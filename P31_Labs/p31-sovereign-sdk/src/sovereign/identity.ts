// src/sovereign/identity.ts
import bs58 from "bs58";

// Generate browser session key (non-extractable)
export async function generateSessionKey(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "Ed25519" },
    false, // non-extractable
    ["sign", "verify"]
  );
}

// Export public key as did:key
export async function publicKeyToDid(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  const bytes = new Uint8Array(raw);

  // Multicodec prefix for Ed25519: 0xed 0x01
  const prefixed = new Uint8Array(2 + bytes.length);
  prefixed[0] = 0xed;
  prefixed[1] = 0x01;
  prefixed.set(bytes, 2);

  // Base58btc encode
  const encoded = bs58.encode(prefixed);
  return `did:key:z${encoded}`;
}

// Sign data with session key
export async function signData(
  key: CryptoKey,
  data: Uint8Array
): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign("Ed25519", key, data as BufferSource);
  return new Uint8Array(sig);
}

// Verify signature
export async function verifySignature(
  publicKey: CryptoKey,
  signature: Uint8Array,
  data: Uint8Array
): Promise<boolean> {
  return crypto.subtle.verify("Ed25519", publicKey, signature, data as BufferSource);
}
