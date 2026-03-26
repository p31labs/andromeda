/**
 * P31 Labs: Post-Quantum Cryptography (PQC) Primitives
 * ---------------------------------------------------------
 * Drop-in replacements for classical cryptographic functions
 * vulnerable to Grover's Algorithm.
 */

import * as crypto from 'crypto';

/**
 * Phase 1 Fix: Upgrades SHA-256 to SHA-512.
 * Grover's algorithm halves the effective bit strength of hashes.
 * SHA-512 provides 256 bits of post-quantum security, matching classical SHA-256.
 * 
 * @param data - The string or buffer to hash (e.g., CID, IPFS data)
 * @returns Hexadecimal string of the SHA-512 hash
 */
export const generateQuantumSafeHash = (data: string | Buffer): string => {
  return crypto.createHash('sha512').update(data).digest('hex');
};

/**
 * Phase 2/3 Fix: Uses FIPS 202 SHAKE256 Extendable-Output Function (XOF).
 * Ideal for advanced quantum-resistant signature schemes and custom key generation.
 * 
 * @param data - The input data to hash
 * @param outputLengthBytes - Desired length of the hash in bytes (default: 64 for 512 bits)
 * @returns Hexadecimal string of the SHAKE256 hash
 */
export const generateShake256Hash = (data: string | Buffer, outputLengthBytes: number = 64): string => {
  // Node.js crypto supports shake256. We use 'shake256' and specify output length.
  const hash = crypto.createHash('shake256', { outputLength: outputLengthBytes });
  return hash.update(data).digest('hex');
};

/**
 * Utility to generate a post-quantum safe random seed (e.g., for QKD simulation)
 * Generates 512 bits (64 bytes) of high-entropy random data.
 */
export const generateQuantumSafeSeed = (): string => {
  return crypto.randomBytes(64).toString('hex');
};