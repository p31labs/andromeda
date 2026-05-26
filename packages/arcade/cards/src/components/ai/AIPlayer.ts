// P31 Card Table: AI Player System
// Adaptive AI with personalities for card games

import seedrandom from 'seedrandom';
import type { 
  Card, PlayerId, Suit, Trick, MatchState, AIPersonality, 
  AIMemory, SpoonState
} from '../../types';
import { AI_PERSONALITIES } from '../../types';
import { isRightBower, isLeftBower } from '../../engine/trick-taking';
import { suggestBid } from '../../engine/bidding';
import { getSameColorSuit } from '../../engine/deck';

// ============================================
// AI PLAYER CLASS
// ============================================

export class AIPlayer {
  playerId: PlayerId;
  personality: AIPersonality;
  memory: AIMemory;
  seed: string;
  difficulty: SpoonState;
  
  constructor(
    playerId: PlayerId,
    personalityId: string,
    seed: string,
    difficulty: SpoonState = 3
  ) {
    this.playerId = playerId;
    this.personality = AI_PERSONALITIES.find(p => p.id === personalityId) || AI_PERSONALITIES[2]; // Default to Buddy
    this.seed = seed;
    this.difficulty = difficulty;
    this.memory = {
      cardsPlayed: new Map(),
      knownVoidSuits: new Map(),
      currentHandEstimate: new Map(),
    };
  }
  
  // ============================================
  // DECISION MAKING
  // ============================================
  
  selectPlay(
    hand: Card[],
    matchState: MatchState,
    validPlays: Card[]
  ): Card {
    if (validPlays.length === 0) {
      throw new Error('No valid plays available');
    }
    
    if (validPlays.length === 1) {
      return validPlays[0];
    }
    
    // Adjust memory strength based on difficulty
    const memoryFactor = this.difficulty === 1 ? 0.3 : 
                        this.difficulty === 3 ? 0.6 : 
                        this.personality.memoryStrength;
    
    // Update memory
    this.updateMemory(matchState);
    
    // Strategy based on game and personality
    switch (matchState.gameId) {
      case 'crazy-eights':
        return this.selectCrazyEightsPlay(validPlays, matchState);
      case 'hearts':
        return this.selectHeartsPlay(validPlays, matchState, memoryFactor);
      case 'euchre':
        return this.selectEuchrePlay(validPlays, matchState, memoryFactor);
      case 'bridge-lite':
        return this.selectBridgePlay(validPlays, matchState, memoryFactor);
      default:
        return this.randomChoice(validPlays);
    }
  }
  
  // ============================================
  // CRAZY EIGHTS STRATEGY
  // ============================================
  
  private selectCrazyEightsPlay(validPlays: Card[], matchState: MatchState): Card {
    const currentSuit = matchState.currentSuit;
    const discardTop = matchState.discardPile[matchState.discardPile.length - 1];
    
    if (!currentSuit || !discardTop) {
      return this.randomChoice(validPlays);
    }
    
    // Count cards per suit in hand
    const suitCounts = new Map<Suit, number>();
    for (const card of validPlays) {
      suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
    }
    
    // Strategy: Play non-8s first, save 8s for emergencies
    const nonEights = validPlays.filter(c => c.rank !== 8);
    
    if (nonEights.length > 0) {
      // Prefer playing from suits we have most of (to get rid of them)
      nonEights.sort((a, b) => (suitCounts.get(b.suit) || 0) - (suitCounts.get(a.suit) || 0));
      
      // Conservative: prefer to follow suit if possible
      if (this.personality.playStyle === 'save-trump') {
        const followingSuit = nonEights.filter(c => c.suit === currentSuit);
        if (followingSuit.length > 0) {
          return this.randomChoice(followingSuit);
        }
      }
      
      return nonEights[0];
    }
    
    // Must play an 8 - choose suit based on what we have most of
    const eights = validPlays.filter(c => c.rank === 8);
    if (eights.length > 0) {
      return eights[0];  // Vite will let player choose suit
    }
    
    return this.randomChoice(validPlays);
  }
  
