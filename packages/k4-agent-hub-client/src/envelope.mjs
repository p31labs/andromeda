/**
 * Canonical envelope helpers — must stay byte-identical with the Worker side
 * at packages/k4-agent-hub/src/crypto.js. These three functions are the
 * contract that lets a client and a hub agree on what was signed.
 *
 * Wire format (UTF-8):
 *   dock canonical = `${clientId}|${schema}|${sortedCaps.join(',')}|${ts}|${nonce}`
 *   call canonical = `${skillId}|${stableJsonStringify(input)}|${ts}|${nonce}`
 */

/** base64url-encode a Uint8Array, no padding. */
export function b64uEncode(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = (typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64"));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url-decode to Uint8Array. */
export function b64uDecode(input) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = (typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary"));
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

/** Build the canonical dock string. Capabilities are sorted alphabetically. */
export function canonicalDockString({ clientId, schema, capabilities, ts, nonce }) {
  const caps = (Array.isArray(capabilities) ? [...capabilities] : []).sort().join(",");
  return `${clientId}|${schema ?? ""}|${caps}|${ts}|${nonce}`;
}

/** Build the canonical per-call string. */
export function canonicalCallString({ skillId, input, ts, nonce }) {
  return `${skillId}|${stableStringify(input ?? null)}|${ts}|${nonce}`;
}
