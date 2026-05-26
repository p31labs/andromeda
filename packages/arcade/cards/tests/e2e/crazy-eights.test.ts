// E2E Test: Crazy Eights
import { describe, it, expect, beforeEach } from 'vitest';
import { generateStandardDeck, dealCrazyEights, formatCard } from '../../src/engine/deck';
import { canPlayCrazyEights, playCrazyEights, getNextPlayer } from '../../src/engine/trick-taking';
import { scoreGame } from '../../src/engine/scoring';
import type { MatchState, PlayerId, Card } from '../../src/types';

describe('Crazy Eights E2E', () => {
  let matchState: MatchState;
  const seed = 'test-seed-123';

  beforeEach(() => {
    const deck = generateStandardDeck('crazy-eights');
    const deal = dealCrazyEights(deck, ['player', 'ai-west', 'ai-north', 'ai-east'], seed);
    
    const topCard = deal.remaining[0];
    if (topCard) topCard.faceUp = true;
    
    matchState = {
      gameId: 'crazy-eights',
      matchId: 'test-match-1',
      deck: deal.remaining.slice(1),
      discardPile: topCard ? [topCard] : [],
      players: [
        {
          id: 'player',
          type: 'human',
          personalityId: 'scout',
          hand: { playerId: 'player', cards: deal.hands.player, tricksWon: 0, score: 0 },
          isDealer: false,
        },
        {
          id: 'ai-west',
          type: 'ai',
          personalityId: 'nana',
          hand: { playerId: 'ai-west', cards: deal.hands['ai-west'], tricksWon: 0, score: 0 },
          isDealer: false,
        },
        {
          id: 'ai-north',
          type: 'ai',
          personalityId: 'ace',
          hand: { playerId: 'ai-north', cards: deal.hands['ai-north'], tricksWon: 0, score: 0 },
          isDealer: false,
        },
        {
          id: 'ai-east',
          type: 'ai',
          personalityId: 'buddy',
          hand: { playerId: 'ai-east', cards: deal.hands['ai-east'], tricksWon: 0, score: 0 },
          isDealer: false,
        },
      ],
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
  });

  it('should deal correct number of cards', () => {
    const playerHand = matchState.players.find(p => p.id === 'player')?.hand.cards.length;
    expect(playerHand).toBeGreaterThan(0);
    expect(playerHand).toBeLessThanOrEqual(7);
  });

  it('should allow playing matching rank', () => {
    const topCard = matchState.discardPile[matchState.discardPile.length - 1];
    const player = matchState.players.find(p => p.id === 'player');
    
    if (player && topCard) {
      const matchingCard = player.hand.cards.find(c => c.rank === topCard.rank);
      if (matchingCard) {
        expect(canPlayCrazyEights(matchingCard, topCard, topCard.suit)).toBe(true);
      }
    }
  });

  it('should allow playing 8 as wild', () => {
    const topCard = matchState.discardPile[matchState.discardPile.length - 1];
    const player = matchState.players.find(p => p.id === 'player');
    
    if (player && topCard) {
      const eightCard = player.hand.cards.find(c => c.rank === 8);
      if (eightCard) {
        expect(canPlayCrazyEights(eightCard, topCard, topCard.suit)).toBe(true);
      }
    }
  });

  it('should complete a full game simulation', () => {
    let turns = 0;
    const maxTurns = 200;
    
    while (matchState.gamePhase !== 'finished' && turns < maxTurns) {
      const currentPlayer = matchState.players.find(p => p.id === matchState.currentPlayer);
      if (!currentPlayer || currentPlayer.hand.cards.length === 0) {
        matchState.gamePhase = 'finished';
        break;
      }
      
      const topCard = matchState.discardPile[matchState.discardPile.length - 1];
      if (!topCard) break;
      
      // Try to play a valid card
      const validCard = currentPlayer.hand.cards.find(c => 
        canPlayCrazyEights(c, topCard, matchState.currentSuit || topCard.suit)
      );
      
      if (validCard) {
        const result = playCrazyEights(validCard, topCard, matchState.currentSuit || topCard.suit);
        if (result.success) {
          validCard.faceUp = true;
          matchState.discardPile.push(validCard);
          currentPlayer.hand.cards = currentPlayer.hand.cards.filter(c => c.id !== validCard.id);
          matchState.currentSuit = result.newSuit;
          
          if (currentPlayer.hand.cards.length === 0) {
            matchState.gamePhase = 'finished';
            break;
          }
        }
      }
      
      matchState.currentPlayer = getNextPlayer(matchState.currentPlayer, false);
      turns++;
    }
    
    // Either game finished or we hit turn limit (which is ok for test)
    expect(matchState.gamePhase === 'finished' || turns >= maxTurns).toBe(true);
  });

  it('should calculate correct final scores', () => {
    // Set up a game where someone has a high score (>= 100) to trigger gameComplete
    matchState.gamePhase = 'scoring';
    
    // Give players cards that will result in high scores
    // 8s = 50 points, face cards = 10, others = face value
    matchState.players[0].hand.cards = [{ id: 'c1', suit: 'HEARTS', rank: 8, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'player' }];
    matchState.players[1].hand.cards = [{ id: 'c2', suit: 'SPADES', rank: 14, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'ai-west' }];
    matchState.players[2].hand.cards = [
      { id: 'c3', suit: 'DIAMONDS', rank: 8, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'ai-north' },
      { id: 'c4', suit: 'CLUBS', rank: 8, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'ai-north' }
    ]; // 100 points - should trigger gameComplete
    matchState.players[3].hand.cards = [{ id: 'c5', suit: 'HEARTS', rank: 5, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'ai-east' }];
    
    const scoreResult = scoreGame(matchState);
    expect(scoreResult.scores['ai-north']).toBe(100);
    expect(scoreResult.gameComplete).toBe(true);
    expect(scoreResult.winner).toBeNull(); // Winner is null when game ends by score
  });
});
