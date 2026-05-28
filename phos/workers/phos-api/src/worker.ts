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
  DISCORD_BOT_TOKEN?: string;
  /** Channel ID for crisis alerts (announcements). */
  DISCORD_ALERT_CHANNEL_ID?: string;
  /** Fallback webhook URL for environments where bot token isn't configured. */
  DISCORD_WEBHOOK_URL?: string;
  HARDWARE_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
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
  { name: 'Forge', description: 'Commerce & POS ledger' },
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

interface ForgeTransactionPayload {
  id: string;
  type: string;
  amount_cents: number;
  tax_cents: number;
  total_cents: number;
  items_json: string;
  payment_method: string;
  note: string;
  hash: string;
  previous_hash: string;
  created_at: number;
  site_id: string;
}

function hashForgeTx(tx: ForgeTransactionPayload): string {
  const input = JSON.stringify({
    id: tx.id, type: tx.type, totalCents: tx.total_cents,
    previousHash: tx.previous_hash, createdAt: tx.created_at,
  });
  return String(
    Array.from(input).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 5381) >>> 0
  );
}

function validateForgeTx(tx: ForgeTransactionPayload, expectedPreviousHash: string): string | null {
  if (!tx.id || !tx.type) return "Missing id or type";
  if (typeof tx.total_cents !== "number") return "total_cents must be number";
  if (typeof tx.amount_cents !== "number") return "amount_cents must be number";
  if (typeof tx.tax_cents !== "number") return "tax_cents must be number";
  if (tx.previous_hash !== expectedPreviousHash) return `Hash chain broken: expected ${expectedPreviousHash}, got ${tx.previous_hash}`;
  return null;
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

      // Non-blocking Discord notification — prefer bot API, fall back to webhook
      const alertChannelId = env.DISCORD_ALERT_CHANNEL_ID || '1486966043128893492';
      const discordBody = JSON.stringify({
        username: 'PHOS Guardian',
        embeds: [{
          title: '\u{1f6a8} Guardian Protocol Activated',
          description: `**Surface:** ${payload.surface}\n**Spoons:** ${payload.spoons}/5\n**Message:** ${payload.message}`,
          color: 0xff3355,
          timestamp: new Date().toISOString(),
        }],
      });

      if (env.DISCORD_BOT_TOKEN) {
        // Bot API path → send to announcements channel
        const chId = alertChannelId;
        fetch(`https://discord.com/api/v10/channels/${chId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: discordBody,
        }).catch(() => {});
      } else if (env.DISCORD_WEBHOOK_URL) {
        // Legacy webhook fallback
        fetch(env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: discordBody,
        }).catch(() => {});
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
      let botStatus: 'online' | 'degraded' | 'offline' = 'offline';
      let botLatency = 0;
      if (env.DISCORD_BOT_TOKEN) {
        try {
          const start = Date.now();
          const r = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
            cf: { cacheTtl: 0 },
          });
          botLatency = Date.now() - start;
          botStatus = r.ok ? 'online' : r.status < 500 ? 'degraded' : 'offline';
        } catch { botStatus = 'offline'; }
      }
      return new Response(JSON.stringify({
        bot: botStatus,
        botLatencyMs: botLatency,
        botTokenConfigured: !!env.DISCORD_BOT_TOKEN,
        webhookConfigured: !!(env.DISCORD_WEBHOOK_URL && env.DISCORD_WEBHOOK_URL.length > 0),
        alertChannelId: env.DISCORD_ALERT_CHANNEL_ID || '1486966043128893492',
        timestamp: new Date().toISOString(),
      }, null, 2), { status: 200, headers });
    }

    // ── GOOGLE DRIVE OAUTH ──
    // Step 1: Generate OAuth consent URL
    if (path === '/api/drive/auth-url') {
      const redirectUri = 'https://phos.p31ca.org/api/drive/callback';
      const scopes = [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/documents.readonly',
      ].join(' ');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${surface}`;
      return new Response(JSON.stringify({ authUrl }, null, 2), { status: 200, headers });
    }

    // Step 2: OAuth callback — exchange code for tokens
    if (path === '/api/drive/callback') {
      const code = url.searchParams.get('code');
      if (!code) return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400, headers });
      const redirectUri = 'https://phos.p31ca.org/api/drive/callback';
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID || '',
          client_secret: env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });
      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => 'unknown');
        return new Response(JSON.stringify({ error: 'Token exchange failed', detail: errText }), { status: 400, headers });
      }
      const tokens = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number };
      return new Response(JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      }, null, 2), { status: 200, headers });
    }

    // ── POST /api/forge/transactions — Batch push from client ──
    if (request.method === "POST" && path === "/api/forge/transactions") {
      let body: { transactions?: ForgeTransactionPayload[] };
      try {
        body = (await request.json()) as { transactions?: ForgeTransactionPayload[] };
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers });
      }

      const txs = body.transactions;
      if (!txs || !Array.isArray(txs) || txs.length === 0) {
        return new Response(JSON.stringify({ error: "Expected transactions array" }), { status: 400, headers });
      }
      if (txs.length > 50) {
        return new Response(JSON.stringify({ error: "Max 50 transactions per batch" }), { status: 400, headers });
      }

      const confirmedIds: string[] = [];
      const rejectedIds: string[] = [];
      let lastHash = "GENESIS";

      // Get the last hash from D1 if available
      try {
        const lastRow = await env.PHOS_EVENT_LOG
          .prepare("SELECT hash FROM forge_edge_transactions ORDER BY created_at DESC LIMIT 1")
          .first<{ hash: string }>();
        if (lastRow?.hash) lastHash = lastRow.hash;
      } catch {
        /* D1 table may not exist yet — use GENESIS */
      }

      for (const tx of txs) {
        const validationError = validateForgeTx(tx, lastHash);
        if (validationError) {
          rejectedIds.push(tx.id);
          continue;
        }
        // Accept transaction
        confirmedIds.push(tx.id);
        lastHash = tx.hash;

        // Persist to D1 if available (fire-and-forget)
        try {
          await env.PHOS_EVENT_LOG
            .prepare(`INSERT OR IGNORE INTO forge_edge_transactions
              (id, site_id, type, amount_cents, tax_cents, total_cents, hash, previous_hash, created_at, received_at)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
            .bind(tx.id, tx.site_id, tx.type, tx.amount_cents, tx.tax_cents, tx.total_cents, tx.hash, tx.previous_hash, tx.created_at, Date.now())
            .run();
        } catch {
          /* D1 optional — accept anyway */
        }
      }

      return new Response(
        JSON.stringify({ confirmed_ids: confirmedIds, rejected_ids: rejectedIds }),
        { status: 200, headers }
      );
    }

    // ── GET /api/forge/reconcile — Pull transactions since timestamp ──
    if (request.method === "GET" && path === "/api/forge/reconcile") {
      const since = parseInt(url.searchParams.get("since") || "0", 10);
      try {
        const { results } = await env.PHOS_EVENT_LOG
          .prepare(`SELECT id, site_id, type, amount_cents, tax_cents, total_cents,
                    items_json, payment_method, note, hash, previous_hash, created_at
                    FROM forge_edge_transactions
                    WHERE created_at > ?
                    ORDER BY created_at ASC LIMIT 100`)
          .bind(since)
          .all();

        const transactions: ForgeTransactionPayload[] = (results || []).map((r) => ({
          id: r.id as string,
          type: r.type as string,
          amount_cents: r.amount_cents as number,
          tax_cents: r.tax_cents as number,
          total_cents: r.total_cents as number,
          items_json: r.items_json as string || "[]",
          payment_method: r.payment_method as string || "cash",
          note: r.note as string || "",
          hash: r.hash as string,
          previous_hash: r.previous_hash as string,
          created_at: r.created_at as number,
          site_id: r.site_id as string,
        }));

        return new Response(
          JSON.stringify({ transactions }),
          { status: 200, headers }
        );
      } catch {
        /* D1 table may not exist — return empty */
        return new Response(
          JSON.stringify({ transactions: [] }),
          { status: 200, headers }
        );
      }
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
