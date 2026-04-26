export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── API Routes ──
    if (url.pathname === '/api/status' && request.method === 'POST') {
      return handleStatusWrite(request, env);
    }
    if (url.pathname === '/api/status' && request.method === 'GET') {
      return handleStatusRead(env);
    }
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    // ── Dashboard ──
    return serveDashboard(env);
  }
};

async function handleStatusWrite(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token || token !== env.STATUS_TOKEN) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  try {
    const body = await request.text();
    JSON.parse(body); // validate JSON
    await env.STATUS_KV.put('status', body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
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

const DEFAULT_STATUS = {
  updated: "2026-04-13T21:00:00Z",
  workers: [
    { name: "genesis-gate", status: "online", url: "https://genesis-gate.trimtab-signal.workers.dev" },
    { name: "p31-bonding-relay", status: "online", url: "https://p31-bonding-relay.trimtab-signal.workers.dev" },
    { name: "p31-telemetry", status: "online", url: "https://p31-telemetry.trimtab-signal.workers.dev" },
    { name: "p31-stripe-webhook", status: "online", url: "https://p31-stripe-webhook.trimtab-signal.workers.dev" },
    { name: "api-phosphorus31-org", status: "online", url: "https://api-phosphorus31-org.trimtab-signal.workers.dev" },
    { name: "carrie-agent", status: "online", url: "https://carrie-agent.trimtab-signal.workers.dev" },
    { name: "command-center", status: "online", url: "https://command-center.trimtab-signal.workers.dev" },
    { name: "p31-mesh", status: "online", url: "https://p31-mesh.pages.dev" },
    { name: "phosphorus31-org", status: "online", url: "https://phosphorus31.org" },
    { name: "bonding-p31ca-org", status: "online", url: "https://bonding.p31ca.org" }
  ],
  legal: {
    case: "Johnson v. Johnson, 2025CV936",
    next_hearing: "April 16, 2026 — 11:00 AM",
    judge: "Chief Judge Scarlett",
    status: "Contempt hearing — discovery sent Apr 14",
    mcghan_deadline: "April 17, 2026"
  },
  financial: {
    operating_buffer: "$0",
    grants_active: "Awesome Foundation $1K (April deliberation)",
    grants_pending: "NIDILRR Switzer $80K, FIP $250K/yr (inquiries sent, no response)",
    grants_dead: "ESG, Microsoft AI, Pollination, NDEP, Mission.Earth",
    corp_status: "P31 Labs Inc — Active (GA SoS). EIN pending. 501(c)(3) not filed."
  },
  research: {
    paper_xii: "Sovereign Stack — 11pp, triple-gated, Zenodo-ready",
    bonding_tests: "413 / 30 suites",
    deployed_workers: 10
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
    return `<div class="wk"><span class="dot" style="background:${color}"></span><div><a href="${w.url}" target="_blank">${w.name}</a><span class="wk-status">${w.status.toUpperCase()}</span></div></div>`;
  }).join('');

  const datesHtml = status.dates.map(d => {
    const urgent = d.event.includes('HEARING') || d.event.includes('CONTEMPT');
    return `<div class="dt ${urgent ? 'urgent' : ''}"><span class="dt-date">${d.date}</span><span>${d.event}</span></div>`;
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
.dt{display:flex;gap:10px;padding:5px 0;font-size:13px;border-bottom:1px solid #1e293b}
.dt:last-child{border-bottom:none}
.dt-date{color:#06b6d4;font-weight:700;min-width:52px;font-size:12px}
.dt.urgent{background:#7f1d1d22;border-radius:4px;padding:5px 6px}
.dt.urgent .dt-date{color:#ef4444}
.updated{text-align:center;font-size:10px;color:#475569;margin-top:12px}
.accent{height:3px;background:#e8636f;width:100%;position:fixed;top:0;left:0;z-index:99}
.links{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
.links a{display:block;background:#06b6d410;border:1px solid #06b6d430;border-radius:8px;
  padding:10px;text-align:center;color:#06b6d4;text-decoration:none;font-size:12px;font-weight:600}
.links a:active{background:#06b6d420}
</style></head><body>
<div class="accent"></div>
<h1>COMMAND CENTER</h1>
<div class="sub">P31 Labs — Delta Topology — Live Status</div>

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
<a href="https://carrie-agent.trimtab-signal.workers.dev" target="_blank">CARRIE</a>
<a href="https://phosphorus31.org" target="_blank">P31.ORG</a>
</div>

<div class="updated">Last update: ${status.updated || 'default values'}</div>
</body></html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html;charset=UTF-8', 'x-robots-tag': 'noindex' }
  });
}
