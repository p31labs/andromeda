// ============================================
// OTHELLO (REVERSI) RULES ENGINE
// ============================================

import type { OthelloState, BoardPiece, Move, Position, PieceColor } from '../../types';
import {
  getPieceAt,
  positionsEqual,
  addPositions,
  createMove,
  initializeOthelloBoard,
} from '../board';

// ============================================
// INITIAL STATE
// ============================================

export function createInitialOthelloState(): OthelloState {
  const pieces = initializeOthelloBoard();
  return {
    gameId: 'othello',
    matchId: `othello-${Date.now()}`,
    pieces,
    currentTurn: 'BLACK',  // Black moves first
    moveHistory: [],
    legalMoves: [],
    capturedPieces: [],
    crdtClock: BigInt(Date.now()),
    lastMoveAt: Date.now(),
    blackCount: 2,
    whiteCount: 2,
    emptyCount: 60,
    validMoves: [],
    isGameOver: false,
  };
}

// All 8 directions for flipping
const DIRECTIONS = [
  { row: -1, col: 0 },   // N
  { row: -1, col: 1 },   // NE
  { row: 0, col: 1 },    // E
  { row: 1, col: 1 },    // SE
  { row: 1, col: 0 },    // S
  { row: 1, col: -1 },   // SW
  { row: 0, col: -1 },   // W
  { row: -1, col: -1 },  // NW
];

// ============================================
// VALID MOVE DETECTION
// ============================================

export function getValidMoves(state: OthelloState, color: PieceColor = state.currentTurn): Position[] {
  const valid: Position[] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const pos = { row: row as 0|1|2|3|4|5|6|7, col: col as 0|1|2|3|4|5|6|7 };
      if (!getPieceAt(state.pieces, pos)) {
        if (isValidOthelloMove(state, pos, color)) {
          valid.push(pos);
        }
      }
    }
  }
  
  return valid;
}

function isValidOthelloMove(state: OthelloState, pos: Position, color: PieceColor): boolean {
  // Check all 8 directions for valid flips
  for (const dir of DIRECTIONS) {
    if (wouldFlipInDirection(state, pos, color, dir)) {
      return true;
    }
  }
  return false;
}

function wouldFlipInDirection(
  state: OthelloState, 
  pos: Position, 
  color: PieceColor, 
  dir: { row: number; col: number }
): boolean {
  let current = addPositions(pos, dir);
  let foundOpponent = false;
  
  while (current) {
    const piece = getPieceAt(state.pieces, current);
    if (!piece) return false;  // Empty square - invalid
    
    if (piece.color !== color) {
      foundOpponent = true;  // Found opponent piece
    } else {
      // Found our piece - valid if we saw opponent pieces
      return foundOpponent;
    }
    
    current = addPositions(current, dir);
  }
  
  return false;
}

// ============================================
// FLIP CALCULATION
// ============================================

function getFlips(
  state: OthelloState, 
  pos: Position, 
  color: PieceColor
): Position[] {
  const flips: Position[] = [];
  
  for (const dir of DIRECTIONS) {
    const dirFlips = getFlipsInDirection(state, pos, color, dir);
    flips.push(...dirFlips);
  }
  
  return flips;
}

function getFlipsInDirection(
  state: OthelloState, 
  pos: Position, 
  color: PieceColor, 
  dir: { row: number; col: number }
): Position[] {
  const flips: Position[] = [];
  let current = addPositions(pos, dir);
  
  while (current) {
    const piece = getPieceAt(state.pieces, current);
    if (!piece) return [];  // Empty square - no flips
    
    if (piece.color !== color) {
      flips.push(current);  // Will flip this piece
    } else {
      // Found our piece - return collected flips
      return flips;
    }
    
    current = addPositions(current, dir);
  }
  
  return [];  // Hit edge without finding our piece
}

// ============================================
// MOVE GENERATION
// ============================================

export function generateOthelloMoves(state: OthelloState, color: PieceColor = state.currentTurn): Move[] {
  const validPositions = getValidMoves(state, color);
  
  return validPositions.map(pos => {
    const flips = getFlips(state, pos, color);
    const piece: BoardPiece = {
      id: `disc-${color}-${pos.row}-${pos.col}`,
      type: 'DISC',
      color,
      position: pos,
      hasMoved: false,
    };
    
    return createMove(piece, pos, undefined, { resultingFlips: flips });
  });
}

// ============================================
// MOVE EXECUTION
// ============================================

