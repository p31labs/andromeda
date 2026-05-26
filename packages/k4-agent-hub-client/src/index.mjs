/**
 * @p31/k4-agent-hub-client — operator-side client for the K₄ agent worker
 * tetrahedron. Pairs with packages/k4-agent-hub/ (schema p31.k4AgentHub/1.1.0).
 *
 *   import { K4AgentHubClient } from "@p31/k4-agent-hub-client";
 *   import { ensureKeyPair }    from "@p31/k4-agent-hub-client/keypair";
 *
 *   const key = await ensureKeyPair();
 *   const c   = await K4AgentHubClient.connect({
 *     baseUrl: "https://k4-agent-hub.trimtab-signal.workers.dev",
 *     keyPair: key,
 *     personalTetra: { schema: "p31.personalTetra/1.0.0", docks: { ... } },
 *     capabilities: ["ts-worker", "voltage-triage", "passport-mirror"],
 *   });
 *
 *   const res = await c.call("forge", "ts-worker", { prompt: "scaffold a /healthz route" });
 *   const top = await c.topology();
 *   const fed = await c.federation();
 *
 * The client signs every dock + call envelope with the supplied Ed25519
 * keypair, verifies session lifetime, and refreshes the dock automatically
 * before expiry.
 */

import { b64uEncode, canonicalCallString, canonicalDockString } from "./envelope.mjs";

const TEXT_ENCODER = new TextEncoder();

async function getSubtle() {
  if (globalThis.crypto?.subtle) return globalThis.crypto.subtle;
  const { webcrypto } = await import("node:crypto");
  return webcrypto.subtle;
}

async function getRandomUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const { webcrypto } = await import("node:crypto");
  return webcrypto.randomUUID();
}

/** Sign a UTF-8 message with an Ed25519 private CryptoKey. Returns base64url. */
async function signMessage(privateKey, message) {
  const subtle = await getSubtle();
  const sig = await subtle.sign({ name: "Ed25519" }, privateKey, TEXT_ENCODER.encode(message));
  return b64uEncode(new Uint8Array(sig));
}

/** Build a fresh nonce; suitable for replay-protection in 90s windows. */
async function newNonce(prefix = "n") {
  const id = await getRandomUuid();
  return `${prefix}-${id.slice(0, 12)}`;
}

export class K4AgentHubClient {
  /** Don't construct directly — use `K4AgentHubClient.connect(opts)`. */
  constructor({ baseUrl, keyPair, personalTetra, capabilities }) {
    if (!baseUrl) throw new Error("baseUrl required");
    if (!keyPair?.keyPair?.privateKey) throw new Error("keyPair with privateKey required");
    if (!keyPair?.publicKeyB64u) throw new Error("keyPair.publicKeyB64u required");
    if (!keyPair?.clientId) throw new Error("keyPair.clientId required");
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.keyPair = keyPair;
    this.personalTetra = personalTetra ?? { schema: "p31.personalTetra/1.0.0" };
    this.capabilities = capabilities ?? [];
    this.session = null; // { sessionId, expiresAtMs, signed, hubs, allowedSkills, policies }
  }

  /** Convenience constructor — also performs the initial dock. */
  static async connect(opts) {
    const c = new K4AgentHubClient(opts);
    await c.dock();
    return c;
  }

  /** Sign + POST /v1/dock. Stores the resulting session. */
  async dock() {
    const ts = Date.now();
    const nonce = await newNonce("dock");
    const message = canonicalDockString({
      clientId: this.keyPair.clientId,
      schema: this.personalTetra?.schema ?? "",
      capabilities: this.capabilities,
      ts,
      nonce,
    });
    const sig = await signMessage(this.keyPair.keyPair.privateKey, message);

    const body = {
      clientId: this.keyPair.clientId,
      personalTetra: this.personalTetra,
      capabilities: this.capabilities,
      publicKey: this.keyPair.publicKeyB64u,
      ts, nonce, sig,
    };
    const res = await fetch(`${this.baseUrl}/v1/dock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) throw new Error(`dock failed: ${JSON.stringify(j)}`);
    this.session = {
      sessionId: j.sessionId,
      expiresAtMs: j.hubs?.[0]?.expires ? Date.parse(j.hubs[0].expires) : Date.now() + 86_400_000,
      signed: !!j.signed,
      hubs: j.hubs,
      allowedSkills: j.allowedSkills,
      policies: j.policies,
    };
    return this.session;
  }

  /** Re-dock if session is missing or within 5 minutes of expiry. */
  async ensureSession() {
    if (!this.session || (this.session.expiresAtMs - Date.now()) < 5 * 60_000) {
      await this.dock();
    }
    return this.session;
  }

  /** Sign + POST /v1/{hubId}/call. */
  async call(hubId, skillId, input = {}, { headers = {} } = {}) {
    if (!["forge", "counsel", "scholar", "scribe"].includes(hubId)) {
      throw new Error(`unknown hub ${hubId}`);
    }
    const session = await this.ensureSession();
    const ts = Date.now();
    const nonce = await newNonce("call");
    const message = canonicalCallString({ skillId, input, ts, nonce });
    const sig = await signMessage(this.keyPair.keyPair.privateKey, message);
    const res = await fetch(`${this.baseUrl}/v1/${hubId}/call`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.sessionId}`,
        ...headers,
      },
      body: JSON.stringify({ skillId, input, ts, nonce, sig }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`call failed (${res.status}): ${JSON.stringify(j)}`);
    return j;
  }

