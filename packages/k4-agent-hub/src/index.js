/**
 * K4 agent worker tetrahedron — Worker entry (v1.1.0).
 *
 * Routes:
 *   POST   /v1/dock                                    — personal tetrahedron docks (signed Ed25519 optional)
 *   GET    /v1/topology                                — K₄ adjacency, hub statuses, K₄,₄ + K₄,₄,₄ covers
 *   GET    /v1/cross/{from}/{to}                       — inter-hub edge call (K₄ adjacency-checked)
 *   GET    /v1/{hub}/health                            — per-hub health
 *   POST   /v1/{hub}/call                              — invoke a skill (signed envelope when session was signed-dock)
 *   GET    /v1/{hub}/skills                            — list skills on the named hub
 *   GET    /v1/{hub}/metrics                           — per-hub metrics
 *   POST   /v1/{hub}/edge                              — inter-hub edge brief (called by sibling hubs)
 *   WS     /v1/{hub}/stream                            — hibernatable WebSocket; broadcasts call events to all docked clients (p31.k4HubStream/1.0.0)
 *   GET    /v1/metrics                                 — aggregated metrics across all four hubs
 *   GET    /v1/federation                              — aggregated topology (local + cached peers)
 *   POST   /v1/federation/peer                         — register a peer hub (signed Ed25519 required)
 *   DELETE /v1/federation/peer/{instanceId}            — unregister a peer
 *   POST   /v1/federation/dispatch                     — peer→peer signed skill dispatch (p31.peerDispatch/1.0.0)
 *   POST   /v1/family/dock                             — operator signs family vertex dock (p31.familyDock/1.0.0)
 *   GET    /                                           — JSON manifest snapshot (canon source for agents.html)
 *   GET    /v1/manifest                                — the same JSON, stable URL
 */

import {
  ADJACENCY, ANCHOR_FOR, BIPARTITE_COVER, EDGES, FAMILY_VERTICES, FEDERATION_SCHEMA,
  PERSONAL_DOCK_FOR, SCHEMA, SKILLS, TRIADIC_COVER, VERB_FOR, VERTEX_IDS, validateTopology,
} from "./topology.js";
import {
  buildDockResponse, methodNotAllowed, newUuid, notFound, ok, parseDockRequest, writeSession,
  resolveAllowedSkills, verifyDockEnvelope, badRequest, forbidden,
} from "./dock-protocol.js";
import { canonicalDockString, canonicalFamilyDockString, canonicalPeerDispatchString, FAMILY_DOCK_SCHEMA, importPublicKey, PEER_DISPATCH_SCHEMA, verifyEd25519 } from "./crypto.js";

export { ForgeHub, CounselHub, ScholarHub, ScribeHub } from "./hubs.js";

validateTopology();

const HUB_BINDINGS = {
  forge: "FORGE",
  counsel: "COUNSEL",
  scholar: "SCHOLAR",
  scribe: "SCRIBE",
};

