/**
 * Anchor pact — binds the operator's Ed25519 keypair to their personal tetrahedron.
 *
 * Schema: p31.anchorPact/1.0.0
 *
 * File on disk: ${P31_HOME ?? '~/.p31'}/anchor-pact.json
 * Contents:
 *   {
 *     schema:          "p31.anchorPact/1.0.0",
 *     clientId:        "<UUID — matches agent-hub-key.json>",
 *     publicKeyB64u:   "<32-byte Ed25519 raw, base64url — no padding>",
 *     personalTetra:   { schema: "p31.personalTetra/1.0.0", docks: { structure, connection, rhythm, creation } },
 *     createdAt:       <ms epoch>,
 *     sig:             "<Ed25519 sig over canonicalAnchorString(...), base64url>",
 *     note:            "self-signed; passkey hardware binding is CWP-P31-K4-AGENT-HUB-ANCHOR-PACT-V2"
 *   }
 *
 * Canonical string (UTF-8, signed):
 *   `${schema}|${clientId}|${publicKeyB64u}|${personalTetraSchema}|${sortedDockPairs}|${createdAt}`
 *
 * where sortedDockPairs = sorted keys joined as "connection:v,creation:v,rhythm:v,structure:v"
 */

import { b64uEncode } from "./envelope.mjs";
import { defaultKeyPath } from "./keypair.mjs";

export const ANCHOR_PACT_SCHEMA = "p31.anchorPact/1.0.0";
export const ANCHOR_PACT_FINGERPRINT_SCHEMA = "p31.anchorPactFingerprint/1.0.0";

// ── Canonical string ──────────────────────────────────────────────────────────

/** Build the canonical string that is signed inside the anchor pact. */
export function canonicalAnchorString({ schema, clientId, publicKeyB64u, personalTetra, createdAt }) {
  const tetraSchema = personalTetra?.schema ?? "";
  const docks = personalTetra?.docks ?? {};
  const sortedDockPairs = Object.keys(docks).sort().map((k) => `${k}:${docks[k]}`).join(",");
  return `${schema}|${clientId}|${publicKeyB64u}|${tetraSchema}|${sortedDockPairs}|${createdAt}`;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function getSubtle() {
  if (globalThis.crypto?.subtle) return globalThis.crypto.subtle;
  const { webcrypto } = await import("node:crypto");
  return webcrypto.subtle;
}

const TEXT_ENCODER = new TextEncoder();

/** Sign the canonical anchor string. Returns base64url sig. */
export async function signAnchorPact(privateKey, canonical) {
  const subtle = await getSubtle();
  const sig = await subtle.sign({ name: "Ed25519" }, privateKey, TEXT_ENCODER.encode(canonical));
  return b64uEncode(new Uint8Array(sig));
}

/** Verify anchor pact signature. Returns true/false. */
export async function verifyAnchorPact({ schema, clientId, publicKeyB64u, personalTetra, createdAt, sig }) {
  const subtle = await getSubtle();
  const canonical = canonicalAnchorString({ schema, clientId, publicKeyB64u, personalTetra, createdAt });
  const { b64uDecode } = await import("./envelope.mjs");
  const pubRaw = b64uDecode(publicKeyB64u);
  const pubKey = await subtle.importKey("raw", pubRaw, { name: "Ed25519" }, false, ["verify"]);
  const sigBytes = b64uDecode(sig);
  return subtle.verify({ name: "Ed25519" }, pubKey, sigBytes, TEXT_ENCODER.encode(canonical));
}

// ── Create / persist ──────────────────────────────────────────────────────────

/**
 * Create a new anchor pact, sign it, and return the pact object.
 * Does NOT write to disk — call saveAnchorPact() for that.
 */
export async function createAnchorPact(keyPair, personalTetra = null) {
  const createdAt = Date.now();
  const schema = ANCHOR_PACT_SCHEMA;
  const { clientId, publicKeyB64u } = keyPair;
  const tetra = personalTetra ?? { schema: "p31.personalTetra/1.0.0", docks: {} };

  const canonical = canonicalAnchorString({ schema, clientId, publicKeyB64u, personalTetra: tetra, createdAt });
  const sig = await signAnchorPact(keyPair.keyPair.privateKey, canonical);

  return {
    schema,
    clientId,
    publicKeyB64u,
    personalTetra: tetra,
    createdAt,
    sig,
    note: "self-signed; passkey hardware binding is CWP-P31-K4-AGENT-HUB-ANCHOR-PACT-V2",
  };
}

/** Default path for the anchor pact file: ~/.p31/anchor-pact.json */
export function defaultAnchorPactPath() {
  const keyPath = defaultKeyPath();
  if (!keyPath) return null;
  return keyPath.replace("agent-hub-key.json", "anchor-pact.json");
}

/** Persist an anchor pact to disk (mode 0600). Node only. */
export async function saveAnchorPact(pact, filePath = null) {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const p = filePath ?? defaultAnchorPactPath();
  if (!p) throw new Error("cannot determine anchor-pact path (not in Node environment)");
  const dir = p.slice(0, p.lastIndexOf("/") === -1 ? p.lastIndexOf("\\") : p.lastIndexOf("/"));
  await mkdir(dir, { recursive: true });
  await writeFile(p, JSON.stringify(pact, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  return p;
}

/** Load an anchor pact from disk. Returns null when not found. Node only. */
export async function loadAnchorPact(filePath = null) {
  const { readFile } = await import("node:fs/promises");
  const p = filePath ?? defaultAnchorPactPath();
  if (!p) return null;
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Ensure an anchor pact exists: load from disk, or create + save a new one.
 * Returns { pact, created: boolean }.
 */
export async function ensureAnchorPact(keyPair, personalTetra = null, filePath = null) {
  const existing = await loadAnchorPact(filePath);
  if (existing?.clientId === keyPair.clientId) {
    return { pact: existing, created: false };
  }
  const pact = await createAnchorPact(keyPair, personalTetra);
  await saveAnchorPact(pact, filePath);
  return { pact, created: true };
}

/**
 * Build the public fingerprint (repo-safe, no private material) from a full pact.
 * Write this to p31-passport-anchor-pact.json.
 */
export function pactFingerprint(pact) {
  return {
    schema: ANCHOR_PACT_FINGERPRINT_SCHEMA,
    clientId: pact.clientId,
    publicKeyB64u: pact.publicKeyB64u,
    createdAt: pact.createdAt,
    note: "public-key fingerprint only — full signed pact at ~/.p31/anchor-pact.json",
  };
}
