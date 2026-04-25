 import {
  fetchCfFull,
  dashWorkersUrl,
  dashPagesUrl,
  dashKvUrl,
  dashAnalyticsUrl,
  dashR2Url,
  dashD1Url,
  dashQueuesUrl,
  dashHyperdriveUrl,
  dashVectorizeUrl,
  dashZeroTrustUrl,
  dashAccessUrl,
} from './cf.js';
import { buildCloudHubHtml } from './cloud-hub-html.js';
import { buildGodDashboardHtml } from './god-dashboard.js';
import { handleSseStream } from './sse-stream.js';
import { CrdtQueueProcessor } from './crdt-processor-do.js';
import { CrdtSessionDO } from './crdt-session-do.js';
export { CrdtQueueProcessor, CrdtSessionDO };

// ── Cloudflare Access JWT helpers ──
const JWKS_CACHE = new Map();
let jwksFetchTime = 0;
const JWKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCfPublicKey(kid, teamDomain) {
  const now = Date.now();
  if (now - jwksFetchTime > JWKS_CACHE_TTL || !JWKS_CACHE.has(kid)) {
    const resp = await fetch(`https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`);
    const jwks = await resp.json();
    for (const key of jwks.keys) {
      JWKS_CACHE.set(key.kid, key.x5c[0]); // PEM cert
    }
    jwksFetchTime = now;
  }
  return JWKS_CACHE.get(kid);
}

function base64urlToUint8Array(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function pemToDer(pem) {
  const b64 = pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\n/g, '');
  return base64urlToUint8Array(b64).buffer;
}

function parseJwtPayload(jwt) {
  const [headerB64, payloadB64, sigB64] = jwt.split('.');
  try {
    return JSON.parse(atob(payloadB64));
  } catch {
    return null;
  }
}

async function validateAccessJwt(request, env) {
  const jwt = request.headers.get('CF-Access-Jwt-Assertion') || '';
  if (!jwt) return null;

  try {
    const [headerB64, payloadB64, sigB64] = jwt.split('.');
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));

    if (!header.kid) return null;
    const teamDomain = env.CF_TEAM_DOMAIN || 'trimtab-signal';
    const publicKeyPem = await getCfPublicKey(header.kid, teamDomain);
    if (!publicKeyPem) return null;

    const isValid = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      await crypto.subtle.importKey('spki', pemToDer(publicKeyPem), { name: 'RSASSA-PKCS1-v1_5' }, false, ['verify']),
      base64urlToUint8Array(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );

    if (!isValid) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Authentication (Cloudflare Access + legacy token fallback) ──
async function authenticate(request, env) {
  // 1. Check for Edge-verified Email header (injected after Cookie validation - vital for WebSockets)
  let email = request.headers.get("Cf-Access-Authenticated-User-Email");
  
  // 2. Fallback to decoding the JWT Assertion (for direct API calls)
  if (!email) {
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        email = payload.email;
      } catch (e) { /* ignore */ }
    }
  }
  
  // 3. THE WEBSOCKET SILVER BULLET: Crack the CF_Authorization cookie directly
  if (!email) {
    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/CF_Authorization=([^;]+)/);
    if (match) {
      try { 
        // Extract the payload (middle segment) of the JWT
        email = JSON.parse(atob(match[1].split(".")[1])).email; 
      } catch(e){}
    }
  }
  
   if (email) {
     return {
       email: email,
       role: getRoleFromEmail(email),
       source: "cloudflare-access"
     };
   }
   return null;
}

// ── Role mapping from email (Cloudflare Access doesn't pass groups) ──
function getRoleFromEmail(email) {
  if (!email) return 'none';
  const lower = email.toLowerCase();
  if (lower.includes('will@p31ca.org') || lower.includes('classicwilly') || lower.includes('willyj1587')) return 'admin';
  if (lower.includes('legal@')) return 'legal';
  if (lower.includes('operator@')) return 'operator';
  if (lower.includes('reader@')) return 'reader';
  return 'none';
}

async function isAdmin(request, env) {
  // Fast path: check Cf-Access-Authenticated-User-Email directly
  const sessionEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (sessionEmail && getRoleFromEmail(sessionEmail) === 'admin') {
    return true;
  }
  // Full auth check as fallback
  const auth = await authenticate(request, env);
  return auth && auth.role === 'admin';
}

// ── RBAC middleware ──
const ROLE_LEVEL = { none: 0, reader: 1, operator: 2, legal: 2, admin: 3 };

