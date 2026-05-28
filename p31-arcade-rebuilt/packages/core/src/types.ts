/**
 * @p31/core — Shared types for the P31 Arcade ecosystem
 * Single source of truth for all game/player/session types
 */

export type PlayerId = 'sj' | 'wj';
export type GameId =
  | 'smallball'
  | 'gridiron'
  | 'cards'
  | 'strategy'
  | 'liquid-sculptor'
  | 'resonance-rings'
  | 'magnetic-poetry'
  | 'orbital-drift'
  | 'geodesic-builder';
export type GameCategory = 'sports' | 'strategy' | 'physics' | 'creative';
export type DomainMode = 'industry' | 'arcade' | 'chump' | 'love' | 'hybrid';
export type SpoonLevel = 1 | 3 | 6;
export type SessionMode = 'solo' | 'coop' | 'spectate';

export interface GameConfig {
  id: GameId;
  name: string;
  category: GameCategory;
  maxSessionMinutes: number;
  baseRate: number;
  learningBonus: number;
  coopEnabled: boolean;
  spectateEnabled: boolean;
  description: string;
  icon: string;
  color: string;
  url: string;
}

export interface UnifiedPlayer {
  id: PlayerId;
  displayName: string;
  globalSpoons: SpoonLevel;
  totalPlayTimeMinutes: number;
  credits: number;
}

export interface GameSession {
  sessionId: string;
  gameId: GameId;
  playerId: PlayerId;
  startTime: number;
  endTime?: number;
  durationMinutes: number;
  score?: number;
  scorePercentile?: number;
  mode: SessionMode;
  coopWith?: PlayerId;
  spectating?: PlayerId;
  creditsEarned: number;
}

export interface SpectateSession {
  sessionId: string;
  watcherId: PlayerId;
  playerId: PlayerId;
  gameId: GameId;
  startTime: number;
  endTime?: number;
  bothEarned: boolean;
  careFlowRecorded: boolean;
}

export interface K4CareFlow {
  edge: 'will→sj' | 'will→wj' | 'christyn→sj' | 'christyn→wj' | 'sj↔wj';
  amount: number;
  reason: string;
  timestamp: number;
  gameContext?: GameId;
}

export interface EarningsStack {
  chumpMonthly: number;
  arcadeMonthly: number;
  combined: number;
  availableCredits: number;
  lastPayout: number;
}

export interface GameState {
  balls: number;
  strikes: number;
  outs: number;
  inning: number;
  score: { home: number; away: number };
  [key: string]: unknown;
}

export interface GameOptions {
  deviceProfile?: DeviceProfile;
}

export interface DeviceProfile {
  name: string;
  maxDrawCalls: number;
  maxTriangles: number;
  maxTextureMemory: number;
  targetFPS: number;
  adaptiveQuality: boolean;
}
