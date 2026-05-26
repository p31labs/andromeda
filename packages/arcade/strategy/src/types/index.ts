// ============================================
// P31 STRATEGY BOARD CLASSICS - TYPES
// Chess | Checkers | Othello
// ============================================

// ============================================
// BOARD GEOMETRY (Shared 8×8)
// ============================================
export interface Position {
  row: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  col: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export type PieceType = 
  // Chess pieces
  | 'PAWN' | 'ROOK' | 'KNIGHT' | 'BISHOP' | 'QUEEN' | 'KING'
  // Checkers pieces
  | 'CHECKER' | 'CHECKER_KING'
  // Othello pieces
  | 'DISC';

export type PieceColor = 'WHITE' | 'BLACK';

export interface BoardPiece {
  id: string;  // CRDT UUID
  type: PieceType;
  color: PieceColor;
  position: Position;
  hasMoved: boolean;
  isCaptured?: boolean;
}

// ============================================
// GAME STATE BASE
// ============================================
export type GameId = 'chess' | 'checkers' | 'othello';

export interface Move {
  id: string;
  pieceId: string;
  from: Position;
  to: Position;
  capturedPieceId?: string;
  promotion?: PieceType;
  isEnPassant?: boolean;
  isCastle?: 'kingside' | 'queenside';
  resultingFlips?: Position[];  // Othello discs flipped
  timestamp: number;
  notation: string;
}

export interface BaseBoardState {
  gameId: GameId;
  matchId: string;
  pieces: BoardPiece[];
  currentTurn: PieceColor;
  moveHistory: Move[];
  legalMoves: Move[];
  capturedPieces: BoardPiece[];
  crdtClock: bigint;
  lastMoveAt: number;
}

// ============================================
// CHESS STATE
// ============================================
export interface ChessState extends BaseBoardState {
  gameId: 'chess';
  castlingRights: {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
  };
  enPassantTarget?: Position;
  halfmoveClock: number;
  fullmoveNumber: number;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

// ============================================
// CHECKERS STATE
// ============================================
export interface CheckersState extends BaseBoardState {
  gameId: 'checkers';
  forcedJumps: boolean;
  multiJumpInProgress?: {
    pieceId: string;
    requiredNextPositions: Position[];
  };
  blackPieces: number;
  whitePieces: number;
  isGameOver: boolean;
  winner?: PieceColor;
}

// ============================================
// OTHELLO STATE
// ============================================
export interface OthelloState extends BaseBoardState {
  gameId: 'othello';
  blackCount: number;
  whiteCount: number;
  emptyCount: number;
  validMoves: Position[];
  isGameOver: boolean;
  winner?: PieceColor | 'DRAW';
}

export type BoardState = ChessState | CheckersState | OthelloState;

// ============================================
// AI SYSTEM
// ============================================
export type AIDifficulty = 'beginner' | 'intermediate' | 'expert' | 'master';
export type AIPersonality = 'aggressive' | 'defensive' | 'positional' | 'balanced';

export interface AIConfig {
  difficulty: AIDifficulty;
  personality: AIPersonality;
  maxThinkTime: number;
  depthLimit: number;
  useOpeningBook: boolean;
  useEndgameTablebase: boolean;
}

export interface AIMoveResult {
  move: Move;
  confidence: number;
  alternatives: Array<{ move: Move; evaluation: number }>;
  calculationTime: number;
  nodesEvaluated: number;
}

// ============================================
// SPOON THEORY ADAPTATION
// ============================================
export type SpoonState = 1 | 3 | 6;

export interface SpoonAdaptation {
  highlightLegalMoves: boolean;
  showHints: boolean;
  maxUndos: number | 'unlimited';
  turnTimer: number | null;  // seconds, null = no timer
  aiAssistance: boolean;
  aiRecoveryMode: boolean;  // AI takes back bad moves at 1 spoon
}

export const SPOON_CONFIG: Record<SpoonState, SpoonAdaptation> = {
  1: {
    highlightLegalMoves: true,
    showHints: true,
    maxUndos: 'unlimited',
    turnTimer: null,
    aiAssistance: true,
    aiRecoveryMode: true,
  },
  3: {
    highlightLegalMoves: true,
    showHints: false,
    maxUndos: 3,
    turnTimer: 45,
    aiAssistance: false,
    aiRecoveryMode: false,
  },
  6: {
    highlightLegalMoves: false,
    showHints: false,
    maxUndos: 0,
    turnTimer: null,
    aiAssistance: false,
    aiRecoveryMode: false,
  },
};

// ============================================
// RATING SYSTEM
// ============================================
export interface GameRating {
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface StrategyRating {
  playerId: string;
  overall: number;
  chess: GameRating & {
    bestWinStreak: number;
    favoriteOpening?: string;
  };
  checkers: GameRating & {
    kingsPromoted: number;
    piecesCaptured: number;
  };
  othello: GameRating & {
    discsFlippedTotal: number;
    cornersControlled: number;
  };
}

export interface RatingChange {
  oldRating: number;
  newRating: number;
  delta: number;
  opponentRating: number;
  expectedScore: number;
  actualScore: number;
  kFactor: number;
}

// ============================================
// AI PERSONALITIES
// ============================================
export interface AIPersonalityConfig {
  name: string;
  game: GameId;
  style: AIPersonality;
  description: string;
  depth: number;
  blunderChance?: number;
  // Game-specific weights
  favorsSacrifice?: number;
  cornerWeight?: number;
  mobilityWeight?: number;
  favorsAttacks?: number;
  favorsSpace?: number;
  openingBook?: string;
  endgameTablebase?: boolean;
  conversionAccuracy?: number;
}

export const AI_PERSONALITIES: Record<string, AIPersonalityConfig> = {
  // Checkers
  hoppy: {
    name: 'Hoppy',
    game: 'checkers',
    style: 'aggressive',
    description: 'Loves to jump and trade pieces',
    depth: 4,
    blunderChance: 0.1,
    favorsSacrifice: 0.3,
  },
  
  // Othello
  corner: {
    name: 'Corner',
    game: 'othello',
    style: 'positional',
    description: 'Obsessed with corner control',
    depth: 6,
    cornerWeight: 2.0,
    mobilityWeight: 1.5,
  },
  
  // Chess
  tactician: {
    name: 'Tactician',
    game: 'chess',
    style: 'aggressive',
    description: 'Looks for forks, pins, and skewers',
    depth: 8,
    openingBook: 'italian',
    favorsAttacks: 0.7,
  },
  strategist: {
    name: 'Strategist',
    game: 'chess',
    style: 'positional',
    description: 'Controls center, builds slow advantages',
    depth: 8,
    openingBook: 'english',
    favorsSpace: 0.8,
  },
  endgame: {
    name: 'Endgame',
    game: 'chess',
    style: 'defensive',
    description: 'Deadly in simplified positions',
    depth: 10,
    endgameTablebase: true,
    conversionAccuracy: 0.95,
  },
};

// ============================================
// ACHIEVEMENTS
// ============================================
export interface Achievement {
  id: string;
  name: string;
  description: string;
  game: GameId | 'all';
  xpReward: number;
  condition: (stats: GameStats) => boolean;
}

export interface GameStats {
  gamesPlayed: number;
  wins: number;
  pawnsPromoted?: number;
  kingsCrowned?: number;
  cornersControlled?: number;
  discsFlipped?: number;
  checkmates?: number;
  perfectGames?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'pawn_promoter',
    name: 'Pawn Promoter',
    description: 'Promote 10 pawns in Chess',
    game: 'chess',
    xpReward: 100,
    condition: (s) => (s.pawnsPromoted || 0) >= 10,
  },
  {
    id: 'king_me',
    name: 'King Me',
    description: 'Crown 20 kings in Checkers',
    game: 'checkers',
    xpReward: 100,
    condition: (s) => (s.kingsCrowned || 0) >= 20,
  },
  {
    id: 'corner_master',
    name: 'Corner Master',
    description: 'Control all 4 corners in an Othello game',
    game: 'othello',
    xpReward: 150,
    condition: (s) => (s.cornersControlled || 0) >= 4,
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    description: 'Reach 2000 rating in any game',
    game: 'all',
    xpReward: 500,
    condition: () => false,  // Checked via rating
  },
  {
    id: 'triple_threat',
    name: 'Triple Threat',
    description: 'Win 10 games in each of the three games',
    game: 'all',
    xpReward: 300,
    condition: (s) => s.wins >= 10,
  },
];

// ============================================
// CROSS-GAME IDENTITY INTEGRATION
// ============================================
export interface CrossGameIdentity {
  id: string;
  rating: StrategyRating;
  totalXP: number;
  level: number;
  unlockedAchievements: string[];
  currentSpoonAllocation: SpoonState;
}

// XP Awards
export const XP_AWARDS = {
  CHECKERS_WIN: 25,
  OTHELLO_WIN: 50,
  CHESS_WIN: 100,
  CHESS_DRAW: 50,
  PERFECT_OTHELLO: 500,
  CHECKERS_12_CROWN: 200,
  SCHOLARS_MATE: 150,
};

// ============================================
// 3D BOARD RENDERING
// ============================================
export interface BoardConfig {
  squareSize: number;
  boardHeight: number;
  pieceHeight: number;
  colors: {
    darkSquare: string;
    lightSquare: string;
    highlightLegal: string;
    highlightLast: string;
    highlightCheck: string;
    whitePiece: string;
    blackPiece: string;
  };
}

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  squareSize: 1,
  boardHeight: 0.2,
  pieceHeight: 0.8,
  colors: {
    darkSquare: '#4a3728',
    lightSquare: '#d4c4a8',
    highlightLegal: '#00ffff',
    highlightLast: '#ffd700',
    highlightCheck: '#ff0000',
    whitePiece: '#f5f5f5',
    blackPiece: '#1a1a1a',
  },
};
