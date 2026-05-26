// P31 Card Table: Hearts Game Component
// Trick-taking with penalty points - avoid hearts and Q of spades

import { useCallback, useEffect, useState } from 'react';
import type { 
  MatchState, GameId, PlayerId, Card, SpoonState, CrossGameIdentity, Trick 
} from '../../types';
import { GAMES, SPOON_CONFIG } from '../../types';
import { generateStandardDeck, dealHearts, formatCard } from '../../engine/deck';
import { 
  createTrick, playToTrick, getValidPlays, getNextPlayer, scoreHeartsHand, checkShootTheMoon 
} from '../../engine/trick-taking';
import { scoreGame, calculateMatchXP } from '../../engine/scoring';
import { AIPlayer, getDefaultPersonality } from '../ai/AIPlayer';

interface HeartsProps {
  spoons: SpoonState;
  identity: CrossGameIdentity;
  onMatchComplete: (matchState: MatchState, winner: PlayerId | null) => void;
  onIdentityUpdate: (identity: CrossGameIdentity) => void;
}

export function Hearts({ spoons, identity, onMatchComplete, onIdentityUpdate }: HeartsProps) {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [message, setMessage] = useState<string>('');
  const [aiPlayers, setAiPlayers] = useState<Partial<Record<PlayerId, AIPlayer>>>({});
  const [handNumber, setHandNumber] = useState(1);
  const [totalScores, setTotalScores] = useState<Record<PlayerId, number>>({
    player: 0, 'ai-west': 0, 'ai-north': 0, 'ai-east': 0
  });
  
  const spoonConfig = SPOON_CONFIG[spoons];
  const game = GAMES.hearts;
  
  // Initialize game
  useEffect(() => {
    initHand();
  }, []);
  
  const initHand = () => {
    const matchId = `match-${Date.now()}`;
    const seed = `seed-${Date.now()}`;
    
    // Create deck and deal
    const deck = generateStandardDeck('hearts');
    const deal = dealHearts(deck, ['player', 'ai-west', 'ai-north', 'ai-east'], seed);
    
    // Face up all cards
    Object.values(deal.hands).forEach(hand => {
      hand.forEach(card => card.faceUp = true);
    });
    
    // Set up players
    const players = [
      {
        id: 'player' as PlayerId,
        type: 'human' as const,
        personalityId: 'scout',
        hand: { playerId: 'player', cards: deal.hands.player, tricksWon: 0, score: 0 },
        isDealer: false,
      },
      {
        id: 'ai-west' as PlayerId,
        type: 'ai' as const,
        personalityId: getDefaultPersonality('ai-west'),
        hand: { playerId: 'ai-west', cards: deal.hands['ai-west'], tricksWon: 0, score: 0 },
        isDealer: false,
      },
      {
        id: 'ai-north' as PlayerId,
        type: 'ai' as const,
        personalityId: getDefaultPersonality('ai-north'),
        hand: { playerId: 'ai-north', cards: deal.hands['ai-north'], tricksWon: 0, score: 0 },
        isDealer: false,
      },
      {
        id: 'ai-east' as PlayerId,
        type: 'ai' as const,
        personalityId: getDefaultPersonality('ai-east'),
        hand: { playerId: 'ai-east', cards: deal.hands['ai-east'], tricksWon: 0, score: 0 },
        isDealer: false,
      },
    ];
    
    // Find player with 2 of clubs to lead
    let firstPlayer: PlayerId = 'player';
    for (const player of players) {
      const hasTwoOfClubs = player.hand.cards.some(c => c.suit === 'CLUBS' && c.rank === 2);
      if (hasTwoOfClubs) {
        firstPlayer = player.id;
        break;
      }
    }
    
    const initialState: MatchState = {
      gameId: 'hearts' as GameId,
      matchId,
      deck: [],
      discardPile: [],
      players,
      tricks: [],
      currentTrick: null,
      turnOrder: ['player', 'ai-west', 'ai-north', 'ai-east'],
      currentPlayer: firstPlayer,
      gamePhase: 'playing',
      scores: totalScores,
      crdtClock: BigInt(1),
      lastActionAt: new Date().toISOString(),
      heartsBroken: false,
    };
    
    setMatchState(initialState);
    
    // Initialize AI players
    const ais: Partial<Record<PlayerId, AIPlayer>> = {
      'ai-west': new AIPlayer('ai-west', getDefaultPersonality('ai-west'), seed, spoons),
      'ai-north': new AIPlayer('ai-north', getDefaultPersonality('ai-north'), seed, spoons),
      'ai-east': new AIPlayer('ai-east', getDefaultPersonality('ai-east'), seed, spoons),
    };
    setAiPlayers(ais);
    
    setMessage(`Hand ${handNumber}: ${firstPlayer === 'player' ? 'You' : 'AI'} leads with 2♣`);
  };
  
  // AI turn handler
  useEffect(() => {
    if (!matchState || matchState.currentPlayer === 'player' || matchState.gamePhase === 'finished') {
      return;
    }
    
    const timer = setTimeout(() => {
      handleAITurn();
    }, 2000 / spoonConfig.animationSpeed);
    
    return () => clearTimeout(timer);
  }, [matchState?.currentPlayer, matchState?.currentTrick]);
  
  const handleAITurn = () => {
    if (!matchState) return;
    
    const currentPlayerId = matchState.currentPlayer;
    const ai = aiPlayers[currentPlayerId];
    
    if (!ai) return;
    
    const player = matchState.players.find(p => p.id === currentPlayerId);
    if (!player) return;
    
    // Get valid plays
    const validPlays = getValidPlaysEngine(player.hand.cards, matchState.currentTrick, 'hearts', matchState);
    
    if (validPlays.length === 0) {
      console.error('AI has no valid plays - this should not happen');
      return;
    }
    
    // AI selects play
    const selected = ai.selectPlay(player.hand.cards, matchState, validPlays);
    handlePlayCard(currentPlayerId, selected);
  };
  
  const handlePlayCard = (playerId: PlayerId, card: Card) => {
    if (!matchState) return;
    
    const player = matchState.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Check if this is first trick and 2 of clubs must be played
    if (matchState.tricks.length === 0 && matchState.currentTrick === null) {
      const twoOfClubs = player.hand.cards.find(c => c.suit === 'CLUBS' && c.rank === 2);
      if (twoOfClubs && card.id !== twoOfClubs.id) {
        setMessage('Must play 2♣ on first trick!');
        return;
      }
    }
    
    // Create trick if needed
    let currentTrick = matchState.currentTrick;
    if (!currentTrick) {
      currentTrick = createTrick(playerId, undefined);
    }
    
    // Play to trick
    const result = playToTrick(
      currentTrick,
      playerId,
      card,
      player.hand.cards,
      'hearts',
      undefined
    );
    
    if (!result.success) {
      setMessage(result.error || 'Invalid play');
      return;
    }
    
    // Check if hearts broken
    let heartsBroken = matchState.heartsBroken;
    if (card.suit === 'HEARTS' && !heartsBroken) {
      heartsBroken = true;
      setMessage('Hearts have been broken!');
    }
    
    // Update player hand
    const newHand = player.hand.cards.filter(c => c.id !== card.id);
    
    // Update state
    setMatchState(prev => {
      if (!prev) return null;
      
      const newState = {
        ...prev,
        players: prev.players.map(p => 
          p.id === playerId 
            ? { ...p, hand: { ...p.hand, cards: newHand } }
            : p
        ),
        currentTrick: result.trick,
        heartsBroken,
        crdtClock: prev.crdtClock + BigInt(1),
        lastActionAt: new Date().toISOString(),
      };
      
      // Check if trick is complete
      if (result.isComplete && result.winner) {
        // Award trick to winner
        newState.tricks = [...prev.tricks, { ...result.trick, winner: result.winner }];
        newState.currentTrick = null;
        newState.currentPlayer = result.winner;
        
        // Check if hand is over
        if (newHand.length === 0) {
          // Calculate scores for this hand
          return handleHandEnd(newState);
        }
      } else {
        // Next player's turn
        newState.currentPlayer = getNextPlayer(playerId);
      }
      
      return newState;
    });
  };
  
  const handleHandEnd = (state: MatchState): MatchState => {
    // Calculate scores for each player
    const handScores: Record<PlayerId, number> = {
      player: scoreHeartsHand(state.tricks, 'player'),
      'ai-west': scoreHeartsHand(state.tricks, 'ai-west'),
      'ai-north': scoreHeartsHand(state.tricks, 'ai-north'),
      'ai-east': scoreHeartsHand(state.tricks, 'ai-east'),
    };
    
    // Check for shoot the moon
    for (const player of state.players) {
      if (checkShootTheMoon(state.tricks, player.id)) {
        // Player shot the moon - give them 0, others 26
        handScores[player.id] = 0;
        state.players.forEach(p => {
          if (p.id !== player.id) {
            handScores[p.id] = 26;
          }
        });
        setMessage(`${player.id === 'player' ? 'You' : 'AI'} shot the moon!`);
        break;
      }
    }
    
    // Update total scores
    const newTotalScores: Record<PlayerId, number> = {
      player: (totalScores.player || 0) + handScores.player,
      'ai-west': (totalScores['ai-west'] || 0) + handScores['ai-west'],
      'ai-north': (totalScores['ai-north'] || 0) + handScores['ai-north'],
      'ai-east': (totalScores['ai-east'] || 0) + handScores['ai-east'],
    };
    
    setTotalScores(newTotalScores);
    
    // Check if game is over
    const targetScore = 100;
    const gameOver = Object.values(newTotalScores).some(s => s >= targetScore);
    
    if (gameOver) {
      // Find winner (lowest score)
      let winner: PlayerId = 'player';
      let minScore = Infinity;
      for (const [pid, score] of Object.entries(newTotalScores)) {
        if (score < minScore) {
          minScore = score;
          winner = pid as PlayerId;
        }
      }
      
      setMessage(`Game over! ${winner === 'player' ? 'You' : 'AI'} won with ${minScore} points!`);
      
      onMatchComplete({ ...state, scores: newTotalScores, gamePhase: 'finished' }, winner);
      
      return { ...state, scores: newTotalScores, gamePhase: 'finished' };
    }
    
    // Continue to next hand
    setHandNumber(handNumber + 1);
    setMessage(`Hand ${handNumber + 1} starting...`);
    
    // Delay before next hand
    setTimeout(() => {
      initHand();
    }, 3000);
    
    return { ...state, scores: newTotalScores, gamePhase: 'scoring' };
  };
  
  const getMyValidPlays = (): Card[] => {
    if (!matchState || matchState.currentPlayer !== 'player') return [];
    
    const player = matchState.players.find(p => p.id === 'player');
    if (!player) return [];
    
    return getValidPlaysEngine(player.hand.cards, matchState.currentTrick, 'hearts', matchState);
  };
  
  const getValidPlaysEngine = (
    hand: Card[],
    trick: Trick | null,
    gameId: string,
    state: MatchState
  ): Card[] => {
    if (!trick || trick.cards.length === 0) {
      // First trick - must play 2 of clubs if have it
      if (state.tricks.length === 0) {
        const twoOfClubs = hand.find(c => c.suit === 'CLUBS' && c.rank === 2);
        if (twoOfClubs) return [twoOfClubs];
      }
      
      // Leading - can't lead hearts unless broken or only have hearts
      if (!state.heartsBroken) {
        const nonHearts = hand.filter(c => c.suit !== 'HEARTS');
        if (nonHearts.length > 0) return nonHearts;
      }
      return hand;
    }
    
    // Must follow suit
    const leadSuit = trick.leadSuit;
    if (!leadSuit) return hand;
    
    const followSuit = hand.filter(c => c.suit === leadSuit);
    if (followSuit.length > 0) return followSuit;
    
    // Can't follow - can play anything
    return hand;
  };
  
  if (!matchState) return <div>Loading...</div>;
  
  const player = matchState.players.find(p => p.id === 'player');
  const validPlays = getMyValidPlays();
  
  return (
    <div style={{ padding: '16px' }}>
      <h2>Hearts - Hand {handNumber}</h2>
      
      {/* Scores */}
      <div style={{ marginBottom: '16px', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>
        <h4>Scores</h4>
        {Object.entries(totalScores).map(([pid, score]) => (
          <div key={pid} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{pid === 'player' ? 'You' : pid}</span>
            <span>{score}</span>
          </div>
        ))}
      </div>
      
      {/* Current trick */}
      {matchState.currentTrick && (
        <div style={{ marginBottom: '16px' }}>
          <h4>Current Trick</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            {matchState.currentTrick.cards.map((played, i) => (
              <div key={i} style={{ padding: '8px', background: 'white', border: '1px solid #ccc' }}>
                {played.playerId}: {formatCard(played.card)}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Message */}
      {message && (
        <div style={{ padding: '8px', background: '#f0f9ff', borderRadius: '4px', marginBottom: '16px' }}>
          {message}
          {spoonConfig.showHints && matchState.heartsBroken && (
            <span style={{ display: 'block', fontSize: '12px', color: '#666', marginTop: '4px' }}>
              💡 Hearts are now in play
            </span>
          )}
        </div>
      )}
      
      {/* Player hand */}
      <div>
        <h4>Your Hand ({player?.hand.cards.length || 0} cards)</h4>
        {spoonConfig.showHints && matchState.currentPlayer === 'player' && matchState.currentTrick && (
          <div style={{ fontSize: '12px', color: '#3b82f6', marginBottom: '8px' }}>
            Must follow {matchState.currentTrick.leadSuit} if possible
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {player?.hand.cards.map(card => {
            const isPlayable = validPlays.some(c => c.id === card.id);
            
            return (
              <button
                key={card.id}
                onClick={() => isPlayable && handlePlayCard('player', card)}
                disabled={!isPlayable || matchState.currentPlayer !== 'player'}
                style={{
                  padding: '12px',
                  fontSize: '16px',
                  background: isPlayable ? '#dbeafe' : '#f3f4f6',
                  border: isPlayable ? '2px solid #3b82f6' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: isPlayable ? 'pointer' : 'not-allowed',
                }}
              >
                {formatCard(card)}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* AI hands */}
      <div style={{ marginTop: '24px' }}>
        <h4>Other Players</h4>
        {matchState.players
          .filter(p => p.type === 'ai')
          .map(p => (
            <div key={p.id} style={{ marginBottom: '8px' }}>
              {p.id}: {p.hand.cards.length} cards, {p.hand.tricksWon} tricks won
              {matchState.currentPlayer === p.id && ' (thinking...)'}
            </div>
          ))}
      </div>
    </div>
  );
}
