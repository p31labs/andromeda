/**
 * PHOS API — Main routing worker
 *
 * Returns deterministic routing responses. No LLMs in the hot path.
 * GREETING → INTENT → ROUTING → CONTENT is resolved via pattern matching.
 *
 * Endpoints:
 *   GET /                    — status + meshStatus
 *   POST /api/phos/alert     — crisis alert webhook (optional Discord forwarding)
 *   POST /api/phos/telemetry — ESP32 hardware telemetry ingestion
 *   GET /api/phos/stream     — WebSocket upgrade for real-time state sync
 */

interface Env {
  PHOS_STATE: KVNamespace;
  PHOS_CACHE: KVNamespace;
  PHOS_EVENT_LOG: D1Database;
  PHOS_ATMOSPHERE: Fetcher;
  DISCORD_WEBHOOK_URL?: string;
  DISCORD_BOT_TOKEN?: string;
  HARDWARE_SECRET?: string;
  WS_HUB: DurableObjectNamespace;
}

interface TelemetryPayload {
  env_temp: number;
  mesh_nodes_active: number;
  ambient_light: number;
  power_draw: number;
  device_id?: string;
}

// ---- Durable Object: WebSocket Hub ----
// Maintains active WebSocket sessions and broadcasts state syncs
// to all connected clients in real-time.

export class WebSocketHub implements DurableObject {
  private sessions: Map<string, WebSocket> = new Map();

  constructor(_state: DurableObjectState, _env: Env) {}

  async fetch(request: Request): Promise<Response> {
    // WebSocket upgrade — new client connection
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      server.accept();

      const sessionId = crypto.randomUUID();
      this.sessions.set(sessionId, server);

      server.addEventListener('message', (event: MessageEvent) => {
        const data = event.data as string;
        for (const [id, ws] of this.sessions) {
          if (id !== sessionId && ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        }
      });

      const cleanup = () => {
        this.sessions.delete(sessionId);
      };

      server.addEventListener('close', cleanup);
      server.addEventListener('error', cleanup);

      return new Response(null, { status: 101, webSocket: client });
    }

    // Broadcast POST — called by the worker to fan-out telemetry to all clients
    if (request.method === 'POST') {
      const payload = await request.json();
      const message = JSON.stringify({ type: 'telemetry', data: payload });
      let count = 0;
      for (const [id, ws] of this.sessions) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          count++;
        }
      }
      return new Response(
        JSON.stringify({ status: 'broadcast', sessions: count }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  }
}

interface MeshNode {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  description: string;
  latencyMs?: number;
}

interface PHOSResponse {
  status: 'PHOS Online';
  version: string;
  surface: string;
  timestamp: string;
  meshStatus: MeshNode[];
}

interface AlertPayload {
  surface: string;
  spoons: number;
  message: string;
}

const STATIC_MESH: { name: string; description: string }[] = [
  { name: 'Atmosphere', description: 'Surface engine' },
  { name: 'Voice', description: 'Speech synthesis' },
  { name: 'Event Log', description: 'Oracle ledger' },
  { name: 'State KV', description: 'Session cache' },
  { name: 'Vault', description: 'Asset storage' },
  { name: 'Love Ledger', description: 'Value accounting' },
];

const EXTERNAL_PROBES: { name: string; url: string }[] = [
  { name: 'Arcade Hub', url: 'https://bonding.p31ca.org' },
  { name: 'Mesh Monitor', url: 'https://phosphorus31.org' },
  { name: 'Discord Bot', url: 'https://discord.com/api/v10/guilds/1449826533089742962' },
];

/**
 * Ping an external endpoint with a timeout.
 * Returns { status: 'online' | 'degraded' | 'offline', latencyMs }.
 */
async function pingEndpoint(
  url: string,
  timeoutMs: number = 1500
): Promise<{ status: MeshNode['status']; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      cf: { cacheTtl: 0 },
    } as RequestInit);
    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (response.ok) {
      return { status: 'online', latencyMs };
    }
    if (response.status < 500) {
      return { status: 'degraded', latencyMs };
    }
    return { status: 'offline', latencyMs };
  } catch {
    return { status: 'offline', latencyMs: Date.now() - start };
  }
}

/**
 * Build mesh status by probing external endpoints.
 * Uses Promise.allSettled so one failure doesn't kill the others.
 */
