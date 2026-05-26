// ============================================
// CHESS RULES ENGINE
// ============================================

import type { ChessState, BoardPiece, Move, Position, PieceColor } from '../../types';
import {
  BOARD_SIZE,
  DIRECTIONS,
  getPieceAt,
  positionsEqual,
  addPositions,
  generateSlidingMoves,
  generateJumpingMoves,
  createMove,
  initializeChessBoard,
  isValidPosition,
} from '../board';

// ============================================
// INITIAL STATE
// ============================================

export function createInitialChessState(): ChessState {
  return {
    gameId: 'chess',
    matchId: `chess-${Date.now()}`,
    pieces: initializeChessBoard(),
    currentTurn: 'WHITE',
    moveHistory: [],
    legalMoves: [],
    capturedPieces: [],
    crdtClock: BigInt(Date.now()),
    lastMoveAt: Date.now(),
    castlingRights: {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    },
    halfmoveClock: 0,
    fullmoveNumber: 1,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
  };
}

// ============================================
// MOVE GENERATION
// ============================================

export function generateChessMoves(state: ChessState, color: PieceColor = state.currentTurn): Move[] {
  const moves: Move[] = [];
  const pieces = state.pieces.filter(p => !p.isCaptured && p.color === color);
  
  for (const piece of pieces) {
    switch (piece.type) {
      case 'PAWN':
        moves.push(...generatePawnMoves(piece, state));
        break;
      case 'KNIGHT':
        moves.push(...generateKnightMoves(piece, state));
        break;
      case 'BISHOP':
        moves.push(...generateBishopMoves(piece, state));
        break;
      case 'ROOK':
        moves.push(...generateRookMoves(piece, state));
        break;
      case 'QUEEN':
        moves.push(...generateQueenMoves(piece, state));
        break;
      case 'KING':
        moves.push(...generateKingMoves(piece, state));
        break;
    }
  }
  
  // Filter out moves that leave king in check
  return moves.filter(move => !wouldLeaveKingInCheck(state, move, color));
}

function generatePawnMoves(piece: BoardPiece, state: ChessState): Move[] {
  const moves: Move[] = [];
  const direction = piece.color === 'WHITE' ? -1 : 1;
  const startRow = piece.color === 'WHITE' ? 6 : 1;
  const promotionRow = piece.color === 'WHITE' ? 0 : 7;
  
  // Forward one square
  const oneForward = addPositions(piece.position, { row: direction, col: 0 });
  if (oneForward && !getPieceAt(state.pieces, oneForward)) {
    if (oneForward.row === promotionRow) {
      // Promotion moves
      for (const promoType of ['QUEEN', 'ROOK', 'BISHOP', 'KNIGHT'] as const) {
        moves.push(createMove(piece, oneForward, undefined, { promotion: promoType }));
      }
    } else {
      moves.push(createMove(piece, oneForward));
    }
    
    // Forward two squares from starting position
    if (piece.position.row === startRow) {
      const twoForward = addPositions(piece.position, { row: direction * 2, col: 0 });
      if (twoForward && !getPieceAt(state.pieces, twoForward)) {
        moves.push(createMove(piece, twoForward));
      }
    }
  }
  
  // Captures (diagonal)
  for (const captureDir of [{ row: direction, col: -1 }, { row: direction, col: 1 }]) {
    const capturePos = addPositions(piece.position, captureDir);
    if (capturePos) {
      const targetPiece = getPieceAt(state.pieces, capturePos);
      if (targetPiece && targetPiece.color !== piece.color) {
        if (capturePos.row === promotionRow) {
          for (const promoType of ['QUEEN', 'ROOK', 'BISHOP', 'KNIGHT'] as const) {
            moves.push(createMove(piece, capturePos, targetPiece, { promotion: promoType }));
          }
        } else {
          moves.push(createMove(piece, capturePos, targetPiece));
        }
      }
      
      // En passant
      if (state.enPassantTarget && positionsEqual(capturePos, state.enPassantTarget)) {
        const epCapturePos = { row: piece.position.row, col: capturePos.col } as Position;
        const epPiece = getPieceAt(state.pieces, epCapturePos);
        if (epPiece) {
          const epMove = createMove(piece, capturePos, epPiece, { isEnPassant: true });
          moves.push(epMove);
        }
      }
    }
  }
  
  return moves;
}

