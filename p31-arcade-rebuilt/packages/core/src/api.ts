/**
 * @p31/core — Unified API client
 * Single source of truth for all external API calls with mock fallbacks
 */

const SMALLBALL_API = 'https://api-smallball.p31ca.org';
const GRIDIRON_API = 'https://api-gridiron.p31ca.org';
const CHUMP_EDGE = 'https://chump-edge.trimtab-signal.workers.dev';
const K4_MESH = 'https://k4-cage.p31ca.org';

// WCD-QM-01: Quantum frequencies
const LARMOR_PRIMARY = 863; // ³¹P in Earth's magnetic field
const LARMOR_SECONDARY = 172.35; // Phosphorus-31 nucleus resonance

function getLarmorPhase(): number {
  return (Date.now() * LARMOR_PRIMARY / 1000) % (2 * Math.PI);
}

async function fetchJson<T>(url: string, fallback: T, signal?: AbortSignal): Promise<T> {
  try {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (res.ok) return res.json();
    return fallback;
  } catch {
    return fallback;
  }
}

export interface HealthResponse {
  status: string; service: string; version: string;
  games: { smallball: { online: boolean; version: string }; gridiron: { online: boolean; version: string } };
  timestamp: number;
}

export interface PlayerIdentity {
  playerId: string; displayName: string; avatarHash: string;
  totalXp: number; level: number; achievements: Array<{ id: string; name: string; description: string; icon: string }>;
}

export interface LeaderboardEntry {
  rank: number; playerId: string; displayName: string; totalXp: number; level: number;
}

export async function getHealth(): Promise<HealthResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const result = await fetchJson(`${SMALLBALL_API}/api/health`, null, controller.signal);
  clearTimeout(timeout);
  return result;
}

export async function getIdentity(playerId: string): Promise<PlayerIdentity> {
  return fetchJson(
    `${SMALLBALL_API}/api/identity/${playerId}`,
    { playerId, displayName: `Player-${playerId.slice(-4)}`, avatarHash: playerId, totalXp: 0, level: 1, achievements: [] },
  );
}

export async function getLeaderboard(): Promise<{ leaderboard: LeaderboardEntry[]; totalPlayers: number }> {
  return fetchJson(
    `${SMALLBALL_API}/api/leaderboard`,
    { leaderboard: [
      { rank: 1, playerId: 'p31-001', displayName: 'Champ', totalXp: 15000, level: 5 },
      { rank: 2, playerId: 'p31-002', displayName: 'Runner', totalXp: 12000, level: 4 },
      { rank: 3, playerId: 'p31-003', displayName: 'Bronze', totalXp: 9000, level: 3 },
    ], totalPlayers: 3 },
  );
}

export async function getEarnings(playerId: string): Promise<{
  chumpMonthly: number; arcadeMonthly: number; availableCredits: number;
}> {
  return fetchJson(
    `${CHUMP_EDGE}/api/arcade/earnings?player=${playerId}`,
    { chumpMonthly: 450, arcadeMonthly: 30, availableCredits: 0 },
  );
}

export async function submitCareFlow(flow: {
  edge: string; amount: number; reason: string; timestamp: number;
}): Promise<boolean> {
  try {
    const res = await fetch(`${K4_MESH}/api/care-flow`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flow),
    });
    return res.ok;
  } catch { return false; }
}

// WCD-QM-01: Quantum API functions
export interface QuantumStateResponse {
  frequency: number;
  phase: number;
  timestamp: number;
  signature: string;
}

export interface QuantumEntangledPair {
  pairId: string;
  playerA: string;
  playerB: string;
  bellState: string;
  sharedState: {
    quantumPhase: number;
    atoms: Record<string, unknown>;
  };
}

export async function getQuantumState(): Promise<QuantumStateResponse> {
  return fetchJson(
    `${K4_MESH}/api/larmor`,
    {
      frequency: 863,
      phase: getLarmorPhase(),
      timestamp: Date.now(),
      signature: 'Ca₉(PO₄)₆',
    },
  );
}

export async function createEntangledPair(
  playerA: string,
  playerB: string,
): Promise<QuantumEntangledPair | null> {
  try {
    const res = await fetch(`${K4_MESH}/api/quantum/entangle/${playerA}/${playerB}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) return res.json();
    return null;
  } catch {
    return null;
  }
}

export async function getQuantumKey(): Promise<{ key: string; nonce: string; larmorPhase: number }> {
  return fetchJson(
    `${K4_MESH}/api/qkd/key`,
    {
      key: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))),
      nonce: `${Date.now()}-${Math.round(getLarmorPhase() * 1000)}`,
      larmorPhase: getLarmorPhase(),
    },
  );
}
