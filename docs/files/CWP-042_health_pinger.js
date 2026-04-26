// ══════════════════════════════════════════════════════
// CWP-042: Health Pinger — Add to command-center/src/index.js
// ══════════════════════════════════════════════════════
// 
// 1. Add to wrangler.toml:
//    [triggers]
//    crons = ["*/5 * * * *"]
//
// 2. Add this `scheduled` export alongside the existing `fetch` export:

export default {
  async fetch(request, env) {
    // ... existing fetch handler unchanged ...
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(pingFleet(env));
  }
};

async function pingFleet(env) {
  const endpoints = [
    { name: "genesis-gate", url: "https://genesis-gate.trimtab-signal.workers.dev" },
    { name: "p31-bonding-relay", url: "https://p31-bonding-relay.trimtab-signal.workers.dev" },
    { name: "p31-telemetry", url: "https://p31-telemetry.trimtab-signal.workers.dev" },
    { name: "p31-stripe-webhook", url: "https://p31-stripe-webhook.trimtab-signal.workers.dev" },
    { name: "api-phosphorus31-org", url: "https://api-phosphorus31-org.trimtab-signal.workers.dev" },
    { name: "carrie-agent", url: "https://carrie-agent.trimtab-signal.workers.dev" },
    { name: "p31-mesh", url: "https://p31-mesh.pages.dev" },
    { name: "phosphorus31-org", url: "https://phosphorus31.org" },
    { name: "bonding-p31ca-org", url: "https://bonding.p31ca.org" },
  ];

  const results = await Promise.allSettled(
    endpoints.map(async (ep) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(ep.url, {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        return {
          name: ep.name,
          url: ep.url,
          status: res.ok ? 'online' : 'error',
          code: res.status,
          ts: new Date().toISOString(),
        };
      } catch (e) {
        return {
          name: ep.name,
          url: ep.url,
          status: 'offline',
          error: e.message,
          ts: new Date().toISOString(),
        };
      }
    })
  );

  // Add command-center itself (always online if this code is running)
  const workers = results.map(r => r.value || r.reason);
  workers.push({
    name: "command-center",
    url: "https://command-center.trimtab-signal.workers.dev",
    status: "online",
    ts: new Date().toISOString(),
  });

  // Read existing status, update workers array, write back
  try {
    const raw = await env.STATUS_KV.get('status');
    const status = raw ? JSON.parse(raw) : {};
    status.workers = workers;
    status.last_ping = new Date().toISOString();
    await env.STATUS_KV.put('status', JSON.stringify(status));
  } catch (e) {
    console.error('Health pinger KV write failed:', e);
  }
}