async function withAccess(request, env, requiredRole, handler) {
  const auth = await authenticate(request, env);
  if (!auth) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer realm="EPCP"' }
    });
  }
  if ((ROLE_LEVEL[auth.role] || 0) < (ROLE_LEVEL[requiredRole] || 99)) {
    return new Response('Forbidden', { status: 403 });
  }
  return handler(auth);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pingFleet(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    
    // DEBUG: Log ALL requests immediately
    console.log(`[WORKER] ${request.method} ${url.pathname}${url.search} | host: ${url.host}`);
    
    // Catch-all debug for /api/crdt/*
    if (url.pathname.startsWith('/api/crdt')) {
      console.log(`[WORKER] CRDT PATH DETECTED: ${url.pathname}`);
    }

    // ── API Routes ──
    if (url.pathname === '/api/status' && request.method === 'POST') {
      return withAccess(request, env, 'operator', async (auth) => {
        return handleStatusWrite(request, env, auth);
      });
    }
    if (url.pathname === '/api/status' && request.method === 'GET') {
      return withAccess(request, env, 'reader', async (auth) => {
        return handleStatusRead(env);
      });
    }
    if (url.pathname === '/api/cf/summary' && request.method === 'GET') {
      return withAccess(request, env, 'reader', async (auth) => {
        return handleCfSummary(request, env, url);
      });
      if (url.pathname === '/api/whoami') {
        const auth = await authenticate(request, env);
        if (!auth) return jsonResponse({ authenticated: false }, 401);
        return jsonResponse({
          authenticated: true,
          sub: auth.sub,
          email: auth.email,
          name: auth.name,
          role: auth.role,
          groups: auth.groups,
          source: auth.source,
        });
      }
      
      // ── Diagnostic: CRDT Headers ──
      if (url.pathname === '/api/debug/crdt-headers' && request.method === 'GET') {
        return withAccess(request, env, 'reader', async () => {
          const keys = await env.STATUS_KV.list({ limit: 10 });
          const diagnostics = [];
          for (const key of keys.keys) {
            if (key.name.startsWith('crdt_diagnostic_')) {
              const value = await env.STATUS_KV.get(key.name, 'json');
              diagnostics.push({ key: key.name, ...value });
            }
          }
          diagnostics.sort((a, b) => (b.ts || '') > (a.ts || '') ? -1 : 1);
          return jsonResponse({ diagnostics: diagnostics.slice(0, 5) });
        });
      }
    
    // ── Server-Sent Events Stream ──
    if (url.pathname === '/api/sse' && request.method === 'GET') {
      // SSE accessible to any authenticated user (Cloudflare Access sets this header)
      const sessionEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
      if (!sessionEmail) {
        return new Response('Unauthorized: No session', { status: 401 });
      }
      try {
        return handleSseStream(request, env);
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

     // ── Mesh Analytics API ──
     if (url.pathname === '/api/analytics/mesh' && request.method === 'GET') {
       const sessionEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
       if (!sessionEmail) return jsonResponse({ error: 'Unauthorized' }, 401);
       try {
         const hours = parseInt(url.searchParams.get('hours') || '24');
         const results = await env.EPCP_DB.prepare(
           'SELECT * FROM mesh_analytics WHERE ts > ? ORDER BY ts DESC LIMIT 500'
         ).bind(Date.now() - (hours * 3600 * 1000)).all();
         return jsonResponse({ events: results.results || [] });
       } catch (e) {
         return jsonResponse({ error: e.message }, 500);
       }
     }

     if (url.pathname === '/api/analytics/health' && request.method === 'GET') {
       const sessionEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
       if (!sessionEmail) return jsonResponse({ error: 'Unauthorized' }, 401);
       try {
         const hours = parseInt(url.searchParams.get('hours') || '24');
         const results = await env.EPCP_DB.prepare(
           'SELECT * FROM node_health_history WHERE ts > ? ORDER BY ts DESC LIMIT 500'
         ).bind(Date.now() - (hours * 3600 * 1000)).all();
         return jsonResponse({ health: results.results || [] });
       } catch (e) {
         return jsonResponse({ error: e.message }, 500);
       }
     }

      // ── Cost Summary API ──
      if (url.pathname === '/api/costs' && request.method === 'GET') {
        const sessionEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
        if (!sessionEmail) return jsonResponse({ error: 'Unauthorized' }, 401);
        try {
          const hours = parseInt(url.searchParams.get('hours') || '24');
          const cutoff = Date.now() - (hours * 3600 * 1000);
          const results = await env.EPCP_DB.prepare(
            'SELECT service, operation, SUM(quantity) as total_qty, SUM(estimated_cost) as total_cost FROM cost_tracking WHERE ts > ? GROUP BY service, operation'
          ).bind(cutoff).all();
          const totalCost = (results.results || []).reduce(function(sum, r) { return sum + (r.total_cost || 0); }, 0);
          return jsonResponse({
            summary: results.results || [],
            total_cost: totalCost,
            period_hours: hours
          });
        } catch (e) {
          return jsonResponse({ error: e.message }, 500);
        }
       }
      
      // ── CRDT Session WebSocket ──
      if (url.pathname === '/api/crdt/session') {
        // Diagnostic mode: ?diag=1 returns header info without invoking DO
        if (url.searchParams.get('diag') === '1') {
          return jsonResponse({
            pathname: url.pathname,
            hostname: url.hostname,
            upgrade: request.headers.get('Upgrade'),
            connection: request.headers.get('Connection'),
            headers: Object.fromEntries(request.headers.entries())
          });
        }
        
        console.log('[WORKER] CRDT route. Host:', url.hostname, 'Upgrade:', request.headers.get('Upgrade'));
        
        try {
          await env.STATUS_KV.put('crdt_last_headers', JSON.stringify({
            ts: new Date().toISOString(),
            host: url.hostname,
            upgrade: request.headers.get('Upgrade'),
            connection: request.headers.get('Connection')
          }));
        } catch (e) {}
        
        if (!env.CRDT_SESSION_DO) {
          return jsonResponse({ error: 'CRDT_SESSION_DO not bound' }, 503);
        }
        const id = env.CRDT_SESSION_DO.idFromName('global-session');
        const stub = env.CRDT_SESSION_DO.get(id);
        return stub.fetch(request);
      }

      // ── Admin: CRDT Access Bypass ──
      if (url.pathname === '/api/admin/crdt-access-bypass' && request.method === 'POST') {
        return withAccess(request, env, 'admin', async () => {
          try {
            if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
              return jsonResponse({ error: 'Admin API token not configured' }, 500);
            }
            const apiToken = env.CF_API_TOKEN;
            const accountId = env.CF_ACCOUNT_ID;
            const apiBase = 'https://api.cloudflare.com/client/v4';

            // 1. Find the Access application for command-center
            const appsRes = await fetch(`${apiBase}/accounts/${accountId}/access/apps`, {
              headers: { Authorization: `Bearer ${apiToken}` }
            });
            const appsJson = await appsRes.json();
            if (!appsJson.success) {
              throw new Error('Failed to list Access apps: ' + (appsJson.errors?.[0]?.message || 'unknown'));
            }
            const apps = appsJson.result || [];
            const targetApp = apps.find(app => app.domain === 'command-center.p31ca.org') ||
                              apps.find(app => app.name && app.name.toLowerCase().includes('command-center'));
            if (!targetApp) {
              throw new Error('Command-center Access application not found');
            }
            const appId = targetApp.id;

            // 2. Fetch current app details (to read existing path_rules)
            const appRes = await fetch(`${apiBase}/accounts/${accountId}/access/apps/${appId}`, {
              headers: { Authorization: `Bearer ${apiToken}` }
            });
            const appJson = await appRes.json();
            if (!appJson.success) {
              throw new Error('Failed to get Access app: ' + (appJson.errors?.[0]?.message || 'unknown'));
            }
            const app = appJson.result;
            let pathRules = app.path_rules || [];

            // 3. Check if bypass rule already exists
            const exists = pathRules.some(rule => rule.value === '/api/crdt/session*' && rule.type === 'exclude');
            if (exists) {
              return jsonResponse({ message: 'Path rule already exists' });
            }

            // 4. Add new exclude rule and PATCH the app
            pathRules.push({ value: '/api/crdt/session*', type: 'exclude', name: 'CRDT WebSocket Bypass' });
            const patchRes = await fetch(`${apiBase}/accounts/${accountId}/access/apps/${appId}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ path_rules: pathRules })
            });
            const patchJson = await patchRes.json();
            if (!patchJson.success) {
              throw new Error('Failed to update Access app: ' + (patchJson.errors?.[0]?.message || 'unknown'));
            }

             return jsonResponse({ message: 'CRDT WebSocket bypass rule added', app: patchJson.result });
          } catch (e) {
            return jsonResponse({ error: e.message }, 500);
          }
        });
      }

      // ── Admin: Access Status ──
      if (url.pathname === '/api/admin/access-status' && request.method === 'GET') {
        return withAccess(request, env, 'admin', async (auth) => {
          return jsonResponse({ 
            authenticated: true,
            user: auth.user,
            domain: url.hostname
          });
        });
      }


     // ── Cloudflare Resources API ──
     if (url.pathname === '/api/cf/resources' && request.method === 'GET') {
       if (!(await isAdmin(request, env))) return jsonResponse({ error: 'Unauthorized' }, 401);
       try {
         const resource = url.searchParams.get('resource');
         const data = await fetchCfFull(env, resource);
         return jsonResponse(data);
       } catch (e) {
         return jsonResponse({ error: e.message }, 500);
       }
     }

     if (url.pathname === '/api/health') {
       return jsonResponse({ ok: true, ts: new Date().toISOString() });
     }

    if (url.pathname === '/cloud' || url.pathname === '/cloud/') {
      return new Response(buildCloudHubHtml(env.CF_ACCOUNT_ID || ''), {
        headers: { 'content-type': 'text/html;charset=UTF-8', 'x-robots-tag': 'noindex' },
      });
    }

    // ── Dashboard ──
    return serveDashboard(env);
  }
};

async function handleStatusWrite(request, env, auth) {
  try {
    const body = await request.text();
    JSON.parse(body); // validate JSON
    await env.STATUS_KV.put('status', body);
    // Log event to D1 if available
    if (env.EPCP_DB) {
      await env.EPCP_DB.prepare(
        'INSERT INTO fleet_status (key, value, updated) VALUES (?, ?, ?)'
      ).bind('status.json', body, new Date().toISOString()).run();
    }
    return jsonResponse({ ok: true, actor: auth.sub });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 400);
  }
}

async function handleStatusRead(env) {
  const data = await env.STATUS_KV.get('status');
  if (!data) {
    return new Response(JSON.stringify(DEFAULT_STATUS), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }
  return new Response(data, {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
  });
}

const CF_HUB_CACHE_KEY = 'p31_cf_hub_cache_v3';

async function handleCfSummary(request, env, url) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token || token !== env.STATUS_TOKEN) {
    return new Response(null, { status: 401 });
  }
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
    return jsonResponse({ configured: false });
  }
  const refresh = url.searchParams.get('refresh') === '1';
  if (!refresh) {
    const cached = await env.STATUS_KV.get(CF_HUB_CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      });
    }
  }
  let summary;
  try {
    summary = await fetchCfFull(env.CF_ACCOUNT_ID, env.CF_API_TOKEN);
  } catch (e) {
    return new Response(null, { status: 500 });
  }
  const id = env.CF_ACCOUNT_ID;
  const body = {
    configured: true,
    dash: {
      workers: dashWorkersUrl(id),
      pages: dashPagesUrl(id),
      kv: dashKvUrl(id),
      r2: dashR2Url(id),
      d1: dashD1Url(id),
      queues: dashQueuesUrl(id),
      hyperdrive: dashHyperdriveUrl(id),
      vectorize: dashVectorizeUrl(id),
      analytics: dashAnalyticsUrl(id),
      access: dashAccessUrl(id),
      zeroTrust: dashZeroTrustUrl(),
    },
    ...summary,
  };
  const out = JSON.stringify(body);
  try {
    await env.STATUS_KV.put(CF_HUB_CACHE_KEY, out, { expirationTtl: 180 });
  } catch (_) {}
  return new Response(out, {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

function jsonResponse(obj, status = 200, extraHeaders = {}) {
  const CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; ');

  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'Content-Security-Policy': CSP,
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...extraHeaders,
    },
  });
}

const DEFAULT_STATUS = {
  updated: "2026-04-14T20:30:00Z",
  workers: [
    { name: "phosphorus31-org", status: "online", url: "https://phosphorus31.org" },
    { name: "p31ca-org", status: "online", url: "https://p31ca.org" },
    { name: "bonding-p31ca-org", status: "online", url: "https://bonding.p31ca.org" },
     { name: "command-center", status: "online", url: "https://command-center.p31ca.org" },
    { name: "carrie-agent", status: "online", url: "https://carrie-agent.trimtab-signal.workers.dev" },
    { name: "carrie-wellness", status: "online", url: "https://carrie-wellness.trimtab-signal.workers.dev" },
    { name: "p31-social-engine", status: "online", url: "https://p31-social-engine.trimtab-signal.workers.dev" },
    { name: "genesis-gate", status: "online", url: "https://genesis-gate.trimtab-signal.workers.dev" },
    { name: "p31-bonding-relay", status: "online", url: "https://p31-bonding-relay.trimtab-signal.workers.dev" },
    { name: "p31-telemetry", status: "online", url: "https://p31-telemetry.trimtab-signal.workers.dev" },
    { name: "p31-stripe-webhook", status: "online", url: "https://p31-stripe-webhook.trimtab-signal.workers.dev" },
    { name: "api-phosphorus31-org", status: "online", url: "https://api-phosphorus31-org.trimtab-signal.workers.dev" },
    { name: "fawn-guard", status: "online", url: "https://fawn-guard.trimtab-signal.workers.dev" },
    { name: "p31-signaling", status: "online", url: "https://p31-signaling.trimtab-signal.workers.dev" },
    { name: "p31-vault", status: "online", url: "https://p31-vault.pages.dev" },
    { name: "p31-mesh", status: "online", url: "https://p31-mesh.pages.dev" },
    { name: "p31-lab", status: "online", url: "https://p31-lab.trimtab-signal.workers.dev" },
    { name: "will-workshop", status: "online", url: "https://will-workshop.trimtab-signal.workers.dev" },
    { name: "bash-lab", status: "online", url: "https://bash-lab.trimtab-signal.workers.dev" },
    { name: "willow-garden", status: "online", url: "https://willow-garden.trimtab-signal.workers.dev" },
    { name: "christyn-corner", status: "online", url: "https://christyn-corner.trimtab-signal.workers.dev" },
    { name: "k4-cage", status: "online", url: "https://k4-cage.trimtab-signal.workers.dev" },
    { name: "k4-personal", status: "online", url: "https://k4-personal.trimtab-signal.workers.dev" },
    { name: "k4-hubs", status: "online", url: "https://k4-hubs.trimtab-signal.workers.dev" },
    { name: "p31-bouncer", status: "online", url: "https://p31-bouncer.trimtab-signal.workers.dev" },
    { name: "p31-phenix", status: "online", url: "https://p31-phenix.pages.dev" }
  ],
  legal: {
    case: "Johnson v. Johnson, 2025CV936",
    next_hearing: "April 16, 2026 — 11:00 AM",
    judge: "Chief Judge Scarlett",
    status: "Contempt hearing — discovery sent Apr 14",
    mcghan_deadline: "April 17, 2026"
  },
  financial: {
    operating_buffer: "$530 (Ko-fi + Stripe)",
    grants_active: "Awesome Foundation $1K (April deliberation)",
    grants_pending: "NIDILRR Switzer $80K, FIP $250K/yr (inquiries sent, no response)",
    grants_dead: "ESG, Microsoft AI, Pollination, NDEP, Mission.Earth",
    corp_status: "P31 Labs Inc — Active (GA SoS). EIN: 42-1888158 (assigned Apr 13, 2026). 501(c)(3) not filed."
  },
  research: {
    paper_xii: "Sovereign Stack — 11pp, triple-gated, Zenodo-ready",
    bonding_tests: "413 / 30 suites",
    deployed_workers: 25,
    k4_phase: 4,
    k4_viz_url: "https://k4-cage.trimtab-signal.workers.dev/viz",
    k4_api_url: "https://k4-cage.trimtab-signal.workers.dev/api",
    phenix_url: "https://p31-phenix.pages.dev"
  },
  dates: [
    { date: "Apr 14", event: "Discovery sent to McGhan (3 docs)" },
    { date: "Apr 16", event: "CONTEMPT HEARING 11AM — Woodbine" },
    { date: "Apr 17", event: "McGhan deadline" },
    { date: "Apr 30", event: "Camden County wellness baseline" },
    { date: "Apr 30", event: "Georgia Tech Summit" },
    { date: "May 19", event: "Neurotech Frontiers Summit" },
    { date: "Jun 1", event: "Stimpunks $3K opens" },
    { date: "Sep 30", event: "FERS filing deadline" }
  ]
};

async function serveDashboard(env) {
  const html = buildGodDashboardHtml();
  
    // Re-use the strict CSP you already built
    const CSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'"
    ].join('; ');

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'x-robots-tag': 'noindex',
      'Content-Security-Policy': CSP,
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  });
}

async function pingFleet(env) {
  const endpoints = [
    { name: "phosphorus31-org", url: "https://phosphorus31.org" },
    { name: "p31ca-org", url: "https://p31ca.org" },
    { name: "bonding-p31ca-org", url: "https://bonding.p31ca.org" },
    { name: "carrie-agent", url: "https://carrie-agent.trimtab-signal.workers.dev" },
    { name: "carrie-wellness", url: "https://carrie-wellness.trimtab-signal.workers.dev" },
    { name: "p31-social-engine", url: "https://p31-social-engine.trimtab-signal.workers.dev" },
    { name: "genesis-gate", url: "https://genesis-gate.trimtab-signal.workers.dev" },
    { name: "p31-bonding-relay", url: "https://p31-bonding-relay.trimtab-signal.workers.dev" },
    { name: "p31-telemetry", url: "https://p31-telemetry.trimtab-signal.workers.dev" },
    { name: "p31-stripe-webhook", url: "https://p31-stripe-webhook.trimtab-signal.workers.dev" },
    { name: "api-phosphorus31-org", url: "https://api-phosphorus31-org.trimtab-signal.workers.dev" },
    { name: "fawn-guard", url: "https://fawn-guard.trimtab-signal.workers.dev" },
    { name: "p31-signaling", url: "https://p31-signaling.trimtab-signal.workers.dev" },
    { name: "p31-vault", url: "https://p31-vault.pages.dev" },
    { name: "p31-mesh", url: "https://p31-mesh.pages.dev" },
    { name: "p31-lab", url: "https://p31-lab.trimtab-signal.workers.dev" },
    { name: "will-workshop", url: "https://will-workshop.trimtab-signal.workers.dev" },
    { name: "bash-lab", url: "https://bash-lab.trimtab-signal.workers.dev" },
    { name: "willow-garden", url: "https://willow-garden.trimtab-signal.workers.dev" },
    { name: "christyn-corner", url: "https://christyn-corner.trimtab-signal.workers.dev" },
    { name: "k4-cage", url: "https://k4-cage.trimtab-signal.workers.dev/api/health" },
    { name: "k4-personal", url: "https://k4-personal.trimtab-signal.workers.dev/api/health" },
    { name: "k4-hubs", url: "https://k4-hubs.trimtab-signal.workers.dev/api/health" },
    { name: "p31-bouncer", url: "https://p31-bouncer.trimtab-signal.workers.dev/health" },
    { name: "p31-phenix", url: "https://p31-phenix.pages.dev" },
  ];

  const results = await Promise.allSettled(
    endpoints.map(async (ep) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(ep.url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
        clearTimeout(timeout);
        return { name: ep.name, url: ep.url, status: res.ok ? 'online' : 'error', code: res.status, ts: new Date().toISOString() };
      } catch (e) {
        return { name: ep.name, url: ep.url, status: 'offline', ts: new Date().toISOString() };
      }
    })
  );

    const workers = results.map(r => {
      const val = r.value || r.reason;
      // Estimate RPS for vitality glow: hubs get higher traffic
      val.rps = (val.status === 'online' || val.status === 'active') ? Math.floor(Math.random() * 5) + 1 : 0;
      if (val.name.includes('hub') || val.name.includes('center') || val.name.includes('command')) {
        val.rps += 12; // Hubs have higher baseline traffic
      }
      // Assign room_id for spatial navigation
      const nameLower = (val.name || '').toLowerCase();
      if (nameLower.includes('command')) val.room_id = 'Command Center';
      else if (nameLower.includes('bouncer')) val.room_id = 'Bouncer Hub';
      else if (nameLower.includes('social')) val.room_id = 'Social Engine';
      else if (nameLower.includes('fawn') || nameLower.includes('forensics')) val.room_id = 'Forensics';
      else val.room_id = 'global';
      return val;
    });
    workers.push({ name: "command-center", url: "https://command-center.trimtab-signal.workers.dev", status: "online", rps: 15, room_id: "Command Center", ts: new Date().toISOString() });

  try {
    const raw = await env.STATUS_KV.get('status');
    const status = raw ? JSON.parse(raw) : {};
    status.workers = workers;
    status.last_ping = new Date().toISOString();
    status.research = status.research || {};
    status.research.deployed_workers = workers.length;
    await env.STATUS_KV.put('status', JSON.stringify(status));
  } catch (e) {
    console.error('Health pinger KV write failed:', e);
  }
}
