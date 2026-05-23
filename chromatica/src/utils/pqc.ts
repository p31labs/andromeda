/**
 * PQC Utilities for Chromatica
 */

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Hash data using SHA-256
 */
export async function sha256(data: string | Uint8Array): Promise<string> {
  const buffer = typeof data === 'string' 
    ? new TextEncoder().encode(data) 
    : data;
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encode to base64
 */
export function toBase64(data: string | Uint8Array): string {
  if (typeof data === 'string') {
    return btoa(data);
  }
  const binary = Array.from(data).map(b => String.fromCharCode(b)).join('');
  return btoa(binary);
}

/**
 * Decode base64
 */
export function fromBase64(base64: string): string {
  return atob(base64);
}

/**
 * Convert hex to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes to hex
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sign project data with ML-DSA-65 (mock implementation)
 */
export async function signProject(
  projectData: Record<string, unknown>,
  secretKey: Uint8Array
): Promise<string> {
  const dataString = JSON.stringify(projectData);
  const hash = await sha256(dataString);
  // Mock signature - in production use actual ML-DSA-65
  return `ml-dsa-65-${hash.substring(0, 64)}`;
}

/**
 * Verify project signature
 */
export async function verifyProjectSignature(
  projectData: Record<string, unknown>,
  signature: string,
  publicKey: Uint8Array
): Promise<boolean> {
  // Mock verification - in production use actual ML-DSA-65 verification
  return signature.startsWith('ml-dsa-65-');
}

/**
 * Encrypt asset with ML-KEM-768 (mock implementation)
 */
export async function encryptAsset(
  data: Uint8Array,
  publicKey: Uint8Array
): Promise<{ ciphertext: string; encryptedKey: string }> {
  // Mock encryption - in production use actual ML-KEM-768
  const ciphertext = toBase64(data);
  const encryptedKey = toBase64(publicKey.slice(0, 32));
  
  return { ciphertext, encryptedKey };
}

// PQC Algorithm Constants
export const PQC_CONSTANTS = {
  ML_KEM_768: {
    PUBLIC_KEY_SIZE: 1184,
    SECRET_KEY_SIZE: 2400,
    CIPHERTEXT_SIZE: 1088
  },
  ML_DSA_65: {
    PUBLIC_KEY_SIZE: 1952,
    SECRET_KEY_SIZE: 4032,
    SIGNATURE_SIZE: 3293
  }
} as const;