const PEER_KV_PREFIX   = "k4ah:peer:";
const PEER_LIST_KEY    = "k4ah:peers:index";
const ANCHOR_KV_PREFIX = "k4ah:anchor:";
const ANCHOR_LIST_KEY  = "k4ah:anchors:index";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/" || path === "/v1/manifest") return manifestSnapshot();
    if (path === "/v1/dock") {
      return request.method === "POST" ? handleDock(request, env, url) : methodNotAllowed("POST");
    }
    if (path === "/v1/topology") return handleTopology(env, url);
    if (path === "/v1/metrics")  return handleMetrics(env, url);

    if (path === "/v1/federation") {
      return request.method === "GET" ? handleFederationGet(env, url) : methodNotAllowed("GET");
    }
    if (path === "/v1/federation/peer") {
      return request.method === "POST" ? handleFederationRegister(request, env) : methodNotAllowed("POST");
    }
    if (path === "/v1/federation/dispatch") {
      return request.method === "POST" ? handleFederationDispatch(request, env) : methodNotAllowed("POST");
    }
    const peerDel = path.match(/^\/v1\/federation\/peer\/([\w-]+)\/?$/);
    if (peerDel) {
      return request.method === "DELETE" ? handleFederationUnregister(peerDel[1], env) : methodNotAllowed("DELETE");
    }

    if (path === "/v1/family/dock") {
      return request.method === "POST" ? handleFamilyDock(request, env) : methodNotAllowed("POST");
    }

    if (path === "/v1/anchor/register") {
      return request.method === "POST" ? handleAnchorRegister(request, env) : methodNotAllowed("POST");
    }
    if (path === "/v1/anchor/status") {
      return request.method === "GET" ? handleAnchorStatus(env) : methodNotAllowed("GET");
    }
    const anchorGet = path.match(/^\/v1\/anchor\/([\w-]+)\/?$/);
    if (anchorGet) {
      return request.method === "GET" ? handleAnchorGet(anchorGet[1], env) : methodNotAllowed("GET");
    }

    const cross = path.match(/^\/v1\/cross\/([a-z]+)\/([a-z]+)\/?$/);
    if (cross) return handleCrossEdge(cross[1], cross[2], request, env);

    const hubMatch = path.match(/^\/v1\/(forge|counsel|scholar|scribe)\/(.*)$/);
    if (hubMatch) return forwardToHub(hubMatch[1], request, env);

    return notFound(`unknown route ${path}`);
  },
};

function manifestSnapshot() {
  return ok({
    schema: SCHEMA,
    federationSchema: FEDERATION_SCHEMA,
    vertices: VERTEX_IDS.map((id) => ({
      id, anchor: ANCHOR_FOR[id], verb: VERB_FOR[id],
      personalDock: PERSONAL_DOCK_FOR[id],
      skills: SKILLS[id], neighbors: ADJACENCY[id],
    })),
    edges: EDGES,
    bipartite: BIPARTITE_COVER,
    family: FAMILY_VERTICES,
    triadic: TRIADIC_COVER,
    docs: {
      spec: "https://github.com/p31labs/bonding-soup/blob/main/docs/P31-K4-AGENT-HUBS.md",
      manifest: "https://github.com/p31labs/bonding-soup/blob/main/p31-k4-agent-hub.json",
    },
  });
}

async function handleDock(request, env, url) {
  let body;
  try { body = await request.json(); }
  catch { return ok({ ok: false, error: "body must be JSON" }, { "x-cause": "parse" }); }

  let parsed;
  try { parsed = parseDockRequest(body); }
  catch (resp) { return resp; }

  const sigCheck = await verifyDockEnvelope(env, parsed);
  if (!sigCheck.ok) return forbidden(sigCheck.error);

  const sessionId = newUuid();
  const ttlSeconds = Number(env.SESSION_TTL_SECONDS ?? 86400);
  const allowedSkills = resolveAllowedSkills(parsed.capabilities);

  await writeSession(env, {
    sessionId, clientId: parsed.clientId, personalTetra: parsed.personalTetra,
    allowedSkills, ttlSeconds,
    publicKey: sigCheck.signed ? parsed.publicKey : null,
    signed: !!sigCheck.signed,
  });

  const baseUrl = `${url.protocol}//${url.host}`;
  const policies = {
    rpm: Number(env.RATE_LIMIT_RPM ?? 30),
    burst: 8,
    maxBody: 262144,
    childGated: { rpm: 10, burst: 4 },
    requireSignedDock: String(env.REQUIRE_SIGNED_DOCK ?? "0") === "1",
  };

  const dockResponse = buildDockResponse({
    sessionId, ttlSeconds, baseUrl, allowedSkills, policies, signed: sigCheck.signed,
  });
  return ok({ ok: true, ...dockResponse }, {
    "set-cookie": `k4ah_session=${sessionId}; Max-Age=${ttlSeconds}; Path=/; HttpOnly; SameSite=Lax; Secure`,
  });
}

