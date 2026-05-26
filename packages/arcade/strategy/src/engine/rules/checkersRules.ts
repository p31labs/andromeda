// ============================================
// CHECKERS RULES ENGINE
// ============================================

import type { CheckersState, BoardPiece, Move, Position, PieceColor } from '../../types';
import {
  getPieceAt,
  positionsEqual,
  addPositions,
  createMove,
  initializeCheckersBoard,
  isValidPosition,
} from '../board';

// ============================================
// INITIAL STATE
// ============================================

export function createInitialCheckersState(): CheckersState {
  const pieces = initializeCheckersBoard();
  return {
    gameId: 'checkers',
    matchId: `checkers-${Date.now()}`,
    pieces,
    currentTurn: 'BLACK',  // Black moves first in checkers
    moveHistory: [],
    legalMoves: [],
    capturedPieces: [],
    crdtClock: BigInt(Date.now()),
    lastMoveAt: Date.now(),
    forcedJumps: false,
    blackPieces: 12,
    whitePieces: 12,
    isGameOver: false,
  };
}

// ============================================
// MOVE GENERATION
// ============================================

export function generateCheckersMoves(state: CheckersState, color: PieceColor = state.currentTurn): Move[] {
  const pieces = state.pieces.filter(p => !p.isCaptured && p.color === color);
  const moves: Move[] = [];
  
  // Check for forced jumps
  for (const piece of pieces) {
    const jumps = getJumps(piece, state);
    moves.push(...jumps);
  }
  
  // If there are jumps, they are mandatory
  if (moves.length > 0) {
    return moves;
  }
  
  // Otherwise, regular moves
  for (const piece of pieces) {
    const regularMoves = getRegularMoves(piece, state);
    moves.push(...regularMoves);
  }
  
  return moves;
}

function getRegularMoves(piece: BoardPiece, state: CheckersState): Move[] {
  const moves: Move[] = [];
  const directions = getMoveDirections(piece);
  
  for (const dir of directions) {
    const newPos = addPositions(piece.position, dir);
    if (newPos && !getPieceAt(state.pieces, newPos)) {
      const move = createMove(piece, newPos);
      // Check for king promotion
      const kingRow = piece.color === 'WHITE' ? 0 : 7;
      if (newPos.row === kingRow && piece.type === 'CHECKER') {
        move.promotion = 'CHECKER_KING';
      }
      moves.push(move);
    }
  }
  
  return moves;
}

function getJumps(piece: BoardPiece, state: CheckersState): Move[] {
  const jumps: Move[] = [];
  const directions = getMoveDirections(piece);
  
  for (const dir of directions) {
    const jumpedPos = addPositions(piece.position, dir);
    const landingPos = addPositions(piece.position, { row: dir.row * 2, col: dir.col * 2 });
    
    if (jumpedPos && landingPos) {
      const jumpedPiece = getPieceAt(state.pieces, jumpedPos);
      const landingPiece = getPieceAt(state.pieces, landingPos);
      
      if (jumpedPiece && jumpedPiece.color !== piece.color && !landingPiece) {
        const move = createMove(piece, landingPos, jumpedPiece);
        // Check for king promotion
        const kingRow = piece.color === 'WHITE' ? 0 : 7;
        if (landingPos.row === kingRow && piece.type === 'CHECKER') {
          move.promotion = 'CHECKER_KING';
        }
        jumps.push(move);
      }
    }
  }
  
  return jumps;
}

function getMoveDirections(piece: BoardPiece): Array<{ row: number; col: number }> {
  if (piece.type === 'CHECKER_KING') {
    // Kings can move in all 4 diagonal directions
    return [
      { row: -1, col: -1 }, { row: -1, col: 1 },
      { row: 1, col: -1 }, { row: 1, col: 1 },
    ];
  }
  
  // Regular pieces move forward only (toward opponent)
  if (piece.color === 'WHITE') {
    return [{ row: -1, col: -1 }, { row: -1, col: 1 }];  // Up the board
  } else {
    return [{ row: 1, col: -1 }, { row: 1, col: 1 }];   // Down the board
  }
}

