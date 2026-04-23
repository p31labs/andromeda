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
import { buildEpcpDashboardHtml } from './epcp-dashboard.js';

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

// ── Role definitions ──
function getRoleFromGroups(groups) {
  if (!groups) return 'none';
  if (groups.includes('p31-admin@phosphorus31.org')) return 'admin';
  if (groups.includes('p31-legal@phosphorus31.org')) return 'legal';
  if (groups.includes('p31-operator@phosphorus31.org')) return 'operator';
  if (groups.includes('p31-reader@phosphorus31.org')) return 'reader';
  return 'none';
}

// ── Authentication (Cloudflare Access + legacy token fallback) ──
async function authenticate(request, env) {
  // Try Cloudflare Access JWT first
  const accessToken = await validateAccessJwt(request, env);
  if (accessToken) {
    return {
      sub: accessToken.sub,
      email: accessToken.email,
      name: accessToken.name,
      role: getRoleFromGroups(accessToken.groups),
      groups: accessToken.groups,
      source: 'cloudflare-access'
    };
  }

  // Fallback: legacy STATUS_TOKEN
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (token && token === env.STATUS_TOKEN) {
    return {
      sub: 'system:legacy-token',
      email: 'system@p31labs',
      name: 'Legacy Token',
      role: 'admin',
      groups: [],
      source: 'legacy-token'
    };
  }

  return null;
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
    }
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
    { name: "command-center", status: "online", url: "https://command-center.trimtab-signal.workers.dev" },
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
  const html = buildEpcpDashboardHtml();
  
  // Re-use the strict CSP you already built
  const CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https:",
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

  const workers = results.map(r => r.value || r.reason);
  workers.push({ name: "command-center", url: "https://command-center.trimtab-signal.workers.dev", status: "online", ts: new Date().toISOString() });

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