async function handleTopology(env, url) {
  const baseUrl = `${url.protocol}//${url.host}`;
  const healths = await Promise.all(VERTEX_IDS.map(async (id) => {
    try {
      const stub = env[HUB_BINDINGS[id]].get(env[HUB_BINDINGS[id]].idFromName("singleton"));
      const resp = await stub.fetch(new Request(`${baseUrl}/v1/${id}/health`));
      return await resp.json();
    } catch (e) {
      return { ok: false, hub: id, error: String(e?.message ?? e) };
    }
  }));
  const statuses = Object.fromEntries(healths.map((h) => [h.hub, h]));
  return ok({
    schema: SCHEMA,
    ts: Date.now(),
    vertices: VERTEX_IDS.map((id) => ({
      id, anchor: ANCHOR_FOR[id], verb: VERB_FOR[id],
      personalDock: PERSONAL_DOCK_FOR[id],
      neighbors: ADJACENCY[id],
      load: statuses[id]?.load ?? 0,
      ok: statuses[id]?.ok ?? false,
      skills: statuses[id]?.skills ?? SKILLS[id].map((s) => s.id),
    })),
    edges: EDGES,
    bipartite: BIPARTITE_COVER,
    family: FAMILY_VERTICES,
    triadic: TRIADIC_COVER,
  });
}

async function handleMetrics(env, url) {
  const baseUrl = `${url.protocol}//${url.host}`;
  const perHub = await Promise.all(VERTEX_IDS.map(async (id) => {
    try {
      const stub = env[HUB_BINDINGS[id]].get(env[HUB_BINDINGS[id]].idFromName("singleton"));
      const resp = await stub.fetch(new Request(`${baseUrl}/v1/${id}/metrics`));
      return await resp.json();
    } catch (e) {
      return { ok: false, hub: id, error: String(e?.message ?? e) };
    }
  }));
  return ok({
    schema: SCHEMA,
    ts: Date.now(),
    hubs: perHub,
    aggregate: {
      callsTotal: perHub.reduce((s, h) => s + (h?.callsTotal ?? 0), 0),
      errorsTotal: perHub.reduce((s, h) => s + (h?.errorsTotal ?? 0), 0),
      callsRecent60s: perHub.reduce((s, h) => s + (h?.callsRecent60s ?? 0), 0),
    },
  });
}

async function handleCrossEdge(from, to, request, env) {
  if (!VERTEX_IDS.includes(from) || !VERTEX_IDS.includes(to)) {
    return notFound(`cross-edge: unknown vertex ${from} or ${to}`);
  }
  if (from === to) return ok({ ok: false, error: "cross-edge requires two distinct vertices" });
  if (!ADJACENCY[from].includes(to)) {
    return ok({ ok: false, error: `no K₄ edge ${from}→${to}` });
  }
  if (env.ALLOW_CROSS_EDGES === "0") {
    return ok({ ok: false, error: "cross-edge calls disabled by ALLOW_CROSS_EDGES=0" });
  }
  // Dispatch a brief through the receiving hub's edge endpoint via service binding.
  const binding = HUB_BINDINGS[to];
  const stub = env[binding].get(env[binding].idFromName("singleton"));
  const url = new URL(request.url);
  const ask = url.searchParams.get("ask") ?? `cross-edge from ${from}`;
  const edgeReq = new Request(`${url.origin}/v1/${to}/edge`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-p31-edge-from": from },
    body: JSON.stringify({ ask }),
  });
  const resp = await stub.fetch(edgeReq);
  const brief = await resp.json();
  return ok({
    ok: true, from, to,
    edgeLabel: EDGES.find((e) =>
      (e.from === from && e.to === to) || (e.from === to && e.to === from))?.label ?? null,
    brief,
  });
}

