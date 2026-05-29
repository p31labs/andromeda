/**
 * P31 Arcade Types - Four-Domain Centaur Architecture
 * Industry + Arcade + CHUMP + Love Economy
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

export interface GameConfig {
  id: GameId;
  name: string;
  category: GameCategory;
  maxSessionMinutes: number;
  baseRate: number; // Credits per hour
  learningBonus: number;
  coopEnabled: boolean;
  spectateEnabled: boolean;
  description: string;
  zenModeEligible: boolean;
}

export interface UnifiedPlayer {
  id: PlayerId;
  displayName: string;
  globalSpoons: number;
  totalPlayTimeMinutes: number;
  skillBridges: SkillBridge[];
  parentControls: ParentControls;
}

export interface ParentControls {
  dailyTimeLimitMinutes: number;
  requireBreaks: boolean;
  allowedGames: GameId[];
  spectateModeEnabled: boolean;
  chumpFundingEnabled: boolean;
}

export interface SkillBridge {
  fromGame: GameId;
  toGame: GameId;
  transferPercent: number;
  active: boolean;
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
  mode: 'solo' | 'coop' | 'spectate';
  coopWith?: PlayerId;
  spectating?: PlayerId;
  creditsEarned: number;
}

export interface K4CareFlow {
  edge: 'will→sj' | 'will→wj' | 'christyn→sj' | 'christyn→wj' | 'sj↔wj';
  amount: number;
  reason: string;
  timestamp: number;
  gameContext?: GameId;
}

export interface EarningsStack {
  chumpMonthly: number; // $450 base
  arcadeMonthly: number; // $30 pool
  combined: number; // $480
  availableCredits: number;
  lastPayout: number;
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

export interface CentaurAnalysis {
  industryContext?: string;
  arcadeIntegration?: string;
  familyGuardrails?: string;
  chumpSynergy?: string;
  loveEconomyImpact?: string;
  unifiedRecommendation?: string;
  detectedDomains: DomainMode[];
}

export interface ZenModeGame {
  gameId: GameId;
  estimatedSpoonCost: number;
  recommendedDuration: number;
  reason: string;
}
