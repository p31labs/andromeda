/**
 * @file profileStore — localStorage-backed user profile (display name, bio).
 *
 * Profile fields are non-sensitive metadata — localStorage is sufficient.
 * The cryptographic identity (DID key pair) lives in IndexedDB via genesisIdentity.ts.
 */

const KEY_NAME = 'p31-profile-name';
const KEY_BIO  = 'p31-profile-bio';

export interface UserProfile {
  displayName: string;
  bio: string;
}

export function loadProfile(): UserProfile {
  try {
    return {
      displayName: localStorage.getItem(KEY_NAME) ?? '',
      bio:         localStorage.getItem(KEY_BIO)  ?? '',
    };
  } catch {
    return { displayName: '', bio: '' };
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(KEY_NAME, profile.displayName.slice(0, 64));
    localStorage.setItem(KEY_BIO,  profile.bio.slice(0, 280));
  } catch {}
}
