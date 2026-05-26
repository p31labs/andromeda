/**
 * Deterministic Deck for P31 Card Table
 * Seeded PRNG ensures all peers have identical deck order
 */

import { Mulberry32 } from './Mulberry32';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Value = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  value: Value;
  suit: Suit;
  id: string;
}

export class DeterministicDeck {
  private prng: Mulberry32;
  private cards: Card[];
  private drawnCards: Card[] = [];
  private currentIndex = 0;

  constructor(seed: number) {
    this.prng = new Mulberry32(seed);
    this.cards = this.generateStandardDeck();
    this.shuffle();
  }

  /**
   * Generate a standard 52-card deck
   */
  private generateStandardDeck(): Card[] {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values: Value[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const value of values) {
        deck.push({
          value,
          suit,
          id: `${value}-${suit}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
    }

    return deck;
  }

  /**
   * Fisher-Yates shuffle using seeded PRNG
   * Guarantees identical deck order across all peers
   */
  private shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = this.prng.rangeInt(0, i);
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Draw n cards from the deck
   */
  draw(count: number = 1): Card[] {
    const drawn: Card[] = [];

    for (let i = 0; i < count; i++) {
      if (this.currentIndex >= this.cards.length) {
        break; // Deck empty
      }

      const card = this.cards[this.currentIndex];
      this.drawnCards.push(card);
      drawn.push(card);
      this.currentIndex++;
    }

    return drawn;
  }

  /**
   * Draw specific cards by ID (for state sync)
   */
  drawSpecific(cardIds: string[]): Card[] {
    return cardIds.map(id => {
      const card = this.cards.find(c => c.id === id);
      if (card && !this.drawnCards.includes(card)) {
        this.drawnCards.push(card);
        this.currentIndex = Math.max(this.currentIndex, this.cards.indexOf(card) + 1);
      }
      return card!;
    }).filter(Boolean);
  }

  /**
   * Peek at next card without drawing
   */
  peek(): Card | null {
    if (this.currentIndex >= this.cards.length) return null;
    return this.cards[this.currentIndex];
  }

  /**
   * Get current deck state for serialization
   */
  getState(): {
    remaining: Card[];
    drawn: Card[];
    currentIndex: number;
  } {
    return {
      remaining: this.cards.slice(this.currentIndex),
      drawn: [...this.drawnCards],
      currentIndex: this.currentIndex,
    };
  }

  /**
   * Get all cards (for initial shuffle verification)
   */
  getAllCards(): Card[] {
    return [...this.cards];
  }

  /**
   * Get count of remaining cards
   */
  remainingCount(): number {
    return this.cards.length - this.currentIndex;
  }

  /**
   * Reset deck (for new game)
   */
  reset(): void {
    this.currentIndex = 0;
    this.drawnCards = [];
    this.shuffle();
  }

  /**
   * Create deck from serialized state
   */
  static fromState(seed: number, state: {
    remaining: Card[];
    drawn: Card[];
    currentIndex: number;
  }): DeterministicDeck {
    const deck = new DeterministicDeck(seed);
    deck.cards = [...state.drawn, ...state.remaining];
    deck.currentIndex = state.currentIndex;
    deck.drawnCards = [...state.drawn];
    return deck;
  }
}

/**
 * Create a new shuffled deck from a shared seed
 * All peers using the same seed will have identical deck order
 */
export function createShuffledDeck(seed: number): DeterministicDeck {
  return new DeterministicDeck(seed);
}

/**
 * Verify deck integrity by comparing hashes
 */
export async function verifyDeckIntegrity(deck: Card[]): Promise<string> {
  const data = JSON.stringify(deck.map(c => ({ value: c.value, suit: c.suit })));
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