export function applyMove(state: OthelloState, move: Move): OthelloState {
  // Create new piece at move position
  const newPiece: BoardPiece = {
    id: `disc-${state.currentTurn}-${move.to.row}-${move.to.col}-${Date.now()}`,
    type: 'DISC',
    color: state.currentTurn,
    position: move.to,
    hasMoved: true,
  };
  
  // Flip pieces
  const flipPositions = move.resultingFlips || [];
  const newPieces = state.pieces.map(p => {
    if (flipPositions.some(fp => positionsEqual(fp, p.position))) {
      return { ...p, color: state.currentTurn };
    }
    return p;
  });
  
  // Add the new piece
  newPieces.push(newPiece);
  
  // Count pieces
  const blackCount = newPieces.filter(p => p.color === 'BLACK').length;
  const whiteCount = newPieces.filter(p => p.color === 'WHITE').length;
  const emptyCount = 64 - blackCount - whiteCount;
  
  // Determine next turn
  const nextTurn: PieceColor = state.currentTurn === 'BLACK' ? 'WHITE' : 'BLACK';
  const nextValidMoves = getValidMoves({ ...state, pieces: newPieces }, nextTurn);
  
  // If opponent has no valid moves, check if current player can move again
  let actualNextTurn: PieceColor = nextTurn;
  let currentPlayerMoves: Position[] = [];
  
  if (nextValidMoves.length === 0) {
    // Opponent can't move - check if current player can move
    currentPlayerMoves = getValidMoves({ ...state, pieces: newPieces }, state.currentTurn);
    if (currentPlayerMoves.length > 0) {
      actualNextTurn = state.currentTurn;  // Current player goes again
    }
  }
  
  // Check game over (no moves for either player or board full)
  const isGameOver = 
    (nextValidMoves.length === 0 && currentPlayerMoves.length === 0) || 
    emptyCount === 0;
  
  let winner: PieceColor | 'DRAW' | undefined;
  if (isGameOver) {
    if (blackCount > whiteCount) winner = 'BLACK';
    else if (whiteCount > blackCount) winner = 'WHITE';
    else winner = 'DRAW';
  }
  
  const newState: OthelloState = {
    ...state,
    pieces: newPieces,
    currentTurn: actualNextTurn,
    moveHistory: [...state.moveHistory, move],
    crdtClock: state.crdtClock + BigInt(1),
    lastMoveAt: Date.now(),
    blackCount,
    whiteCount,
    emptyCount,
    validMoves: actualNextTurn === nextTurn ? nextValidMoves : currentPlayerMoves,
    isGameOver,
    winner,
  };
  
  // Pre-calculate legal moves for the actual next turn
  newState.legalMoves = generateOthelloMoves(newState, actualNextTurn);
  
  return newState;
}

// ============================================
// POSITION EVALUATION (for AI)
// ============================================

// Position weights (corners are most valuable)
const POSITION_WEIGHTS = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -30, -2, -2, -2, -2, -30, -20],
  [10, -2, 5, 2, 2, 5, -2, 10],
  [5, -2, 2, 0, 0, 2, -2, 5],
  [5, -2, 2, 0, 0, 2, -2, 5],
  [10, -2, 5, 2, 2, 5, -2, 10],
  [-20, -30, -2, -2, -2, -2, -30, -20],
  [100, -20, 10, 5, 5, 10, -20, 100],
];

export function evaluateOthelloPosition(state: OthelloState): number {
  const pieces = state.pieces.filter(p => !p.isCaptured);
  
  let score = 0;
  
  // Weighted position evaluation
  for (const piece of pieces) {
    const weight = POSITION_WEIGHTS[piece.position.row][piece.position.col];
    if (piece.color === state.currentTurn) {
      score += weight;
    } else {
      score -= weight;
    }
  }
  
  // Mobility (number of valid moves)
  const currentMobility = getValidMoves(state, state.currentTurn).length;
  const opponentMobility = getValidMoves(state, state.currentTurn === 'BLACK' ? 'WHITE' : 'BLACK').length;
  score += (currentMobility - opponentMobility) * 5;
  
  // Disc parity (prefer even number of empty squares in endgame)
  if (state.emptyCount < 10) {
    score += (state.currentTurn === 'BLACK' ? state.blackCount - state.whiteCount : state.whiteCount - state.blackCount) * 10;
  }
  
  return score;
}

// ============================================
// GAME PHASE DETECTION
// ============================================

export function getGamePhase(state: OthelloState): 'opening' | 'midgame' | 'endgame' {
  const filled = 64 - state.emptyCount;
  if (filled < 20) return 'opening';
  if (filled < 50) return 'midgame';
  return 'endgame';
}
