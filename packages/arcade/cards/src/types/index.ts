// P31 Card Table: Complete Type System (10000% Convergence)
// Family card game pack with Spoon Theory accessibility

// ============================================
// CARD SYSTEM
// ============================================

export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J, 12=Q, 13=K, 14=A

export const SUIT_SYMBOLS: Record<Suit, string> = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
  SPADES: '♠',
};

export const RANK_LABELS: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export interface Card {
  id: string;  // UUID for CRDT
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  position: CardPosition;
  owner: PlayerId;
}

export interface CardPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;  // radians
}

export type PlayerId = 'player' | 'ai-north' | 'ai-east' | 'ai-west';

// ============================================
// GAME TYPES
// ============================================

export type GameId = 'crazy-eights' | 'hearts' | 'euchre' | 'bridge-lite';

export interface CardGame {
  id: GameId;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  deckCount: number;  // 1 or 2 decks
  rules: GameRules;
  aiDifficulty: 'beginner' | 'intermediate' | 'expert';
  spoonCost: number;  // Spoons required per game
}

export interface GameRules {
  trickTaking: boolean;
  bidding: boolean;
  trumpSuit: boolean | 'fixed' | 'dynamic';
  specialCards: SpecialCard[];
  scoring: 'tricks' | 'points' | 'bid-fulfillment';
  winCondition: 'first-to-score' | 'lowest-score' | 'most-tricks' | 'target-score';
  targetScore?: number;
  maxHands?: number;
}

export interface SpecialCard {
  card: string;  // e.g., "8-ANY" for Crazy Eights
  effect: string;
  description: string;
}

export const GAMES: Record<GameId, CardGame> = {
  'crazy-eights': {
    id: 'crazy-eights',
    name: 'Crazy Eights',
    minPlayers: 2,
    maxPlayers: 4,
    deckCount: 1,
    rules: {
      trickTaking: false,
      bidding: false,
      trumpSuit: false,
      specialCards: [
        { card: '8-ANY', effect: 'wild', description: '8s are wild - change suit' },
        { card: '2-DRAW', effect: 'draw2', description: '2 forces next player to draw 2' },
        { card: 'J-SKIP', effect: 'skip', description: 'Jack skips next player' },
      ],
      scoring: 'points',
      winCondition: 'lowest-score',
      targetScore: 100,
    },
    aiDifficulty: 'beginner',
    spoonCost: 1,
  },
  'hearts': {
    id: 'hearts',
    name: 'Hearts',
    minPlayers: 4,
    maxPlayers: 4,
    deckCount: 1,
    rules: {
      trickTaking: true,
      bidding: false,
      trumpSuit: false,
      specialCards: [
        { card: 'Q-SPADES', effect: '13-points', description: 'Queen of Spades = 13 penalty points' },
        { card: 'HEARTS-ALL', effect: '1-point-each', description: 'Each heart = 1 penalty point' },
      ],
      scoring: 'points',
      winCondition: 'lowest-score',
      targetScore: 100,
    },
    aiDifficulty: 'intermediate',
    spoonCost: 2,
  },
  'euchre': {
    id: 'euchre',
    name: 'Euchre',
    minPlayers: 4,
    maxPlayers: 4,
    deckCount: 1,
    rules: {
      trickTaking: true,
      bidding: true,
      trumpSuit: 'dynamic',
      specialCards: [
        { card: 'J-TRUMP-RIGHT', effect: 'right-bower', description: 'Right bower (trump jack) highest' },
        { card: 'J-TRUMP-LEFT', effect: 'left-bower', description: 'Left bower (same color jack) second highest' },
      ],
      scoring: 'tricks',
      winCondition: 'target-score',
      targetScore: 10,
    },
    aiDifficulty: 'intermediate',
    spoonCost: 3,
  },
  'bridge-lite': {
    id: 'bridge-lite',
    name: 'Bridge Lite',
    minPlayers: 4,
    maxPlayers: 4,
    deckCount: 1,
    rules: {
      trickTaking: true,
      bidding: true,
      trumpSuit: 'dynamic',
      specialCards: [],
      scoring: 'bid-fulfillment',
      winCondition: 'target-score',
      targetScore: 100,
    },
    aiDifficulty: 'expert',
    spoonCost: 4,
  },
};

// ============================================
// TRICK & HAND
// ============================================

export interface Trick {
  id: string;
  leadPlayer: PlayerId;
  cards: PlayedCard[];  // In play order
  winner: PlayerId | null;
  trumpSuit?: Suit;
  leadSuit?: Suit;
}

export interface PlayedCard {
  playerId: PlayerId;
  card: Card;
  timestamp: string;
}

export interface Hand {
  playerId: string;
  cards: Card[];
  bid?: number;
  tricksWon: number;
  score: number;
}

// ============================================
// MATCH STATE
// ============================================

export type GamePhase = 'dealing' | 'bidding' | 'playing' | 'scoring' | 'finished';

