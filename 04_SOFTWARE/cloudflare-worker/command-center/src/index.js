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
  let status = DEFAULT_STATUS;
  try {
    const raw = await env.STATUS_KV.get('status');
    if (raw) status = JSON.parse(raw);
  } catch (e) { /* use defaults */ }

  const workersHtml = status.workers.map(w => {
    const color = w.status === 'online' ? '#22c55e' : w.status === 'debug' ? '#eab308' : '#ef4444';
    const pingAgo = w.ts ? (() => {
      const secs = Math.floor((Date.now() - new Date(w.ts).getTime()) / 1000);
      if (secs < 60) return `${secs}s ago`;
      if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
      return `${Math.floor(secs/3600)}h ago`;
    })() : '';
    return `<div class="wk"><span class="dot" style="background:${color}"></span><div style="flex:1"><a href="${w.url}" target="_blank">${w.name}</a><span class="wk-status">${w.status.toUpperCase()}${pingAgo ? ` · ${pingAgo}` : ''}</span></div></div>`;
  }).join('');

  const now = Date.now();
  const r = status.research || {};
  const k4Phase = r.k4_phase ?? 4;
  const k4Viz = r.k4_viz_url || 'https://k4-cage.trimtab-signal.workers.dev/viz';
  const k4Api = r.k4_api_url || 'https://k4-cage.trimtab-signal.workers.dev/api';
  const phenixUrl = r.phenix_url || 'https://p31-phenix.pages.dev';

  const datesHtml = status.dates.map(d => {
    // Parse date like "Apr 16" against current year
    const parsed = new Date(`${d.date} 2026`).getTime();
    const diff = parsed - now;
    const days = diff / 86400000;
    const urgency = days < 2 ? 'red' : days < 7 ? 'yellow' : 'green';
    return `<div class="dt dt-${urgency}"><span class="dt-date">${d.date}</span><span>${d.event}</span></div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>P31 Command Center</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0a0a14;color:#e2e8f0;padding:12px}
h1{font-size:20px;color:#06b6d4;margin-bottom:2px}
.sub{font-size:11px;color:#64748b;margin-bottom:16px}
.card{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:14px;margin-bottom:10px}
.card-title{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;
  display:flex;align-items:center;gap:6px}
.card-title svg{width:14px;height:14px;fill:currentColor}
.wk{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #1e293b}
.wk:last-child{border-bottom:none}
.wk .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.wk a{color:#06b6d4;text-decoration:none;font-size:13px;font-weight:600}
.wk-status{display:block;font-size:10px;color:#64748b}
.kv{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
.kv-key{color:#94a3b8}.kv-val{color:#e2e8f0;font-weight:600;text-align:right;max-width:60%}
.kv-val.green{color:#22c55e}.kv-val.red{color:#ef4444}.kv-val.yellow{color:#eab308}
.dt{display:flex;gap:10px;padding:5px 6px;font-size:13px;border-bottom:1px solid #1e293b;border-radius:4px}
.dt:last-child{border-bottom:none}
.dt-date{font-weight:700;min-width:52px;font-size:12px}
.dt-red{background:#7f1d1d22}.dt-red .dt-date{color:#ef4444}
.dt-yellow{background:#78350f22}.dt-yellow .dt-date{color:#eab308}
.dt-green .dt-date{color:#22c55e}
.refresh-btn{width:100%;padding:10px;background:transparent;border:1px solid #1e293b;border-radius:8px;
  color:#64748b;font-size:12px;cursor:pointer;margin-bottom:10px;min-height:44px}
.refresh-btn:active{background:#1e293b;color:#e2e8f0}
.updated{text-align:center;font-size:10px;color:#475569;margin-top:12px}
.accent{height:3px;background:#e8636f;width:100%;position:fixed;top:0;left:0;z-index:99}
.links{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
.links a{display:block;background:#06b6d410;border:1px solid #06b6d430;border-radius:8px;
  padding:10px;text-align:center;color:#06b6d4;text-decoration:none;font-size:12px;font-weight:600}
.links a:active{background:#06b6d420}
.cloud-cta{display:block;text-align:center;padding:12px;margin-bottom:12px;background:linear-gradient(90deg,#6366f118,#22d3ee18);
  border:1px solid #6366f144;border-radius:10px;color:#a5b4fc;text-decoration:none;font-size:12px;font-weight:700}
.cloud-cta:active{opacity:0.9}
</style></head><body>
<div class="accent"></div>
<h1>COMMAND CENTER</h1>
<div class="sub">P31 Labs — Delta Topology — Live Status</div>
<a href="/cloud" class="cloud-cta">☁ P31 CLOUD HUB — full account API (Workers, Pages, KV, R2, D1, zones, …)</a>
<button class="refresh-btn" onclick="refreshStatus()">↻ REFRESH</button>

<div class="card">
<div class="card-title">Fleet Status (${status.workers.length} nodes)</div>
${workersHtml}
</div>

<div class="card">
<div class="card-title">Legal — ${status.legal.case}</div>
<div class="kv"><span class="kv-key">Next Hearing</span><span class="kv-val red">${status.legal.next_hearing}</span></div>
<div class="kv"><span class="kv-key">Judge</span><span class="kv-val">${status.legal.judge}</span></div>
<div class="kv"><span class="kv-key">Status</span><span class="kv-val yellow">${status.legal.status}</span></div>
<div class="kv"><span class="kv-key">McGhan Deadline</span><span class="kv-val">${status.legal.mcghan_deadline}</span></div>
</div>

<div class="card">
<div class="card-title">Financial</div>
<div class="kv"><span class="kv-key">Operating Buffer</span><span class="kv-val red">${status.financial.operating_buffer}</span></div>
<div class="kv"><span class="kv-key">Active Grants</span><span class="kv-val yellow">${status.financial.grants_active}</span></div>
<div class="kv"><span class="kv-key">Pending</span><span class="kv-val">${status.financial.grants_pending}</span></div>
<div class="kv"><span class="kv-key">Corp Status</span><span class="kv-val">${status.financial.corp_status}</span></div>
</div>

<div class="card">
<div class="card-title">Research & Engineering</div>
<div class="kv"><span class="kv-key">K₄ Cage</span><span class="kv-val green">Phase ${k4Phase} · <a href="${k4Viz}" target="_blank" rel="noopener" style="color:#86efac;text-decoration:underline">viz</a> · <a href="${k4Api}" target="_blank" rel="noopener" style="color:#86efac;text-decoration:underline">routes</a></span></div>
<div class="kv"><span class="kv-key">Weave</span><span class="kv-val green"><a href="${phenixUrl}" target="_blank" rel="noopener" style="color:#86efac;text-decoration:underline">Phenix wallet</a> · vault · mesh · Carrie (family / <a href="https://carrie-wellness.trimtab-signal.workers.dev" target="_blank" rel="noopener" style="color:#86efac;text-decoration:underline">public</a>)</span></div>
<div class="kv"><span class="kv-key">Paper XII</span><span class="kv-val green">${status.research.paper_xii}</span></div>
<div class="kv"><span class="kv-key">BONDING Tests</span><span class="kv-val green">${status.research.bonding_tests}</span></div>
<div class="kv"><span class="kv-key">Deployed Workers</span><span class="kv-val green">${status.research.deployed_workers}</span></div>
</div>

<div class="card">
<div class="card-title">Key Dates</div>
${datesHtml}
</div>

<div class="links">
<a href="https://bonding.p31ca.org" target="_blank">BONDING</a>
<a href="https://p31-mesh.pages.dev" target="_blank">MESH</a>
<a href="https://p31-vault.pages.dev" target="_blank">VAULT</a>
<a href="https://k4-cage.trimtab-signal.workers.dev/viz" target="_blank" rel="noopener">K₄ VIZ</a>
<a href="https://k4-personal.trimtab-signal.workers.dev/viz" target="_blank" rel="noopener">K₄ PERSONAL</a>
<a href="https://k4-hubs.trimtab-signal.workers.dev/viz" target="_blank" rel="noopener">K₄ HUBS</a>
<a href="https://p31-phenix.pages.dev" target="_blank" rel="noopener">PHENIX</a>
<a href="https://carrie-agent.trimtab-signal.workers.dev" target="_blank">CARRIE</a>
<a href="https://carrie-wellness.trimtab-signal.workers.dev" target="_blank">CARRIE·PUB</a>
<a href="https://phosphorus31.org" target="_blank">P31.ORG</a>
</div>

<div class="updated" id="last-update">Last update: ${status.updated || 'default values'}</div>
<script>
async function refreshStatus() {
  const btn = document.querySelector('.refresh-btn');
  btn.textContent = '↻ REFRESHING...';
  btn.disabled = true;
  try {
    const r = await fetch('/api/status');
    const s = await r.json();
    // Reload page with fresh data (simplest, no state management)
    location.reload();
  } catch(e) {
    btn.textContent = '✗ FAILED — retry';
    btn.disabled = false;
  }
}
</script>
</body></html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html;charset=UTF-8', 'x-robots-tag': 'noindex' }
  });
}

// ── CWP-042: Health Pinger (runs every 5 min via cron) ──
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
