/**
 * P31 Worker Crypto Utilities
 *
 * Standard cryptographic helpers for P31 Cloudflare Workers.
 * One source for crypto patterns across the worker fleet.
 *
 * @module @p31/worker-utils/crypto
 */

/**
 * Generate a cryptographically secure UUID v4
 */
export function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Generate a secure random ID with optional prefix
 */
export function generateId(prefix?: string): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}:${id}` : id;
}

/**
 * Encode ArrayBuffer to base64url string
 */
export function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Decode base64url string to Uint8Array
 */
export function fromB64url(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b + "=".repeat((4 - (b.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/**
 * Encode string to base64url
 */
export function b64urlFromString(s: string): string {
  return b64url(new TextEncoder().encode(s));
}

/**
 * Generate a secure random token
 */
export function generateToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return b64url(bytes);
}

/**
 * SHA-256 hash
 */
export async function sha256(data: string | Uint8Array): Promise<Uint8Array> {
  const encoded =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
}

/**
 * Time-constant comparison to prevent timing attacks
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Simple HMAC-SHA256 using SubtleCrypto
 */
export async function hmac(
  key: Uint8Array,
  message: string | Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data =
    typeof message === "string" ? new TextEncoder().encode(message) : message;
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data));
}