async function buildMeshStatus(): Promise<MeshNode[]> {
  // Self is always online
  const nodes: MeshNode[] = [
    { name: 'PHOS API', status: 'online', description: 'Core routing API', latencyMs: 0 },
  ];

  // Probe external endpoints
  const probeResults = await Promise.allSettled(
    EXTERNAL_PROBES.map(async (probe) => {
      const result = await pingEndpoint(probe.url);
      return { name: probe.name, ...result };
    })
  );

  for (let i = 0; i < EXTERNAL_PROBES.length; i++) {
    const staticNode = STATIC_MESH.find((n) => n.name === EXTERNAL_PROBES[i].name);
    const result = probeResults[i];
    if (result.status === 'fulfilled') {
      nodes.push({
        name: result.value.name,
        status: result.value.status,
        description: staticNode?.description || 'External service',
        latencyMs: result.value.latencyMs,
      });
    } else {
      nodes.push({
        name: EXTERNAL_PROBES[i].name,
        status: 'offline',
        description: staticNode?.description || 'External service',
      });
    }
  }

  // Services that are internal to the worker ecosystem
  // (these don't have external URLs to ping, mark as online)
  for (const staticNode of STATIC_MESH) {
    if (!EXTERNAL_PROBES.find((p) => p.name === staticNode.name)) {
      nodes.push({
        name: staticNode.name,
        status: 'online',
        description: staticNode.description,
        latencyMs: 0,
      });
    }
  }

  return nodes;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const surface = url.searchParams.get('surface') || 'GREETING';
    const grayRock =
      url.searchParams.has('urgent') ||
      url.searchParams.has('grayrock') ||
      url.searchParams.has('crisis');

    // CORS headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // ── WebSocket upgrade — real-time state sync ──
    if (path === '/api/phos/stream') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426, headers });
      }
      const doId = env.WS_HUB.idFromName('global');
      const doStub = env.WS_HUB.get(doId);
      return doStub.fetch(request);
    }

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // ── POST /api/phos/alert — Guardian crisis webhook ──
    if (request.method === 'POST' && path === '/api/phos/alert') {
      let payload: AlertPayload;
      try {
        payload = (await request.json()) as AlertPayload;
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON payload' }),
          { status: 400, headers }
        );
      }

      // Non-blocking Discord webhook (fire and forget)
      if (env.DISCORD_WEBHOOK_URL) {
        const discordBody = JSON.stringify({
          username: 'PHOS Guardian',
          embeds: [
            {
              title: '🚨 Guardian Protocol Activated',
              description: `**Surface:** ${payload.surface}\n**Spoons:** ${payload.spoons}/5\n**Message:** ${payload.message}`,
              color: 0xff3355,
              timestamp: new Date().toISOString(),
            },
          ],
        });

        // Fire-and-forget: don't await, just catch errors
        fetch(env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: discordBody,
        }).catch(() => {
          // Silently fail — never block the client response
        });
      }

      return new Response(
        JSON.stringify({ status: 'alert_sent', timestamp: new Date().toISOString() }),
        { status: 200, headers }
      );
    }

    // ── POST /api/phos/telemetry — ESP32 hardware ingestion ──
    if (request.method === 'POST' && path === '/api/phos/telemetry') {
      const auth = request.headers.get('Authorization');
      if (env.HARDWARE_SECRET && (!auth || auth !== `Bearer ${env.HARDWARE_SECRET}`)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
      }

      let payload: TelemetryPayload;
      try {
        payload = (await request.json()) as TelemetryPayload;
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400, headers });
      }

      if (typeof payload.env_temp !== 'number' || typeof payload.mesh_nodes_active !== 'number') {
        return new Response(JSON.stringify({ error: 'Invalid telemetry contract' }), { status: 400, headers });
      }

      // Forward to Durable Object for WebSocket broadcast
      const doId = env.WS_HUB.idFromName('global');
      const doStub = env.WS_HUB.get(doId);
      await doStub.fetch('http://do/broadcast', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      return new Response(
        JSON.stringify({ status: 'telemetry_received', timestamp: new Date().toISOString() }),
        { status: 200, headers }
      );
    }

    // ── GET /api/phos/discord-status — Bot health for PHOS HUD ──
    if (path === '/api/phos/discord-status') {
      const botUrl = 'https://discord.com/api/v10/guilds/1449826533089742962';
      let botStatus: 'online' | 'degraded' | 'offline' = 'offline';
      let botLatency = 0;
      try {
        const start = Date.now();
        const r = await fetch(botUrl, {
          headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN || ''}` },
          cf: { cacheTtl: 0 },
        } as RequestInit);
        botLatency = Date.now() - start;
        if (r.ok) botStatus = 'online';
        else if (r.status < 500) botStatus = 'degraded';
      } catch { botStatus = 'offline'; }

      const whUrl = env.DISCORD_WEBHOOK_URL || '';
      return new Response(JSON.stringify({
        bot: botStatus,
        botLatencyMs: botLatency,
        webhookConfigured: whUrl.length > 0,
        timestamp: new Date().toISOString(),
      }, null, 2), { status: 200, headers });
    }

    // ── GET / — Status + Mesh ──
    const meshStatus = await buildMeshStatus();

    const body: PHOSResponse = {
      status: 'PHOS Online',
      version: '0.1.0',
      surface: grayRock ? 'GRAY_ROCK' : surface,
      timestamp: new Date().toISOString(),
      meshStatus,
    };

    return new Response(JSON.stringify(body, null, 2), { status: 200, headers });
  },
};
