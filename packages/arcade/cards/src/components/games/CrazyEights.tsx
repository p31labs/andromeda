// P31 Card Table: Crazy Eights Game Component
// Fast-paced shedding game with wild 8s

import { useEffect, useState } from 'react';
import type { 
  MatchState, PlayerId, Card, SpoonState, CrossGameIdentity 
} from '../../types';
import { SPOON_CONFIG } from '../../types';
import { generateStandardDeck, dealCrazyEights, formatCard } from '../../engine/deck';
import { canPlayCrazyEights, playCrazyEights, getNextPlayer } from '../../engine/trick-taking';
import { AIPlayer, getDefaultPersonality } from '../ai/AIPlayer';

interface CrazyEightsProps {
  spoons: SpoonState;
  identity: CrossGameIdentity;
  onMatchComplete: (matchState: MatchState, winner: PlayerId | null) => void;
  onIdentityUpdate: (identity: CrossGameIdentity) => void;
}

export function CrazyEights({ spoons, identity, onMatchComplete, onIdentityUpdate }: CrazyEightsProps) {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [message, setMessage] = useState<string>('');
  const [aiPlayers, setAiPlayers] = useState<Partial<Record<PlayerId, AIPlayer>>>({});
  
  const spoonConfig = SPOON_CONFIG[spoons];
  
  // Initialize game
  useEffect(() => {
    initGame();
  }, []);
  
  const initGame = () => {
    const matchId = `match-${Date.now()}`;
    const seed = `seed-${Date.now()}`;
    
    // Create deck and deal
    const deck = generateStandardDeck('crazy-eights');
    const deal = dealCrazyEights(deck, ['player', 'ai-west', 'ai-north', 'ai-east'], seed);
    
    // Set up players
    const players = [
      {
        id: 'player' as PlayerId,
        type: 'human' as const,
        personalityId: 'scout',
        hand: { playerId: 'player' as PlayerId, cards: deal.hands.player, tricksWon: 0, score: 0 },
        isDealer: false,
      },
      {
        id: 'ai-west' as PlayerId,
        type: 'ai' as const,
        personalityId: getDefaultPersonality('ai-west'),
        hand: { playerId: 'ai-west' as PlayerId, cards: deal.hands['ai-west'], tricksWon: 0, score: 0 },
        isDealer: false,
      },
      {
        id: 'ai-north' as PlayerId,
        type: 'ai' as const,
        personalityId: getDefaultPersonality('ai-north'),
        hand: { playerId: 'ai-north' as PlayerId, cards: deal.hands['ai-north'], tricksWon: 0, score: 0 },
        isDealer: false,
      },
      {
        id: 'ai-east' as PlayerId,
        type: 'ai' as const,
        personalityId: getDefaultPersonality('ai-east'),
        hand: { playerId: 'ai-east' as PlayerId, cards: deal.hands['ai-east'], tricksWon: 0, score: 0 },
        isDealer: false,
      },
    ];
    
    // Set up initial state
    const topCard = deal.remaining[0];
    if (topCard) topCard.faceUp = true;
    
    const initialState: MatchState = {
      gameId: 'crazy-eights',
      matchId,
      deck: deal.remaining.slice(1),
      discardPile: topCard ? [topCard] : [],
      players,
      tricks: [],
      currentTrick: null,
      turnOrder: ['player', 'ai-west', 'ai-north', 'ai-east'],
      currentPlayer: 'player',
      gamePhase: 'playing',
      scores: { player: 0, 'ai-west': 0, 'ai-north': 0, 'ai-east': 0 },
      crdtClock: BigInt(1),
      lastActionAt: new Date().toISOString(),
      currentSuit: topCard?.suit,
    };
    
    setMatchState(initialState);
    
    // Initialize AI players
    const ais: Partial<Record<PlayerId, AIPlayer>> = {
      'ai-west': new AIPlayer('ai-west', getDefaultPersonality('ai-west'), seed, spoons),
      'ai-north': new AIPlayer('ai-north', getDefaultPersonality('ai-north'), seed, spoons),
      'ai-east': new AIPlayer('ai-east', getDefaultPersonality('ai-east'), seed, spoons),
    };
    setAiPlayers(ais);
    
    setMessage('Play a card matching rank or suit, or play an 8 to change suit');
  };
  
  // AI turn handler
  useEffect(() => {
    if (!matchState || matchState.currentPlayer === 'player' || matchState.gamePhase === 'finished') {
      return;
    }
    
    const timer = setTimeout(() => {
      handleAITurn();
    }, 1500 / spoonConfig.animationSpeed);
    
    return () => clearTimeout(timer);
  }, [matchState?.currentPlayer, matchState?.gamePhase]);
  
  const handleAITurn = () => {
    if (!matchState) return;
    
    const currentPlayerId = matchState.currentPlayer;
    const ai = aiPlayers[currentPlayerId];
    
    if (!ai) return;
    
    const player = matchState.players.find(p => p.id === currentPlayerId);
    if (!player) return;
    
    const topCard = matchState.discardPile[matchState.discardPile.length - 1];
    if (!topCard) return;
    
    // Find valid plays
    const validPlays = player.hand.cards.filter(card => 
      canPlayCrazyEights(card, topCard, matchState.currentSuit || topCard.suit)
    );
    
    if (validPlays.length === 0) {
      // Draw card
      handleDrawCard(currentPlayerId);
    } else {
      // AI selects play
      const selected = ai.selectPlay(player.hand.cards, matchState, validPlays);
      handlePlayCard(currentPlayerId, selected);
    }
  };
  
  const handlePlayCard = (playerId: PlayerId, card: Card) => {
    if (!matchState) return;
    
    const topCard = matchState.discardPile[matchState.discardPile.length - 1];
    if (!topCard) return;
    
    const result = playCrazyEights(card, topCard, matchState.currentSuit || topCard.suit);
    
    if (!result.success) {
      setMessage(result.error || 'Invalid play');
      return;
    }
    
    // Update state
    const player = matchState.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Remove card from hand
    const newHand = player.hand.cards.filter(c => c.id !== card.id);
    
    // Add to discard pile
    card.faceUp = true;
    const newDiscardPile = [...matchState.discardPile, card];
    
    // Check win condition
    if (newHand.length === 0) {
      setMatchState({
        ...matchState,
        players: matchState.players.map(p => 
          p.id === playerId 
            ? { ...p, hand: { ...p.hand, cards: newHand } }
            : p
        ),
        discardPile: newDiscardPile,
        currentSuit: result.newSuit,
        gamePhase: 'finished',
        crdtClock: matchState.crdtClock + BigInt(1),
        lastActionAt: new Date().toISOString(),
      });
      
      setMessage(`${playerId === 'player' ? 'You' : 'AI'} won!`);
      onMatchComplete(matchState, playerId);
      return;
    }
    
    // Determine next player
    let nextPlayer = getNextPlayer(playerId, result.skipNext || false);
    
    // Handle draw cards
    if (result.drawCards && result.drawCards > 0) {
      const nextPlayerObj = matchState.players.find(p => p.id === nextPlayer);
      if (nextPlayerObj) {
        const drawCount = Math.min(result.drawCards, matchState.deck.length);
        const drawnCards = matchState.deck.slice(0, drawCount);
        const newDeck = matchState.deck.slice(drawCount);
        
        // Add drawn cards to next player's hand
        setMatchState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            deck: newDeck,
            players: prev.players.map(p => 
              p.id === nextPlayer
                ? { ...p, hand: { ...p.hand, cards: [...p.hand.cards, ...drawnCards] } }
                : p
            ),
          };
        });
        
        setMessage(`${nextPlayer === 'player' ? 'You' : 'AI'} must draw ${drawCount} cards!`);
      }
    }
    
    setMatchState({
      ...matchState,
      players: matchState.players.map(p => 
        p.id === playerId 
          ? { ...p, hand: { ...p.hand, cards: newHand } }
          : p
      ),
      discardPile: newDiscardPile,
      currentSuit: result.newSuit,
      currentPlayer: nextPlayer,
      crdtClock: matchState.crdtClock + BigInt(1),
      lastActionAt: new Date().toISOString(),
    });
    
    if (result.newSuit && result.newSuit !== card.suit) {
      setMessage(`Suit changed to ${result.newSuit}`);
    }
  };
  
  const handleDrawCard = (playerId: PlayerId) => {
    if (!matchState) return;
    
    if (matchState.deck.length === 0) {
      // Reshuffle discard pile
      const newDeck = [...matchState.discardPile.slice(0, -1)];
      setMatchState({
        ...matchState,
        deck: newDeck,
        discardPile: [matchState.discardPile[matchState.discardPile.length - 1]],
      });
      setMessage('Deck reshuffled!');
      return;
    }
    
    const drawnCard = matchState.deck[0];
    const newDeck = matchState.deck.slice(1);
    
    setMatchState({
      ...matchState,
      deck: newDeck,
      players: matchState.players.map(p => 
        p.id === playerId
          ? { ...p, hand: { ...p.hand, cards: [...p.hand.cards, drawnCard] } }
          : p
      ),
      crdtClock: matchState.crdtClock + BigInt(1),
      lastActionAt: new Date().toISOString(),
    });
    
    setMessage(`${playerId === 'player' ? 'You' : 'AI'} drew a card`);
  };
  
  const getValidPlays = (): Card[] => {
    if (!matchState || matchState.currentPlayer !== 'player') return [];
    
    const player = matchState.players.find(p => p.id === 'player');
    const topCard = matchState.discardPile[matchState.discardPile.length - 1];
    
    if (!player || !topCard) return [];
    
    return player.hand.cards.filter(card => 
      canPlayCrazyEights(card, topCard, matchState.currentSuit || topCard.suit)
    );
  };
  
  if (!matchState) return <div>Loading...</div>;
  
  const player = matchState.players.find(p => p.id === 'player');
  const topCard = matchState.discardPile[matchState.discardPile.length - 1];
  const validPlays = getValidPlays();
  
  return (
    <div style={{ padding: '16px' }}>
      <h2>Crazy Eights</h2>
      
      {/* Discard pile */}
      <div style={{ marginBottom: '16px' }}>
        <h4>Top Card</h4>
        {topCard && (
          <div style={{
            display: 'inline-flex',
            padding: '16px',
            background: 'white',
            border: '2px solid #333',
            borderRadius: '8px',
            fontSize: '24px',
          }}>
            {formatCard(topCard)}
            {matchState.currentSuit && matchState.currentSuit !== topCard.suit && (
              <span style={{ marginLeft: '8px', color: '#3b82f6' }}>
                (Suit: {matchState.currentSuit})
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Message */}
      {message && (
        <div style={{ padding: '8px', background: '#f0f9ff', borderRadius: '4px', marginBottom: '16px' }}>
          {message}
        </div>
      )}
      
      {/* Player hand */}
      <div>
        <h4>Your Hand ({player?.hand.cards.length || 0} cards)</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {player?.hand.cards.map(card => {
            const isPlayable = validPlays.some(c => c.id === card.id);
            
            return (
              <button
                key={card.id}
                onClick={() => isPlayable && handlePlayCard('player', card)}
                disabled={!isPlayable || matchState.currentPlayer !== 'player'}
                style={{
                  padding: '16px',
                  fontSize: '18px',
                  background: isPlayable ? '#dbeafe' : '#f3f4f6',
                  border: isPlayable ? '2px solid #3b82f6' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: isPlayable ? 'pointer' : 'not-allowed',
                  opacity: matchState.currentPlayer === 'player' ? 1 : 0.6,
                }}
              >
                {formatCard(card)}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Draw button */}
      {matchState.currentPlayer === 'player' && validPlays.length === 0 && (
        <button
          onClick={() => handleDrawCard('player')}
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Draw Card
        </button>
      )}
      
      {/* AI hands */}
      <div style={{ marginTop: '24px' }}>
        <h4>Other Players</h4>
        {matchState.players
          .filter(p => p.type === 'ai')
          .map(p => (
            <div key={p.id} style={{ marginBottom: '8px' }}>
              {p.id}: {p.hand.cards.length} cards
              {matchState.currentPlayer === p.id && ' (thinking...)'}
            </div>
          ))}
      </div>
    </div>
  );
}