  // ============================================
  // HEARTS STRATEGY
  // ============================================
  
  private selectHeartsPlay(validPlays: Card[], matchState: MatchState, memoryFactor: number): Card {
    const trick = matchState.currentTrick;
    const leadSuit = trick?.leadSuit;
    
    // If leading
    if (!leadSuit) {
      return this.selectHeartsLead(validPlays, matchState, memoryFactor);
    }
    
    // Following - must play valid card
    return this.selectHeartsFollow(validPlays, matchState, memoryFactor);
  }
  
  private selectHeartsLead(validPlays: Card[], matchState: MatchState, memoryFactor: number): Card {
    // Sort by rank (low to high)
    const sorted = [...validPlays].sort((a, b) => a.rank - b.rank);
    
    // Conservative: lead low to avoid taking tricks
    if (this.personality.riskTolerance < 0.5) {
      // Avoid leading hearts until broken
      const nonHearts = sorted.filter(c => c.suit !== 'HEARTS');
      if (nonHearts.length > 0) {
        return nonHearts[0];
      }
      return sorted[0];
    }
    
    // Aggressive: might lead high to shoot the moon
    if (this.personality.riskTolerance > 0.7) {
      const highCards = sorted.filter(c => c.rank >= 12);
      if (highCards.length >= 3) {
        // Might try shooting the moon - lead high
        return sorted[sorted.length - 1];
      }
    }
    
    return sorted[0];
  }
  
  private selectHeartsFollow(validPlays: Card[], matchState: MatchState, memoryFactor: number): Card {
    // Try to play lowest card that follows suit
    const sorted = [...validPlays].sort((a, b) => a.rank - b.rank);
    
    // Check if we can safely slough high cards
    const trick = matchState.currentTrick;
    if (!trick || trick.cards.length === 0) {
      return sorted[0];
    }
    
    // If someone already played high, we can safely play high too
    const leadSuit = trick.leadSuit;
    const leadCards = trick.cards.filter(c => c.card.suit === leadSuit);
    if (leadCards.length > 0) {
      const highestLead = Math.max(...leadCards.map(c => c.card.rank));
      
      // Play lowest card that won't win
      const safePlays = sorted.filter(c => c.rank < highestLead);
      if (safePlays.length > 0) {
        return safePlays[safePlays.length - 1];  // Highest safe card
      }
    }
    
    // Default: play lowest
    return sorted[0];
  }
  
  // ============================================
  // EUCHRE STRATEGY
  // ============================================
  
  private selectEuchrePlay(validPlays: Card[], matchState: MatchState, memoryFactor: number): Card {
    const trumpSuit = matchState.trumpSuit;
    const trick = matchState.currentTrick;
    const leadSuit = trick?.leadSuit;
    
    if (!trumpSuit) {
      return this.randomChoice(validPlays);
    }
    
    // Sort cards by value
    const sorted = [...validPlays].sort((a, b) => {
      const valueA = this.getEuchreCardValue(a, trumpSuit);
      const valueB = this.getEuchreCardValue(b, trumpSuit);
      return valueB - valueA;  // High to low
    });
    
    // If leading
    if (!leadSuit) {
      // Lead high trump if we have it and are maker
      const isMaker = matchState.bidWinner === this.playerId;
      const trumps = validPlays.filter(c => this.isTrump(c, trumpSuit));
      
      if (isMaker && trumps.length > 0 && this.personality.playStyle === 'trump-early') {
        return trumps[0];  // Lead best trump
      }
      
      // Otherwise lead high non-trump
      const nonTrumps = sorted.filter(c => !this.isTrump(c, trumpSuit));
      if (nonTrumps.length > 0) {
        return nonTrumps[0];
      }
      
      return sorted[0];
    }
    
    // Following suit
    const leadSuitCards = validPlays.filter(c => c.suit === leadSuit && !isRightBower(c, trumpSuit));
    
    // If we can win the trick, do so
    const currentHigh = this.getCurrentHighCard(trick, trumpSuit);
    if (leadSuitCards.length > 0) {
      const canWin = leadSuitCards.some(c => c.rank > currentHigh);
      if (canWin) {
        // Play lowest winning card
        const winningCards = leadSuitCards.filter(c => c.rank > currentHigh);
        return winningCards[winningCards.length - 1];
      }
      // Can't win - play lowest
      return leadSuitCards[leadSuitCards.length - 1];
    }
    
    // Can't follow suit - try to trump
    const trumps = validPlays.filter(c => this.isTrump(c, trumpSuit));
    if (trumps.length > 0 && !this.hasTrumpBeenPlayed(trick, trumpSuit)) {
      return trumps[trumps.length - 1];  // Lowest trump
    }
    
    // Can't help - play lowest
    return sorted[sorted.length - 1];
  }
  
