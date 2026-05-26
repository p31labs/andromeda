// P31 Card Table: Euchre Game Component
// Partnership trick-taking with trump

import { useCallback, useEffect, useState } from 'react';
import type { 
  MatchState, GameId, PlayerId, Card, SpoonState, CrossGameIdentity, Suit 
} from '../../types';
import { GAMES, SPOON_CONFIG } from '../../types';
import { generateStandardDeck, dealEuchre, formatCard } from '../../engine/deck';
import { 
  createTrick, playToTrick, getValidPlays, getNextPlayer, countTricksWon, getPartner 
} from '../../engine/trick-taking';
import { createEuchreBidding, placeEuchreBid, evaluateEuchreHand } from '../../engine/bidding';
import { AIPlayer, getDefaultPersonality } from '../ai/AIPlayer';

interface EuchreProps {
  spoons: SpoonState;
  identity: CrossGameIdentity;
  onMatchComplete: (matchState: MatchState, winner: PlayerId | null) => void;
  onIdentityUpdate: (identity: CrossGameIdentity) => void;
}

export function Euchre({ spoons, identity, onMatchComplete, onIdentityUpdate }: EuchreProps) {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [message, setMessage] = useState<string>('');
  const [aiPlayers, setAiPlayers] = useState<Partial<Record<PlayerId, AIPlayer>>>({});
  const [biddingState, setBiddingState] = useState<ReturnType<typeof createEuchreBidding> | null>(null);
  const [handNumber, setHandNumber] = useState(1);
  const [teamScores, setTeamScores] = useState({ 'team-a': 0, 'team-b': 0 });
  
  const spoonConfig = SPOON_CONFIG[spoons];
  
  // Initialize game
  useEffect(() => {
    initHand();
  }, []);
  
  const initHand = () => {
    const matchId = `match-${Date.now()}`;
    const seed = `seed-${Date.now()}`;
    
    // Create deck and deal (24 cards for Euchre)
    const deck = generateStandardDeck('euchre');
    const deal = dealEuchre(deck, ['player', 'ai-west', 'ai-north', 'ai-east'], seed);
    
    // Set up players with teams
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
    
    // Set up bidding
    const dealer = players.find(p => p.isDealer)?.id || 'player';
    const upCard = deal.remaining[0];
    const bidding = createEuchreBidding(upCard, dealer);
    
    const initialState: MatchState = {
      gameId: 'euchre' as GameId,
      matchId,
      deck: deal.remaining,
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
    
    // Initialize AI players
    const ais: Partial<Record<PlayerId, AIPlayer>> = {
      'ai-west': new AIPlayer('ai-west', getDefaultPersonality('ai-west'), seed, spoons),
      'ai-north': new AIPlayer('ai-north', getDefaultPersonality('ai-north'), seed, spoons),
      'ai-east': new AIPlayer('ai-east', getDefaultPersonality('ai-east'), seed, spoons),
    };
    setAiPlayers(ais);
    
    setMessage(`Hand ${handNumber}: Up card is ${formatCard(upCard)}. Bidding starts.`);
  };
  
  // Bidding handler
  useEffect(() => {
    if (!matchState || !biddingState || matchState.gamePhase !== 'bidding') return;
    
    if (matchState.currentPlayer === 'player') return;
    
    const timer = setTimeout(() => {
      handleAIBid();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [matchState?.currentPlayer, biddingState?.currentBidder]);
  
  const handleAIBid = () => {
    if (!matchState || !biddingState) return;
    
    const playerId = matchState.currentPlayer;
    const ai = aiPlayers[playerId];
    const player = matchState.players.find(p => p.id === playerId);
    
    if (!ai || !player) return;
    
    const bidResult = ai.makeBid(player.hand.cards, 'euchre', biddingState, biddingState.upCard);
    handleBid(playerId, bidResult.bid, bidResult.chosenSuit);
  };
  
  const handleBid = (playerId: PlayerId, bid: string, chosenSuit?: Suit) => {
    if (!matchState || !biddingState) return;
    
    const newBiddingState = placeEuchreBid(biddingState, playerId, bid as any, chosenSuit);
    setBiddingState(newBiddingState);
    
    if (newBiddingState.phase === 'completed') {
      // Bidding done - start playing
      const maker = newBiddingState.maker || 'player';
      const trumpSuit = newBiddingState.trumpSuit;
      
      // If maker is dealer, they get the up card
      if (maker === biddingState.dealer) {
        const dealer = matchState.players.find(p => p.id === maker);
        if (dealer) {
          dealer.hand.cards.push({ ...biddingState.upCard, faceUp: true });
          dealer.hand.cards = sortHandForEuchre(dealer.hand.cards, trumpSuit as Suit);
        }
      }
      
      setMatchState({
        ...matchState,
        gamePhase: 'playing',
        currentPlayer: getNextPlayer(biddingState.dealer),  // Eldest hand leads
        trumpSuit: trumpSuit as Suit,
        bidWinner: maker,
      });
      
      setMessage(`${maker === 'player' ? 'You' : 'AI'} ordered up ${trumpSuit}. Play begins!`);
    } else {
      setMatchState({
        ...matchState,
        currentPlayer: newBiddingState.currentBidder,
      });
    }
  };
  
  const sortHandForEuchre = (hand: Card[], trump: Suit): Card[] => {
    return [...hand].sort((a, b) => {
      // Trump cards go first
      const aIsTrump = a.suit === trump || (a.rank === 11 && a.suit === getSameColorSuit(trump));
      const bIsTrump = b.suit === trump || (b.rank === 11 && b.suit === getSameColorSuit(trump));
      
      if (aIsTrump && !bIsTrump) return -1;
      if (!aIsTrump && bIsTrump) return 1;
      
      // Same category - sort by rank
      return b.rank - a.rank;
    });
  };
  
  const getSameColorSuit = (suit: Suit): Suit => {
    const pairs: Record<Suit, Suit> = {
      'HEARTS': 'DIAMONDS',
      'DIAMONDS': 'HEARTS',
      'CLUBS': 'SPADES',
      'SPADES': 'CLUBS',
    };
    return pairs[suit];
  };
  
  // AI turn handler
  useEffect(() => {
    if (!matchState || matchState.currentPlayer === 'player' || matchState.gamePhase !== 'playing') {
      return;
    }
    
    const timer = setTimeout(() => {
      handleAIPlay();
    }, 2000 / spoonConfig.animationSpeed);
    
    return () => clearTimeout(timer);
  }, [matchState?.currentPlayer, matchState?.currentTrick]);
  
  const handleAIPlay = () => {
    if (!matchState) return;
    
    const playerId = matchState.currentPlayer;
    const ai = aiPlayers[playerId];
    const player = matchState.players.find(p => p.id === playerId);
    
    if (!ai || !player) return;
    
    const validPlays = getValidPlays(player.hand.cards, matchState.currentTrick, 'euchre', matchState);
    
    if (validPlays.length === 0) {
      console.error('AI has no valid plays');
      return;
    }
    
    const selected = ai.selectPlay(player.hand.cards, matchState, validPlays);
    handlePlayCard(playerId, selected);
  };
  
  const handlePlayCard = (playerId: PlayerId, card: Card) => {
    if (!matchState) return;
    
    const player = matchState.players.find(p => p.id === playerId);
    if (!player) return;
    
    let currentTrick = matchState.currentTrick;
    if (!currentTrick) {
      currentTrick = createTrick(playerId, matchState.trumpSuit);
    }
    
    const result = playToTrick(
      currentTrick,
      playerId,
      card,
      player.hand.cards,
      'euchre',
      matchState.trumpSuit
    );
    
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
          p.id === playerId 
            ? { ...p, hand: { ...p.hand, cards: newHand } }
            : p
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
    // Count tricks per team
    const teamATricks = state.players
      .filter(p => p.team === 'team-a')
      .reduce((sum, p) => sum + countTricksWon(state.tricks, p.id), 0);
    const teamBTricks = state.players
      .filter(p => p.team === 'team-b')
      .reduce((sum, p) => sum + countTricksWon(state.tricks, p.id), 0);
    
    // Determine maker
    const maker = state.bidWinner || 'player';
    const makerTeam = state.players.find(p => p.id === maker)?.team || 'team-a';
    const makerTricks = makerTeam === 'team-a' ? teamATricks : teamBTricks;
    
    // Score hand
    let points: { 'team-a': number; 'team-b': number } = { ...teamScores };
    
    if (makerTricks >= 5) {
      // March
      points[makerTeam] += 2;
      setMessage(`${makerTeam === 'team-a' ? 'Your team' : 'Opponents'} march! +2 points`);
    } else if (makerTricks >= 3) {
      // Made contract
      points[makerTeam] += 1;
      setMessage(`${makerTeam === 'team-a' ? 'Your team' : 'Opponents'} made contract. +1 point`);
    } else {
      // Euchred
      const otherTeam = makerTeam === 'team-a' ? 'team-b' : 'team-a';
      points[otherTeam] += 2;
      setMessage(`${makerTeam === 'team-a' ? 'Your team' : 'Opponents'} got euchred! +2 to other team`);
    }
    
    setTeamScores(points);
    
    // Check for game over (10 points)
    if (points['team-a'] >= 10 || points['team-b'] >= 10) {
      const winningTeam = points['team-a'] >= 10 ? 'team-a' : 'team-b';
      const playerWon = winningTeam === 'team-a';
      
      setMessage(`Game over! ${playerWon ? 'Your team' : 'Opponents'} win ${points[winningTeam]}-${points[playerWon ? 'team-b' : 'team-a']}!`);
      
      const winner: PlayerId = playerWon ? 'player' : 'ai-west';
      onMatchComplete({ ...state, gamePhase: 'finished', teamScores: points }, winner);
      
      return { ...state, teamScores: points, gamePhase: 'finished' };
    }
    
    // Next hand
    setHandNumber(handNumber + 1);
    setTimeout(() => initHand(), 3000);
    
    return { ...state, teamScores: points, gamePhase: 'scoring' };
  };
  
  const player = matchState?.players.find(p => p.id === 'player');
  
  return (
    <div style={{ padding: '16px' }}>
      <h2>Euchre - Hand {handNumber}</h2>
      
      {/* Team scores */}
      <div style={{ marginBottom: '16px', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>
        <h4>Scores</h4>
        <div>Your Team (You + North): {teamScores['team-a']}</div>
        <div>Opponents (West + East): {teamScores['team-b']}</div>
      </div>
      
      {/* Bidding */}
      {matchState?.gamePhase === 'bidding' && biddingState && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#fef3c7', borderRadius: '4px' }}>
          <h4>Bidding</h4>
          <div>Up card: {formatCard(biddingState.upCard)}</div>
          {biddingState.currentBidder === 'player' ? (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                {evaluateEuchreHand(player?.hand.cards || [], biddingState.upCard).reasoning}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleBid('player', 'pass')} style={{ padding: '8px 16px' }}>
                  Pass
                </button>
                <button onClick={() => handleBid('player', 'order-up')} style={{ padding: '8px 16px', background: '#10b981', color: 'white' }}>
                  Order Up
                </button>
              </div>
            </div>
          ) : (
            <div>Waiting for {matchState.currentPlayer} to bid...</div>
          )}
        </div>
      )}
      
      {/* Message */}
      {message && <div style={{ padding: '8px', background: '#f0f9ff', marginBottom: '16px' }}>{message}</div>}
      
      {/* Current trick */}
      {matchState?.currentTrick && (
        <div style={{ marginBottom: '16px' }}>
          <h4>Trick</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            {matchState.currentTrick.cards.map((played, i) => (
              <div key={i} style={{ padding: '8px', background: 'white', border: '1px solid #ccc' }}>
                {played.playerId}: {formatCard(played.card)}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Trump indicator */}
      {matchState?.trumpSuit && (
        <div style={{ marginBottom: '16px', padding: '8px', background: '#dbeafe', borderRadius: '4px' }}>
          <strong>Trump: {matchState.trumpSuit}</strong>
          {matchState.bidWinner === 'player' && <span> (You are maker)</span>}
        </div>
      )}
      
      {/* Player hand */}
      {matchState?.gamePhase === 'playing' && (
        <div>
          <h4>Your Hand</h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {player?.hand.cards.map(card => {
              const isPlayable = matchState.currentPlayer === 'player' && 
                getValidPlays(player.hand.cards, matchState.currentTrick, 'euchre', matchState)
                  .some(c => c.id === card.id);
              
              return (
                <button
                  key={card.id}
                  onClick={() => isPlayable && handlePlayCard('player', card)}
                  disabled={!isPlayable}
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
      )}
    </div>
  );
}
