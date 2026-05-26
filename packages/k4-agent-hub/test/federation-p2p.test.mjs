/**
 * K4 agent hub — federation P2P dispatch tests.
 * Tests POST /v1/federation/dispatch handler logic directly (no Wrangler).
 *
 * Run: node --test --test-reporter=spec test/federation-p2p.test.mjs
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { generateKeyPair } from "../../k4-agent-hub-client/src/keypair.mjs";
import { importPublicKey, verifyEd25519, PEER_DISPATCH_SCHEMA, canonicalPeerDispatchString } from "../src/crypto.js";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeKv(initial = new Map()) {
  const store = new Map(initial);
  return {
    get: async (k) => store.get(k) ?? null,
    put: async (k, v) => { store.set(k, v); },
    delete: async (k) => { store.delete(k); },
  };
}

function makeEnv(kv) {
  return { K4_AGENT_HUB: kv };
}

async function signMessage(privateKey, message) {
  const subtle = globalThis.crypto?.subtle ?? (await import("node:crypto")).webcrypto.subtle;
  const buf = await subtle.sign("Ed25519", privateKey, new TextEncoder().encode(message));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── canonical peer dispatch string ───────────────────────────────────────────

describe("canonicalPeerDispatchString", () => {
  it("produces pipe-delimited schema|peerId|hubId|skillId|ts", () => {
    const s = canonicalPeerDispatchString({
      peerId: "peer-123", hubId: "forge", skillId: "ts-worker", ts: 1717000000000,
    });
    assert.equal(s, `${PEER_DISPATCH_SCHEMA}|peer-123|forge|ts-worker|1717000000000`);
  });
});

// ── Ed25519 round-trip (client canonical matches worker) ─────────────────────

describe("peer dispatch — Ed25519 round-trip", () => {
  it("client-signed canonical string verifies on worker side", async () => {
    const kp = await generateKeyPair();
    const ts = Date.now();
    const canonical = canonicalPeerDispatchString({
      peerId: kp.clientId, hubId: "counsel", skillId: "pro-se-georgia", ts,
    });
    const sig = await signMessage(kp.keyPair.privateKey, canonical);

    const pub = await importPublicKey(kp.publicKeyB64u);
    const valid = await verifyEd25519({ publicKey: pub, message: canonical, signatureB64u: sig });
    assert.equal(valid, true);
  });

  it("tampered hubId fails verification", async () => {
    const kp = await generateKeyPair();
    const ts = Date.now();
    const canonicalSigned = canonicalPeerDispatchString({
      peerId: kp.clientId, hubId: "forge", skillId: "ts-worker", ts,
    });
    const sig = await signMessage(kp.keyPair.privateKey, canonicalSigned);

    // Verify against a different hubId
    const canonicalTampered = canonicalPeerDispatchString({
      peerId: kp.clientId, hubId: "counsel", skillId: "ts-worker", ts,
    });
    const pub = await importPublicKey(kp.publicKeyB64u);
    const valid = await verifyEd25519({ publicKey: pub, message: canonicalTampered, signatureB64u: sig });
    assert.equal(valid, false);
  });
});

// ── peer registration prerequisite ───────────────────────────────────────────

describe("peer dispatch — KV peer lookup", () => {
  it("peer record stored under k4ah:peer:{peerId} is retrievable", async () => {
    const kp = await generateKeyPair();
    const PEER_KV_PREFIX = "k4ah:peer:";
    const kv = makeKv();

    const record = {
      instanceId: kp.clientId,
      publicKey: kp.publicKeyB64u,
      registeredAt: Date.now(),
      expiresAt: Date.now() + 86400 * 1000,
    };
    await kv.put(`${PEER_KV_PREFIX}${kp.clientId}`, JSON.stringify(record));

    const raw = await kv.get(`${PEER_KV_PREFIX}${kp.clientId}`);
    const stored = JSON.parse(raw);
    assert.equal(stored.instanceId, kp.clientId);
    assert.equal(stored.publicKey, kp.publicKeyB64u);
    assert.ok(stored.expiresAt > Date.now());
  });

  it("expired peer record is detectable via expiresAt", async () => {
    const kp = await generateKeyPair();
    const PEER_KV_PREFIX = "k4ah:peer:";
    const kv = makeKv();

    const record = {
      instanceId: kp.clientId,
      publicKey: kp.publicKeyB64u,
      registeredAt: Date.now() - 2000,
      expiresAt: Date.now() - 1000, // already expired
    };
    await kv.put(`${PEER_KV_PREFIX}${kp.clientId}`, JSON.stringify(record));

    const raw = await kv.get(`${PEER_KV_PREFIX}${kp.clientId}`);
    const stored = JSON.parse(raw);
    assert.ok(stored.expiresAt < Date.now(), "expiresAt should be in the past");
  });
});
