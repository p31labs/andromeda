// ============================================
// BOARD GEOMETRY & UTILITIES
// ============================================

import type { Position, BoardPiece, Move, PieceColor } from '../types';

// 8×8 grid constants
export const BOARD_SIZE = 8;
export const SQUARE_COUNT = 64;

// Direction vectors for move calculations
export const DIRECTIONS = {
  // Cardinal
  N: { row: -1, col: 0 },
  S: { row: 1, col: 0 },
  E: { row: 0, col: 1 },
  W: { row: 0, col: -1 },
  // Diagonal
  NE: { row: -1, col: 1 },
  NW: { row: -1, col: -1 },
  SE: { row: 1, col: 1 },
  SW: { row: 1, col: -1 },
  // Knight (L-shape)
  KNIGHT_1: { row: -2, col: 1 },
  KNIGHT_2: { row: -2, col: -1 },
  KNIGHT_3: { row: -1, col: 2 },
  KNIGHT_4: { row: -1, col: -2 },
  KNIGHT_5: { row: 1, col: 2 },
  KNIGHT_6: { row: 1, col: -2 },
  KNIGHT_7: { row: 2, col: 1 },
  KNIGHT_8: { row: 2, col: -1 },
};

// ============================================
// POSITION UTILITIES
// ============================================

export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE;
}

export function addPositions(a: Position, b: { row: number; col: number }): Position | null {
  const result = {
    row: a.row + b.row,
    col: a.col + b.col,
  } as Position;
  return isValidPosition(result) ? result : null;
}

export function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function positionToIndex(pos: Position): number {
  return pos.row * BOARD_SIZE + pos.col;
}

export function indexToPosition(index: number): Position {
  return {
    row: Math.floor(index / BOARD_SIZE) as 0|1|2|3|4|5|6|7,
    col: (index % BOARD_SIZE) as 0|1|2|3|4|5|6|7,
  };
}

export function positionToAlgebraic(pos: Position): string {
  const files = 'abcdefgh';
  const ranks = '87654321';
  return files[pos.col] + ranks[pos.row];
}

export function algebraicToPosition(algebraic: string): Position | null {
  if (algebraic.length !== 2) return null;
  const files = 'abcdefgh';
  const ranks = '87654321';
  const col = files.indexOf(algebraic[0]);
  const row = ranks.indexOf(algebraic[1]);
  if (col === -1 || row === -1) return null;
  return { row: row as 0|1|2|3|4|5|6|7, col: col as 0|1|2|3|4|5|6|7 };
}

// ============================================
// PIECE UTILITIES
// ============================================

export function getPieceAt(pieces: BoardPiece[], pos: Position): BoardPiece | undefined {
  return pieces.find(p => !p.isCaptured && positionsEqual(p.position, pos));
}

export function isOccupied(pieces: BoardPiece[], pos: Position): boolean {
  return getPieceAt(pieces, pos) !== undefined;
}

export function isEnemy(piece: BoardPiece, pos: Position, pieces: BoardPiece[]): boolean {
  const target = getPieceAt(pieces, pos);
  return target !== undefined && target.color !== piece.color;
}

export function isFriendly(piece: BoardPiece, pos: Position, pieces: BoardPiece[]): boolean {
  const target = getPieceAt(pieces, pos);
  return target !== undefined && target.color === piece.color;
}

// ============================================
// MOVE GENERATION HELPERS
// ============================================

export function generateSlidingMoves(
  piece: BoardPiece,
  pieces: BoardPiece[],
  directions: Array<{ row: number; col: number }>,
  maxSteps: number = BOARD_SIZE
): Move[] {
  const moves: Move[] = [];
  
  for (const dir of directions) {
    for (let step = 1; step <= maxSteps; step++) {
      const newPos = addPositions(piece.position, {
        row: dir.row * step,
        col: dir.col * step,
      });
      
      if (!newPos) break;
      
      const targetPiece = getPieceAt(pieces, newPos);
      
      if (!targetPiece) {
        // Empty square - can move here
        moves.push(createMove(piece, newPos));
      } else if (targetPiece.color !== piece.color) {
        // Enemy piece - can capture
        moves.push(createMove(piece, newPos, targetPiece));
        break;
      } else {
        // Friendly piece - blocked
        break;
      }
    }
  }
  
  return moves;
}

