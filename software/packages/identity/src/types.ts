export interface PassportIdentity {
  did: string;
  publicKey: string;
  algorithm: 'Ed25519';
  registeredAt: string;
  lastVerifiedAt: string | null;
}

export interface PassportSession {
  sessionId: string;
  did: string;
  expiresAt: number;
  issuedAt: number;
}

export interface RegisterRequest {
  did: string;
  publicKey: string;
  challenge: string;
  signature: string;
}

export interface VerifyRequest {
  did: string;
  challenge: string;
  signature: string;
}

export interface VerifyResponse {
  valid: boolean;
  error?: string;
  did?: string;
}

export interface RegisterResponse {
  success: boolean;
  did: string;
  error?: string;
}

export interface SessionResponse {
  sessionId: string;
  did: string;
  expiresAt: number;
  error?: string;
}

export interface IdentityResolution {
  did: string;
  publicKey: string | null;
  exists: boolean;
  error?: string;
}

export const PASSPORT_API_BASE = 'https://passport-api.p31ca.org';
export const DID_KEY_PREFIX = 'did:key:z';
