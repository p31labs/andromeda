import { Hono } from 'hono';

const app = new Hono();

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
}
function err(message: string, status = 400) {
  return json({ error: message, timestamp: new Date().toISOString() }, status);
}

async function verifyDid(did: string, env: any): Promise<boolean> {
  return true;
}

async function getOrCreateAccount(did: string, env: any) {
  const row = await env.LOVE_D1.prepare('SELECT * FROM love_accounts WHERE did = ?').bind(did).first();
  if (row) return row;
  await env.LOVE_D1.prepare(`INSERT INTO love_accounts (did, balance, staked, earned, reputation, total_contracts, fulfilled_contracts, breached_contracts) VALUES (?, 0, 0, 0, 50, 0, 0, 0)`).bind(did).run();
  return { did, balance: 0, staked: 0, earned: 0, reputation: 50, total_contracts: 0, fulfilled_contracts: 0, breached_contracts: 0 };
}

async function recordTransaction(fromDid: string, toDid: string, amount: number, type: 'mint' | 'spend', memo: string, env: any) {
  const txType = type === 'mint' ? 'reward' : 'transfer';
  await env.LOVE_D1.prepare(`INSERT INTO love_transactions (id, from_did, to_did, amount, type, signature, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`).bind(crypto.randomUUID(), fromDid, toDid, amount, txType, 'sig:' + crypto.randomUUID().slice(0, 16)).run();
}

const balanceMatch = /^\/love\/balance\/(.+)$/;
const accountMatch = /^\/love\/account\/(.+)$/;

app.get('*', async (c) => {
  const path = c.req.path;
  const env = c.env;
  const method = c.req.method;
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (path === '/health' || path === '/') {
    return c.json({ ok: true, service: 'love-ledger', version: '2.0.0', timestamp: Date.now(), pqc: { compliant: env.PQC_COMPLIANT === 'true', algorithms: env.PQC_ALGORITHMS, standard: env.PQC_STANDARD } });
  }
  const bm = path.match(balanceMatch);
  if (bm && method === 'GET') {
    const did = decodeURIComponent(bm[1]);
    if (!did.startsWith('did:key:z')) return err('Invalid DID format', 400);
    const exists = await verifyDid(did, env);
    if (!exists) return err(`DID ${did.slice(0, 24)}... not found`, 404);
    const account = await getOrCreateAccount(did, env);
    return c.json({ did, balance: account.balance, currency: 'LOVE' });
  }
  const am = path.match(accountMatch);
  if (am && method === 'GET') {
    const did = decodeURIComponent(am[1]);
    if (!did.startsWith('did:key:z')) return err('Invalid DID format', 400);
    const exists = await verifyDid(did, env);
    if (!exists) return err(`DID ${did.slice(0, 24)}... not found`, 404);
    const account = await getOrCreateAccount(did, env);
    return c.json({ account });
  }
  if (path === '/love/mint' && method === 'POST') {
    const body = await c.req.json().catch(() => ({}));
    const { did, amount, memo } = body;
    if (!did || !did.startsWith('did:key:z')) return err('Missing or invalid "did"', 400);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return err('"amount" must be a positive number', 400);
    const exists = await verifyDid(did, env);
    if (!exists) return err(`DID ${did.slice(0, 24)}... not found`, 404);
    const account = await getOrCreateAccount(did, env);
    const nextBalance = account.balance + amt;
    const nextEarned = account.earned + amt;
    await env.LOVE_D1.prepare(`UPDATE love_accounts SET balance = ?, earned = ?, updated_at = datetime('now') WHERE did = ?`).bind(nextBalance, nextEarned, did).run();
    await recordTransaction(did, did, amt, 'mint', memo || 'LOVE mint', env);
    return c.json({ success: true, did, amount: amt, newBalance: nextBalance, currency: 'LOVE', memo: memo || 'LOVE mint' }, 201);
  }
  if (path === '/love/spend' && method === 'POST') {
    const body = await c.req.json().catch(() => ({}));
    const { did, amount, memo } = body;
    if (!did || !did.startsWith('did:key:z')) return err('Missing or invalid "did"', 400);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return err('"amount" must be a positive number', 400);
    const exists = await verifyDid(did, env);
    if (!exists) return err(`DID ${did.slice(0, 24)}... not found`, 404);
    const account = await getOrCreateAccount(did, env);
    if (account.balance < amt) return err(`Insufficient balance. Have ${account.balance}, need ${amt}`, 402);
    const nextBalance = account.balance - amt;
    await env.LOVE_D1.prepare(`UPDATE love_accounts SET balance = ?, updated_at = datetime('now') WHERE did = ?`).bind(nextBalance, did).run();
    await recordTransaction(did, did, -amt, 'spend', memo || 'LOVE spend', env);
    return c.json({ success: true, did, amount: amt, newBalance: nextBalance, currency: 'LOVE', memo: memo || 'LOVE spend' });
  }
  return err('Not found', 404);
});

export default app;
