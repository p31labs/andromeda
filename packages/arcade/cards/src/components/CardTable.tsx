// P31 Card Table: Table Component
// Simplified 2D table view

import type { TableConfig } from '../types';

interface CardTableProps {
  config?: TableConfig;
  children?: React.ReactNode;
}

export function CardTable({ config, children }: CardTableProps) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: config?.feltColor || 'linear-gradient(135deg, #1a472a 0%, #0d2615 100%)',
      borderRadius: '16px',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Wood border */}
      <div style={{
        position: 'absolute',
        inset: '-8px',
        background: config?.woodTexture || 'linear-gradient(135deg, #8b5a2b 0%, #5c3a1e 100%)',
        borderRadius: '24px',
        zIndex: -1,
      }} />
      
      {/* Felt texture overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 70%)',
        borderRadius: '16px',
      }} />
      
      {children}
    </div>
  );
}

// Trick pile - cards in the center
interface TrickPileProps {
  trick: { playerId: string; card: { suit: string; rank: number; faceUp: boolean } }[] | null;
}

export function TrickPile({ trick }: TrickPileProps) {
  if (!trick || trick.length === 0) return null;
  
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '16px',
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '8px',
    }}>
      {trick.map((played, i) => (
        <div key={i} style={{
          padding: '8px',
          background: 'white',
          borderRadius: '4px',
          fontSize: '14px',
        }}>
          {played.playerId}: {played.card.faceUp ? `${played.card.rank} of ${played.card.suit}` : '🃏'}
        </div>
      ))}
    </div>
  );
}

// Deck stack
interface DeckProps {
  cardCount: number;
  topCardFaceUp?: boolean;
  onClick?: () => void;
}

export function Deck({ cardCount, topCardFaceUp, onClick }: DeckProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: '60px',
        height: '84px',
        background: topCardFaceUp ? 'white' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        border: '2px solid #60a5fa',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      }}>
        {topCardFaceUp ? 'Top' : '🃏'}
      </div>
      <div style={{
        marginTop: '8px',
        padding: '4px 8px',
        background: '#374151',
        color: 'white',
        borderRadius: '12px',
        fontSize: '12px',
      }}>
        {cardCount}
      </div>
    </div>
  );
}

// Discard pile
interface DiscardPileProps {
  topCard: { suit: string; rank: number } | null;
  cardCount: number;
}

export function DiscardPile({ topCard, cardCount }: DiscardPileProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        width: '60px',
        height: '84px',
        background: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      }}>
        {topCard ? `${topCard.rank}` : 'Discard'}
      </div>
      <div style={{
        marginTop: '8px',
        padding: '4px 8px',
        background: '#374151',
        color: 'white',
        borderRadius: '12px',
        fontSize: '12px',
      }}>
        {cardCount}
      </div>
    </div>
  );
}
