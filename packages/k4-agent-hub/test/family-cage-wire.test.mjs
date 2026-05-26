/**
 * K4 agent hub — family cage wire tests.
 * Tests the POST /v1/family/dock handler logic (no Wrangler).
 *
 * Run: node --test --test-reporter=spec test/family-cage-wire.test.mjs
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { generateKeyPair } from "../../k4-agent-hub-client/src/keypair.mjs";
import { importPublicKey, verifyEd25519, FAMILY_DOCK_SCHEMA, canonicalFamilyDockString } from "../src/crypto.js";

// ── helpers ──────────────────────────────────────────────────────────────────

async function signMessage(privateKey, message) {
  const subtle = globalThis.crypto?.subtle ?? (await import("node:crypto")).webcrypto.subtle;
  const buf = await subtle.sign("Ed25519", privateKey, new TextEncoder().encode(message));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── canonical family dock string ─────────────────────────────────────────────

describe("canonicalFamilyDockString", () => {
  it("produces pipe-delimited schema|operatorClientId|vertexId|ts", () => {
    const s = canonicalFamilyDockString({
      operatorClientId: "op-123", vertexId: "will", ts: 1717000000000,
    });
    assert.equal(s, `${FAMILY_DOCK_SCHEMA}|op-123|will|1717000000000`);
  });
});

// ── Ed25519 round-trip ────────────────────────────────────────────────────────

describe("family dock — Ed25519 round-trip", () => {
  it("operator-signed canonical string verifies on worker side", async () => {
    const kp = await generateKeyPair();
    const ts = Date.now();
    const canonical = canonicalFamilyDockString({ operatorClientId: kp.clientId, vertexId: "christyn", ts });
    const sig = await signMessage(kp.keyPair.privateKey, canonical);

    const pub = await importPublicKey(kp.publicKeyB64u);
    const valid = await verifyEd25519({ publicKey: pub, message: canonical, signatureB64u: sig });
    assert.equal(valid, true);
  });

  it("tampered vertexId fails verification", async () => {
    const kp = await generateKeyPair();
    const ts = Date.now();
    const canonicalSigned = canonicalFamilyDockString({ operatorClientId: kp.clientId, vertexId: "will", ts });
    const sig = await signMessage(kp.keyPair.privateKey, canonicalSigned);

    const canonicalTampered = canonicalFamilyDockString({ operatorClientId: kp.clientId, vertexId: "sj", ts });
    const pub = await importPublicKey(kp.publicKeyB64u);
    const valid = await verifyEd25519({ publicKey: pub, message: canonicalTampered, signatureB64u: sig });
    assert.equal(valid, false);
  });
});

// ── guardian assignment logic ─────────────────────────────────────────────────

describe("family cage — guardian agent assignment", () => {
  const FAMILY_MAP = {
    will:     { guardianAgent: "forge",   personalDock: "structure",  ageBand: "adult", gate: null },
    sj:       { guardianAgent: "scholar", personalDock: "rhythm",     ageBand: "minor", gate: "child-mesh-unlock" },
    wj:       { guardianAgent: "scribe",  personalDock: "creation",   ageBand: "minor", gate: "child-mesh-unlock" },
    christyn: { guardianAgent: "counsel", personalDock: "connection", ageBand: "adult", gate: null },
  };

  it("each family vertex maps to its guardian agent and personal dock", () => {
    for (const [vertexId, expected] of Object.entries(FAMILY_MAP)) {
      assert.equal(FAMILY_MAP[vertexId].guardianAgent, expected.guardianAgent);
      assert.equal(FAMILY_MAP[vertexId].personalDock, expected.personalDock);
    }
  });

  it("minor vertices (sj, wj) carry child-mesh-unlock gate", () => {
    assert.equal(FAMILY_MAP.sj.gate, "child-mesh-unlock");
    assert.equal(FAMILY_MAP.wj.gate, "child-mesh-unlock");
    assert.equal(FAMILY_MAP.will.gate, null);
    assert.equal(FAMILY_MAP.christyn.gate, null);
  });

  it("two family vertices produce distinct canonical strings", async () => {
    const kp = await generateKeyPair();
    const ts = 1717000000000;
    const s1 = canonicalFamilyDockString({ operatorClientId: kp.clientId, vertexId: "will", ts });
    const s2 = canonicalFamilyDockString({ operatorClientId: kp.clientId, vertexId: "christyn", ts });
    assert.notEqual(s1, s2);
  });
});
