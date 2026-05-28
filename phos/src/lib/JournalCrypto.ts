/**
 * JournalCrypto.ts — AES-GCM encryption for the Sanctuary journal.
 *
 * Derives a symmetric encryption key from the WebAuthn device seal credential ID.
 * If no device seal exists, generates a random key for local-only use.
 *
 * Encryption: AES-GCM 256-bit with 96-bit random IV per entry.
 * Output format: base64(iv) + ":" + base64(ciphertext)
 *
 * Zero-telemetry: all operations use crypto.subtle — no network calls.
 */

const KEY_MATERIAL_STORAGE = "phos_journal_km";

interface StoredKeyMaterial {
  salt: string;
  iterations: number;
  createdAt: number;
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf.buffer;
}

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

async function deriveOrGenerateKey(): Promise<CryptoKey> {
  let salt: Uint8Array;

  try {
    const stored = localStorage.getItem(KEY_MATERIAL_STORAGE);
    if (stored) {
      const mat = JSON.parse(stored) as StoredKeyMaterial;
      salt = new Uint8Array(fromBase64(mat.salt));
    } else {
      salt = generateSalt();
      localStorage.setItem(
        KEY_MATERIAL_STORAGE,
        JSON.stringify({
          salt: toBase64(salt.buffer),
          iterations: 100_000,
          createdAt: Date.now(),
        })
      );
    }
  } catch {
    salt = generateSalt();
  }

  let keySource: ArrayBuffer;
  try {
    const credId = localStorage.getItem("phos_crypto_soul");
    if (credId) {
      keySource = fromBase64(credId);
    } else {
      keySource = crypto.getRandomValues(new Uint8Array(32)).buffer;
    }
  } catch {
    keySource = crypto.getRandomValues(new Uint8Array(32)).buffer;
  }

  const baseKey = await crypto.subtle.importKey(
    "raw",
    keySource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

let cachedKey: CryptoKey | null = null;
let keyPromise: Promise<CryptoKey> | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  if (keyPromise) return keyPromise;
  keyPromise = (async () => {
    cachedKey = await deriveOrGenerateKey();
    return cachedKey;
  })();
  return keyPromise;
}

export async function encryptEntry(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return `${toBase64(iv.buffer)}:${toBase64(ciphertext)}`;
}

export async function decryptEntry(encrypted: string): Promise<string> {
  const key = await getKey();
  const parts = encrypted.split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted format");

  const iv = new Uint8Array(fromBase64(parts[0]));
  const ciphertext = fromBase64(parts[1]);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

export async function encryptAndPackageEntries(
  entries: Array<{ id: string; text: string }>
): Promise<string> {
  const encrypted: Array<{ id: string; encryptedText: string }> = [];
  for (const entry of entries) {
    encrypted.push({
      id: entry.id,
      encryptedText: await encryptEntry(entry.text),
    });
  }
  return JSON.stringify(encrypted);
}

export async function decryptAndUnpackageEntries(
  raw: string
): Promise<Array<{ id: string; text: string }>> {
  const parsed = JSON.parse(raw) as Array<{ id: string; encryptedText: string }>;
  const results: Array<{ id: string; text: string }> = [];

  for (const entry of parsed) {
    const text = await decryptEntry(entry.encryptedText);
    results.push({ id: entry.id, text });
  }

  return results;
}

export function getKeyFingerprint(): string {
  try {
    const stored = localStorage.getItem(KEY_MATERIAL_STORAGE);
    if (stored) {
      const mat = JSON.parse(stored) as StoredKeyMaterial;
      return `phos-journal-key:${mat.createdAt}:${mat.salt.slice(0, 8)}`;
    }
  } catch {
    /* ignore */
  }
  return "phos-journal-key:unknown";
}

export async function isCryptoReady(): Promise<boolean> {
  try {
    const key = await getKey();
    if (!key) return false;
    const test = await encryptEntry("phos-crypto-test");
    const decrypted = await decryptEntry(test);
    return decrypted === "phos-crypto-test";
  } catch {
    return false;
  }
}
