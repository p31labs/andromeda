// P31 Card Table: Bridge Lite Game Component
// Simplified contract bridge for family play

import { useEffect, useState } from 'react';
import type { 
  MatchState, GameId, PlayerId, Card, SpoonState, CrossGameIdentity, Suit 
} from '../../types';
import { GAMES, SPOON_CONFIG } from '../../types';
import { generateStandardDeck, dealBridge, formatCard } from '../../engine/deck';
import { 
  createTrick, playToTrick, getValidPlays, getNextPlayer, countTricksWon 
} from '../../engine/trick-taking';
import { createBridgeBidding, placeBridgeBid, evaluateBridgeHand } from '../../engine/bidding';
import { AIPlayer, getDefaultPersonality } from '../ai/AIPlayer';

interface BridgeLiteProps {
  spoons: SpoonState;
  identity: CrossGameIdentity;
  onMatchComplete: (matchState: MatchState, winner: PlayerId | null) => void;
  onIdentityUpdate: (identity: CrossGameIdentity) => void;
}

export function BridgeLite({ spoons, identity, onMatchComplete, onIdentityUpdate }: BridgeLiteProps) {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [message, setMessage] = useState<string>('Bridge Lite - Contract Bridge for Families');
  const [aiPlayers, setAiPlayers] = useState<Partial<Record<PlayerId, AIPlayer>>>({});
  const [biddingState, setBiddingState] = useState<ReturnType<typeof createBridgeBidding> | null>(null);
  const [handNumber, setHandNumber] = useState(1);
  const [teamScores, setTeamScores] = useState({ 'team-a': 0, 'team-b': 0 });
  
  const spoonConfig = SPOON_CONFIG[spoons];
  
  useEffect(() => {
    initHand();
  }, []);
  
  const initHand = () => {
    const matchId = `match-${Date.now()}`;
    const seed = `seed-${Date.now()}`;
    
    const deck = generateStandardDeck();
    const deal = dealBridge(deck, ['player', 'ai-west', 'ai-north', 'ai-east'], seed);
    
    const players = [
      {
        id: 'player' as PlayerId,
        type: 'human' as const,
        personalityId: 'scout',
        hand: { playerId: 'player', cards: deal.hands.player, tricksWon: 0, score: 0 },
        team: 'team-a' as const,
        isDealer: handNumber % 4 === 1,
      },
      {
        id: 'ai-west' as PlayerId,
        type: 'ai' as const,
        personalityId: getDefaultPersonality('ai-west'),
        hand: { playerId: 'ai-west', cards: deal.hands['ai-west'], tricksWon: 0, score: 0 },
        team: 'team-b' as const,
        isDealer: handNumber % 4 === 0,
      },
      {
        id: 'ai-north' as PlayerId,
        type: 'ai' as const,
        personalityId: getDefaultPersonality('ai-north'),
        hand: { playerId: 'ai-north', cards: deal.hands['ai-north'], tricksWon: 0, score: 0 },
        team: 'team-a' as const,
        isDealer: handNumber % 4 === 3,
      },
      {
        id: 'ai-east' as PlayerId,
        type: 'ai' as const,
        personalityId: getDefaultPersonality('ai-east'),
        hand: { playerId: 'ai-east', cards: deal.hands['ai-east'], tricksWon: 0, score: 0 },
        team: 'team-b' as const,
        isDealer: handNumber % 4 === 2,
      },
    ];
    
    const dealer = players.find(p => p.isDealer)?.id || 'player';
    const bidding = createBridgeBidding(dealer);
    
    const initialState: MatchState = {
      gameId: 'bridge-lite' as GameId,
      matchId,
      deck: [],
      discardPile: [],
      players,
      tricks: [],
      currentTrick: null,
      turnOrder: ['player', 'ai-west', 'ai-north', 'ai-east'],
      currentPlayer: bidding.currentBidder,
      gamePhase: 'bidding',
      scores: { player: 0, 'ai-west': 0, 'ai-north': 0, 'ai-east': 0 },
      teamScores,
      crdtClock: BigInt(1),
      lastActionAt: new Date().toISOString(),
    };
    
    setMatchState(initialState);
    setBiddingState(bidding);
    
    const ais: Partial<Record<PlayerId, AIPlayer>> = {
      'ai-west': new AIPlayer('ai-west', getDefaultPersonality('ai-west'), seed, spoons),
      'ai-north': new AIPlayer('ai-north', getDefaultPersonality('ai-north'), seed, spoons),
      'ai-east': new AIPlayer('ai-east', getDefaultPersonality('ai-east'), seed, spoons),
    };
    setAiPlayers(ais);
    
    setMessage(`Hand ${handNumber}: Bidding begins`);
  };
  
  // Simplified bidding - AI auto-bid
  useEffect(() => {
    if (!matchState || !biddingState || matchState.gamePhase !== 'bidding') return;
    if (matchState.currentPlayer === 'player') return;
    
    const timer = setTimeout(() => {
      const playerId = matchState.currentPlayer;
      const ai = aiPlayers[playerId];
      const player = matchState.players.find(p => p.id === playerId);
      
      if (!ai || !player) return;
      
      const evaluation = evaluateBridgeHand(player.hand.cards);
      const bid = evaluation.recommendedBid === 0 ? 'pass' : 
        { level: evaluation.recommendedBid, trump: evaluation.recommendedTrump || 'no-trump' };
      
      handleBid(playerId, bid);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [matchState?.currentPlayer]);
  
  const handleBid = (playerId: PlayerId, bid: 'pass' | { level: number; trump: Suit | 'no-trump' }) => {
    if (!matchState || !biddingState) return;
    
    try {
      const newBiddingState = placeBridgeBid(biddingState, playerId, bid);
      setBiddingState(newBiddingState);
      
      if (newBiddingState.phase === 'completed') {
        const contract = newBiddingState.contract;
        if (contract) {
          const tricksBid: Record<PlayerId, number> = { 
            player: 0, 
            'ai-west': 0, 
            'ai-north': 0, 
            'ai-east': 0 
          };
          tricksBid[contract.declarer] = contract.level;
          setMatchState({
            ...matchState,
            gamePhase: 'playing',
            currentPlayer: contract.declarer,
            trumpSuit: contract.trump === 'no-trump' ? undefined : contract.trump,
            tricksBid,
            bidWinner: contract.declarer,
          });
          setMessage(`Contract: ${contract.level} ${contract.trump} by ${contract.declarer}`);
        }
      } else {
        setMatchState({
          ...matchState,
          currentPlayer: newBiddingState.currentBidder,
        });
      }
    } catch (e) {
      // Invalid bid - pass instead
      handleBid(playerId, 'pass');
    }
  };
  
  // AI play
  useEffect(() => {
    if (!matchState || matchState.currentPlayer === 'player' || matchState.gamePhase !== 'playing') return;
    
    const timer = setTimeout(() => {
      const playerId = matchState.currentPlayer;
      const ai = aiPlayers[playerId];
      const player = matchState.players.find(p => p.id === playerId);
      
      if (!ai || !player) return;
      
      const validPlays = getValidPlays(player.hand.cards, matchState.currentTrick, 'bridge-lite', matchState);
      const selected = ai.selectPlay(player.hand.cards, matchState, validPlays);
      handlePlayCard(playerId, selected);
    }, 1500 / spoonConfig.animationSpeed);
    
    return () => clearTimeout(timer);
  }, [matchState?.currentPlayer]);
  
  const handlePlayCard = (playerId: PlayerId, card: Card) => {
    if (!matchState) return;
    
    const player = matchState.players.find(p => p.id === playerId);
    if (!player) return;
    
    let currentTrick = matchState.currentTrick;
    if (!currentTrick) {
      currentTrick = createTrick(playerId, matchState.trumpSuit);
    }
    
    const result = playToTrick(currentTrick, playerId, card, player.hand.cards, 'bridge-lite', matchState.trumpSuit);
    
    if (!result.success) {
      setMessage(result.error || 'Invalid play');
      return;
    }
    
    const newHand = player.hand.cards.filter(c => c.id !== card.id);
    
    setMatchState(prev => {
      if (!prev) return null;
      
      const newState = {
        ...prev,
        players: prev.players.map(p => 
          p.id === playerId ? { ...p, hand: { ...p.hand, cards: newHand } } : p
        ),
        currentTrick: result.trick,
        crdtClock: prev.crdtClock + BigInt(1),
        lastActionAt: new Date().toISOString(),
      };
      
      if (result.isComplete && result.winner) {
        newState.tricks = [...prev.tricks, { ...result.trick, winner: result.winner }];
        newState.currentTrick = null;
        newState.currentPlayer = result.winner;
        
        if (newHand.length === 0) {
          return handleHandEnd(newState);
        }
      } else {
        newState.currentPlayer = getNextPlayer(playerId);
      }
      
      return newState;
    });
  };
  
  const handleHandEnd = (state: MatchState): MatchState => {
    const declarer = state.bidWinner || 'player';
    const contract = state.tricksBid?.[declarer] || 7;
    
    const teamATricks = state.players
      .filter(p => p.team === 'team-a')
      .reduce((sum, p) => sum + countTricksWon(state.tricks, p.id), 0);
    const teamBTricks = state.players
      .filter(p => p.team === 'team-b')
      .reduce((sum, p) => sum + countTricksWon(state.tricks, p.id), 0);
    
    const declarerTeam = state.players.find(p => p.id === declarer)?.team || 'team-a';
    const declarerTricks = declarerTeam === 'team-a' ? teamATricks : teamBTricks;
    
    // Simple scoring
    let points = 0;
    if (declarerTricks >= contract) {
      points = (declarerTricks - 6) * (state.trumpSuit ? 30 : 20);
      setMessage(`Contract made! ${declarerTeam} scores ${points}`);
    } else {
      points = -50;
      setMessage(`Contract failed. ${declarerTeam} loses 50 points`);
    }
    
    const newTeamScores = { ...teamScores, [declarerTeam]: teamScores[declarerTeam] + points };
    setTeamScores(newTeamScores);
    
    if (newTeamScores['team-a'] >= 100 || newTeamScores['team-b'] >= 100) {
      const winner = newTeamScores['team-a'] >= 100 ? 'player' : 'ai-west';
      onMatchComplete({ ...state, gamePhase: 'finished' }, winner);
      return { ...state, gamePhase: 'finished' };
    }
    
    setHandNumber(handNumber + 1);
    setTimeout(() => initHand(), 3000);
    
    return { ...state, gamePhase: 'scoring' };
  };
  
  const player = matchState?.players.find(p => p.id === 'player');
  
  return (
    <div style={{ padding: '16px' }}>
      <h2>Bridge Lite - Hand {handNumber}</h2>
      
      {/* Team scores */}
      <div style={{ marginBottom: '16px', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>
        <div>Your Team: {teamScores['team-a']}</div>
        <div>Opponents: {teamScores['team-b']}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>Target: 100 points</div>
      </div>
      
      {/* Bidding (simplified) */}
      {matchState?.gamePhase === 'bidding' && biddingState && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#fef3c7' }}>
          <h4>Your Hand</h4>
          {player?.hand.cards.map(card => (
            <span key={card.id} style={{ marginRight: '8px' }}>{formatCard(card)}</span>
          ))}
          <div style={{ marginTop: '8px' }}>
            {biddingState.currentBidder === 'player' ? (
              <div>
                {evaluateBridgeHand(player?.hand.cards || []).reasoning}
                <button onClick={() => handleBid('player', 'pass')} style={{ marginLeft: '8px' }}>Pass</button>
              </div>
            ) : (
              <div>Waiting for AI to bid...</div>
            )}
          </div>
        </div>
      )}
      
      {message && <div style={{ padding: '8px', background: '#f0f9ff', marginBottom: '16px' }}>{message}</div>}
      
      {/* Playing */}
      {matchState?.gamePhase === 'playing' && (
        <div>
          <h4>Your Hand</h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {player?.hand.cards.map(card => {
              const isPlayable = matchState.currentPlayer === 'player' &&
                getValidPlays(player.hand.cards, matchState.currentTrick, 'bridge-lite', matchState)
                  .some(c => c.id === card.id);
              return (
                <button
                  key={card.id}
                  onClick={() => isPlayable && handlePlayCard('player', card)}
                  disabled={!isPlayable}
                  style={{ padding: '12px', background: isPlayable ? '#dbeafe' : '#f3f4f6' }}
                >
                  {formatCard(card)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