  /** GET /v1/{hubId}/health (no session needed). */
  async health(hubId) {
    const res = await fetch(`${this.baseUrl}/v1/${hubId}/health`);
    return res.json();
  }

  /** GET /v1/{hubId}/skills (no session needed). */
  async skills(hubId) {
    const res = await fetch(`${this.baseUrl}/v1/${hubId}/skills`);
    return res.json();
  }

  /** GET /v1/{hubId}/metrics. */
  async metricsForHub(hubId) {
    const res = await fetch(`${this.baseUrl}/v1/${hubId}/metrics`);
    return res.json();
  }

  /** GET /v1/cross/{from}/{to}?ask=... — invoke an inter-hub edge brief. */
  async cross(from, to, ask) {
    const url = new URL(`${this.baseUrl}/v1/cross/${from}/${to}`);
    if (ask) url.searchParams.set("ask", ask);
    const res = await fetch(url);
    return res.json();
  }

  /** GET /v1/topology — full K₄ + bipartite + triadic snapshot with live load. */
  async topology() {
    const res = await fetch(`${this.baseUrl}/v1/topology`);
    return res.json();
  }

  /** GET /v1/metrics — aggregated counters. */
  async metrics() {
    const res = await fetch(`${this.baseUrl}/v1/metrics`);
    return res.json();
  }

  /** GET /v1/federation — peer registry + aggregated topology. */
  async federation() {
    const res = await fetch(`${this.baseUrl}/v1/federation`);
    return res.json();
  }

  /**
   * POST /v1/anchor/register — register the operator's anchor pact with the hub.
   * Requires a pre-built pact (create with createAnchorPact from anchor-pact.mjs).
   */
  async anchorRegister(pact) {
    const res = await fetch(`${this.baseUrl}/v1/anchor/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId:       pact.clientId,
        publicKeyB64u:  pact.publicKeyB64u,
        personalTetra:  pact.personalTetra,
        createdAt:      pact.createdAt,
        sig:            pact.sig,
        schema:         pact.schema,
      }),
    });
    return res.json();
  }

  /** GET /v1/anchor/status — list all registered anchor fingerprints on this hub. */
  async anchorStatus() {
    const res = await fetch(`${this.baseUrl}/v1/anchor/status`);
    return res.json();
  }

  /** GET /v1/anchor/{clientId} — fetch a specific registered anchor record. */
  async anchor(clientId) {
    const res = await fetch(`${this.baseUrl}/v1/anchor/${encodeURIComponent(clientId)}`);
    return res.json();
  }

  /** POST /v1/federation/peer — sign and register self as a peer at another hub. */
  async registerAsPeer(targetHubBaseUrl, manifestUrl) {
    const ts = Date.now();
    const message = canonicalDockString({
      clientId: this.keyPair.clientId,
      schema: manifestUrl,
      capabilities: [],
      ts,
      nonce: this.keyPair.clientId,
    });
    const sig = await signMessage(this.keyPair.keyPair.privateKey, message);
    const res = await fetch(`${targetHubBaseUrl.replace(/\/$/, "")}/v1/federation/peer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instanceId: this.keyPair.clientId,
        manifestUrl,
        publicKey: this.keyPair.publicKeyB64u,
        ts, sig,
      }),
    });
    return res.json();
  }

  /** POST /v1/family/dock — operator signs a family vertex dock. */
  async familyDock(vertexId, { childMeshToken = null } = {}) {
    const ts = Date.now();
    const canonical = `p31.familyDock/1.0.0|${this.keyPair.clientId}|${vertexId}|${ts}`;
    const sig = await signMessage(this.keyPair.keyPair.privateKey, canonical);
    const body = {
      operatorClientId: this.keyPair.clientId,
      publicKeyB64u: this.keyPair.publicKeyB64u,
      vertexId,
      ts,
      sig,
      ...(childMeshToken ? { childMeshToken } : {}),
    };
    const res = await fetch(`${this.baseUrl}/v1/family/dock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  /** POST /v1/federation/dispatch — signed peer→peer skill dispatch. */
  async peerDispatch(peerBaseUrl, hubId, skillId, input = {}) {
    const ts = Date.now();
    const canonical = `p31.peerDispatch/1.0.0|${this.keyPair.clientId}|${hubId}|${skillId}|${ts}`;
    const sig = await signMessage(this.keyPair.keyPair.privateKey, canonical);
    const res = await fetch(`${peerBaseUrl.replace(/\/$/, "")}/v1/federation/dispatch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        peerId: this.keyPair.clientId,
        hubId,
        skillId,
        input,
        ts,
        sig,
      }),
    });
    return res.json();
  }
}

export { canonicalCallString, canonicalDockString } from "./envelope.mjs";
export { ensureKeyPair, generateKeyPair, importKeyPair, loadKeyPairFromDisk, saveKeyPairToDisk, defaultKeyPath } from "./keypair.mjs";
export { canonicalAnchorString, createAnchorPact, ensureAnchorPact, loadAnchorPact, pactFingerprint, saveAnchorPact } from "./anchor-pact.mjs";
