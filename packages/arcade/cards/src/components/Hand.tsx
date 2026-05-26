// P31 Card Table: Hand Component
// Displays player's hand with fan layout

import { Card3D, CardMini } from './Card';
import type { Card as CardType, SpoonState } from '../types';
import { SPOON_CONFIG } from '../types';

interface HandProps {
  cards: CardType[];
  validPlays: CardType[];
  selectedCard: CardType | null;
  onCardClick: (card: CardType) => void;
  onCardHover: (card: CardType | null) => void;
  isPlayer: boolean;
  spoons: SpoonState;
  gamePhase: string;
}

export function Hand({
  cards,
  validPlays,
  selectedCard,
  onCardClick,
  onCardHover,
  isPlayer,
  spoons,
  gamePhase,
}: HandProps) {
  const spoonConfig = SPOON_CONFIG[spoons];
  
  // Only player sees their cards face up
  const isFaceUp = isPlayer;
  
  return (
    <div style={{ padding: '16px' }}>
      {/* Cards */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {cards.map((card) => {
          const isPlayable = validPlays.some(c => c.id === card.id);
          const isSelected = selectedCard?.id === card.id;
          
          return (
            <Card3D
              key={card.id}
              card={{ ...card, faceUp: isFaceUp }}
              isPlayable={isPlayable && gamePhase === 'playing'}
              isSelected={isSelected}
              onClick={() => onCardClick(card)}
              onHover={(hovered) => onCardHover(hovered ? card : null)}
            />
          );
        })}
      </div>
      
      {/* Spoon mode hint indicator */}
      {spoonConfig.showHints && isPlayer && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          background: '#10b981',
          borderRadius: '4px',
          textAlign: 'center',
          color: 'white',
          fontSize: '12px',
        }}>
          💡 Hint mode active - playable cards are highlighted
        </div>
      )}
    </div>
  );
}

// 2D hand display for UI
interface HandUIProps {
  cards: CardType[];
  validPlays: CardType[];
  selectedCard: CardType | null;
  onCardClick: (card: CardType) => void;
  spoons: SpoonState;
}

export function HandUI({ cards, validPlays, selectedCard, onCardClick, spoons }: HandUIProps) {
  const spoonConfig = SPOON_CONFIG[spoons];
  
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      padding: '16px',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '8px',
      flexWrap: 'wrap',
    }}>
      {cards.map((card) => {
        const isPlayable = validPlays.some(c => c.id === card.id);
        const isSelected = selectedCard?.id === card.id;
        
        return (
          <div
            key={card.id}
            onClick={() => isPlayable && onCardClick(card)}
            style={{
              cursor: isPlayable ? 'pointer' : 'not-allowed',
              transform: isSelected ? 'translateY(-10px)' : 'none',
              transition: 'transform 0.2s',
              opacity: isPlayable || !spoonConfig.showHints ? 1 : 0.5,
              position: 'relative',
            }}
          >
            <CardMini suit={card.suit} rank={card.rank} faceUp={true} />
            {isPlayable && spoonConfig.showHints && (
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '12px',
                height: '12px',
                background: '#10b981',
                borderRadius: '50%',
                border: '2px solid white',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// AI hand (face down)
interface AIHandProps {
  cardCount: number;
  playerName: string;
  position: 'north' | 'east' | 'west';
}

export function AIHand({ cardCount, playerName, position }: AIHandProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
    }}>
      <div style={{ fontSize: '14px', fontWeight: 600 }}>{playerName}</div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {Array.from({ length: Math.min(cardCount, 5) }).map((_, index) => (
          <div
            key={index}
            style={{
              width: '30px',
              height: '42px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              border: '1px solid #60a5fa',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              marginLeft: index > 0 ? '-15px' : '0',
            }}
          />
        ))}
        {cardCount > 5 && (
          <div style={{
            width: '30px',
            height: '42px',
            background: '#374151',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            marginLeft: '-15px',
          }}>
            +{cardCount - 5}
          </div>
        )}
      </div>
      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{cardCount} cards</div>
    </div>
  );
}
