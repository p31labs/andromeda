/**
 * Dock protocol — request/response shapes + session lifecycle helpers.
 *
 * Personal tetrahedron POSTs to /v1/dock; the hub returns a sessionId valid
 * for SESSION_TTL_SECONDS (default 86400 = 24h). Subsequent calls present the
 * sessionId via `Authorization: Bearer ...` or a same-origin cookie.
 */

import { ANCHOR_FOR, BIPARTITE_COVER, EDGES, PERSONAL_DOCK_FOR, SCHEMA, SKILLS, VERB_FOR, VERTEX_IDS } from "./topology.js";
import { canonicalCallString, canonicalDockString, importPublicKey, sha256Hex, verifyEd25519 } from "./crypto.js";

const SESSION_KV_PREFIX = "k4ah:session:";
const DOCK_KV_PREFIX = "k4ah:dock:";
const NONCE_KV_PREFIX = "k4ah:nonce:";
const NONCE_TTL_SECONDS = 90;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Generate a v4 UUID using crypto.randomUUID() — available in Cloudflare Workers. */
export function newUuid() {
  return crypto.randomUUID();
}

/** Validate a dock request body. Returns the parsed body or throws Response(400). */
export function parseDockRequest(body) {
  if (!body || typeof body !== "object") throw badRequest("dock body must be a JSON object");
  if (typeof body.clientId !== "string" || body.clientId.length < 8) {
    throw badRequest("clientId required (≥8 chars)");
  }
  if (body.personalTetra && body.personalTetra.schema && body.personalTetra.schema !== "p31.personalTetra/1.0.0") {
    throw badRequest("personalTetra.schema must be p31.personalTetra/1.0.0");
  }
  const requested = Array.isArray(body.capabilities) ? body.capabilities.filter((s) => typeof s === "string") : [];
  const ts = typeof body.ts === "number" ? body.ts : null;
  const nonce = typeof body.nonce === "string" && body.nonce.length >= 8 ? body.nonce : null;
  const sig = typeof body.sig === "string" ? body.sig : null;
  return {
    clientId: body.clientId,
    personalTetra: body.personalTetra ?? null,
    capabilities: requested,
    publicKey: typeof body.publicKey === "string" ? body.publicKey : null,
    ts,
    nonce,
    sig,
  };
}

/**
 * Verify a signed dock envelope. Returns:
 *   { ok: true, signed: true } when valid signature
 *   { ok: true, signed: false } when no signature provided and REQUIRE_SIGNED_DOCK !== "1"
 *   { ok: false, error } when signature missing/invalid (and required) or replay detected
 */
export async function verifyDockEnvelope(env, parsed) {
  const required = String(env.REQUIRE_SIGNED_DOCK ?? "0") === "1";
  if (!parsed.publicKey || !parsed.sig || parsed.ts === null || !parsed.nonce) {
    if (required) return { ok: false, error: "REQUIRE_SIGNED_DOCK=1 — clientId+publicKey+ts+nonce+sig required" };
    return { ok: true, signed: false };
  }
  const skew = Math.abs(Date.now() - parsed.ts);
  if (skew > MAX_CLOCK_SKEW_MS) {
    return { ok: false, error: `dock ts skew ${skew}ms exceeds ${MAX_CLOCK_SKEW_MS}ms` };
  }
  const replayKey = `${NONCE_KV_PREFIX}dock:${parsed.clientId}:${parsed.nonce}`;
  const seen = await env.K4_AGENT_HUB.get(replayKey);
  if (seen) return { ok: false, error: "dock nonce already used (replay protection)" };

  let pub;
  try {
    pub = await importPublicKey(parsed.publicKey);
  } catch (e) {
    return { ok: false, error: `invalid public key: ${e.message}` };
  }
  const message = canonicalDockString({
    clientId: parsed.clientId,
    schema: parsed.personalTetra?.schema ?? "",
    capabilities: parsed.capabilities,
    ts: parsed.ts,
    nonce: parsed.nonce,
  });
  const valid = await verifyEd25519({ publicKey: pub, message, signatureB64u: parsed.sig });
  if (!valid) return { ok: false, error: "dock signature did not verify" };
  await env.K4_AGENT_HUB.put(replayKey, "1", { expirationTtl: NONCE_TTL_SECONDS * 4 });
  return { ok: true, signed: true };
}

/**
 * Verify a per-call signed envelope when the session was signed-dock.
 * `body` must include `ts`, `nonce`, `sig`. The session record carries `publicKey`.
 */