function generateKnightMoves(piece: BoardPiece, state: ChessState): Move[] {
  const knightJumps = [
    DIRECTIONS.KNIGHT_1, DIRECTIONS.KNIGHT_2, DIRECTIONS.KNIGHT_3, DIRECTIONS.KNIGHT_4,
    DIRECTIONS.KNIGHT_5, DIRECTIONS.KNIGHT_6, DIRECTIONS.KNIGHT_7, DIRECTIONS.KNIGHT_8,
  ];
  return generateJumpingMoves(piece, state.pieces, knightJumps);
}

function generateBishopMoves(piece: BoardPiece, state: ChessState): Move[] {
  const diagonals = [DIRECTIONS.NE, DIRECTIONS.NW, DIRECTIONS.SE, DIRECTIONS.SW];
  return generateSlidingMoves(piece, state.pieces, diagonals);
}

function generateRookMoves(piece: BoardPiece, state: ChessState): Move[] {
  const cardinals = [DIRECTIONS.N, DIRECTIONS.S, DIRECTIONS.E, DIRECTIONS.W];
  return generateSlidingMoves(piece, state.pieces, cardinals);
}

function generateQueenMoves(piece: BoardPiece, state: ChessState): Move[] {
  const allDirections = [
    DIRECTIONS.N, DIRECTIONS.S, DIRECTIONS.E, DIRECTIONS.W,
    DIRECTIONS.NE, DIRECTIONS.NW, DIRECTIONS.SE, DIRECTIONS.SW,
  ];
  return generateSlidingMoves(piece, state.pieces, allDirections);
}

function generateKingMoves(piece: BoardPiece, state: ChessState): Move[] {
  const kingMoves = [
    DIRECTIONS.N, DIRECTIONS.S, DIRECTIONS.E, DIRECTIONS.W,
    DIRECTIONS.NE, DIRECTIONS.NW, DIRECTIONS.SE, DIRECTIONS.SW,
  ];
  const moves = generateJumpingMoves(piece, state.pieces, kingMoves);
  
  // Castling
  if (!piece.hasMoved && !isKingInCheck(state, piece.color)) {
    const castlingRights = state.castlingRights;
    const color = piece.color;
    const row = color === 'WHITE' ? 7 : 0;
    
    // Kingside
    const canKingSide = color === 'WHITE' ? castlingRights.whiteKingside : castlingRights.blackKingside;
    if (canKingSide) {
      const rook = state.pieces.find(p => 
        p.type === 'ROOK' && p.color === color && p.position.row === row && p.position.col === 7
      );
      if (rook && !rook.hasMoved && !getPieceAt(state.pieces, { row, col: 5 }) && !getPieceAt(state.pieces, { row, col: 6 })) {
        if (!isSquareAttacked(state, { row, col: 5 }, color) && !isSquareAttacked(state, { row, col: 6 }, color)) {
          moves.push(createMove(piece, { row, col: 6 }, undefined, { isCastle: 'kingside' }));
        }
      }
    }
    
    // Queenside
    const canQueenSide = color === 'WHITE' ? castlingRights.whiteQueenside : castlingRights.blackQueenside;
    if (canQueenSide) {
      const rook = state.pieces.find(p => 
        p.type === 'ROOK' && p.color === color && p.position.row === row && p.position.col === 0
      );
      if (rook && !rook.hasMoved && 
          !getPieceAt(state.pieces, { row, col: 1 }) && 
          !getPieceAt(state.pieces, { row, col: 2 }) && 
          !getPieceAt(state.pieces, { row, col: 3 })) {
        if (!isSquareAttacked(state, { row, col: 2 }, color) && !isSquareAttacked(state, { row, col: 3 }, color)) {
          moves.push(createMove(piece, { row, col: 2 }, undefined, { isCastle: 'queenside' }));
        }
      }
    }
  }
  
  return moves;
}