export interface MatchState {
  gameId: GameId;
  matchId: string;  // CRDT UUID
  deck: Card[];
  discardPile: Card[];
  players: Player[];
  tricks: Trick[];
  currentTrick: Trick | null;
  turnOrder: PlayerId[];
  currentPlayer: PlayerId;
  gamePhase: GamePhase;
  scores: Record<PlayerId, number>;
  teamScores?: Record<string, number>;  // For partnership games
  crdtClock: bigint;
  lastActionAt: string;
  
  // Game-specific state
  currentSuit?: Suit;  // For Crazy Eights - current suit to match
  trumpSuit?: Suit;  // For Euchre/Bridge
  bidWinner?: PlayerId;  // Who won the bid
  tricksBid?: Record<PlayerId, number>;  // Bids made
  heartsBroken?: boolean;  // Hearts specific
  shootTheMoon?: boolean;  // Hearts specific
  goingAlone?: boolean;  // Euchre - maker going alone
}

export interface Player {
  id: PlayerId;
  type: 'human' | 'ai';
  personalityId: string;
  hand: Hand;
  team?: 'team-a' | 'team-b';  // For partnership games
  isDealer: boolean;
}

// ============================================
// AI SYSTEM
// ============================================

export interface AIPersonality {
  id: string;
  name: string;
  biddingStyle: 'aggressive' | 'conservative' | 'mathematical' | 'intuitive';
  playStyle: 'trump-early' | 'save-trump' | 'even-distribution' | 'slough-high';
  bluffing: number;  // 0-1
  riskTolerance: number;  // 0-1
  patternRecognition: number;  // 0-1, how well they track played cards
  memoryStrength: number;  // 0-1, how many cards they remember
}

export const AI_PERSONALITIES: AIPersonality[] = [
  {
    id: 'nana',
    name: 'Nana',
    biddingStyle: 'conservative',
    playStyle: 'save-trump',
    bluffing: 0.1,
    riskTolerance: 0.2,
    patternRecognition: 0.3,
    memoryStrength: 0.4,
  },
  {
    id: 'ace',
    name: 'Ace',
    biddingStyle: 'aggressive',
    playStyle: 'trump-early',
    bluffing: 0.7,
    riskTolerance: 0.8,
    patternRecognition: 0.9,
    memoryStrength: 0.9,
  },
  {
    id: 'buddy',
    name: 'Buddy',
    biddingStyle: 'mathematical',
    playStyle: 'even-distribution',
    bluffing: 0.4,
    riskTolerance: 0.5,
    patternRecognition: 0.6,
    memoryStrength: 0.7,
  },
  {
    id: 'scout',
    name: 'Scout',
    biddingStyle: 'intuitive',
    playStyle: 'slough-high',
    bluffing: 0.3,
    riskTolerance: 0.4,
    patternRecognition: 0.8,
    memoryStrength: 0.6,
  },
];

export interface AIMemory {
  cardsPlayed: Map<string, Card[]>;  // playerId -> cards they've played
  knownVoidSuits: Map<string, Suit[]>;  // playerId -> suits they don't have
  currentHandEstimate: Map<string, number>;  // playerId -> estimated cards remaining
}

// ============================================
// SPOON THEORY UX
// ============================================

export type SpoonState = 1 | 3 | 6;

export interface SpoonAdaptation {
  mode: 'auto-play' | 'assisted' | 'competitive';
  showHints: boolean;
  allowUndo: boolean;
  timerSeconds: number | null;  // null = no timer
  autoSuggest: boolean;  // AI suggests moves
  simplifiedBidding: boolean;  // Hide complex bidding options
  scoreVisibility: 'hidden' | 'simple' | 'full';
  animationSpeed: number;  // 0.5 = slow, 1.0 = normal
  cardPreview: boolean;  // Show what happens before confirming
}

export const SPOON_CONFIG: Record<SpoonState, SpoonAdaptation> = {
  1: {
    mode: 'auto-play',
    showHints: true,
    allowUndo: true,
    timerSeconds: null,
    autoSuggest: true,
    simplifiedBidding: true,
    scoreVisibility: 'hidden',
    animationSpeed: 0.5,
    cardPreview: true,
  },
  3: {
    mode: 'assisted',
    showHints: true,
    allowUndo: true,
    timerSeconds: 45,
    autoSuggest: false,
    simplifiedBidding: true,
    scoreVisibility: 'simple',
    animationSpeed: 0.75,
    cardPreview: true,
  },
  6: {
    mode: 'competitive',
    showHints: false,
    allowUndo: false,
    timerSeconds: 30,
    autoSuggest: false,
    simplifiedBidding: false,
    scoreVisibility: 'full',
    animationSpeed: 1.0,
    cardPreview: false,
  },
};