export async function verifyCallEnvelope(env, session, body) {
  if (!session.publicKey) return { ok: true, signed: false };
  if (!body || typeof body !== "object") return { ok: false, error: "call body must be JSON" };
  if (typeof body.ts !== "number" || typeof body.nonce !== "string" || typeof body.sig !== "string") {
    return { ok: false, error: "signed-dock session requires ts+nonce+sig in call body" };
  }
  const skew = Math.abs(Date.now() - body.ts);
  if (skew > MAX_CLOCK_SKEW_MS) return { ok: false, error: `call ts skew ${skew}ms exceeds ${MAX_CLOCK_SKEW_MS}ms` };
  const dedupKey = `${NONCE_KV_PREFIX}call:${session.clientId}:${body.nonce}`;
  const seen = await env.K4_AGENT_HUB.get(dedupKey);
  if (seen) return { ok: false, error: "call nonce already used (replay protection)" };

  let pub;
  try {
    pub = await importPublicKey(session.publicKey);
  } catch (e) {
    return { ok: false, error: `invalid session public key: ${e.message}` };
  }
  const message = canonicalCallString({
    skillId: body.skillId,
    input: body.input ?? null,
    ts: body.ts,
    nonce: body.nonce,
  });
  const valid = await verifyEd25519({ publicKey: pub, message, signatureB64u: body.sig });
  if (!valid) return { ok: false, error: "call signature did not verify" };
  await env.K4_AGENT_HUB.put(dedupKey, "1", { expirationTtl: NONCE_TTL_SECONDS });
  return { ok: true, signed: true };
}

export function badRequest(msg) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}

export function unauthorized(msg = "missing or invalid sessionId") {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 401,
    headers: { "content-type": "application/json", "www-authenticate": "Bearer realm=\"k4-agent-hub\"" },
  });
}

export function notFound(msg = "not found") {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

export function forbidden(msg) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

export function methodNotAllowed(allowed) {
  return new Response(JSON.stringify({ ok: false, error: `method not allowed; expected ${allowed}` }), {
    status: 405,
    headers: { "content-type": "application/json", allow: allowed },
  });
}

export function ok(body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** Compute the allowed skills given the requested capabilities. */
export function resolveAllowedSkills(requested) {
  const all = new Set();
  for (const v of VERTEX_IDS) for (const s of SKILLS[v]) all.add(s.id);
  if (!requested || requested.length === 0) return [...all];
  return requested.filter((id) => all.has(id));
}

/** Produce a dock-response payload (the canonical shape consumed by personal tetras). */
export function buildDockResponse({ sessionId, ttlSeconds, baseUrl, allowedSkills, policies, signed }) {
  const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return {
    schema: SCHEMA,
    sessionId,
    signed: !!signed,
    hubs: VERTEX_IDS.map((id) => ({
      id,
      anchor: ANCHOR_FOR[id],
      verb: VERB_FOR[id],
      personalDock: PERSONAL_DOCK_FOR[id],
      baseUrl: `${baseUrl}/v1/${id}`,
      expires,
    })),
    edges: EDGES,
    bipartite: BIPARTITE_COVER,
    allowedSkills,
    policies,
  };
}

/** Persist a dock entry and a session entry into KV with TTL. */
export async function writeSession(env, { sessionId, clientId, personalTetra, allowedSkills, ttlSeconds, publicKey, signed }) {
  const value = JSON.stringify({
    clientId,
    personalTetraSchema: personalTetra?.schema ?? null,
    allowedSkills,
    issuedAt: Date.now(),
    ttlSeconds,
    publicKey: publicKey ?? null,
    signed: !!signed,
  });
  await Promise.all([
    env.K4_AGENT_HUB.put(`${SESSION_KV_PREFIX}${sessionId}`, value, { expirationTtl: ttlSeconds }),
    env.K4_AGENT_HUB.put(`${DOCK_KV_PREFIX}${clientId}`, sessionId, { expirationTtl: ttlSeconds }),
  ]);
}

/** Read + check a session. Returns the parsed session or null. */
export async function readSession(env, sessionId) {
  if (!sessionId) return null;
  const raw = await env.K4_AGENT_HUB.get(`${SESSION_KV_PREFIX}${sessionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Extract the bearer token from a Request (Authorization header or cookie). */
export function extractSessionId(request) {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+([A-Za-z0-9-_]{8,})$/);
  if (m) return m[1];
  const cookie = request.headers.get("cookie") || "";
  const c = cookie.match(/(?:^|;\s*)k4ah_session=([A-Za-z0-9-_]{8,})/);
  if (c) return c[1];
  return null;
}
