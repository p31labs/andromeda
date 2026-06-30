export interface Env {
  CAPITAL_DB: D1Database;
  ORACLE_KV: KVNamespace;
  ENVIRONMENT?: string;
  ORACLE_VERSION?: string;
}

export interface CareStateRow {
  public_key_hex: string;
  composite_score: number;
  confidence: number;
  biometric_score: number;
  bond_score: number;
  ledger_score: number;
  last_update: number;
}

export interface OracleSnapshot {
  snapshotId: string;
  takenAt: number;
  totalIdentities: number;
  totalComposite: number;
  averageComposite: number;
  averageConfidence: number;
  entries: Array<{
    publicKeyHex: string;
    composite: number;
    confidence: number;
    lastUpdate: number;
  }>;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

      const url = new URL(request.url);
      const path = url.pathname;

      if (path === '/health' || path === '/') {
        return json({ ok: true, service: 'oracle-proof-of-care', version: env.ORACLE_VERSION || '0.1.0', ts: new Date().toISOString() });
      }

      if (path === '/oracle/latest') {
        const latest = await env.ORACLE_KV.get('oracle:latest');
        if (!latest) return json({ error: 'No snapshot yet. Cron will generate one within 6 hours.' }, 404);
        return json(JSON.parse(latest));
      }

      if (path === '/oracle/snapshot' && request.method === 'POST') {
        const auth = request.headers.get('Authorization');
        if (auth !== 'Bearer oracle-internal') {
          return json({ error: 'Unauthorized' }, 401);
        }
        const snapshot = await takeSnapshot(env);
        return json(snapshot);
      }

      return json({ error: 'Not found' }, 404);
    } catch (err: any) {
      return json({ error: err.message, stack: err.stack }, 500);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(takeSnapshot(env));
  },
};

async function takeSnapshot(env: Env): Promise<OracleSnapshot> {
  const rows = await env.CAPITAL_DB.prepare(
    'SELECT public_key_hex, composite_score, confidence, biometric_score, bond_score, ledger_score, last_update FROM care_state ORDER BY composite_score DESC'
  ).all<CareStateRow>();

  const entries = (rows.results || []).map(r => ({
    publicKeyHex: r.public_key_hex,
    composite: r.composite_score,
    confidence: r.confidence,
    lastUpdate: r.last_update,
  }));

  const totalComposite = entries.reduce((s, e) => s + e.composite, 0);
  const totalConfidence = entries.reduce((s, e) => s + e.confidence, 0);
  const count = entries.length;

  const snapshot: OracleSnapshot = {
    snapshotId: crypto.randomUUID(),
    takenAt: Date.now(),
    totalIdentities: count,
    totalComposite,
    averageComposite: count > 0 ? totalComposite / count : 0,
    averageConfidence: count > 0 ? totalConfidence / count : 0,
    entries,
  };

  const historicKey = `oracle:history:${snapshot.snapshotId}`;
  await Promise.all([
    env.ORACLE_KV.put('oracle:latest', JSON.stringify(snapshot)),
    env.ORACLE_KV.put(historicKey, JSON.stringify(snapshot), { expirationTtl: 86400 * 90 }),
  ]);

  return snapshot;
}
