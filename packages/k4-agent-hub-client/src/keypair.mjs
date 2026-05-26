/**
 * Keypair management — Ed25519 generation + load/save to disk for Node hosts.
 *
 * Default key path: ${P31_HOME ?? '~/.p31'}/agent-hub-key.json
 * File contents:
 *   {
 *     schema: "p31.k4AgentHubClientKey/1.0.0",
 *     publicKeyB64u: "<32-byte raw, base64url>",
 *     privateKeyJwk: { ... },     // JWK shape for portable re-import
 *     createdAt: 1717000000000,
 *     clientId: "<UUID>"          // stable identity for this keypair
 *   }
 *
 * Browser usage: skip loadKeyPairFromDisk; pass the keypair directly via the
 * client constructor.
 */

import { b64uEncode } from "./envelope.mjs";

/** Resolve the default key path. Returns null when not in a Node host. */
export function defaultKeyPath() {
  if (typeof process === "undefined" || !process?.env) return null;
  const home = process.env.P31_HOME ?? process.env.HOME ?? null;
  if (!home) return null;
  // Inline path join to avoid an import in browser-targeting builds.
  const sep = home.includes("\\") ? "\\" : "/";
  return `${home}${sep}.p31${sep}agent-hub-key.json`;
}

/** Generate a new Ed25519 keypair using the platform Web Crypto API. */
export async function generateKeyPair({ clientId } = {}) {
  const subtle = (globalThis.crypto?.subtle) ?? (await import("node:crypto")).webcrypto.subtle;
  const pair = await subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const pubRaw = new Uint8Array(await subtle.exportKey("raw", pair.publicKey));
  const jwk = await subtle.exportKey("jwk", pair.privateKey);
  const id = clientId ?? (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `client-${Date.now().toString(16)}`);
  return {
    publicKeyB64u: b64uEncode(pubRaw),
    privateKeyJwk: jwk,
    keyPair: pair,
    clientId: id,
    createdAt: Date.now(),
  };
}

/** Re-import an exported keypair from disk material. */
export async function importKeyPair({ publicKeyB64u, privateKeyJwk }) {
  const subtle = (globalThis.crypto?.subtle) ?? (await import("node:crypto")).webcrypto.subtle;
  const privateKey = await subtle.importKey("jwk", privateKeyJwk, { name: "Ed25519" }, true, ["sign"]);
  // Public key reconstruction from raw is enough for verify if needed.
  const publicKey = privateKeyJwk.x
    ? await subtle.importKey("jwk", { kty: "OKP", crv: "Ed25519", x: privateKeyJwk.x, key_ops: ["verify"], ext: true }, { name: "Ed25519" }, true, ["verify"])
    : null;
  return {
    publicKeyB64u,
    privateKeyJwk,
    keyPair: { privateKey, publicKey },
  };
}

/** Persist a keypair to disk (Node only). Returns the file path. */
export async function saveKeyPairToDisk(material, p) {
  const target = p ?? defaultKeyPath();
  if (!target) throw new Error("saveKeyPairToDisk: no default path (browser host?) — pass an explicit path");
  const fs = await import("node:fs");
  const path = await import("node:path");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const payload = {
    schema: "p31.k4AgentHubClientKey/1.0.0",
    publicKeyB64u: material.publicKeyB64u,
    privateKeyJwk: material.privateKeyJwk,
    clientId: material.clientId,
    createdAt: material.createdAt,
  };
  fs.writeFileSync(target, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });
  return target;
}

/** Load a keypair from disk. Returns null when the file doesn't exist. */
export async function loadKeyPairFromDisk(p) {
  const target = p ?? defaultKeyPath();
  if (!target) return null;
  const fs = await import("node:fs");
  if (!fs.existsSync(target)) return null;
  const raw = JSON.parse(fs.readFileSync(target, "utf8"));
  const imported = await importKeyPair(raw);
  return { ...imported, clientId: raw.clientId, createdAt: raw.createdAt };
}

/** Load-or-create. Persists a fresh keypair on first run. */
export async function ensureKeyPair(p) {
  const existing = await loadKeyPairFromDisk(p);
  if (existing) return existing;
  const fresh = await generateKeyPair();
  try {
    await saveKeyPairToDisk(fresh, p);
  } catch {
    // Browser host — the caller will hold the in-memory keypair.
  }
  return fresh;
}
