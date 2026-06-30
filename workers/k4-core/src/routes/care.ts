import { Hono } from 'hono';

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 10;

const app = new Hono();

app.post('/sync', async (c) => {
  const env = c.env;
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token' };
  if (c.req.header('X-Turnstile-Token')?.length) {
    // token present, continue
  } else {
    return c.json({ error: 'Turnstile token required' }, 403, corsHeaders);
  }
  const body = await c.req.json();
  const publicKeyHex = body.publicKeyHex;
  if (!publicKeyHex || publicKeyHex.length < 32) {
    return c.json({ error: 'Invalid publicKeyHex' }, 400, corsHeaders);
  }
  const now = Math.floor(Date.now() / 1000);
  if (body.timestamp && (body.timestamp < now - 300 || body.timestamp > now + 60)) {
    return c.json({ error: 'Timestamp out of range' }, 400, corsHeaders);
  }
  const rateKey = `rate:${publicKeyHex}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;
  const recentHits = await env.CAPITAL_KV.get(rateKey);
  if (recentHits && parseInt(recentHits, 10) >= RATE_LIMIT_MAX) {
    return c.json({ error: 'Rate limit exceeded' }, 429, { ...corsHeaders, 'Retry-After': String(RATE_LIMIT_WINDOW) });
  }
  if (!body.payload.biometricScore && !body.payload.bondScore && !body.payload.ledgerBump) {
    return c.json({ error: 'No update payload provided' }, 400, corsHeaders);
  }
  await ensureIdentity(env, publicKeyHex);
  let currentState = await getCareState(env, publicKeyHex);
  if (!currentState) currentState = { biometricScore: 0.1, bondScore: 0.1, ledgerScore: 0.1, confidence: 0, lastTimestamp: now };
  const update: any = {};
  if (body.payload.biometricScore !== undefined) update.biometricDelta = body.payload.biometricScore;
  if (body.payload.bondScore !== undefined) update.bondDelta = body.payload.bondScore;
  if (body.payload.ledgerBump !== undefined) update.ledgerBump = body.payload.ledgerBump;
  const { ReputationEngine, createInitialMetrics } = await import('./lib/reputationEngine');
  const engine = new ReputationEngine();
  const result = engine.computeCompositeScore(currentState, update, now);
  const countKey = `count:${publicKeyHex}`;
  let interactionCount = parseInt(await env.CAPITAL_KV.get(countKey) || '0', 10);
  interactionCount++;
  const updatedMetrics = { ...result.updatedMetrics, confidence: engine.computeConfidence(interactionCount) };
  const composite = result.composite;
  const telemetryId = body.payload.id || crypto.randomUUID();
  const nonce = body.payload.nonce || crypto.randomUUID();
  const insertTelemetry = env.CAPITAL_DB.prepare(`INSERT INTO care_telemetry (id, public_key_hex, biometric_score, bond_score, ledger_score, composite_score, timestamp, signature_hex, nonce) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(telemetryId, publicKeyHex, updatedMetrics.biometricScore, updatedMetrics.bondScore, updatedMetrics.ledgerScore, composite, now, body.signature || '', nonce);
  const upsertState = env.CAPITAL_DB.prepare(`INSERT OR REPLACE INTO care_state (public_key_hex, biometric_score, bond_score, ledger_score, composite_score, confidence, last_update) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(publicKeyHex, updatedMetrics.biometricScore, updatedMetrics.bondScore, updatedMetrics.ledgerScore, composite, updatedMetrics.confidence, now);
  const batchResults = await env.CAPITAL_DB.batch([upsertState, insertTelemetry]);
  if (batchResults.some((r: any) => !r.success)) throw new Error('D1 batch transaction failed');
  (c.executionCtx as any).waitUntil(Promise.all([
    env.CAPITAL_KV.put(rateKey, String(parseInt(recentHits || '0', 10) + 1), { expirationTtl: RATE_LIMIT_WINDOW }),
    env.CAPITAL_KV.put(countKey, String(interactionCount), { expirationTtl: 86400 * 30 }),
    (env.EVENTS_QUEUE as any).send({ type: 'care_score_alert', payload: { publicKeyHex, composite, timestamp: now }, timestamp: now, priority: 'normal' }),
  ]));
  return c.json({ success: true, composite, metrics: updatedMetrics, message: 'Care score synced' }, 200, corsHeaders);
});

app.post('/sync-spoon', async (c) => {
  const env = c.env;
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token' };
  const body = await c.req.json().catch(() => ({}));
  const { kind, publicKeyHex, timestamp } = body;
  if (!kind) return c.json({ error: 'Missing "kind" — e.g. "journal", "ping", "build"' }, 400, corsHeaders);
  if (!publicKeyHex) return c.json({ error: 'Missing "publicKeyHex"' }, 400, corsHeaders);
  const now = timestamp || Math.floor(Date.now() / 1000);
  const careUpdate = mapSpoonKind(kind);
  await ensureIdentity(env, publicKeyHex);
  let currentState = await getCareState(env, publicKeyHex);
  if (!currentState) {
    const { createInitialMetrics } = await import('./lib/reputationEngine');
    currentState = createInitialMetrics(0.1, 0);
    currentState.lastTimestamp = now;
  }
  const { ReputationEngine } = await import('./lib/reputationEngine');
  const engine = new ReputationEngine();
  const result = engine.computeCompositeScore(currentState, careUpdate, now);
  const countKey = `count:${publicKeyHex}`;
  let interactionCount = parseInt(await env.CAPITAL_KV.get(countKey) || '0', 10);
  interactionCount++;
  const updatedMetrics = { ...result.updatedMetrics, confidence: engine.computeConfidence(interactionCount) };
  const composite = result.composite;
  const telemetryId = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const insertTelemetry = env.CAPITAL_DB.prepare(`INSERT INTO care_telemetry (id, public_key_hex, biometric_score, bond_score, ledger_score, composite_score, timestamp, signature_hex, nonce) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(telemetryId, publicKeyHex, updatedMetrics.biometricScore, updatedMetrics.bondScore, updatedMetrics.ledgerScore, composite, now, '', nonce);
  const upsertState = env.CAPITAL_DB.prepare(`INSERT OR REPLACE INTO care_state (public_key_hex, biometric_score, bond_score, ledger_score, composite_score, confidence, last_update) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(publicKeyHex, updatedMetrics.biometricScore, updatedMetrics.bondScore, updatedMetrics.ledgerScore, composite, updatedMetrics.confidence, now);
  const batchResults = await env.CAPITAL_DB.batch([upsertState, insertTelemetry]);
  if (batchResults.some((r: any) => !r.success)) throw new Error('D1 batch transaction failed');
  (c.executionCtx as any).waitUntil(env.CAPITAL_KV.put(countKey, String(interactionCount), { expirationTtl: 86400 * 30 }).catch(() => {}));
  return c.json({ success: true, composite, metrics: updatedMetrics, kind, message: 'Spoon event synced to care score' }, 200, corsHeaders);
});

app.get('/state', async (c) => {
  const env = c.env;
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token' };
  const publicKeyHex = c.req.query('publicKey');
  if (!publicKeyHex) return c.json({ error: 'publicKey parameter required' }, 400, corsHeaders);
  const state = await getCareState(env, publicKeyHex);
  if (!state) return c.json({ error: 'Identity not found' }, 404, corsHeaders);
  const now = Math.floor(Date.now() / 1000);
  const { ReputationEngine } = await import('./lib/reputationEngine');
  const engine = new ReputationEngine();
  const decayed = engine.getDecayedScores(state, now);
  const composite = engine.computeCompositeScore(decayed, {}, now).composite;
  return c.json({ publicKeyHex, current: state, decayed, composite, timestamp: now }, 200, corsHeaders);
});

export default app;

async function ensureIdentity(env: any, publicKeyHex: string) {
  const existing = await env.CAPITAL_DB.prepare('SELECT public_key_hex FROM identities WHERE public_key_hex = ?').bind(publicKeyHex).first<{ public_key_hex: string }>();
  if (!existing) {
    await env.CAPITAL_DB.prepare('INSERT INTO identities (public_key_hex, created_at) VALUES (?, ?)').bind(publicKeyHex, Math.floor(Date.now() / 1000)).run();
  }
}

async function getCareState(env: any, publicKeyHex: string) {
  const result = await env.CAPITAL_DB.prepare(`SELECT biometric_score, bond_score, ledger_score, composite_score, confidence, last_update FROM care_state WHERE public_key_hex = ?`).bind(publicKeyHex).first<{ biometric_score: number; bond_score: number; ledger_score: number; composite_score: number; confidence: number; last_update: number }>();
  if (!result) return null;
  return { biometricScore: result.biometric_score, bondScore: result.bond_score, ledgerScore: result.ledger_score, confidence: result.confidence, lastTimestamp: result.last_update };
}

const SPOON_KIND_MAP: Record<string, { biometricDelta?: number; bondDelta?: number; ledgerBump?: number }> = {
  journal: { biometricDelta: 0.3 },
  write: { biometricDelta: 0.3 },
  reflect: { biometricDelta: 0.3 },
  ping: { bondDelta: 0.3 },
  bond: { bondDelta: 0.3 },
  family: { bondDelta: 0.3 },
  heart: { bondDelta: 0.3 },
  build: { ledgerBump: 0.2 },
  create: { ledgerBump: 0.2 },
  code: { ledgerBump: 0.2 },
  earn: { ledgerBump: 0.2 },
  rest: { biometricDelta: 0.1 },
  spoon: { biometricDelta: 0.1 },
  social: { bondDelta: 0.2 },
  share: { bondDelta: 0.2 },
};

function mapSpoonKind(kind: string) {
  const lower = kind.toLowerCase();
  for (const [key, value] of Object.entries(SPOON_KIND_MAP)) {
    if (lower.includes(key)) return value;
  }
  return { biometricDelta: 0.1 };
}
