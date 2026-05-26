// src/sovereign/ucan.ts — UCAN capability delegation
// After BLE pairing, SE050 signs a UCAN delegating capabilities to browser

export interface UCANPayload {
  iss: string;  // did:key of SE050 (hardware root)
  aud: string;  // did:key of browser session
  att: Array<{ can: string; with: string }>;  // capabilities
  exp: number;  // expiration (unix timestamp)
  prf: string[];  // proof chain (empty for root)
}

export interface SignedUCAN {
  payload: UCANPayload;
  signature: string;  // Base64 encoded Ed25519 signature
}

// Standard P31 capabilities
export const P31_CAPABILITIES = {
  TELEMETRY_RECORD: 'telemetry/record',
  MESH_TRANSMIT: 'mesh/transmit',
  EVIDENCE_SIGN: 'evidence/sign',
  HAPTIC_TRIGGER: 'haptic/trigger',
  STORAGE_READ: 'storage/read',
  STORAGE_WRITE: 'storage/write',
} as const;

export type P31Capability = typeof P31_CAPABILITIES[keyof typeof P31_CAPABILITIES];

export function createDelegation(
  hardwareDid: string,
  browserDid: string,
  capabilities: P31Capability[],
  ttlSeconds: number = 86400 // 24 hours
): UCANPayload {
  return {
    iss: hardwareDid,
    aud: browserDid,
    att: capabilities.map(can => ({ can, with: 'p31:*' })),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    prf: [],
  };
}

// Simulate hardware signing (in real implementation, this would be done by SE050)
export async function signUCAN(
  payload: UCANPayload,
  signingKey: CryptoKey
): Promise<SignedUCAN> {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign('Ed25519', signingKey, payloadBytes);
  
  return {
    payload,
    signature: arrayBufferToBase64(signature),
  };
}

// Verify UCAN signature
export async function verifyUCAN(
  ucan: SignedUCAN,
  publicKey: CryptoKey
): Promise<boolean> {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(ucan.payload));
  const signature = base64ToArrayBuffer(ucan.signature);
  
  return crypto.subtle.verify('Ed25519', publicKey, signature, payloadBytes);
}

// Check if UCAN grants a specific capability
export function hasCapability(
  ucan: SignedUCAN | null,
  capability: P31Capability
): boolean {
  if (!ucan) return false;
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (ucan.payload.exp <= now) return false;
  
  // Check capability
  return ucan.payload.att.some(attr => attr.can === capability);
}

// Get all capabilities from UCAN
export function getCapabilities(ucan: SignedUCAN | null): P31Capability[] {
  if (!ucan) return [];
  
  const now = Math.floor(Date.now() / 1000);
  if (ucan.payload.exp <= now) return [];
  
  return ucan.payload.att.map(attr => attr.can as P31Capability);
}

// Create a default UCAN for development (simulated hardware)
export async function createDevelopmentUCAN(
  hardwareDid: string,
  browserDid: string,
  signingKey: CryptoKey
): Promise<SignedUCAN> {
  const payload = createDelegation(
    hardwareDid,
    browserDid,
    [
      P31_CAPABILITIES.TELEMETRY_RECORD,
      P31_CAPABILITIES.EVIDENCE_SIGN,
      P31_CAPABILITIES.STORAGE_READ,
      P31_CAPABILITIES.STORAGE_WRITE,
    ],
    86400 * 7 // 7 days for development
  );
  
  return signUCAN(payload, signingKey);
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}