// ============================================
// MOVE EXECUTION
// ============================================

export function applyMove(state: CheckersState, move: Move): CheckersState {
  const piece = state.pieces.find(p => p.id === move.pieceId);
  if (!piece) return state;
  
  // Apply the move
  let newPieces = state.pieces.map(p => {
    if (p.id === move.pieceId) {
      return {
        ...p,
        position: move.to,
        hasMoved: true,
        type: move.promotion || p.type,
      };
    }
    if (move.capturedPieceId && p.id === move.capturedPieceId) {
      return { ...p, isCaptured: true };
    }
    return p;
  });
  
  const newCaptured = move.capturedPieceId 
    ? [...state.capturedPieces, state.pieces.find(p => p.id === move.capturedPieceId)!]
    : state.capturedPieces;
  
  // Check for multi-jump
  const movedPiece = newPieces.find(p => p.id === move.pieceId)!;
  const additionalJumps = getJumps(movedPiece, { ...state, pieces: newPieces });
  
  // Count remaining pieces
  const blackPieces = newPieces.filter(p => !p.isCaptured && p.color === 'BLACK').length;
  const whitePieces = newPieces.filter(p => !p.isCaptured && p.color === 'WHITE').length;
  
  // Check game over
  const isGameOver = blackPieces === 0 || whitePieces === 0;
  const winner = blackPieces === 0 ? 'WHITE' : whitePieces === 0 ? 'BLACK' : undefined;
  
  const newState: CheckersState = {
    ...state,
    pieces: newPieces,
    currentTurn: state.currentTurn === 'WHITE' ? 'BLACK' : 'WHITE',
    moveHistory: [...state.moveHistory, move],
    capturedPieces: newCaptured,
    crdtClock: state.crdtClock + BigInt(1),
    lastMoveAt: Date.now(),
    forcedJumps: additionalJumps.length > 0,
    multiJumpInProgress: additionalJumps.length > 0 ? {
      pieceId: movedPiece.id,
      requiredNextPositions: additionalJumps.map(j => j.to),
    } : undefined,
    blackPieces,
    whitePieces,
    isGameOver,
    winner,
  };
  
  // If multi-jump in progress, current player continues
  if (additionalJumps.length > 0 && move.capturedPieceId) {
    newState.currentTurn = piece.color;
    newState.legalMoves = additionalJumps;
  } else {
    // Generate moves for next player
    newState.multiJumpInProgress = undefined;
    newState.legalMoves = generateCheckersMoves(newState, newState.currentTurn);
    newState.isGameOver = newState.legalMoves.length === 0 || isGameOver;
    if (newState.legalMoves.length === 0 && !isGameOver) {
      newState.winner = newState.currentTurn === 'WHITE' ? 'BLACK' : 'WHITE';
    }
  }
  
  return newState;
}

// ============================================
// POSITION EVALUATION (for AI)
// ============================================

export function evaluateCheckersPosition(state: CheckersState): number {
  let score = 0;
  
  const pieces = state.pieces.filter(p => !p.isCaptured);
  
  for (const piece of pieces) {
    const value = piece.type === 'CHECKER_KING' ? 3 : 1;
    const positionValue = evaluatePosition(piece);
    
    if (piece.color === state.currentTurn) {
      score += value + positionValue;
    } else {
      score -= value + positionValue;
    }
  }
  
  return score;
}

function evaluatePosition(piece: BoardPiece): number {
  // Value center control and advancement
  const centerBonus = (3.5 - Math.abs(piece.position.col - 3.5)) * 0.1;
  
  if (piece.type === 'CHECKER') {
    // Advance toward king row
    const progress = piece.color === 'WHITE' 
      ? (7 - piece.position.row) / 7  // Closer to row 0 is better for white
      : piece.position.row / 7;        // Closer to row 7 is better for black
    return centerBonus + progress * 0.2;
  }
  
  // Kings value mobility
  return centerBonus + 0.3;
}
