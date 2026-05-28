/**
 * @p31/sentinel — SENTINEL guardrail logic
 * Enforces game access, session caps, and age-appropriate content
 */

import { isGameAllowed, GAME_CATALOG } from '@p31/core';
import type { GameId } from '@p31/core';

export interface SentinelEnforcement {
  allowed: boolean;
  reason?: string;
  maxMinutes?: number;
}

export function checkGameAccess(gameId: GameId, playerId: string): SentinelEnforcement {
  if (!isGameAllowed(gameId, playerId)) {
    return { allowed: false, reason: 'SENTINEL: Game not appropriate for this player' };
  }
  const config = GAME_CATALOG[gameId];
  return { allowed: true, maxMinutes: config.maxSessionMinutes };
}

export function generateSessionToken(playerId: string, gameId: GameId): string {
  const payload = { playerId, gameId, iat: Date.now(), exp: Date.now() + 3600000 };
  return btoa(JSON.stringify(payload));
}

export function verifySessionToken(token: string): { playerId: string; gameId: GameId } | null {
  try { return JSON.parse(atob(token)); }
  catch { return null; }
}

export const SENTINEL_POLICY = {
  name: 'SENTINEL Guardian',
  version: '2.0.0',
  rules: [
    'Zero ads — absolutely no advertising or external monetization',
    'Age-appropriate — W.J. restricted to whitelisted games',
    'Session limits — enforced countdown per game config',
    'Family-safe — all content reviewed, no external links in games',
    'CHUMP-funded — all infrastructure paid by bandwidth earnings',
  ],
} as const;
