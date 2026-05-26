/**
 * cf-edge-lab — small Worker showcasing edge metadata, Workers AI, and WebSockets.
 */

export interface Env {
  AI: Ai;
}

type CfSnapshot = {
  colo?: string;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  continent?: string;
  latitude?: string;
  longitude?: string;
  asn?: number;
  asOrganization?: string;
  httpProtocol?: string;
  tlsVersion?: string;
  tlsCipher?: string;
  edgeRequestKeepAliveStatus?: number;
};

function cfSnapshot(cf: IncomingRequestCfProperties | undefined): CfSnapshot | null {
  if (!cf) return null;
  return {
    colo: cf.colo,
    country: cf.country,
    city: cf.city,
    region: cf.region,
    timezone: cf.timezone,
    continent: cf.continent,
    latitude: cf.latitude,
    longitude: cf.longitude,
    asn: cf.asn,
    asOrganization: cf.asOrganization,
    httpProtocol: cf.httpProtocol,
    tlsVersion: cf.tlsVersion,
    tlsCipher: cf.tlsCipher,
    edgeRequestKeepAliveStatus: cf.edgeRequestKeepAliveStatus,
  };
}

const JSON_HDR = { 'content-type': 'application/json; charset=utf-8' };

const PLAY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>cf-edge-lab</title>
  <style>
    :root { color-scheme: dark; --bg: #0c0d10; --fg: #e8eaef; --accent: #5eead4; --muted: #8b919d; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--fg); margin: 0; padding: 1.25rem; max-width: 52rem; }
    h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
    p { color: var(--muted); font-size: 0.9rem; line-height: 1.5; }
    pre { background: #15171c; border: 1px solid #252830; border-radius: 8px; padding: 1rem; overflow: auto; font-size: 0.78rem; }
    button { background: var(--accent); color: #041; border: 0; border-radius: 8px; padding: 0.5rem 1rem; font-weight: 600; cursor: pointer; margin-right: 0.5rem; margin-top: 0.5rem; }
    button:hover { filter: brightness(1.08); }
    input, textarea { width: 100%; box-sizing: border-box; background: #15171c; border: 1px solid #252830; color: var(--fg); border-radius: 8px; padding: 0.5rem 0.65rem; margin-top: 0.35rem; font-size: 0.9rem; }
    textarea { min-height: 4rem; resize: vertical; }
    .row { margin-top: 1.25rem; }
    .tag { display: inline-block; font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: #252830; color: var(--muted); margin-right: 0.35rem; }
  </style>
</head>
<body>
  <h1>cf-edge-lab</h1>
  <p><span class="tag">GET /api/edge</span><span class="tag">POST /api/vibe</span><span class="tag">GET /ws</span> WebSocket</p>
  <div class="row">
    <button type="button" id="btnEdge">Refresh edge snapshot</button>
    <pre id="edgeOut">…</pre>
  </div>
  <div class="row">
    <label for="vibeIn">Vibe-check (Workers AI)</label>
    <textarea id="vibeIn" placeholder="Paste a sentence…"></textarea>
    <button type="button" id="btnVibe">Run vibe</button>
    <pre id="vibeOut">…</pre>
  </div>
  <div class="row">
    <button type="button" id="btnWs">Open WebSocket echo</button>
    <pre id="wsOut">…</pre>
  </div>
  <script>
    const $ = (id) => document.getElementById(id);
    async function refreshEdge() {
      $('edgeOut').textContent = 'loading…';
      const r = await fetch('/api/edge');
      $('edgeOut').textContent = JSON.stringify(await r.json(), null, 2);
    }
    $('btnEdge').onclick = refreshEdge;
    $('btnVibe').onclick = async () => {
      const line = $('vibeIn').value.trim() || 'the color teal';
      $('vibeOut').textContent = 'thinking…';
      const r = await fetch('/api/vibe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ line }) });
      $('vibeOut').textContent = JSON.stringify(await r.json(), null, 2);
    };
    $('btnWs').onclick = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(proto + '://' + location.host + '/ws');
      const log = (m) => { const el = $('wsOut'); el.textContent = (el.textContent === '…' ? '' : el.textContent) + m + '\\n'; };
      ws.onopen = () => { log('open — send a few messages'); ws.send('hello from browser'); };
      ws.onmessage = (e) => log('← ' + e.data);
      ws.onerror = () => log('error');
      ws.onclose = () => log('closed');
    };
    refreshEdge();
  </script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (path === '/' && request.method === 'GET') {
      return new Response(PLAY_HTML, {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    if (path === '/api/edge' && request.method === 'GET') {
      const body = {
        ok: true,
        ray: request.headers.get('cf-ray') ?? null,
        cf: cfSnapshot(request.cf),
        url: request.url,
        method: request.method,
      };
      return new Response(JSON.stringify(body, null, 2), { headers: JSON_HDR });
    }

    if (path === '/api/vibe' && request.method === 'POST') {
      let line = '';
      try {
        const j = (await request.json()) as { line?: string };
        line = typeof j.line === 'string' ? j.line.slice(0, 2000) : '';
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), { status: 400, headers: JSON_HDR });
      }
      if (!line.trim()) {
        return new Response(JSON.stringify({ ok: false, error: 'missing_line' }), { status: 400, headers: JSON_HDR });
      }
      try {
        const out = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
          messages: [
            {
              role: 'system',
              content:
                'You are a terse edge poet. Reply with exactly one sentence under 20 words. No quotation marks.',
            },
            { role: 'user', content: `Vibe-check: ${line}` },
          ],
          temperature: 0.4,
          max_tokens: 80,
        });
        const text =
          typeof out === 'object' && out !== null && 'response' in out && typeof (out as { response?: string }).response === 'string'
            ? (out as { response: string }).response
            : String(out);
        return new Response(JSON.stringify({ ok: true, model: '@cf/meta/llama-3.1-8b-instruct-fast', text: text.trim() }), {
          headers: JSON_HDR,
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: 'ai_failed', detail: String(e) }), { status: 502, headers: JSON_HDR });
      }
    }

    if (path === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426, headers: { connection: 'Upgrade', upgrade: 'websocket' } });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      const colo = request.cf?.colo ?? 'local';
      server.send(JSON.stringify({ event: 'welcome', colo, t: Date.now() }));
      server.addEventListener('message', (ev) => {
        const payload = typeof ev.data === 'string' ? ev.data : '[binary]';
        server.send(JSON.stringify({ event: 'echo', colo, body: payload, t: Date.now() }));
      });
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response(JSON.stringify({ ok: false, error: 'not_found', hint: 'GET /' }), { status: 404, headers: JSON_HDR });
  },
};
