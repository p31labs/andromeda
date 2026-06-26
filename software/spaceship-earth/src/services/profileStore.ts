/**
 * @file profileStore — localStorage-backed user profile with friends and UCAN.
 *
 * Profile fields are non-sensitive metadata — localStorage is sufficient.
 * The cryptographic identity (DID key pair) lives in IndexedDB via genesisIdentity.ts.
 *
 * Constraints (per review):
 *   - Co-presence friend discovery (no relay storage)
 *   - Friends discovered through shared BONDING rooms only
 *   - UCAN delegation for cartridge sharing
 *   - Local-only profile storage (no cloud sync)
 *   - COPPA-compliant: no server-side friend storage
 */

const KEY_NAME = 'p31-profile-name';
const KEY_BIO  = 'p31-profile-bio';
const KEY_PUBLIC = 'p31-profile-public';
const KEY_FRIENDS = 'p31-friends';
const KEY_UCAN_TOKENS = 'p31-ucan-tokens';

export interface UserProfile {
  displayName: string;
  bio: string;
  isPublic: boolean;
}

export interface Friend {
  did: string;
  displayName: string;
  addedAt: number;
  lastSeen?: number;
}

export interface UCANToken {
  id: string;
  issuer: string;
  audience: string;
  cartridgeId: string;
  permissions: 'read';
  expiresAt: number;
  token: string;
}

export function loadProfile(): UserProfile {
  try {
    return {
      displayName: localStorage.getItem(KEY_NAME) ?? '',
      bio:         localStorage.getItem(KEY_BIO)  ?? '',
      isPublic:    localStorage.getItem(KEY_PUBLIC) === '1',
    };
  } catch {
    return { displayName: '', bio: '', isPublic: false };
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(KEY_NAME, profile.displayName.slice(0, 64));
    localStorage.setItem(KEY_BIO,  profile.bio.slice(0, 280));
    localStorage.setItem(KEY_PUBLIC, profile.isPublic ? '1' : '0');
  } catch {}
}

// ── Friend System (co-presence only) ─────────────────────────────────────────

export function loadFriends(): Friend[] {
  try {
    const stored = localStorage.getItem(KEY_FRIENDS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveFriends(friends: Friend[]): void {
  try {
    // Store max 50 friends
    localStorage.setItem(KEY_FRIENDS, JSON.stringify(friends.slice(0, 50)));
  } catch {}
}

export function addFriend(did: string, displayName: string): Friend | null {
  const friends = loadFriends();
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Check if already exists
  if (friends.some(f => f.did === did)) {
    return null;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  const friend: Friend = {
    did,
    displayName,
    addedAt: Date.now(),
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  friends.push(friend);
  saveFriends(friends);
  return friend;
}

export function removeFriend(did: string): void {
  const friends = loadFriends().filter(f => f.did !== did);
  saveFriends(friends);
}

// ── UCAN Delegation ───────────────────────────────────────────────────────────

export function loadUCANTokens(): UCANToken[] {
  try {
    const stored = localStorage.getItem(KEY_UCAN_TOKENS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveUCANTokens(tokens: UCANToken[]): void {
  try {
    // Store max 20 tokens
    localStorage.setItem(KEY_UCAN_TOKENS, JSON.stringify(tokens.slice(0, 20)));
  } catch {}
}

/**
 * Encode a string to Base64URL format (URL-safe, no padding).
 * Handles Unicode properly without btoa() limitations.
 */
function encodeBase64Url(str: string): string {
  // Use TextEncoder for proper UTF-8 encoding
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
<<<<<<< HEAD
  
  // Convert to base64
  let base64 = btoa(String.fromCharCode(...data));
  
=======

  // Convert to base64
  let base64 = btoa(String.fromCharCode(...data));

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Make URL-safe and remove padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a Base64URL string back to UTF-8.
 */
function decodeBase64Url(str: string): string {
  // Add padding if needed
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  const decoded = atob(base64);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}

/**
 * Generate a UCAN token for delegating cartridge access.
 * Uses base64url encoding with proper Unicode handling.
 */
export function generateUCANToken(
  issuerDID: string,
  audienceDID: string,
  cartridgeId: string,
  expiresInMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days
): UCANToken {
  const payload = {
    iss: issuerDID,
    aud: audienceDID,
    exp: Date.now() + expiresInMs,
    cat: cartridgeId,
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Use proper Base64Url encoding (handles Unicode, replaces +/ with -_)
  const token: UCANToken = {
    id: crypto.randomUUID(),
    issuer: issuerDID,
    audience: audienceDID,
    cartridgeId,
    permissions: 'read',
    expiresAt: Date.now() + expiresInMs,
    token: encodeBase64Url(JSON.stringify(payload)),
  };
<<<<<<< HEAD
  
  const tokens = loadUCANTokens();
  tokens.push(token);
  saveUCANTokens(tokens);
  
=======

  const tokens = loadUCANTokens();
  tokens.push(token);
  saveUCANTokens(tokens);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return token;
}

/**
 * Verify a UCAN token.
 */
export function verifyUCANToken(tokenString: string): UCANToken | null {
  try {
    const decoded = JSON.parse(decodeBase64Url(tokenString));
    const tokens = loadUCANTokens();
<<<<<<< HEAD
    
    // Find matching token
    const token = tokens.find(t => 
      t.token === tokenString && 
      t.expiresAt > Date.now()
    );
    
=======

    // Find matching token
    const token = tokens.find(t =>
      t.token === tokenString &&
      t.expiresAt > Date.now()
    );

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Revoke a UCAN token.
 */
export function revokeUCANToken(tokenId: string): void {
  const tokens = loadUCANTokens().filter(t => t.id !== tokenId);
  saveUCANTokens(tokens);
}
