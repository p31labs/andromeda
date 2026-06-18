const WORKERS = {
  'k4-cage':            'https://k4-cage.trimtab-signal.workers.dev',
  'donate-api':         'https://donate-api.trimtab-signal.workers.dev',
  'p31-forge':          'https://p31-forge.trimtab-signal.workers.dev',
  'p31-cortex':         'https://p31-cortex.trimtab-signal.workers.dev',
  'command-center':     'https://command-center.trimtab-signal.workers.dev',
  'spin-matchmaking':   'https://spin-matchmaking.trimtab-signal.workers.dev',
  'spin-logistics':     'https://spin-logistics.trimtab-signal.workers.dev',
};

const SITES = {
  'p31ca':             'https://p31ca.org',
  'phos':              'https://phos.p31ca.org',
  'ops':               'https://ops.p31ca.org',
  'bonding-meatspace': 'https://bonding-meatspace.pages.dev',
  'phosphorus31':      'https://phosphorus31.org',
};

export async function onRequestGet() {
  const results = {};
  for (const [name, url] of Object.entries(WORKERS)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      results[name] = { url, status: res.status, ok: res.ok };
    } catch {
      results[name] = { url, status: 'timeout', ok: false };
    }
  }
  for (const [name, url] of Object.entries(SITES)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      results[name] = { url, status: res.status, ok: res.ok };
    } catch {
      results[name] = { url, status: 'timeout', ok: false };
    }
  }
  return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString(), services: results }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