  private getEuchreCardValue(card: Card, trumpSuit: Suit): number {
    if (isRightBower(card, trumpSuit)) return 100;
    if (isLeftBower(card, trumpSuit)) return 99;
    if (card.suit === trumpSuit) return 50 + card.rank;
    return card.rank;
  }
  
  private isTrump(card: Card, trumpSuit: Suit): boolean {
    return card.suit === trumpSuit || isLeftBower(card, trumpSuit);
  }
  
  private getCurrentHighCard(trick: Trick | null, trumpSuit: Suit): number {
    if (!trick || trick.cards.length === 0) return 0;
    
    let maxValue = 0;
    for (const played of trick.cards) {
      const value = this.getEuchreCardValue(played.card, trumpSuit);
      if (value > maxValue) maxValue = value;
    }
    return maxValue;
  }
  
  private hasTrumpBeenPlayed(trick: Trick | null, trumpSuit: Suit): boolean {
    if (!trick) return false;
    return trick.cards.some(c => this.isTrump(c.card, trumpSuit));
  }
  
  // ============================================
  // BRIDGE LITE STRATEGY
  // ============================================
  
  private selectBridgePlay(validPlays: Card[], matchState: MatchState, memoryFactor: number): Card {
    const trick = matchState.currentTrick;
    const trumpSuit = matchState.trumpSuit;
    
    if (!trick || trick.cards.length === 0) {
      // Leading - play low from weak suits
      const sorted = [...validPlays].sort((a, b) => a.rank - b.rank);
      return sorted[0];
    }
    
    const leadSuit = trick.leadSuit;
    if (!leadSuit) {
      return this.randomChoice(validPlays);
    }
    
    // Try to follow suit with lowest card
    const followingSuit = validPlays.filter(c => c.suit === leadSuit);
    if (followingSuit.length > 0) {
      const sorted = followingSuit.sort((a, b) => a.rank - b.rank);
      
      // Play lowest if we can't win
      const partnerPlayed = trick.cards[trick.cards.length - 2];
      if (partnerPlayed) {
        const partnerHigh = Math.max(...trick.cards.map(c => c.card.rank));
        const canWin = sorted.some(c => c.rank > partnerHigh);
        if (!canWin) {
          return sorted[sorted.length - 1];  // Lowest
        }
      }
      
      return sorted[0];  // Try to win with lowest possible
    }
    
    // Can't follow - discard low
    const sorted = [...validPlays].sort((a, b) => a.rank - b.rank);
    return sorted[sorted.length - 1];
  }
  
  // ============================================
  // BIDDING DECISIONS
  // ============================================
  