// ============================================
// CHECK & CHECKMATE DETECTION
// ============================================

function isKingInCheck(state: ChessState, color: PieceColor): boolean {
  const king = state.pieces.find(p => p.type === 'KING' && p.color === color && !p.isCaptured);
  if (!king) return false;
  return isSquareAttacked(state, king.position, color);
}

function isSquareAttacked(state: ChessState, pos: Position, defendingColor: PieceColor): boolean {
  const attackingColor = defendingColor === 'WHITE' ? 'BLACK' : 'WHITE';
  const attackers = state.pieces.filter(p => !p.isCaptured && p.color === attackingColor);
  
  for (const piece of attackers) {
    // Check if this piece can move to the target square
    let canAttack = false;
    
    switch (piece.type) {
      case 'PAWN': {
        const direction = piece.color === 'WHITE' ? -1 : 1;
        const attackDirs = [{ row: direction, col: -1 }, { row: direction, col: 1 }];
        canAttack = attackDirs.some(dir => {
          const attackPos = addPositions(piece.position, dir);
          return attackPos && positionsEqual(attackPos, pos);
        });
        break;
      }
      case 'KNIGHT': {
        const jumps = [
          { row: -2, col: 1 }, { row: -2, col: -1 }, { row: -1, col: 2 }, { row: -1, col: -2 },
          { row: 1, col: 2 }, { row: 1, col: -2 }, { row: 2, col: 1 }, { row: 2, col: -1 },
        ];
        canAttack = jumps.some(jump => {
          const target = addPositions(piece.position, jump);
          return target && positionsEqual(target, pos);
        });
        break;
      }
      case 'KING': {
        const moves = [
          { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 },
          { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 },
        ];
        canAttack = moves.some(m => {
          const target = addPositions(piece.position, m);
          return target && positionsEqual(target, pos);
        });
        break;
      }
      case 'BISHOP':
        canAttack = canSlideAttack(piece.position, pos, state.pieces, [
          DIRECTIONS.NE, DIRECTIONS.NW, DIRECTIONS.SE, DIRECTIONS.SW,
        ]);
        break;
      case 'ROOK':
        canAttack = canSlideAttack(piece.position, pos, state.pieces, [
          DIRECTIONS.N, DIRECTIONS.S, DIRECTIONS.E, DIRECTIONS.W,
        ]);
        break;
      case 'QUEEN':
        canAttack = canSlideAttack(piece.position, pos, state.pieces, [
          DIRECTIONS.N, DIRECTIONS.S, DIRECTIONS.E, DIRECTIONS.W,
          DIRECTIONS.NE, DIRECTIONS.NW, DIRECTIONS.SE, DIRECTIONS.SW,
        ]);
        break;
    }
    
    if (canAttack) return true;
  }
  
  return false;
}

function canSlideAttack(
  from: Position, 
  to: Position, 
  pieces: BoardPiece[], 
  directions: Array<{ row: number; col: number }>
): boolean {
  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;
  
  for (const dir of directions) {
    if ((rowDiff === 0 || Math.sign(rowDiff) === Math.sign(dir.row)) &&
        (colDiff === 0 || Math.sign(colDiff) === Math.sign(dir.col))) {
      let current = { row: from.row + dir.row, col: from.col + dir.col };
      
      while (isValidPosition(current as Position)) {
        const piece = getPieceAt(pieces, current as Position);
        if (positionsEqual(current as Position, to)) return true;
        if (piece) break;
        current = { row: current.row + dir.row, col: current.col + dir.col };
      }
    }
  }
  
  return false;
}

function wouldLeaveKingInCheck(state: ChessState, move: Move, color: PieceColor): boolean {
  // Simulate the move
  const newState = simulateMove(state, move);
  return isKingInCheck(newState, color);
}

function simulateMove(state: ChessState, move: Move): ChessState {
  const newPieces: typeof state.pieces = state.pieces.map(p => {
    if (p.id === move.pieceId) {
      return { ...p, position: move.to as typeof p.position, hasMoved: true };
    }
    if (move.capturedPieceId && p.id === move.capturedPieceId) {
      return { ...p, isCaptured: true };
    }
    return p;
  });
  
  return { ...state, pieces: newPieces };
}

