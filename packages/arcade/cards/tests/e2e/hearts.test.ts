// E2E Test: Hearts
import { describe, it, expect, beforeEach } from 'vitest';
import { generateStandardDeck, dealHearts } from '../../src/engine/deck';
import { createTrick, playToTrick, scoreHeartsHand, checkShootTheMoon } from '../../src/engine/trick-taking';
import { scoreGame } from '../../src/engine/scoring';
import type { MatchState, Trick } from '../../src/types';

describe('Hearts E2E', () => {
  let matchState: MatchState;
  const seed = 'test-hearts-456';

  beforeEach(() => {
    const deck = generateStandardDeck('hearts');
    const deal = dealHearts(deck, ['player', 'ai-west', 'ai-north', 'ai-east'], seed);
    
    // Face up all cards
    Object.values(deal.hands).forEach(hand => {
      hand.forEach(card => card.faceUp = true);
    });
    
    matchState = {
      gameId: 'hearts',
      matchId: 'test-hearts-1',
      deck: [],
      discardPile: [],
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
      heartsBroken: false,
    };
  });

  it('should deal 13 cards to each player', () => {
    matchState.players.forEach(player => {
      expect(player.hand.cards.length).toBe(13);
    });
  });

  it('should identify 2 of clubs holder as first player', () => {
    const twoOfClubsHolder = matchState.players.find(p => 
      p.hand.cards.some(c => c.suit === 'CLUBS' && c.rank === 2)
    );
    expect(twoOfClubsHolder).toBeDefined();
  });

  it('should complete a trick correctly', () => {
    const trick = createTrick('player', undefined);
    
    // Play 4 cards from each player
    const playerOrder: Array<'player' | 'ai-west' | 'ai-north' | 'ai-east'> = ['player', 'ai-west', 'ai-north', 'ai-east'];
    
    for (const playerId of playerOrder) {
      const player = matchState.players.find(p => p.id === playerId);
      if (player && player.hand.cards.length > 0) {
        // Find a card that follows suit if possible
        let cardToPlay = player.hand.cards[0];
        if (trick.leadSuit) {
          const followingSuit = player.hand.cards.find(c => c.suit === trick.leadSuit);
          if (followingSuit) {
            cardToPlay = followingSuit;
          }
        }
        
        const result = playToTrick(trick, playerId, cardToPlay, player.hand.cards, 'hearts', undefined);
        if (result.success) {
          player.hand.cards = player.hand.cards.filter(c => c.id !== cardToPlay.id);
          // Update trick with result
          Object.assign(trick, result.trick);
          if (result.isComplete && result.winner) {
            trick.winner = result.winner;
          }
        }
      }
    }
    
    expect(trick.cards.length).toBe(4);
    expect(trick.winner).toBeDefined();
  });

  it('should detect shoot the moon', () => {
    // Simulate a player winning all hearts and Q of spades
    const mockTricks: any[] = [];
    
    // Add all heart tricks
    for (let rank = 2; rank <= 14; rank++) {
      mockTricks.push({
        winner: 'player',
        cards: [{ playerId: 'player', card: { suit: 'HEARTS', rank } }]
      });
    }
    
    // Add Q of spades
    mockTricks.push({
      winner: 'player',
      cards: [{ playerId: 'player', card: { suit: 'SPADES', rank: 12 } }]
    });
    
    const hasShotMoon = checkShootTheMoon(mockTricks as any, 'player');
    expect(hasShotMoon).toBe(true);
  });

  it('should calculate penalty points correctly', () => {
    const mockTricks: any[] = [
      {
        winner: 'player',
        cards: [
          { playerId: 'player', card: { suit: 'HEARTS', rank: 2 } },
          { playerId: 'ai-west', card: { suit: 'CLUBS', rank: 3 } },
        ]
      },
      {
        winner: 'player',
        cards: [
          { playerId: 'player', card: { suit: 'SPADES', rank: 12 } },
          { playerId: 'ai-west', card: { suit: 'DIAMONDS', rank: 5 } },
        ]
      }
    ];
    
    const score = scoreHeartsHand(mockTricks as any, 'player');
    expect(score).toBe(14); // 1 heart + 13 for Q of spades
  });
});
