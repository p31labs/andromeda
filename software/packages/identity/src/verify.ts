import {
  publicKeyToDid,
  verifySignature,
} from '@p31/sovereign/identity';
import { DID_KEY_PREFIX } from './types';

export function isDidFormat(did: string): boolean {
  return did.startsWith(DID_KEY_PREFIX) && did.length >= 48;
}

export function formatDidError(did: string): string {
  if (!did.startsWith(DID_KEY_PREFIX)) {
    return `DID must start with ${DID_KEY_PREFIX}. Got: ${did.slice(0, 20)}...`;
  }
  if (did.length < 48) {
    return `DID too short (${did.length} chars). Expected ≥ 48 for did:key:z format.`;
  }
  return 'Unknown DID format error';
}

export async function importPublicKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    raw as BufferSource,
    { name: 'Ed25519' },
    true,
    ['verify'],
  );
}

export async function verifyChallenge(
  publicKeyBytes: Uint8Array,
  challenge: string,
  signature: Uint8Array,
): Promise<boolean> {
  const key = await importPublicKey(publicKeyBytes);
  const data = new TextEncoder().encode(challenge);
  return verifySignature(key, signature, data);
}
