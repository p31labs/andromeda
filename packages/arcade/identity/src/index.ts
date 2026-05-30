export type PlayerId = 'sj' | 'wj';

export interface PlayerIdentity {
  id: PlayerId;
  displayName: string;
  totalPlayMinutes: number;
  gamesPlayed: number;
  lastGame: string | null;
  lastPlayedAt: number | null;
}

const STORAGE_KEY = 'p31-arcade-player';

export function loadPlayer(): PlayerIdentity | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

export function savePlayer(player: PlayerIdentity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

export function createDefaultPlayer(id: PlayerId): PlayerIdentity {
  return {
    id,
    displayName: id === 'sj' ? 'S.J.' : 'W.J.',
    totalPlayMinutes: 0,
    gamesPlayed: 0,
    lastGame: null,
    lastPlayedAt: null,
  };
}