export function generateJumpingMoves(
  piece: BoardPiece,
  pieces: BoardPiece[],
  jumps: Array<{ row: number; col: number }>
): Move[] {
  const moves: Move[] = [];
  
  for (const jump of jumps) {
    const newPos = addPositions(piece.position, jump);
    if (!newPos) continue;
    
    const targetPiece = getPieceAt(pieces, newPos);
    
    if (!targetPiece) {
      moves.push(createMove(piece, newPos));
    } else if (targetPiece.color !== piece.color) {
      moves.push(createMove(piece, newPos, targetPiece));
    }
  }
  
  return moves;
}

// ============================================
// MOVE CREATION
// ============================================

let moveIdCounter = 0;

export function createMove(
  piece: BoardPiece,
  to: Position,
  capturedPiece?: BoardPiece,
  options: {
    promotion?: Move['promotion'];
    isEnPassant?: boolean;
    isCastle?: Move['isCastle'];
    resultingFlips?: Position[];
    notation?: string;
  } = {}
): Move {
  const move: Move = {
    id: `move-${++moveIdCounter}-${Date.now()}`,
    pieceId: piece.id,
    from: { ...piece.position },
    to,
    capturedPieceId: capturedPiece?.id,
    timestamp: Date.now(),
    notation: options.notation || generateNotation(piece, to, capturedPiece, options),
    ...options,
  };
  
  return move;
}

function generateNotation(
  piece: BoardPiece,
  to: Position,
  captured?: BoardPiece,
  options: Partial<Move> = {}
): string {
  const dest = positionToAlgebraic(to);
  
  // Chess notation
  if (piece.type === 'PAWN') {
    if (captured || options.isEnPassant) {
      const fromFile = positionToAlgebraic(piece.position)[0];
      return `${fromFile}x${dest}`;
    }
    if (options.promotion) {
      return `${dest}=${options.promotion[0]}`;
    }
    return dest;
  }
  
  if (options.isCastle) {
    return options.isCastle === 'kingside' ? 'O-O' : 'O-O-O';
  }
  
  const pieceLetter = piece.type[0];
  const capture = captured ? 'x' : '';
  return `${pieceLetter}${capture}${dest}`;
}

// ============================================
// BOARD INITIALIZATION
// ============================================

export function createPiece(
  type: BoardPiece['type'],
  color: PieceColor,
  row: number,
  col: number,
  id?: string
): BoardPiece {
  return {
    id: id || `${type}-${color}-${row}-${col}-${Date.now()}`,
    type,
    color,
    position: { row: row as 0|1|2|3|4|5|6|7, col: col as 0|1|2|3|4|5|6|7 },
    hasMoved: false,
    isCaptured: false,
  };
}

export function initializeChessBoard(): BoardPiece[] {
  const pieces: BoardPiece[] = [];
  
  // White pieces (row 6-7)
  const whiteBackRow = ['ROOK', 'KNIGHT', 'BISHOP', 'QUEEN', 'KING', 'BISHOP', 'KNIGHT', 'ROOK'] as const;
  for (let col = 0; col < 8; col++) {
    pieces.push(createPiece('PAWN', 'WHITE', 6, col));
    pieces.push(createPiece(whiteBackRow[col], 'WHITE', 7, col));
  }
  
  // Black pieces (row 0-1)
  const blackBackRow = ['ROOK', 'KNIGHT', 'BISHOP', 'KING', 'QUEEN', 'BISHOP', 'KNIGHT', 'ROOK'] as const;
  for (let col = 0; col < 8; col++) {
    pieces.push(createPiece('PAWN', 'BLACK', 1, col));
    pieces.push(createPiece(blackBackRow[col], 'BLACK', 0, col));
  }
  
  return pieces;
}

export function initializeCheckersBoard(): BoardPiece[] {
  const pieces: BoardPiece[] = [];
  
  // Black pieces (rows 0-2, dark squares only)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        pieces.push(createPiece('CHECKER', 'BLACK', row, col));
      }
    }
  }
  
  // White pieces (rows 5-7, dark squares only)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        pieces.push(createPiece('CHECKER', 'WHITE', row, col));
      }
    }
  }
  
  return pieces;
}

export function initializeOthelloBoard(): BoardPiece[] {
  const pieces: BoardPiece[] = [];
  
  // Starting position: 4 discs in center
  pieces.push(createPiece('DISC', 'BLACK', 3, 3));
  pieces.push(createPiece('DISC', 'WHITE', 3, 4));
  pieces.push(createPiece('DISC', 'WHITE', 4, 3));
  pieces.push(createPiece('DISC', 'BLACK', 4, 4));
  
  return pieces;
}

// ============================================
// CRDT UTILITIES
// ============================================

export function generateCRDTId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function incrementClock(clock: bigint): bigint {
  return clock + BigInt(1);
}
