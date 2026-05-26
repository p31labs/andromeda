/**
 * @p31/k4-agent-hub-client — anchor pact unit tests.
 * Run: node --test --test-reporter=spec test/anchor-pact.test.mjs
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { webcrypto } from "node:crypto";
import {
  ANCHOR_PACT_SCHEMA, ANCHOR_PACT_FINGERPRINT_SCHEMA,
  canonicalAnchorString, createAnchorPact, pactFingerprint, verifyAnchorPact,
} from "../src/anchor-pact.mjs";
import { generateKeyPair } from "../src/keypair.mjs";

// ── helpers ──────────────────────────────────────────────────────────────────

async function freshKeyPair() {
  const kp = await generateKeyPair();
  // ensureKeyPair returns the disk-loaded shape; generateKeyPair returns the in-memory shape.
  // Tests run entirely in-memory.
  return kp;
}

const PERSONAL_TETRA = {
  schema: "p31.personalTetra/1.0.0",
  docks: { structure: "will", connection: "christyn", rhythm: "sj", creation: "wj" },
};

// ── canonicalAnchorString ─────────────────────────────────────────────────────

describe("canonicalAnchorString", () => {
  it("pipe-delimits schema|clientId|pubkey|tetraSchema|sortedDockPairs|createdAt", () => {
    const s = canonicalAnchorString({
      schema: "p31.anchorPact/1.0.0",
      clientId: "test-id",
      publicKeyB64u: "abc123",
      personalTetra: PERSONAL_TETRA,
      createdAt: 1717000000000,
    });
    // docks sorted alphabetically: connection, creation, rhythm, structure
    assert.equal(
      s,
      "p31.anchorPact/1.0.0|test-id|abc123|p31.personalTetra/1.0.0|connection:christyn,creation:wj,rhythm:sj,structure:will|1717000000000"
    );
  });

  it("handles empty docks gracefully", () => {
    const s = canonicalAnchorString({
      schema: "p31.anchorPact/1.0.0",
      clientId: "x",
      publicKeyB64u: "y",
      personalTetra: { schema: "p31.personalTetra/1.0.0", docks: {} },
      createdAt: 0,
    });
    assert.match(s, /p31\.anchorPact\/1\.0\.0\|x\|y\|p31\.personalTetra\/1\.0\.0\|\|0/);
  });
});

// ── createAnchorPact ──────────────────────────────────────────────────────────

describe("createAnchorPact", () => {
  it("returns a pact with the correct schema and clientId", async () => {
    const kp = await freshKeyPair();
    const pact = await createAnchorPact(kp, PERSONAL_TETRA);
    assert.equal(pact.schema, ANCHOR_PACT_SCHEMA);
    assert.equal(pact.clientId, kp.clientId);
    assert.equal(pact.publicKeyB64u, kp.publicKeyB64u);
    assert.ok(typeof pact.sig === "string" && pact.sig.length > 10);
    assert.ok(typeof pact.createdAt === "number");
    assert.deepEqual(pact.personalTetra, PERSONAL_TETRA);
  });

  it("pact signature verifies offline", async () => {
    const kp = await freshKeyPair();
    const pact = await createAnchorPact(kp, PERSONAL_TETRA);
    const valid = await verifyAnchorPact(pact);
    assert.equal(valid, true);
  });

  it("tampered publicKeyB64u fails verification", async () => {
    const kp = await freshKeyPair();
    const pact = await createAnchorPact(kp, PERSONAL_TETRA);
    const tampered = { ...pact, publicKeyB64u: pact.publicKeyB64u.slice(0, -1) + "X" };
    let threw = false;
    try {
      await verifyAnchorPact(tampered);
    } catch {
      threw = true;
    }
    // Either throws (bad key bytes) or returns false — both are correct rejections.
    if (!threw) {
      const valid = await verifyAnchorPact(tampered);
      assert.equal(valid, false);
    }
  });

  it("tampered clientId fails verification", async () => {
    const kp = await freshKeyPair();
    const pact = await createAnchorPact(kp, PERSONAL_TETRA);
    const tampered = { ...pact, clientId: "wrong-id" };
    const valid = await verifyAnchorPact(tampered);
    assert.equal(valid, false);
  });

  it("two keypairs produce different pacts", async () => {
    const kp1 = await freshKeyPair();
    const kp2 = await freshKeyPair();
    const p1 = await createAnchorPact(kp1, PERSONAL_TETRA);
    const p2 = await createAnchorPact(kp2, PERSONAL_TETRA);
    assert.notEqual(p1.clientId, p2.clientId);
    assert.notEqual(p1.sig, p2.sig);
  });
});

// ── pactFingerprint ───────────────────────────────────────────────────────────

describe("pactFingerprint", () => {
  it("strips sig and personalTetra; keeps public fields only", async () => {
    const kp = await freshKeyPair();
    const pact = await createAnchorPact(kp, PERSONAL_TETRA);
    const fp = pactFingerprint(pact);
    assert.equal(fp.schema, ANCHOR_PACT_FINGERPRINT_SCHEMA);
    assert.equal(fp.clientId, pact.clientId);
    assert.equal(fp.publicKeyB64u, pact.publicKeyB64u);
    assert.equal(fp.createdAt, pact.createdAt);
    assert.equal(fp.sig, undefined);
    assert.equal(fp.personalTetra, undefined);
    assert.ok(typeof fp.note === "string");
  });
});
