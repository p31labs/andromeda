import type { PassportSession } from './types';

const SESSION_KEY = 'p31:passport:session';

export function saveSession(session: PassportSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* localStorage may be unavailable */
  }
}

export function loadSession(): PassportSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PassportSession;
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function isSessionValid(session: PassportSession | null): session is PassportSession {
  return session !== null && session.expiresAt > Date.now();
}
