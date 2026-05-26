/**
 * Crypto unit tests — Ed25519 sign/verify + canonical envelope strings.
 * Uses the Node.js Web Crypto polyfill (Node 20+ supports Ed25519 natively).
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  b64uDecode, b64uEncode, canonicalCallString, canonicalDockString,
  generateKeypair, importPublicKey, sha256Hex, signEd25519, stableStringify, verifyEd25519,
} from "../src/crypto.js";

describe("base64url helpers", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 10, 20, 30]);
    const enc = b64uEncode(bytes);
    assert.ok(!enc.includes("="));
    assert.ok(!enc.includes("+"));
    assert.ok(!enc.includes("/"));
    const dec = b64uDecode(enc);
    assert.deepEqual(Array.from(dec), Array.from(bytes));
  });
});

describe("stableStringify", () => {
  it("orders object keys alphabetically", () => {
    const a = stableStringify({ b: 1, a: 2, c: 3 });
    const b = stableStringify({ c: 3, b: 1, a: 2 });
    assert.equal(a, b);
    assert.equal(a, '{"a":2,"b":1,"c":3}');
  });

  it("handles arrays and nested objects", () => {
    const x = stableStringify({ arr: [1, 2, { z: "y", a: "b" }] });
    assert.equal(x, '{"arr":[1,2,{"a":"b","z":"y"}]}');
  });
});

describe("canonical envelope strings", () => {
  it("dock string sorts capabilities deterministically", () => {
    const a = canonicalDockString({
      clientId: "abc", schema: "p31.personalTetra/1.0.0",
      capabilities: ["c", "a", "b"], ts: 1000, nonce: "n1",
    });
    const b = canonicalDockString({
      clientId: "abc", schema: "p31.personalTetra/1.0.0",
      capabilities: ["b", "c", "a"], ts: 1000, nonce: "n1",
    });
    assert.equal(a, b);
    assert.equal(a, "abc|p31.personalTetra/1.0.0|a,b,c|1000|n1");
  });

  it("call string is stable across input shape", () => {
    const a = canonicalCallString({
      skillId: "ts-worker",
      input: { foo: 1, bar: 2 }, ts: 100, nonce: "n",
    });
    const b = canonicalCallString({
      skillId: "ts-worker",
      input: { bar: 2, foo: 1 }, ts: 100, nonce: "n",
    });
    assert.equal(a, b);
  });
});

describe("Ed25519 sign + verify (Node 20 SubtleCrypto)", () => {
  it("round-trips a signed dock envelope", async () => {
    const { keyPair, publicKeyB64u } = await generateKeypair();
    const message = canonicalDockString({
      clientId: "client-001", schema: "p31.personalTetra/1.0.0",
      capabilities: ["ts-worker"], ts: Date.now(), nonce: "abcdefgh",
    });
    const sig = await signEd25519({ privateKey: keyPair.privateKey, message });
    const pub = await importPublicKey(publicKeyB64u);
    const valid = await verifyEd25519({ publicKey: pub, message, signatureB64u: sig });
    assert.equal(valid, true);
  });

  it("rejects tampered messages", async () => {
    const { keyPair, publicKeyB64u } = await generateKeypair();
    const message = "good";
    const sig = await signEd25519({ privateKey: keyPair.privateKey, message });
    const pub = await importPublicKey(publicKeyB64u);
    const valid = await verifyEd25519({ publicKey: pub, message: "evil", signatureB64u: sig });
    assert.equal(valid, false);
  });
});

describe("sha256Hex", () => {
  it("returns deterministic 64-char hex", async () => {
    const a = await sha256Hex("hello");
    const b = await sha256Hex("hello");
    assert.equal(a, b);
    assert.equal(a.length, 64);
    assert.match(a, /^[0-9a-f]{64}$/);
  });
});
