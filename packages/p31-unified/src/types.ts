// P31 Arcade Unified Types
// Cross-game types for identity, progression, and spoon economy

export type GameId =
  | 'smallball'
  | 'gridiron'
  | 'cards'
  | 'strategy'
  | 'liquid-sculptor'
  | 'resonance-rings'
  | 'magnetic-poetry'
  | 'orbital-drift'
  | 'water-parksimulator';

export type SkillTrack =
  | 'athletics'
  | 'strategy'
  | 'creativity'
  | 'precision'
  | 'tactics'
  | 'intuition';

export interface PlayerAvatar {
  id: string;
  name: string;
  icon: string;
  color: string;
  level: number;
}

export interface GameProgress {
  level: number;
  xp: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  achievements: string[];
  lastPlayed: string; // ISO8601
  streak: number;
}

export interface UnifiedPlayer {
  id: string;
  displayName: string;
  avatar: PlayerAvatar;
  globalLevel: number;
  totalXP: number;
  skillTracks: Record<SkillTrack, number>;
  games: Record<GameId, GameProgress>;
  achievements: Achievement[];
  lastPlayed: Partial<Record<GameId, string>>;
  totalPlayTime: number;
  spoonState: SpoonState;
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  gameId: GameId;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  xpBonus: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface SpoonState {
  dailyBudget: number;
  usedToday: number;
  lastReset: string;
  recoveryRate: {
    passive: number;
    active: number;
    sleep: number;
  };
  current: number;
}

export type SpoonBudget = 1 | 3 | 6 | 9 | 12;

export interface GameModeConfig {
  gameId: GameId;
  mode: string;
  spoonCost: number;
  skillTrack: SkillTrack;
  description: string;
}

export const GAME_MODES: GameModeConfig[] = [
  // Sports (High Energy)
  { gameId: 'smallball', mode: 'training', spoonCost: 1, skillTrack: 'athletics', description: 'Pitch training practice' },
  { gameId: 'smallball', mode: 'game', spoonCost: 2, skillTrack: 'athletics', description: 'Full baseball game' },
  { gameId: 'gridiron', mode: 'play', spoonCost: 2, skillTrack: 'athletics', description: 'Quick football play' },
  { gameId: 'gridiron', mode: 'training', spoonCost: 1, skillTrack: 'athletics', description: 'QB training drills' },
  { gameId: 'gridiron', mode: 'match', spoonCost: 4, skillTrack: 'athletics', description: 'Full football match' },
  
  // Strategy (Medium Energy)
  { gameId: 'strategy', mode: 'chess-rapid', spoonCost: 2, skillTrack: 'strategy', description: 'Rapid chess (10 min)' },
  { gameId: 'strategy', mode: 'chess-blitz', spoonCost: 1, skillTrack: 'strategy', description: 'Blitz chess (3 min)' },
  { gameId: 'strategy', mode: 'chess-classical', spoonCost: 4, skillTrack: 'strategy', description: 'Classical chess (30 min)' },
  { gameId: 'strategy', mode: 'checkers-casual', spoonCost: 1, skillTrack: 'tactics', description: 'Casual checkers' },
  { gameId: 'strategy', mode: 'checkers-rated', spoonCost: 2, skillTrack: 'tactics', description: 'Rated checkers' },
  { gameId: 'strategy', mode: 'othello-casual', spoonCost: 1, skillTrack: 'tactics', description: 'Casual othello' },
  { gameId: 'strategy', mode: 'othello-rated', spoonCost: 2, skillTrack: 'tactics', description: 'Rated othello' },
  
  // Cards (Medium Energy)
  { gameId: 'cards', mode: 'crazy-eights', spoonCost: 1, skillTrack: 'tactics', description: 'Crazy Eights' },
  { gameId: 'cards', mode: 'hearts', spoonCost: 2, skillTrack: 'tactics', description: 'Hearts' },
  { gameId: 'cards', mode: 'euchre', spoonCost: 2, skillTrack: 'tactics', description: 'Euchre' },
  { gameId: 'cards', mode: 'bridge-lite', spoonCost: 3, skillTrack: 'strategy', description: 'Bridge Lite' },
  
  // Physics (Variable - zen modes are FREE!)
  { gameId: 'liquid-sculptor', mode: 'zen', spoonCost: 0, skillTrack: 'creativity', description: 'Fluid sculpting zen mode' },
  { gameId: 'liquid-sculptor', mode: 'challenge', spoonCost: 1, skillTrack: 'precision', description: 'Timed fluid challenges' },
  { gameId: 'liquid-sculptor', mode: 'create', spoonCost: 2, skillTrack: 'creativity', description: 'Create and save sculptures' },
  { gameId: 'resonance-rings', mode: 'free', spoonCost: 0, skillTrack: 'intuition', description: 'Free wave exploration' },
  { gameId: 'resonance-rings', mode: 'matcher', spoonCost: 1, skillTrack: 'intuition', description: 'Harmonic matching' },
  { gameId: 'resonance-rings', mode: 'theremin', spoonCost: 1, skillTrack: 'creativity', description: 'Play the wave theremin' },
  { gameId: 'magnetic-poetry', mode: 'sandbox', spoonCost: 0, skillTrack: 'creativity', description: 'Word sandbox' },
  { gameId: 'magnetic-poetry', mode: 'haiku', spoonCost: 1, skillTrack: 'creativity', description: 'Haiku composition' },
  { gameId: 'magnetic-poetry', mode: 'epic', spoonCost: 3, skillTrack: 'creativity', description: 'Epic poetry challenge' },
  { gameId: 'orbital-drift', mode: 'sandbox', spoonCost: 0, skillTrack: 'intuition', description: 'Gravity sandbox' },
  { gameId: 'orbital-drift', mode: 'level', spoonCost: 2, skillTrack: 'precision', description: 'Trajectory challenges' },
  { gameId: 'orbital-drift', mode: 'expert', spoonCost: 4, skillTrack: 'precision', description: 'Expert orbital puzzles' },
];

export const ZEN_MODES = GAME_MODES.filter(m => m.spoonCost === 0);
export const PAID_MODES = GAME_MODES.filter(m => m.spoonCost > 0);

export interface SkillBridge {
  from: {
    gameId: GameId;
    skill: string;
  };
  to: {
    gameId: GameId;
    boost: string;
    skillTrack: SkillTrack;
  };
  transferRate: number;
  minLevel: number;
  description: string;
}

export interface GameRecommendation {
  gameId: GameId;
  mode: string;
  spoonCost: number;
  reason: string;
  boostAmount: number;
}

export interface XPBreakdown {
  gameId: GameId;
  baseXP: number;
  skillBonus: number;
  streakBonus: number;
  bridgeBonus: number;
  totalXP: number;
}