  makeBid(
    hand: Card[],
    gameId: 'euchre' | 'bridge-lite',
    currentState?: any,
    upCard?: Card
  ): { bid: string; chosenSuit?: Suit } {
    const suggestion = suggestBid(hand, gameId, currentState, upCard);
    
    // Apply personality adjustments
    const rng = createPRNG(`${this.seed}-bid-${Date.now()}`);
    const randomFactor = rng();
    
    // Aggressive personalities bid more
    if (this.personality.biddingStyle === 'aggressive') {
      if (suggestion.confidence > 40 && suggestion.bid === 'pass') {
        return { bid: gameId === 'euchre' ? 'order-up' : '1', chosenSuit: upCard?.suit };
      }
    }
    
    // Conservative passes more
    if (this.personality.biddingStyle === 'conservative') {
      if (suggestion.confidence < 60 && suggestion.bid !== 'pass') {
        return { bid: 'pass' };
      }
    }
    
    // Parse Euchre bid
    if (gameId === 'euchre') {
      if (suggestion.bid === 'alone' && this.personality.riskTolerance > 0.5) {
        return { bid: 'alone', chosenSuit: upCard?.suit };
      }
      if (suggestion.bid === 'order-up' || suggestion.bid === 'alone') {
        return { bid: 'order-up', chosenSuit: upCard?.suit };
      }
      
      // Second round - can name any suit
      if (currentState?.phase === 'second-round') {
        // Pick best suit
        const suitStrengths = new Map<Suit, number>();
        for (const suit of ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'] as Suit[]) {
          if (suit === upCard?.suit) continue;  // Can't pick up card suit
          const strength = this.evaluateSuitStrength(hand, suit);
          suitStrengths.set(suit, strength);
        }
        
        const bestSuit = Array.from(suitStrengths.entries())
          .sort((a, b) => b[1] - a[1])[0];
        
        if (bestSuit && bestSuit[1] > 30) {
          return { bid: 'order-up', chosenSuit: bestSuit[0] };
        }
      }
      
      return { bid: 'pass' };
    }
    
    // Bridge Lite
    if (gameId === 'bridge-lite') {
      return { bid: suggestion.bid };
    }
    
    return { bid: 'pass' };
  }
  
  private evaluateSuitStrength(hand: Card[], suit: Suit): number {
    let strength = 0;
    for (const card of hand) {
      if (card.suit === suit) {
        strength += card.rank;
        if (card.rank === 11) strength += 5;  // Jack bonus
      }
    }
    return strength;
  }
  
  // ============================================
  // MEMORY MANAGEMENT
  // ============================================
  
  private updateMemory(matchState: MatchState): void {
    // Update cards played
    for (const trick of matchState.tricks) {
      for (const played of trick.cards) {
        const playerCards = this.memory.cardsPlayed.get(played.playerId) || [];
        if (!playerCards.some(c => c.id === played.card.id)) {
          playerCards.push(played.card);
          this.memory.cardsPlayed.set(played.playerId, playerCards);
        }
      }
    }
    
    // Track void suits (if player didn't follow suit when they should have)
    for (const trick of matchState.tricks) {
      if (trick.leadSuit) {
        for (const played of trick.cards) {
          if (played.card.suit !== trick.leadSuit) {
            // Didn't follow suit - must be void in lead suit
            const voidSuits = this.memory.knownVoidSuits.get(played.playerId) || [];
            if (!voidSuits.includes(trick.leadSuit)) {
              voidSuits.push(trick.leadSuit);
              this.memory.knownVoidSuits.set(played.playerId, voidSuits);
            }
          }
        }
      }
    }
  }
  
  // ============================================
  // UTILITY
  // ============================================
  
  private randomChoice<T>(options: T[]): T {
    const rng = createPRNG(`${this.seed}-choice-${Date.now()}`);
    return options[Math.floor(rng() * options.length)];
  }
}

// ============================================
// PRNG
// ============================================

function createPRNG(seed: string): () => number {
  return seedrandom(seed);
}

// ============================================
// AI FACTORY
// ============================================

export function createAIPlayer(
  playerId: PlayerId,
  personalityId: string,
  seed: string,
  difficulty: SpoonState = 3
): AIPlayer {
  return new AIPlayer(playerId, personalityId, seed, difficulty);
}

// Personality selection based on position
export function getDefaultPersonality(playerId: PlayerId): string {
  const map: Record<PlayerId, string> = {
    'ai-north': 'ace',      // Aggressive
    'ai-east': 'buddy',     // Mathematical
    'ai-west': 'nana',      // Conservative
    'player': 'scout',      // Player chooses
  };
  return map[playerId];
}
