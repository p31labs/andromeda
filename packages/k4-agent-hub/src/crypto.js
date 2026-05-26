/**
 * Crypto primitives for the K4 agent hub — Ed25519 sign/verify + canonical
 * envelope hashing using SubtleCrypto (Cloudflare Workers runtime).
 *
 * Wire format:
 *   - clientPublicKey: base64url(raw 32 bytes)
 *   - signature:       base64url(raw 64 bytes)
 *   - canonical:       UTF-8(`${clientId}|${schema}|${sortedCaps.join(',')}|${ts}|${nonce}`)
 *   - call envelope:   UTF-8(`${skillId}|${stableJsonStringify(input)}|${ts}|${nonce}`)
 *
 * The canonical-string approach is intentionally simple — readable in logs,
 * deterministic, no JSON-canonicalization library needed in the worker hot path.
 */

const TEXT_ENCODER = new TextEncoder();

/** base64url encode a Uint8Array (no padding). */
export function b64uEncode(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url decode to Uint8Array. */
export function b64uDecode(input) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Stable JSON stringification — sorted keys, no whitespace. */
export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}

/** Build the canonical dock string. */
export function canonicalDockString({ clientId, schema, capabilities, ts, nonce }) {
  const caps = (Array.isArray(capabilities) ? [...capabilities] : []).sort().join(",");
  return `${clientId}|${schema ?? ""}|${caps}|${ts}|${nonce}`;
}

/** Build the canonical per-call string. */
export function canonicalCallString({ skillId, input, ts, nonce }) {
  return `${skillId}|${stableStringify(input ?? null)}|${ts}|${nonce}`;
}

/** Import a raw Ed25519 public key (32 bytes, base64url) into a CryptoKey. */
export async function importPublicKey(b64uKey) {
  const raw = b64uDecode(b64uKey);
  if (raw.length !== 32) throw new Error(`expected 32-byte Ed25519 public key, got ${raw.length}`);
  return await crypto.subtle.importKey("raw", raw, { name: "Ed25519" }, true, ["verify"]);
}

/** Verify an Ed25519 signature. Returns boolean. Soft-fails on any error. */
export async function verifyEd25519({ publicKey, message, signatureB64u }) {
  try {
    const sig = b64uDecode(signatureB64u);
    if (sig.length !== 64) return false;
    const data = TEXT_ENCODER.encode(message);
    return await crypto.subtle.verify({ name: "Ed25519" }, publicKey, sig, data);
  } catch {
    return false;
  }
}

/** Generate an Ed25519 keypair (test helper — useful in smoke scripts). */
export async function generateKeypair() {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return { keyPair: pair, publicKeyB64u: b64uEncode(pubRaw) };
}

/** Sign a UTF-8 message with an Ed25519 private CryptoKey. Returns base64url. */
export async function signEd25519({ privateKey, message }) {
  const data = TEXT_ENCODER.encode(message);
  const sig = await crypto.subtle.sign({ name: "Ed25519" }, privateKey, data);
  return b64uEncode(new Uint8Array(sig));
}

/** SHA-256 hex of a string — used for nonce dedup keys. */
export async function sha256Hex(message) {
  const data = TEXT_ENCODER.encode(message);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const arr = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, "0");
  return hex;
}

/** Schema for peer-to-peer signed skill dispatch. */
export const PEER_DISPATCH_SCHEMA = "p31.peerDispatch/1.0.0";

/** Build the canonical peer dispatch string (peerId signs this). */
export function canonicalPeerDispatchString({ peerId, hubId, skillId, ts }) {
  return `${PEER_DISPATCH_SCHEMA}|${peerId}|${hubId}|${skillId}|${ts}`;
}

/** Schema for operator-signed family vertex dock. */
export const FAMILY_DOCK_SCHEMA = "p31.familyDock/1.0.0";

/** Build the canonical family dock string (cage operator signs this). */
export function canonicalFamilyDockString({ operatorClientId, vertexId, ts }) {
  return `${FAMILY_DOCK_SCHEMA}|${operatorClientId}|${vertexId}|${ts}`;
}
