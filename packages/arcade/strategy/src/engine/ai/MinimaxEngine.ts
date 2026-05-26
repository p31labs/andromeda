// ============================================
// MINIMAX ENGINE WITH ALPHA-BETA PRUNING
// ============================================

import type { 
  BoardState, 
  Move, 
  AIMoveResult, 
  AIConfig, 
  GameId,
  ChessState,
  CheckersState,
  OthelloState,
} from '../../types';
import { generateChessMoves, applyMove as applyChessMove } from '../rules/chessRules';
import { evaluateCheckersPosition, generateCheckersMoves, applyMove as applyCheckersMove } from '../rules/checkersRules';
import { evaluateOthelloPosition, generateOthelloMoves, applyMove as applyOthelloMove } from '../rules/othelloRules';

// ============================================
// ENGINE CONFIGURATION
// ============================================

const DEFAULT_CONFIG: AIConfig = {
  difficulty: 'intermediate',
  personality: 'balanced',
  maxThinkTime: 5000,
  depthLimit: 4,
  useOpeningBook: false,
  useEndgameTablebase: false,
};

const DEPTH_BY_DIFFICULTY: Record<string, number> = {
  beginner: 2,
  intermediate: 4,
  expert: 6,
  master: 8,
};

// Blunder chance by difficulty (percentage)
const BLUNDER_CHANCE: Record<string, number> = {
  beginner: 0.15,
  intermediate: 0.05,
  expert: 0.0,
  master: 0.0,
};

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

export async function calculateBestMove(
  state: BoardState,
  config: Partial<AIConfig> = {}
): Promise<AIMoveResult> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  fullConfig.depthLimit = DEPTH_BY_DIFFICULTY[fullConfig.difficulty] || 4;
  
  const startTime = Date.now();
  const gameId = state.gameId;
  
  // Generate all legal moves
  const legalMoves = getLegalMoves(state);
  
  if (legalMoves.length === 0) {
    throw new Error('No legal moves available');
  }
  
  if (legalMoves.length === 1) {
    return {
      move: legalMoves[0],
      confidence: 0.5,
      alternatives: [],
      calculationTime: Date.now() - startTime,
      nodesEvaluated: 1,
    };
  }
  
  // Random blunder for beginner/intermediate
  if (Math.random() < BLUNDER_CHANCE[fullConfig.difficulty]) {
    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    return {
      move: randomMove,
      confidence: 0.3,
      alternatives: [],
      calculationTime: Date.now() - startTime,
      nodesEvaluated: 1,
    };
  }
  
  // Run minimax
  let nodesEvaluated = 0;
  
  const results = legalMoves.map(move => {
    const newState = applyMove(state, move);
    const score = minimax(
      newState,
      fullConfig.depthLimit - 1,
      -Infinity,
      Infinity,
      false,
      gameId,
      () => nodesEvaluated++
    );
    return { move, score };
  });
  
  // Sort by score (descending for current player)
  results.sort((a, b) => b.score - a.score);
  
  const bestResult = results[0];
  const bestScore = bestResult.score;
  
  // Calculate confidence based on score difference
  const secondBestScore = results[1]?.score ?? bestScore;
  const scoreDiff = Math.abs(bestScore - secondBestScore);
  const confidence = Math.min(0.95, 0.5 + scoreDiff / 200);
  
  const calculationTime = Date.now() - startTime;
  
  return {
    move: bestResult.move,
    confidence,
    alternatives: results.slice(1, 4).map(r => ({
      move: r.move,
      evaluation: r.score,
    })),
    calculationTime,
    nodesEvaluated,
  };
}

// ============================================
// MINIMAX WITH ALPHA-BETA PRUNING
// ============================================

function minimax(
  state: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  gameId: GameId,
  onNodeEvaluated: () => void
): number {
  onNodeEvaluated();
  
  // Terminal conditions
  if (depth === 0) {
    return evaluatePosition(state, gameId);
  }
  
  const legalMoves = getLegalMoves(state);
  
  if (legalMoves.length === 0) {
    // Game over - return extreme score
    return isMaximizing ? -10000 : 10000;
  }
  
  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of legalMoves) {
      const newState = applyMove(state, move);
      const score = minimax(newState, depth - 1, alpha, beta, false, gameId, onNodeEvaluated);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;  // Alpha-beta pruning
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of legalMoves) {
      const newState = applyMove(state, move);
      const score = minimax(newState, depth - 1, alpha, beta, true, gameId, onNodeEvaluated);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;  // Alpha-beta pruning
    }
    return minScore;
  }
}

// ============================================
// GAME-SPECIFIC WRAPPERS
// ============================================

function getLegalMoves(state: BoardState): Move[] {
  switch (state.gameId) {
    case 'chess':
      return generateChessMoves(state as ChessState);
    case 'checkers':
      return generateCheckersMoves(state as CheckersState);
    case 'othello':
      return generateOthelloMoves(state as OthelloState);
  }
}

function applyMove(state: BoardState, move: Move): BoardState {
  switch (state.gameId) {
    case 'chess':
      return applyChessMove(state as ChessState, move);
    case 'checkers':
      return applyCheckersMove(state as CheckersState, move);
    case 'othello':
      return applyOthelloMove(state as OthelloState, move);
  }
}

function evaluatePosition(state: BoardState, gameId: GameId): number {
  switch (gameId) {
    case 'chess': {
      const chessState = state as ChessState;
      if (chessState.isCheckmate) return chessState.currentTurn === 'WHITE' ? -10000 : 10000;
      if (chessState.isDraw) return 0;
      return evaluateChessPosition(chessState);
    }
    case 'checkers': {
      const checkersState = state as CheckersState;
      if (checkersState.isGameOver) {
        if (checkersState.winner) {
          return checkersState.winner === 'WHITE' ? -10000 : 10000;
        }
        return 0;
      }
      return evaluateCheckersPosition(checkersState);
    }
    case 'othello': {
      const othelloState = state as OthelloState;
      if (othelloState.isGameOver) {
        const diff = othelloState.blackCount - othelloState.whiteCount;
        if (othelloState.winner === 'DRAW') return 0;
        return othelloState.winner === 'BLACK' ? 10000 : -10000;
      }
      return evaluateOthelloPosition(othelloState);
    }
  }
}

// ============================================
// CHESS EVALUATION
// ============================================

const PIECE_VALUES: Record<string, number> = {
  PAWN: 100,
  KNIGHT: 320,
  BISHOP: 330,
  ROOK: 500,
  QUEEN: 900,
  KING: 20000,
};

// Piece-square tables (position bonuses)
const PAWN_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0],
];

function evaluateChessPosition(state: ChessState): number {
  let score = 0;
  const pieces = state.pieces.filter(p => !p.isCaptured);
  
  for (const piece of pieces) {
    const value = PIECE_VALUES[piece.type] || 0;
    let positionBonus = 0;
    
    // Add position bonus for pawns
    if (piece.type === 'PAWN') {
      const row = piece.color === 'WHITE' ? piece.position.row : 7 - piece.position.row;
      positionBonus = PAWN_TABLE[row][piece.position.col];
    }
    
    if (piece.color === 'WHITE') {
      score += value + positionBonus;
    } else {
      score -= value + positionBonus;
    }
  }
  
  // Current turn matters for evaluation perspective
  return state.currentTurn === 'WHITE' ? score : -score;
}
