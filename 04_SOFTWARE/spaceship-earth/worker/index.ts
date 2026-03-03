// spaceship-earth/worker/index.ts
// Spaceship Earth telemetry Worker — separate from BONDING Genesis Block relay.
//
// KV namespace: SPACESHIP_TELEMETRY (separate from BONDING_TELEMETRY)
// Server-side SHA-256 on all writes (same pattern as Genesis Block).
//
// Routes:
//   POST /session/start     → handleSessionStart
//   POST /session/heartbeat → handleSessionHeartbeat
//   POST /session/end       → handleSessionEnd

export interface Env {
  SPACESHIP_TELEMETRY: KVNamespace;
}

// ── CORS ──

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function corsResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── SHA-256 (server-side, independent of client) ──

async function sha256(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── KV key helpers ──

function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

// ── Types ──

interface SessionRecord {
  sessionId: string;
  startedAt: string;
  userAgent?: string;
  ip?: string;
  heartbeats: HeartbeatRecord[];
  endedAt?: string;
  serverHash: string;
}

interface HeartbeatRecord {
  room: string;
  durationMs: number;
  spoons: number;
  ts: string;
}

// ── Handlers ──

// POST /session/start — create session
async function handleSessionStart(req: Request, env: Env): Promise<Response> {
  let body: { timestamp?: string; userAgent?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400);
  }

  const sessionId = crypto.randomUUID();
  const startedAt = body.timestamp ?? new Date().toISOString();
  const canonical = JSON.stringify({ sessionId, startedAt });
  const serverHash = await sha256(canonical);

  const session: SessionRecord = {
    sessionId,
    startedAt,
    userAgent: req.headers.get('user-agent') ?? undefined,
    ip: req.headers.get('cf-connecting-ip') ?? undefined,
    heartbeats: [],
    serverHash,
  };

  await env.SPACESHIP_TELEMETRY.put(sessionKey(sessionId), JSON.stringify(session), {
    expirationTtl: 30 * 86400, // 30 days
  });

  return corsResponse(JSON.stringify({ ok: true, sessionId, serverHash }));
}

// POST /session/heartbeat — record room visit duration
async function handleSessionHeartbeat(req: Request, env: Env): Promise<Response> {
  let body: { sessionId?: string; room?: string; durationMs?: number; spoons?: number };
  try {
    body = await req.json() as typeof body;
  } catch {
    return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400);
  }

  const { sessionId, room, durationMs, spoons } = body;
  if (!sessionId || !room || durationMs === undefined) {
    return corsResponse(JSON.stringify({ error: 'Missing fields' }), 400);
  }

  const raw = await env.SPACESHIP_TELEMETRY.get(sessionKey(sessionId));
  if (!raw) {
    return corsResponse(JSON.stringify({ error: 'Session not found' }), 404);
  }

  const session = JSON.parse(raw) as SessionRecord;
  const heartbeat: HeartbeatRecord = {
    room,
    durationMs,
    spoons: spoons ?? 0,
    ts: new Date().toISOString(),
  };
  session.heartbeats.push(heartbeat);

  const canonical = JSON.stringify({ sessionId, heartbeats: session.heartbeats });
  session.serverHash = await sha256(canonical);

  await env.SPACESHIP_TELEMETRY.put(sessionKey(sessionId), JSON.stringify(session), {
    expirationTtl: 30 * 86400,
  });

  return corsResponse(JSON.stringify({ ok: true, serverHash: session.serverHash }));
}

// POST /session/end — finalize session
async function handleSessionEnd(req: Request, env: Env): Promise<Response> {
  let body: { sessionId?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400);
  }

  const { sessionId } = body;
  if (!sessionId) {
    return corsResponse(JSON.stringify({ error: 'Missing sessionId' }), 400);
  }

  const raw = await env.SPACESHIP_TELEMETRY.get(sessionKey(sessionId));
  if (!raw) {
    return corsResponse(JSON.stringify({ error: 'Session not found' }), 404);
  }

  const session = JSON.parse(raw) as SessionRecord;
  session.endedAt = new Date().toISOString();

  const canonical = JSON.stringify({ sessionId, startedAt: session.startedAt, endedAt: session.endedAt, heartbeats: session.heartbeats });
  session.serverHash = await sha256(canonical);

  await env.SPACESHIP_TELEMETRY.put(sessionKey(sessionId), JSON.stringify(session), {
    expirationTtl: 365 * 86400, // 1 year for completed sessions
  });

  return corsResponse(JSON.stringify({ ok: true, serverHash: session.serverHash }));
}

// ── Router ──

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname;

    if (method === 'OPTIONS') {
      return optionsResponse();
    }

    if (method === 'POST' && path === '/session/start') {
      return handleSessionStart(request, env);
    }

    if (method === 'POST' && path === '/session/heartbeat') {
      return handleSessionHeartbeat(request, env);
    }

    if (method === 'POST' && path === '/session/end') {
      return handleSessionEnd(request, env);
    }

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404);
  },
};