async function handleFederationGet(env, url) {
  const indexRaw = await env.K4_AGENT_HUB.get(PEER_LIST_KEY);
  const ids = indexRaw ? JSON.parse(indexRaw) : [];
  const peers = await Promise.all(ids.map(async (id) => {
    const raw = await env.K4_AGENT_HUB.get(`${PEER_KV_PREFIX}${id}`);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }));
  const live = peers.filter((p) => p && p.expiresAt > Date.now());
  return ok({
    schema: FEDERATION_SCHEMA,
    ts: Date.now(),
    self: {
      schema: SCHEMA,
      origin: `${url.protocol}//${url.host}`,
      vertices: VERTEX_IDS.map((id) => ({ id, verb: VERB_FOR[id], anchor: ANCHOR_FOR[id] })),
    },
    peers: live,
    aggregateVertexCount: 4 + live.length * 4,
    aggregateEdgeCount: 6 + live.length * 6,
  });
}

async function handleFederationRegister(request, env) {
  let body;
  try { body = await request.json(); } catch { return badRequest("body must be JSON"); }
  const { instanceId, manifestUrl, publicKey, ts, sig } = body ?? {};
  if (typeof instanceId !== "string" || instanceId.length < 4) return badRequest("instanceId required");
  if (typeof manifestUrl !== "string" || !/^https?:\/\//.test(manifestUrl)) return badRequest("manifestUrl required");
  if (typeof publicKey !== "string") return badRequest("publicKey required");
  if (typeof ts !== "number" || typeof sig !== "string") return badRequest("ts+sig required");

  const skew = Math.abs(Date.now() - ts);
  if (skew > 5 * 60 * 1000) return badRequest(`peer ts skew ${skew}ms exceeds 5min`);

  // Signed envelope: same canonical form as a dock — instanceId acts as clientId, manifestUrl as schema, [] capabilities, ts, nonce=instanceId.
  let pub;
  try { pub = await importPublicKey(publicKey); } catch (e) { return badRequest(`invalid publicKey: ${e.message}`); }
  const message = canonicalDockString({
    clientId: instanceId, schema: manifestUrl, capabilities: [], ts, nonce: instanceId,
  });
  const valid = await verifyEd25519({ publicKey: pub, message, signatureB64u: sig });
  if (!valid) return forbidden("peer signature did not verify");

  const peerTtlSeconds = Number(env.PEER_TTL_SECONDS ?? 86400);
  const expiresAt = Date.now() + peerTtlSeconds * 1000;
  const record = { instanceId, manifestUrl, publicKey, registeredAt: Date.now(), expiresAt };

  await env.K4_AGENT_HUB.put(`${PEER_KV_PREFIX}${instanceId}`, JSON.stringify(record), { expirationTtl: peerTtlSeconds });

  // Maintain a small registry index (capped at maxPeers=16)
  const indexRaw = await env.K4_AGENT_HUB.get(PEER_LIST_KEY);
  let ids = indexRaw ? JSON.parse(indexRaw) : [];
  ids = ids.filter((x) => x !== instanceId);
  ids.unshift(instanceId);
  if (ids.length > 16) ids = ids.slice(0, 16);
  await env.K4_AGENT_HUB.put(PEER_LIST_KEY, JSON.stringify(ids));

  return ok({ ok: true, schema: FEDERATION_SCHEMA, registered: instanceId, expiresAt });
}

async function handleFederationUnregister(instanceId, env) {
  await env.K4_AGENT_HUB.delete(`${PEER_KV_PREFIX}${instanceId}`);
  const indexRaw = await env.K4_AGENT_HUB.get(PEER_LIST_KEY);
  if (indexRaw) {
    const ids = JSON.parse(indexRaw).filter((x) => x !== instanceId);
    await env.K4_AGENT_HUB.put(PEER_LIST_KEY, JSON.stringify(ids));
  }
  return ok({ ok: true, schema: FEDERATION_SCHEMA, unregistered: instanceId });
}

async function handleFederationDispatch(request, env) {
  let body;
  try { body = await request.json(); } catch { return badRequest("body must be JSON"); }
  const { peerId, hubId, skillId, input, ts, sig } = body ?? {};

  if (typeof peerId !== "string" || peerId.length < 4) return badRequest("peerId required");
  if (typeof hubId !== "string" || !HUB_BINDINGS[hubId]) return badRequest("hubId must be forge|counsel|scholar|scribe");
  if (typeof skillId !== "string" || skillId.length < 1) return badRequest("skillId required");
  if (typeof ts !== "number" || typeof sig !== "string") return badRequest("ts+sig required");

  const skew = Math.abs(Date.now() - ts);
  if (skew > 5 * 60 * 1000) return badRequest(`peer ts skew ${skew}ms exceeds 5min`);

  const peerRaw = await env.K4_AGENT_HUB.get(`${PEER_KV_PREFIX}${peerId}`);
  if (!peerRaw) return forbidden("peer not registered");
  let peer;
  try { peer = JSON.parse(peerRaw); } catch { return forbidden("peer record corrupt"); }
  if (peer.expiresAt < Date.now()) return forbidden("peer registration expired");

  let pub;
  try { pub = await importPublicKey(peer.publicKey); } catch (e) { return badRequest(`invalid peer publicKey: ${e.message}`); }
  const canonical = canonicalPeerDispatchString({ peerId, hubId, skillId, ts });
  const valid = await verifyEd25519({ publicKey: pub, message: canonical, signatureB64u: sig });
  if (!valid) return forbidden("peer dispatch signature did not verify");

  const hubSkills = SKILLS[hubId] ?? [];
  const skill = hubSkills.find((s) => s.id === skillId);
  if (!skill) return badRequest(`skill ${skillId} not available on hub ${hubId}`);

  const { dispatch } = await import("./dispatcher.js");
  const result = await dispatch({ env, hubId, skill, input: input ?? {} });
  return ok({ ...result, federation: { peerId, schema: PEER_DISPATCH_SCHEMA } });
}

async function handleFamilyDock(request, env) {
  let body;
  try { body = await request.json(); } catch { return badRequest("body must be JSON"); }
  const { operatorClientId, publicKeyB64u, vertexId, ts, sig, childMeshToken } = body ?? {};

  if (typeof operatorClientId !== "string" || operatorClientId.length < 4) return badRequest("operatorClientId required");
  if (typeof publicKeyB64u !== "string") return badRequest("publicKeyB64u required");
  if (typeof vertexId !== "string") return badRequest("vertexId required");
  if (typeof ts !== "number" || typeof sig !== "string") return badRequest("ts+sig required");

  const skew = Math.abs(Date.now() - ts);
  if (skew > 5 * 60 * 1000) return badRequest(`ts skew ${skew}ms exceeds 5min`);

  const vertex = FAMILY_VERTICES.find((v) => v.id === vertexId);
  if (!vertex) return badRequest(`unknown family vertex ${vertexId}; must be one of ${FAMILY_VERTICES.map((v) => v.id).join("|")}`);

  if (vertex.gate === "child-mesh-unlock") {
    if (!childMeshToken) return forbidden("child-mesh-unlock required — supply childMeshToken");
  }

  let pub;
  try { pub = await importPublicKey(publicKeyB64u); } catch (e) { return badRequest(`invalid publicKeyB64u: ${e.message}`); }
  const canonical = canonicalFamilyDockString({ operatorClientId, vertexId, ts });
  const valid = await verifyEd25519({ publicKey: pub, message: canonical, signatureB64u: sig });
  if (!valid) return forbidden("family dock signature did not verify");

  const guardianAgent = vertex.guardianAgent;
  const sessionId = newUuid();
  const ttlSeconds = 8 * 60 * 60; // 8h family session
  const allowedSkills = (SKILLS[guardianAgent] ?? []).filter((s) => s.gate !== "child-mesh-unlock").map((s) => s.id);
  const expiresAt = Date.now() + ttlSeconds * 1000;

  await writeSession(env, {
    sessionId,
    clientId: `family:${vertexId}:${operatorClientId}`,
    signed: true,
    publicKey: publicKeyB64u,
    allowedSkills,
    ttlSeconds,
  });

  return ok({
    ok: true,
    schema: FAMILY_DOCK_SCHEMA,
    vertexId,
    role: vertex.role,
    ageBand: vertex.ageBand,
    personalDock: vertex.personalDock,
    guardianAgent,
    sessionId,
    allowedSkills,
    expiresAt,
  });
}

async function forwardToHub(hubId, request, env) {
  const binding = HUB_BINDINGS[hubId];
  const stub = env[binding].get(env[binding].idFromName("singleton"));
  return stub.fetch(request);
}

// ── Anchor pact routes ────────────────────────────────────────────────────────

async function handleAnchorRegister(request, env) {
  let body;
  try { body = await request.json(); } catch { return badRequest("invalid JSON"); }
  const { clientId, publicKeyB64u, personalTetra, createdAt, sig, schema } = body ?? {};

  if (!clientId || typeof clientId !== "string") return badRequest("clientId required");
  if (!publicKeyB64u || typeof publicKeyB64u !== "string") return badRequest("publicKeyB64u required");
  if (!sig || typeof sig !== "string") return badRequest("sig required");
  if (!createdAt || typeof createdAt !== "number") return badRequest("createdAt (ms epoch) required");

  // Verify the Ed25519 self-signature over the canonical anchor string.
  let pub;
  try { pub = await importPublicKey(publicKeyB64u); } catch (e) { return badRequest(`invalid publicKeyB64u: ${e.message}`); }

  const tetraSchema = personalTetra?.schema ?? "";
  const docks = personalTetra?.docks ?? {};
  const sortedDockPairs = Object.keys(docks).sort().map((k) => `${k}:${docks[k]}`).join(",");
  const canonical = `${schema ?? "p31.anchorPact/1.0.0"}|${clientId}|${publicKeyB64u}|${tetraSchema}|${sortedDockPairs}|${createdAt}`;

  const valid = await verifyEd25519({ publicKey: pub, message: canonical, signatureB64u: sig });
  if (!valid) return forbidden("anchor pact signature did not verify");

  const record = {
    schema: schema ?? "p31.anchorPact/1.0.0",
    clientId,
    publicKeyB64u,
    personalTetra: personalTetra ?? null,
    createdAt,
    registeredAt: Date.now(),
  };
  await env.K4_AGENT_HUB.put(`${ANCHOR_KV_PREFIX}${clientId}`, JSON.stringify(record));

  const indexRaw = await env.K4_AGENT_HUB.get(ANCHOR_LIST_KEY);
  let ids = indexRaw ? JSON.parse(indexRaw) : [];
  if (!ids.includes(clientId)) ids.unshift(clientId);
  if (ids.length > 64) ids = ids.slice(0, 64);
  await env.K4_AGENT_HUB.put(ANCHOR_LIST_KEY, JSON.stringify(ids));

  return ok({ ok: true, schema: "p31.anchorPact/1.0.0", registered: clientId, registeredAt: record.registeredAt });
}

async function handleAnchorStatus(env) {
  const indexRaw = await env.K4_AGENT_HUB.get(ANCHOR_LIST_KEY);
  const ids = indexRaw ? JSON.parse(indexRaw) : [];
  const anchors = await Promise.all(
    ids.map(async (id) => {
      const raw = await env.K4_AGENT_HUB.get(`${ANCHOR_KV_PREFIX}${id}`);
      return raw ? JSON.parse(raw) : null;
    })
  );
  return ok({
    ok: true,
    schema: "p31.anchorPact/1.0.0",
    count: anchors.filter(Boolean).length,
    anchors: anchors.filter(Boolean).map(({ clientId, publicKeyB64u, createdAt, registeredAt }) => ({
      clientId, publicKeyB64u, createdAt, registeredAt,
    })),
  });
}

async function handleAnchorGet(clientId, env) {
  const raw = await env.K4_AGENT_HUB.get(`${ANCHOR_KV_PREFIX}${clientId}`);
  if (!raw) return notFound(`anchor ${clientId} not found`);
  return ok(JSON.parse(raw));
}
