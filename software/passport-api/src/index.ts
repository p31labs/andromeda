import bs58 from 'bs58';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

export interface Env {
  PASSPORT_DB: D1Database;
  PASSPORT_SESSION_KV: KVNamespace;
  ENVIRONMENT?: string;
  PASSPORT_VERSION?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: CORS_HEADERS,
  });
}

function challengeResponse(did: string): string {
  return `p31-passport-verify:${did}:${Date.now()}:${crypto.randomUUID()}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health' || path === '/') {
      return json({
        ok: true,
        service: 'passport-api',
        version: env.PASSPORT_VERSION || '0.1.0',
        ts: new Date().toISOString(),
      });
    }

    if (path === '/identity/register' && request.method === 'POST') {
      return handleRegister(request, env);
    }

    if (path === '/identity/verify' && request.method === 'POST') {
      return handleVerify(request, env);
    }

    if (path === '/identity/session' && request.method === 'POST') {
      return handleCreateSession(request, env);
    }

    if (path === '/identity/session/refresh' && request.method === 'POST') {
      return handleRefreshSession(request, env);
    }

    const resolveMatch = path.match(/^\/identity\/resolve\/(.+)$/);
    if (resolveMatch && request.method === 'GET') {
      return handleResolve(resolveMatch[1], env);
    }

    const challengeMatch = path.match(/^\/identity\/challenge\/(.+)$/);
    if (challengeMatch && request.method === 'GET') {
      return json({ did: challengeMatch[1], challenge: challengeResponse(challengeMatch[1]) });
    }

    return json({ error: 'Not found', path }, 404);
  },
};

async function handleRegister(request: Request, env: Env): Promise<Response> {
  let body: { did?: string; publicKey?: string; signature?: string; challenge?: string };
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Request body must be valid JSON' }, 400);
  }

  const { did, publicKey, challenge, signature } = body;

  if (!did) {
    return json({ success: false, error: 'Missing "did" — expected format: did:key:z...' }, 400);
  }
  if (!publicKey) {
    return json({ success: false, error: 'Missing "publicKey" — base58-encoded Ed25519 public key bytes' }, 400);
  }
  if (!challenge) {
    return json({ success: false, error: 'Missing "challenge" — must sign a challenge to prove key ownership' }, 400);
  }
  if (!signature) {
    return json({ success: false, error: 'Missing "signature" — hex-encoded Ed25519 signature of the challenge' }, 400);
  }

  if (!did.startsWith('did:key:z')) {
    return json({ success: false, error: `DID must start with did:key:z. Got: ${did.slice(0, 24)}...` }, 400);
  }

  const existing = await env.PASSPORT_DB.prepare(
    'SELECT did FROM identities WHERE did = ?',
  ).bind(did).first();

  if (existing) {
    return json({ success: false, error: `DID ${did} is already registered. Use /identity/verify to authenticate.` }, 409);
  }

  let publicKeyBytes: Uint8Array;
  try {
    const decoded = bs58.decode(publicKey);
    if (decoded.length !== 32) {
      return json({ success: false, error: `Public key must be 32 bytes (Ed25519). Got ${decoded.length} bytes.` }, 400);
    }
    publicKeyBytes = decoded;
  } catch {
    return json({ success: false, error: 'Invalid base58 public key encoding. Use bs58-encoded 32-byte Ed25519 key.' }, 400);
  }

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = hexToBytes(signature);
    if (signatureBytes.length !== 64) {
      return json({ success: false, error: `Signature must be 64 bytes (Ed25519). Got ${signatureBytes.length} bytes.` }, 400);
    }
  } catch {
    return json({ success: false, error: 'Invalid signature hex encoding. Use lowercase hex-encoded 64-byte Ed25519 signature.' }, 400);
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      { name: 'Ed25519' },
      true,
      ['verify'],
    );
    const data = new TextEncoder().encode(challenge);
    const valid = await crypto.subtle.verify(
      'Ed25519',
      key,
      signatureBytes,
      data,
    );

    if (!valid) {
      return json({ success: false, error: 'Signature does not match challenge. Check that you signed the exact challenge string with your Ed25519 private key.' }, 401);
    }
  } catch (e) {
    return json({ success: false, error: `Signature verification failed: ${e instanceof Error ? e.message : 'unknown error'}` }, 400);
  }

  const now = Date.now();
  await env.PASSPORT_DB.prepare(
    'INSERT INTO identities (did, public_key, algorithm, registered_at, last_verified_at) VALUES (?, ?, ?, ?, ?)',
  ).bind(did, publicKey, 'Ed25519', now, now).run();

  return json({
    success: true,
    did,
    registeredAt: now,
    message: 'Identity registered. You can now create sessions via /identity/session.',
  }, 201);
}

async function handleVerify(request: Request, env: Env): Promise<Response> {
  let body: { did?: string; challenge?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return json({ valid: false, error: 'Request body must be valid JSON' }, 400);
  }

  const { did, challenge, signature } = body;

  if (!did) {
    return json({ valid: false, error: 'Missing "did" — expected format: did:key:z...' }, 400);
  }
  if (!challenge) {
    return json({ valid: false, error: 'Missing "challenge" — the challenge string to verify' }, 400);
  }
  if (!signature) {
    return json({ valid: false, error: 'Missing "signature" — hex-encoded Ed25519 signature' }, 400);
  }

  const row = await env.PASSPORT_DB.prepare(
    'SELECT public_key FROM identities WHERE did = ?',
  ).bind(did).first<{ public_key: string }>();

  if (!row) {
    return json({ valid: false, error: `DID ${did.slice(0, 24)}... is not registered. Register first at /identity/register.`, did }, 404);
  }

  let publicKeyBytes: Uint8Array;
  try {
    publicKeyBytes = bs58.decode(row.public_key);
  } catch {
    return json({ valid: false, error: 'Stored public key is corrupted. Re-register your identity.' }, 500);
  }

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = hexToBytes(signature);
  } catch {
    return json({ valid: false, error: 'Invalid signature hex encoding' }, 400);
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      { name: 'Ed25519' },
      true,
      ['verify'],
    );
    const data = new TextEncoder().encode(challenge);
    const valid = await crypto.subtle.verify('Ed25519', key, signatureBytes, data);

    if (valid) {
      await env.PASSPORT_DB.prepare(
        'UPDATE identities SET last_verified_at = ? WHERE did = ?',
      ).bind(Date.now(), did).run();
    }

    return json({
      valid,
      did,
      ...(valid ? {} : { error: 'Signature does not match challenge' }),
    }, valid ? 200 : 401);
  } catch (e) {
    return json({ valid: false, error: `Verification error: ${e instanceof Error ? e.message : 'unknown'}` }, 400);
  }
}

async function handleResolve(did: string, env: Env): Promise<Response> {
  if (!did.startsWith('did:key:z')) {
    return json({ did, publicKey: null, exists: false, error: 'DID must be did:key:z format' }, 400);
  }

  const row = await env.PASSPORT_DB.prepare(
    'SELECT public_key, algorithm, registered_at, last_verified_at FROM identities WHERE did = ?',
  ).bind(did).first<{ public_key: string; algorithm: string; registered_at: number; last_verified_at: number | null }>();

  if (!row) {
    return json({ did, publicKey: null, exists: false, error: `Identity ${did.slice(0, 24)}... not found` }, 404);
  }

  return json({
    did,
    publicKey: row.public_key,
    algorithm: row.algorithm,
    registeredAt: row.registered_at,
    lastVerifiedAt: row.last_verified_at,
    exists: true,
  });
}

async function handleCreateSession(request: Request, env: Env): Promise<Response> {
  let body: { did?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400);
  }

  const { did } = body;
  if (!did) {
    return json({ error: 'Missing "did"' }, 400);
  }

  const row = await env.PASSPORT_DB.prepare(
    'SELECT did FROM identities WHERE did = ?',
  ).bind(did).first();

  if (!row) {
    return json({ error: `Identity ${did.slice(0, 24)}... not registered. Register at /identity/register first.` }, 404);
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const ttl = 3600_000;
  const session = {
    sessionId,
    did,
    expiresAt: now + ttl,
    issuedAt: now,
  };

  await env.PASSPORT_SESSION_KV.put(
    `session:${sessionId}`,
    JSON.stringify(session),
    { expirationTtl: Math.ceil(ttl / 1000) },
  );

  await env.PASSPORT_DB.prepare(
    'INSERT INTO sessions (session_id, did, expires_at, issued_at) VALUES (?, ?, ?, ?)',
  ).bind(sessionId, did, now + ttl, now).run();

  return json({ ...session, message: 'Session expires in 1 hour. Refresh via /identity/session/refresh.' }, 201);
}

async function handleRefreshSession(request: Request, env: Env): Promise<Response> {
  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400);
  }

  const { sessionId } = body;
  if (!sessionId) {
    return json({ error: 'Missing "sessionId"' }, 400);
  }

  const raw = await env.PASSPORT_SESSION_KV.get(`session:${sessionId}`);
  if (!raw) {
    return json({ error: 'Session expired or not found. Create a new session via /identity/session.' }, 404);
  }

  const session = JSON.parse(raw);
  const now = Date.now();
  const ttl = 3600_000;
  session.expiresAt = now + ttl;

  await env.PASSPORT_SESSION_KV.put(
    `session:${sessionId}`,
    JSON.stringify(session),
    { expirationTtl: Math.ceil(ttl / 1000) },
  );

  return json({ ...session, message: 'Session refreshed for another hour.' });
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/gi, '').replace(/\s/g, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}
