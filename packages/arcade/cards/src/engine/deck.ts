// P31 Card Table: Deck Engine with PRNG
// Deterministic shuffle for reproducible games

import seedrandom from 'seedrandom';
import type { Card, CardPosition, GameId, PlayerId, Rank, Suit } from '../types';

// ============================================
// DECK GENERATION
// ============================================

const SUITS: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// Euchre uses only 9-A
const EUCHRE_RANKS: Rank[] = [9, 10, 11, 12, 13, 14];

export function generateStandardDeck(gameId?: GameId): Card[] {
  const deck: Card[] = [];
  const ranks = gameId === 'euchre' ? EUCHRE_RANKS : RANKS;
  
  let idCounter = 0;
  
  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push({
        id: `card-${suit}-${rank}-${idCounter++}`,
        suit,
        rank,
        faceUp: false,
        position: { x: 0, y: 0, z: 0, rotation: 0 },
        owner: 'player',  // Will be reassigned during deal
      });
    }
  }
  
  return deck;
}

export function generateDoubleDeck(): Card[] {
  const deck1 = generateStandardDeck();
  const deck2 = generateStandardDeck();
  
  // Update IDs to be unique
  deck2.forEach((card, i) => {
    card.id = `card-deck2-${i}`;
  });
  
  return [...deck1, ...deck2];
}

// ============================================
// DETERMINISTIC SHUFFLE (PRNG)
// ============================================

export interface ShuffleState {
  deck: Card[];
  seed: string;
  prngIndex: number;
}

export function createPRNG(seed: string): () => number {
  const rng = seedrandom(seed);
  return () => rng();
}

