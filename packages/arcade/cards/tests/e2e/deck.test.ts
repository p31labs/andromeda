// E2E Test: Deck Engine
import { describe, it, expect } from 'vitest';
import { 
  generateStandardDeck, 
  generateDoubleDeck, 
  shuffleDeck, 
  dealCards,
  dealCrazyEights,
  dealHearts,
  formatCard,
  validateDeck,
  getCardValue,
  getSameColorSuit,
  isSameColor
} from '../../src/engine/deck';
import type { Suit, Card } from '../../src/types';

describe('Deck Engine E2E', () => {
  describe('Deck Generation', () => {
    it('should generate standard 52-card deck', () => {
      const deck = generateStandardDeck();
      expect(deck.length).toBe(52);
      
      // Check suits distribution
      const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
      suits.forEach(suit => {
        const suitCards = deck.filter(c => c.suit === suit);
        expect(suitCards.length).toBe(13);
      });
    });

    it('should generate Euchre deck (24 cards)', () => {
      const deck = generateStandardDeck('euchre');
      expect(deck.length).toBe(24);
      
      // Should only have 9-A ranks (6 ranks × 4 suits = 24)
      deck.forEach(card => {
        expect(card.rank).toBeGreaterThanOrEqual(9);
        expect(card.rank).toBeLessThanOrEqual(14);
      });
    });

    it('should generate double deck (104 cards)', () => {
      const deck = generateDoubleDeck();
      expect(deck.length).toBe(104);
    });

    it('should have unique card IDs', () => {
      const deck = generateStandardDeck();
      const ids = deck.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Deck Validation', () => {
    it('should validate a complete deck', () => {
      const deck = generateStandardDeck();
      const validation = validateDeck(deck);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect missing cards', () => {
      const deck = generateStandardDeck();
      const incompleteDeck = deck.slice(0, 51); // Remove one card
      const validation = validateDeck(incompleteDeck);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Card Formatting', () => {
    it('should format cards correctly', () => {
      const card: Card = {
        id: 'test-1',
        suit: 'HEARTS',
        rank: 14,
        faceUp: true,
        position: { x: 0, y: 0, z: 0, rotation: 0 },
        owner: 'player'
      };
      
      expect(formatCard(card)).toBe('A♥');
    });

    it('should format face cards', () => {
      const jack: Card = { id: 'j', suit: 'SPADES', rank: 11, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'player' };
      const queen: Card = { id: 'q', suit: 'DIAMONDS', rank: 12, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'player' };
      const king: Card = { id: 'k', suit: 'CLUBS', rank: 13, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'player' };
      
      expect(formatCard(jack)).toBe('J♠');
      expect(formatCard(queen)).toBe('Q♦');
      expect(formatCard(king)).toBe('K♣');
    });
  });

  describe('Card Value', () => {
    it('should calculate Euchre card values', () => {
      const spades: Suit = 'SPADES';
      
      // Right bower (trump jack)
      const rightBower: Card = { id: 'rb', suit: 'SPADES', rank: 11, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'player' };
      expect(getCardValue(rightBower, 'euchre', spades)).toBe(100);
      
      // Left bower (same color jack)
      const leftBower: Card = { id: 'lb', suit: 'CLUBS', rank: 11, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'player' };
      expect(getCardValue(leftBower, 'euchre', spades)).toBe(99);
      
      // Regular trump
      const trumpAce: Card = { id: 'ta', suit: 'SPADES', rank: 14, faceUp: true, position: { x: 0, y: 0, z: 0, rotation: 0 }, owner: 'player' };
      expect(getCardValue(trumpAce, 'euchre', spades)).toBe(64); // 50 + 14
    });
  });

  describe('Suit Colors', () => {
    it('should identify same color suits', () => {
      expect(isSameColor('HEARTS', 'DIAMONDS')).toBe(true);
      expect(isSameColor('CLUBS', 'SPADES')).toBe(true);
      expect(isSameColor('HEARTS', 'CLUBS')).toBe(false);
      expect(isSameColor('DIAMONDS', 'SPADES')).toBe(false);
    });

    it('should get same color suit', () => {
      expect(getSameColorSuit('HEARTS')).toBe('DIAMONDS');
      expect(getSameColorSuit('DIAMONDS')).toBe('HEARTS');
      expect(getSameColorSuit('CLUBS')).toBe('SPADES');
      expect(getSameColorSuit('SPADES')).toBe('CLUBS');
    });
  });

  describe('Shuffling', () => {
    it('should shuffle deck deterministically with seed', () => {
      const deck = generateStandardDeck();
      const seed = 'test-seed-789';
      
      const shuffled1 = shuffleDeck(deck, seed);
      const shuffled2 = shuffleDeck(deck, seed);
      
      // Same seed should produce same order
      expect(shuffled1.map(c => c.id)).toEqual(shuffled2.map(c => c.id));
    });

    it('should produce different orders with different seeds', () => {
      const deck = generateStandardDeck();
      
      const shuffled1 = shuffleDeck(deck, 'seed-1');
      const shuffled2 = shuffleDeck(deck, 'seed-2');
      
      // Different seeds should produce different orders (with high probability)
      expect(shuffled1.map(c => c.id)).not.toEqual(shuffled2.map(c => c.id));
    });

    it('should maintain all cards after shuffle', () => {
      const deck = generateStandardDeck();
      const shuffled = shuffleDeck(deck, 'test-seed');
      
      expect(shuffled.length).toBe(deck.length);
      
      const originalIds = new Set(deck.map(c => c.id));
      const shuffledIds = new Set(shuffled.map(c => c.id));
      expect(shuffledIds).toEqual(originalIds);
    });
  });

  describe('Dealing', () => {
    it('should deal Crazy Eights correctly', () => {
      const deck = generateStandardDeck('crazy-eights');
      const playerIds = ['player', 'ai-west', 'ai-north', 'ai-east'] as const;
      
      const deal = dealCrazyEights(deck, playerIds, 'test-seed');
      
      // Each player gets 5 cards (4 players = 20 cards)
      expect(deal.hands.player.length).toBe(5);
      expect(deal.hands['ai-west'].length).toBe(5);
      expect(deal.hands['ai-north'].length).toBe(5);
      expect(deal.hands['ai-east'].length).toBe(5);
      
      // Remaining cards (52 total - 20 dealt = 32 remaining)
      expect(deal.remaining.length).toBe(32);
    });

    it('should deal Hearts correctly', () => {
      const deck = generateStandardDeck('hearts');
      const playerIds = ['player', 'ai-west', 'ai-north', 'ai-east'] as const;
      
      const deal = dealHearts(deck, playerIds, 'test-seed');
      
      // Each player gets 13 cards
      playerIds.forEach(id => {
        expect(deal.hands[id].length).toBe(13);
      });
      
      // No remaining cards
      expect(deal.remaining.length).toBe(0);
    });

    it('should not duplicate cards when dealing', () => {
      const deck = generateStandardDeck();
      const playerIds = ['player', 'ai-west', 'ai-north', 'ai-east'] as const;
      
      const deal = dealCards(deck, playerIds, 5, 'test-seed', 0);
      
      const allDealtCards = [
        ...deal.hands.player,
        ...deal.hands['ai-west'],
        ...deal.hands['ai-north'],
        ...deal.hands['ai-east'],
        ...deal.remaining
      ];
      
      const uniqueIds = new Set(allDealtCards.map(c => c.id));
      expect(uniqueIds.size).toBe(allDealtCards.length);
    });
  });
});