// ============================================
// MOVE EXECUTION
// ============================================

export function applyMove(state: ChessState, move: Move): ChessState {
  const piece = state.pieces.find(p => p.id === move.pieceId);
  if (!piece) return state;
  
  const newPieces: typeof state.pieces = state.pieces.map(p => {
    if (p.id === move.pieceId) {
      return { 
        ...p, 
        position: move.to as typeof p.position, 
        hasMoved: true,
        type: (move.promotion || p.type) as typeof p.type,
      };
    }
    if (move.capturedPieceId && p.id === move.capturedPieceId) {
      return { ...p, isCaptured: true };
    }
    if (move.isCastle) {
      // Move the rook for castling
      const rookFromCol = move.isCastle === 'kingside' ? 7 : 0;
      const rookToCol = move.isCastle === 'kingside' ? 5 : 3;
      const row = piece.position.row;
      if (p.type === 'ROOK' && p.position.row === row && p.position.col === rookFromCol && p.color === piece.color) {
        const newPos: typeof p.position = { row: row as 0|1|2|3|4|5|6|7, col: rookToCol as 0|1|2|3|4|5|6|7 };
        return { ...p, position: newPos, hasMoved: true };
      }
    }
    return p;
  });
  
  const newCaptured = move.capturedPieceId 
    ? [...state.capturedPieces, state.pieces.find(p => p.id === move.capturedPieceId)!]
    : state.capturedPieces;
  
  // Update castling rights
  let newCastlingRights = { ...state.castlingRights };
  if (piece.type === 'KING') {
    if (piece.color === 'WHITE') {
      newCastlingRights.whiteKingside = false;
      newCastlingRights.whiteQueenside = false;
    } else {
      newCastlingRights.blackKingside = false;
      newCastlingRights.blackQueenside = false;
    }
  }
  if (piece.type === 'ROOK') {
    if (piece.color === 'WHITE') {
      if (piece.position.col === 7) newCastlingRights.whiteKingside = false;
      if (piece.position.col === 0) newCastlingRights.whiteQueenside = false;
    } else {
      if (piece.position.col === 7) newCastlingRights.blackKingside = false;
      if (piece.position.col === 0) newCastlingRights.blackQueenside = false;
    }
  }
  
  // Update en passant target
  let newEnPassantTarget: Position | undefined;
  if (piece.type === 'PAWN' && Math.abs(move.from.row - move.to.row) === 2) {
    const epRow = (move.from.row + move.to.row) / 2;
    newEnPassantTarget = { row: epRow as 0|1|2|3|4|5|6|7, col: move.to.col };
  }
  
  // Update clocks
  const newHalfmoveClock = piece.type === 'PAWN' || move.capturedPieceId ? 0 : state.halfmoveClock + 1;
  const newFullmoveNumber = state.currentTurn === 'BLACK' ? state.fullmoveNumber + 1 : state.fullmoveNumber;
  
  const newState: ChessState = {
    ...state,
    pieces: newPieces,
    currentTurn: state.currentTurn === 'WHITE' ? 'BLACK' : 'WHITE',
    moveHistory: [...state.moveHistory, move],
    capturedPieces: newCaptured,
    crdtClock: state.crdtClock + BigInt(1),
    lastMoveAt: Date.now(),
    castlingRights: newCastlingRights,
    enPassantTarget: newEnPassantTarget,
    halfmoveClock: newHalfmoveClock,
    fullmoveNumber: newFullmoveNumber,
  };
  
  // Recalculate game state
  const nextColor = newState.currentTurn;
  newState.isCheck = isKingInCheck(newState, nextColor);
  newState.legalMoves = generateChessMoves(newState, nextColor);
  newState.isCheckmate = newState.isCheck && newState.legalMoves.length === 0;
  newState.isStalemate = !newState.isCheck && newState.legalMoves.length === 0;
  newState.isDraw = newState.isStalemate || newState.halfmoveClock >= 100;
  
  return newState;
}