export function shuffleDeck(deck: Card[], seed: string): Card[] {
  const rng = createPRNG(seed);
  const shuffled = [...deck];
  
  // Fisher-Yates shuffle with deterministic PRNG
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

export function shuffleWithIndex(deck: Card[], seed: string, prngIndex: number): Card[] {
  const rng = createPRNG(`${seed}-${prngIndex}`);
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// ============================================
// DEALING
// ============================================

export interface DealResult {
  hands: Record<PlayerId, Card[]>;
  remaining: Card[];  // Kitty/stock
  prngIndex: number;
}

export function dealCards(
  deck: Card[],
  playerIds: PlayerId[],
  cardsPerPlayer: number,
  seed: string,
  startingPrngIndex: number = 0
): DealResult {
  const shuffled = shuffleWithIndex(deck, seed, startingPrngIndex);
  const hands: Record<PlayerId, Card[]> = {} as Record<PlayerId, Card[]>;
  
  playerIds.forEach(id => {
    hands[id] = [];
  });
  
  // Deal round-robin
  let cardIndex = 0;
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (const playerId of playerIds) {
      if (cardIndex < shuffled.length) {
        const card = shuffled[cardIndex];
        card.owner = playerId;
        hands[playerId].push(card);
        cardIndex++;
      }
    }
  }
  
  // Remaining cards (kitty/stock)
  const remaining = shuffled.slice(cardIndex);
  
  return {
    hands,
    remaining,
    prngIndex: startingPrngIndex + 1,
  };
}

// Euchre: deal 5 cards to each player, 4 remaining as kitty
export function dealEuchre(deck: Card[], playerIds: PlayerId[], seed: string): DealResult {
  return dealCards(deck, playerIds, 5, seed, 0);
}

// Hearts: deal entire deck evenly (13 each for 4 players)
export function dealHearts(deck: Card[], playerIds: PlayerId[], seed: string): DealResult {
  const result = dealCards(deck, playerIds, 13, seed, 0);
  return { ...result, remaining: [] };
}

// Crazy Eights: deal 5-8 cards depending on player count
export function dealCrazyEights(
  deck: Card[],
  playerIds: PlayerId[],
  seed: string
): DealResult {
  const cardsPerPlayer = playerIds.length === 2 ? 7 : 5;
  const result = dealCards(deck, playerIds, cardsPerPlayer, seed, 0);
  
  // Flip top card of remaining to start discard pile
  if (result.remaining.length > 0) {
    result.remaining[0].faceUp = true;
  }
  
  return result;
}

// Bridge Lite: deal 13 cards each
export function dealBridge(deck: Card[], playerIds: PlayerId[], seed: string): DealResult {
  return dealHearts(deck, playerIds, seed);  // Same dealing pattern
}

// ============================================
// CARD UTILITIES
// ============================================

export function getCardValue(card: Card, gameId: GameId, trumpSuit?: Suit): number {
  // Base value from rank
  let value = card.rank;
  
  if (gameId === 'euchre' && trumpSuit) {
    // Right bower (trump jack) = highest
    if (card.rank === 11 && card.suit === trumpSuit) {
      return 100;  // Right bower
    }
    
    // Left bower (same color jack) = second highest
    const sameColor = getSameColorSuit(trumpSuit);
    if (card.rank === 11 && card.suit === sameColor) {
      return 99;  // Left bower
    }
    
    // Other trump cards
    if (card.suit === trumpSuit) {
      return 50 + card.rank;
    }
  }
  
  return value;
}

export function getSameColorSuit(suit: Suit): Suit {
  const colorMap: Record<Suit, Suit> = {
    HEARTS: 'DIAMONDS',
    DIAMONDS: 'HEARTS',
    CLUBS: 'SPADES',
    SPADES: 'CLUBS',
  };
  return colorMap[suit];
}

export function getSuitColor(suit: Suit): 'red' | 'black' {
  return suit === 'HEARTS' || suit === 'DIAMONDS' ? 'red' : 'black';
}

export function isSameColor(suit1: Suit, suit2: Suit): boolean {
  return getSuitColor(suit1) === getSuitColor(suit2);
}

export function sortHand(hand: Card[], trumpSuit?: Suit): Card[] {
  const sorted = [...hand];
  
  sorted.sort((a, b) => {
    const valueA = getCardValue(a, 'euchre', trumpSuit);
    const valueB = getCardValue(b, 'euchre', trumpSuit);
    return valueB - valueA;  // Highest first
  });
  
  return sorted;
}

export function formatCard(card: Card): string {
  const rankLabel = card.rank === 11 ? 'J' : 
                    card.rank === 12 ? 'Q' : 
                    card.rank === 13 ? 'K' : 
                    card.rank === 14 ? 'A' : 
                    card.rank.toString();
  const suitSymbol = { HEARTS: '♥', DIAMONDS: '♦', CLUBS: '♣', SPADES: '♠' }[card.suit];
  return `${rankLabel}${suitSymbol}`;
}

// ============================================
// CARD POSITION ANIMATION
// ============================================

export function calculateDealPosition(
  playerIndex: number,
  cardIndex: number,
  totalCards: number,
  tableRadius: number = 5
): CardPosition {
  const angle = (playerIndex * Math.PI * 2) / 4 - Math.PI / 2;  // Start from top
  
  // Fan cards in hand
  const fanAngle = (cardIndex - totalCards / 2) * 0.15;
  const fanRadius = 3;
  
  return {
    x: Math.cos(angle) * tableRadius + Math.cos(angle + fanAngle) * fanRadius,
    y: 0,
    z: Math.sin(angle) * tableRadius + Math.sin(angle + fanAngle) * fanRadius,
    rotation: angle + fanAngle,
  };
}

export function calculateTrickPosition(
  playerIndex: number,
  tableRadius: number = 5
): CardPosition {
  const angle = (playerIndex * Math.PI * 2) / 4 - Math.PI / 2;
  const trickRadius = tableRadius * 0.4;
  
  return {
    x: Math.cos(angle) * trickRadius,
    y: 0.1,  // Slightly above table
    z: Math.sin(angle) * trickRadius,
    rotation: angle + Math.PI / 2,  // Face center
  };
}

// ============================================
// DECK VALIDATION
// ============================================

export function validateDeck(deck: Card[], gameId?: GameId): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for duplicate IDs
  const ids = deck.map(c => c.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    errors.push(`Duplicate card IDs: ${duplicates.join(', ')}`);
  }
  
  // Check expected count
  const expectedCount = gameId === 'euchre' ? 24 : 52;
  if (deck.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} cards, got ${deck.length}`);
  }
  
  // Check all suits and ranks present (except Euchre)
  if (!gameId || gameId !== 'euchre') {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const found = deck.find(c => c.suit === suit && c.rank === rank);
        if (!found) {
          errors.push(`Missing card: ${rank} of ${suit}`);
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================
// SEED GENERATION
// ============================================

export function generateMatchSeed(): string {
  return `match-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export function generateDeterministicSeed(matchId: string, gameId: GameId, timestamp: string): string {
  return `${gameId}-${matchId}-${timestamp}`;
}