export interface SpoonAllocation {
  playerId: string;
  date: string;
  totalSpoons: number;
  usedSpoons: number;
  recoveryRate: number;
  manuallySet: boolean;
  crdtClock: bigint;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getSuitColor(suit: Suit): 'red' | 'black' {
  return suit === 'HEARTS' || suit === 'DIAMONDS' ? 'red' : 'black';
}

export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

export function getLevelProgress(identity: CrossGameIdentity): {
  current: number;
  next: number;
  percentage: number;
} {
  const currentLevelXP = XP_FORMULA.levelToXP(identity.globalLevel);
  const nextLevelXP = XP_FORMULA.levelToXP(identity.globalLevel + 1);
  const progress = identity.totalXP - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;

  return {
    current: progress,
    next: needed,
    percentage: Math.min(100, Math.round((progress / needed) * 100)),
  };
}

// ============================================
// CROSS-GAME IDENTITY
// ============================================

export interface CrossGameIdentity {
  playerId: string;
  globalLevel: number;
  totalXP: number;
  gamesPlayed: {
    smallball: number;
    gridiron: number;
    cards: number;
  };
  achievements: CrossGameAchievement[];
  avatar: {
    primaryColor: string;
    secondaryColor: string;
    pattern: string;
  };
  cardUnlocks: CardUnlocks;
  lastSyncedAt: string;
}

export interface CrossGameAchievement {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: string | null;
  progress: number;
  required: number;
}

export interface CardUnlocks {
  cardBacks: string[];
  tableThemes: string[];
  avatars: string[];
}

export const CARD_ACHIEVEMENTS = [
  {
    id: 'card_shark',
    name: 'Card Shark',
    description: 'Win 10 hands across all card games',
    rarity: 'common' as const,
    required: 10,
  },
  {
    id: 'grand_slam',
    name: 'Grand Slam',
    description: 'Win all 5 tricks in a Euchre hand',
    rarity: 'rare' as const,
    required: 1,
  },
  {
    id: 'heart_breaker',
    name: 'Heart Breaker',
    description: 'Successfully shoot the moon in Hearts',
    rarity: 'epic' as const,
    required: 1,
  },
  {
    id: 'bridge_builder',
    name: 'Bridge Builder',
    description: 'Complete 5 Bridge Lite rubbers',
    rarity: 'rare' as const,
    required: 5,
  },
  {
    id: 'table_master',
    name: 'Table Master',
    description: 'Win at least once in all 4 card games',
    rarity: 'epic' as const,
    required: 4,
  },
  {
    id: 'crazy_eights_champion',
    name: 'Crazy Eights Champion',
    description: 'Win 20 games of Crazy Eights',
    rarity: 'common' as const,
    required: 20,
  },
  {
    id: 'euchre_expert',
    name: 'Euchre Expert',
    description: 'Win 15 games of Euchre',
    rarity: 'rare' as const,
    required: 15,
  },
];

// XP Awards
export const XP_AWARDS = {
  winHand: 50,
  shootTheMoon: 200,
  completeRubber: 300,
  euchreMarch: 150,
  playAnyGame: 25,
  winGame: 100,
};

// XP Formula: level = 1000 * n * (n + 1) / 2
export const XP_FORMULA = {
  levelToXP: (level: number): number => 1000 * level * (level + 1) / 2,
  xpToLevel: (xp: number): number => Math.floor((-1 + Math.sqrt(1 + 8 * xp / 1000)) / 2),
  xpForNextLevel: (currentLevel: number): number => {
    const nextLevel = currentLevel + 1;
    return 1000 * nextLevel * (nextLevel + 1) / 2;
  },
};

// ============================================
// DATABASE SCHEMA TYPES (PGLite)
// ============================================

export interface DBMatch {
  id: string;
  game_id: GameId;
  match_state: string;  // JSON serialized MatchState
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  winner: PlayerId | null;
  final_scores: string;  // JSON Record<PlayerId, number>
}

export interface DBPlayerStats {
  player_id: string;
  identity_id: string;
  games_played: number;
  games_won: number;
  total_hands_played: number;
  total_hands_won: number;
  favorite_game: GameId | null;
  total_xp_earned: number;
  last_played_at: string;
  created_at: string;
  updated_at: string;
}

export interface DBGameHistory {
  id: string;
  match_id: string;
  game_id: GameId;
  player_id: string;
  action_type: 'play' | 'bid' | 'pass' | 'draw';
  action_data: string;  // JSON
  timestamp: string;
  crdt_clock: bigint;
}

// ============================================
// UI & RENDERING
// ============================================

export interface CardRenderProps {
  card: Card;
  isPlayable: boolean;
  isSelected: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
  scale?: number;
  animate?: boolean;
}

export interface TableConfig {
  woodTexture: string;
  feltColor: string;
  lighting: 'day' | 'evening' | 'night';
  cameraAngle: { x: number; y: number; z: number };
}

export interface AnimationConfig {
  dealSpeed: number;  // seconds per card
  shuffleDuration: number;
  cardFlipDuration: number;
  trickCollectionDelay: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface SyncResponse {
  matchesUpdated: number;
  xpGained: number;
  achievementsUnlocked: string[];
  timestamp: string;
}

export interface XPAwardResult {
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  previousLevel: number;
  achievementsUnlocked: CrossGameAchievement[];
}
