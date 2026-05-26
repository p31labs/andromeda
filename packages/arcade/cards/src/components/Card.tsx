// P31 Card Table: Card Component
// Simplified 2D card display

import type { Card as CardType, Suit } from '../types';
import { SUIT_SYMBOLS, RANK_LABELS } from '../types';

interface CardProps {
  card: CardType;
  isPlayable: boolean;
  isSelected: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
  scale?: number;
}

export function getSuitColor(suit: Suit): 'red' | 'black' {
  return suit === 'HEARTS' || suit === 'DIAMONDS' ? 'red' : 'black';
}

export function Card3D({
  card,
  isPlayable,
  isSelected,
  onClick,
  onHover,
  scale = 1,
}: CardProps) {
  const color = getSuitColor(card.suit);
  const suitColor = color === 'red' ? '#dc2626' : '#1f2937';
  
  if (!card.faceUp) {
    return (
      <div
        onClick={isPlayable ? onClick : undefined}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        style={{
          width: `${60 * scale}px`,
          height: `${84 * scale}px`,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          border: '2px solid #60a5fa',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isPlayable ? 'pointer' : 'default',
          transform: isSelected ? 'translateY(-10px)' : 'none',
          transition: 'transform 0.2s',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        }}
      >
        <span style={{ fontSize: `${24 * scale}px` }}>🃏</span>
      </div>
    );
  }
  
  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      style={{
        width: `${60 * scale}px`,
        height: `${84 * scale}px`,
        background: 'white',
        border: isPlayable ? '3px solid #3b82f6' : '2px solid #e5e7eb',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${8 * scale}px`,
        cursor: isPlayable ? 'pointer' : 'default',
        transform: isSelected ? 'translateY(-10px)' : 'none',
        transition: 'transform 0.2s',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ 
        fontSize: `${14 * scale}px`, 
        fontWeight: 'bold',
        color: suitColor,
        alignSelf: 'flex-start',
      }}>
        {RANK_LABELS[card.rank]}
      </div>
      <div style={{ 
        fontSize: `${28 * scale}px`,
        color: suitColor,
      }}>
        {SUIT_SYMBOLS[card.suit]}
      </div>
      <div style={{ 
        fontSize: `${14 * scale}px`, 
        fontWeight: 'bold',
        color: suitColor,
        alignSelf: 'flex-end',
        transform: 'rotate(180deg)',
      }}>
        {RANK_LABELS[card.rank]}
      </div>
    </div>
  );
}

// 2D card for hand display
export function CardMini({ suit, rank, faceUp }: { suit: Suit; rank: number; faceUp: boolean }) {
  if (!faceUp) {
    return (
      <div style={{
        width: '40px',
        height: '56px',
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        borderRadius: '4px',
        border: '1px solid #60a5fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}>
        <span style={{ color: 'white', fontSize: '16px' }}>🃏</span>
      </div>
    );
  }
  
  const color = getSuitColor(suit) === 'red' ? '#dc2626' : '#1f2937';
  
  return (
    <div style={{
      width: '40px',
      height: '56px',
      background: 'white',
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '4px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    }}>
      <span style={{ color, fontSize: '12px', fontWeight: 'bold' }}>
        {RANK_LABELS[rank as 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14]}
      </span>
      <span style={{ color, fontSize: '18px' }}>{SUIT_SYMBOLS[suit]}</span>
    </div>
  );
}

// Simple card back pattern
export function generateCardBackPattern(color: string): string {
  return `
    <svg width="100" height="140" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="140" fill="${color}"/>
      <rect x="5" y="5" width="90" height="130" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
    </svg>
  `;
}
