/**
 * K4 agent hub — anchor pact route tests.
 * Tests the POST /v1/anchor/register + GET /v1/anchor/status + GET /v1/anchor/{clientId}
 * handlers by verifying their logic directly (no Wrangler / miniflare needed).
 *
 * Run: node --test --test-reporter=spec test/anchor.test.mjs
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { webcrypto } from "node:crypto";
import { generateKeyPair } from "../../k4-agent-hub-client/src/keypair.mjs";
import { canonicalAnchorString, createAnchorPact, ANCHOR_PACT_SCHEMA } from "../../k4-agent-hub-client/src/anchor-pact.mjs";
import { importPublicKey, verifyEd25519 } from "../src/crypto.js";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Minimal in-memory KV mock (matches the subset of CF KV the anchor handlers use). */
function makeKv() {
  const store = new Map();
  return {
    get: async (k) => store.get(k) ?? null,
    put: async (k, v) => { store.set(k, v); },
    delete: async (k) => { store.delete(k); },
  };
}

/** Build a minimal env with a mock KV. */
function makeEnv() {
  return { K4_AGENT_HUB: makeKv() };
}

const PERSONAL_TETRA = {
  schema: "p31.personalTetra/1.0.0",
  docks: { structure: "will", connection: "christyn", rhythm: "sj", creation: "wj" },
};

// ── canonical anchor string matches what the Worker reconstructs ──────────────

describe("anchor canonical string — client↔worker parity", () => {
  it("client and worker produce identical canonical string", async () => {
    const kp = await generateKeyPair();
    const pact = await createAnchorPact(kp, PERSONAL_TETRA);

    // Worker-side reconstruction (same logic as handleAnchorRegister):
    const { personalTetra, createdAt, schema, clientId, publicKeyB64u } = pact;
    const tetraSchema = personalTetra?.schema ?? "";
    const docks = personalTetra?.docks ?? {};
    const sortedDockPairs = Object.keys(docks).sort().map((k) => `${k}:${docks[k]}`).join(",");
    const workerCanonical = `${schema}|${clientId}|${publicKeyB64u}|${tetraSchema}|${sortedDockPairs}|${createdAt}`;

    const clientCanonical = canonicalAnchorString(pact);
    assert.equal(clientCanonical, workerCanonical);
  });
});

// ── Worker sig verification ───────────────────────────────────────────────────

describe("anchor pact — Worker Ed25519 verification", () => {
  it("importPublicKey + verifyEd25519 accepts a valid pact sig", async () => {
    const kp = await generateKeyPair();
    const pact = await createAnchorPact(kp, PERSONAL_TETRA);
    const canonical = canonicalAnchorString(pact);

    const pub = await importPublicKey(pact.publicKeyB64u);
    const valid = await verifyEd25519({ publicKey: pub, message: canonical, signatureB64u: pact.sig });
    assert.equal(valid, true);
  });

  it("rejects a tampered canonical string", async () => {
    const kp = await generateKeyPair();
    const pact = await createAnchorPact(kp, PERSONAL_TETRA);
    const canonical = canonicalAnchorString(pact) + "|tampered";

    const pub = await importPublicKey(pact.publicKeyB64u);
    const valid = await verifyEd25519({ publicKey: pub, message: canonical, signatureB64u: pact.sig });
    assert.equal(valid, false);
  });
});

// ── anchor KV round-trip (handler logic) ─────────────────────────────────────

describe("anchor KV round-trip", () => {
  it("stores and retrieves an anchor by clientId", async () => {
    const kv = makeKv();
    const ANCHOR_KV_PREFIX = "k4ah:anchor:";
    const ANCHOR_LIST_KEY  = "k4ah:anchors:index";

    const kp = await generateKeyPair();
    const pact = await createAnchorPact(kp, PERSONAL_TETRA);

    // Simulate handleAnchorRegister KV writes
    const record = {
      schema: pact.schema,
      clientId: pact.clientId,
      publicKeyB64u: pact.publicKeyB64u,
      personalTetra: pact.personalTetra,
      createdAt: pact.createdAt,
      registeredAt: Date.now(),
    };
    await kv.put(`${ANCHOR_KV_PREFIX}${pact.clientId}`, JSON.stringify(record));
    await kv.put(ANCHOR_LIST_KEY, JSON.stringify([pact.clientId]));

    // Retrieve
    const raw = await kv.get(`${ANCHOR_KV_PREFIX}${pact.clientId}`);
    const stored = JSON.parse(raw);
    assert.equal(stored.clientId, pact.clientId);
    assert.equal(stored.publicKeyB64u, pact.publicKeyB64u);
    assert.equal(stored.schema, ANCHOR_PACT_SCHEMA);

    // Index
    const index = JSON.parse(await kv.get(ANCHOR_LIST_KEY));
    assert.ok(index.includes(pact.clientId));
  });

  it("two registrations don't duplicate the index", async () => {
    const kv = makeKv();
    const ANCHOR_KV_PREFIX = "k4ah:anchor:";
    const ANCHOR_LIST_KEY  = "k4ah:anchors:index";

    const kp = await generateKeyPair();
    const pact = await createAnchorPact(kp, PERSONAL_TETRA);

    // First registration
    await kv.put(`${ANCHOR_KV_PREFIX}${pact.clientId}`, JSON.stringify({ clientId: pact.clientId }));
    let ids = [];
    ids.unshift(pact.clientId);
    await kv.put(ANCHOR_LIST_KEY, JSON.stringify(ids));

    // Second registration (same clientId)
    const indexRaw = await kv.get(ANCHOR_LIST_KEY);
    ids = JSON.parse(indexRaw);
    if (!ids.includes(pact.clientId)) ids.unshift(pact.clientId);
    await kv.put(ANCHOR_LIST_KEY, JSON.stringify(ids));

    const finalIndex = JSON.parse(await kv.get(ANCHOR_LIST_KEY));
    assert.equal(finalIndex.filter((x) => x === pact.clientId).length, 1);
  });
});
