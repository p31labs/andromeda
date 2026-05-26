// P31 Card Table: Trick-Taking Engine
// Core logic for Hearts, Euchre, Bridge Lite

import type { Card, GameId, PlayerId, Suit, Trick, PlayedCard, MatchState } from '../types';
import { getCardValue, getSameColorSuit, getSuitColor } from './deck';

// ============================================
// TRICK PLAY
// ============================================

export interface PlayToTrickResult {
  success: boolean;
  trick: Trick;
  error?: string;
  isComplete: boolean;
  winner?: PlayerId;
}

export function playToTrick(
  trick: Trick,
  playerId: PlayerId,
  card: Card,
  hand: Card[],
  gameId: GameId,
  trumpSuit?: Suit
): PlayToTrickResult {
  // Check if player has card
  const hasCard = hand.some(c => c.id === card.id);
  if (!hasCard) {
    return { success: false, trick, error: 'Card not in hand', isComplete: false };
  }
  
  // If not the lead player, must follow suit if possible
  if (trick.leadPlayer !== playerId && trick.leadSuit) {
    const hasLeadSuit = hand.some(c => c.suit === trick.leadSuit);
    if (hasLeadSuit && card.suit !== trick.leadSuit) {
      return { success: false, trick, error: `Must follow ${trick.leadSuit}`, isComplete: false };
    }
  }
  
  // Update card
  card.faceUp = true;
  card.owner = playerId;
  
  // Create played card record
  const playedCard: PlayedCard = {
    playerId,
    card,
    timestamp: new Date().toISOString(),
  };
  
  // Update trick
  const updatedTrick: Trick = {
    ...trick,
    cards: [...trick.cards, playedCard],
    leadSuit: trick.leadSuit || card.suit,
  };
  
  // Check if trick is complete
  const expectedPlays = 4;  // Always 4 players
  const isComplete = updatedTrick.cards.length === expectedPlays;
  
  let winner: PlayerId | undefined;
  if (isComplete) {
    winner = determineTrickWinner(updatedTrick, gameId, trumpSuit);
    updatedTrick.winner = winner;
  }
  
  return {
    success: true,
    trick: updatedTrick,
    isComplete,
    winner,
  };
}

export function createTrick(leadPlayer: PlayerId, trumpSuit?: Suit): Trick {
  return {
    id: `trick-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    leadPlayer,
    cards: [],
    winner: null,
    trumpSuit,
  };
}

// ============================================
// TRICK WINNER DETERMINATION
// ============================================

export function determineTrickWinner(
  trick: Trick,
  gameId: GameId,
  trumpSuit?: Suit
): PlayerId {
  if (trick.cards.length === 0) {
    throw new Error('Cannot determine winner of empty trick');
  }
  
  let winner = trick.cards[0].playerId;
  let winningCard = trick.cards[0].card;
  let winningValue = getCardValue(winningCard, gameId, trumpSuit);
  
  for (const played of trick.cards.slice(1)) {
    const value = getCardValue(played.card, gameId, trumpSuit);
    
    // Trump suit wins over non-trump
    if (trumpSuit) {
      const isWinningTrump = winningCard.suit === trumpSuit || 
        (gameId === 'euchre' && winningCard.rank === 11 && 
         (winningCard.suit === trumpSuit || winningCard.suit === getSameColorSuit(trumpSuit)));
      const isPlayedTrump = played.card.suit === trumpSuit ||
        (gameId === 'euchre' && played.card.rank === 11 &&
         (played.card.suit === trumpSuit || played.card.suit === getSameColorSuit(trumpSuit)));
      
      if (!isWinningTrump && isPlayedTrump) {
        winner = played.playerId;
        winningCard = played.card;
        winningValue = value;
        continue;
      }
      
      if (isWinningTrump && !isPlayedTrump) {
        continue;
      }
    }
    
    // Must follow lead suit if no trump involved
    if (!trumpSuit || (winningCard.suit !== trumpSuit && played.card.suit !== trumpSuit)) {
      if (played.card.suit === trick.leadSuit && winningCard.suit !== trick.leadSuit) {
        winner = played.playerId;
        winningCard = played.card;
        winningValue = value;
        continue;
      }
      
      if (played.card.suit !== trick.leadSuit && winningCard.suit !== trick.leadSuit) {
        // Neither followed suit - first played wins
        continue;
      }
    }
    
    // Higher value wins
    if (value > winningValue) {
      winner = played.playerId;
      winningCard = played.card;
      winningValue = value;
    }
  }
  
  return winner;
}

// ============================================
// VALID PLAYS
// ============================================

export function getValidPlays(
  hand: Card[],
  trick: Trick | null,
  gameId: GameId,
  matchState: MatchState
): Card[] {
  if (!trick || trick.cards.length === 0) {
    // Lead can play anything (with game-specific restrictions)
    if (gameId === 'hearts') {
      // Can't lead hearts until broken
      const hasOnlyHearts = hand.every(c => c.suit === 'HEARTS');
      if (!matchState.heartsBroken && !hasOnlyHearts) {
        return hand.filter(c => c.suit !== 'HEARTS');
      }
    }
    return hand;
  }
  
  // Must follow suit if possible
  const leadSuit = trick.leadSuit;
  if (!leadSuit) return hand;
  
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);
  if (hasLeadSuit) {
    return hand.filter(c => c.suit === leadSuit);
  }
  
  // Can't follow suit - can play anything
  return hand;
}

// ============================================
// CRAZY EIGHTS LOGIC
// ============================================

export interface CrazyEightsPlayResult {
  success: boolean;
  newSuit?: Suit;
  drawCards?: number;
  skipNext?: boolean;
  error?: string;
}

export function canPlayCrazyEights(card: Card, topCard: Card, currentSuit: Suit): boolean {
  // Must match rank, suit, or be an 8
  return card.rank === topCard.rank || 
         card.suit === currentSuit || 
         card.rank === 8;
}

export function playCrazyEights(
  card: Card,
  topCard: Card,
  currentSuit: Suit,
  chosenSuit?: Suit
): CrazyEightsPlayResult {
  if (!canPlayCrazyEights(card, topCard, currentSuit)) {
    return { success: false, error: 'Card cannot be played' };
  }
  
  let newSuit: Suit | undefined;
  let drawCards = 0;
  let skipNext = false;
  
  // 8s are wild
  if (card.rank === 8) {
    if (!chosenSuit) {
      return { success: false, error: 'Must choose suit for 8' };
    }
    newSuit = chosenSuit;
  } else {
    newSuit = card.suit;
  }
  
  // 2 forces draw 2
  if (card.rank === 2) {
    drawCards = 2;
  }
  
  // Jack skips
  if (card.rank === 11) {
    skipNext = true;
  }
  
  return {
    success: true,
    newSuit,
    drawCards,
    skipNext,
  };
}

// ============================================
// HEARTS SPECIFIC
// ============================================

export function scoreHeartsHand(tricks: Trick[], playerId: PlayerId): number {
  let score = 0;
  
  for (const trick of tricks) {
    if (trick.winner === playerId) {
      for (const played of trick.cards) {
        // Each heart is 1 point
        if (played.card.suit === 'HEARTS') {
          score += 1;
        }
        // Queen of spades is 13 points
        if (played.card.suit === 'SPADES' && played.card.rank === 12) {
          score += 13;
        }
      }
    }
  }
  
  return score;
}

export function checkShootTheMoon(tricks: Trick[], playerId: PlayerId): boolean {
  // Player won all hearts and Q of spades
  const allHearts = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
  const wonHearts: number[] = [];
  let wonQueenSpades = false;
  
  for (const trick of tricks) {
    if (trick.winner === playerId) {
      for (const played of trick.cards) {
        if (played.card.suit === 'HEARTS') {
          wonHearts.push(played.card.rank);
        }
        if (played.card.suit === 'SPADES' && played.card.rank === 12) {
          wonQueenSpades = true;
        }
      }
    }
  }
  
  // Check if all hearts captured
  const allHeartsWon = allHearts.every(rank => wonHearts.includes(rank));
  return allHeartsWon && wonQueenSpades;
}

// ============================================
// EUCHRE SPECIFIC
// ============================================

export function isRightBower(card: Card, trumpSuit: Suit): boolean {
  return card.rank === 11 && card.suit === trumpSuit;
}

export function isLeftBower(card: Card, trumpSuit: Suit): boolean {
  return card.rank === 11 && card.suit === getSameColorSuit(trumpSuit);
}

export function countTricksWon(tricks: Trick[], playerId: PlayerId): number {
  return tricks.filter(t => t.winner === playerId).length;
}

export function getPartner(playerId: PlayerId): PlayerId {
  const partners: Record<PlayerId, PlayerId> = {
    'player': 'ai-east',
    'ai-east': 'player',
    'ai-north': 'ai-west',
    'ai-west': 'ai-north',
  };
  return partners[playerId];
}

// ============================================
// BRIDGE LITE SPECIFIC
// ============================================

export function calculateBridgeScore(
  tricksWon: number,
  bid: number,
  trumpSuit?: Suit
): number {
  const overtricks = tricksWon - bid;
  
  if (tricksWon >= bid) {
    // Made contract
    let baseScore = bid * (trumpSuit ? 30 : 20);  // Trump = 30/trick, NT = 20/trick
    if (overtricks > 0) {
      baseScore += overtricks * (trumpSuit ? 30 : 20);
    }
    return baseScore;
  } else {
    // Failed contract - penalty
    const undertricks = bid - tricksWon;
    return -undertricks * 50;
  }
}

export function determineDeclarer(
  bids: Record<PlayerId, number>,
  trumpBids: Record<PlayerId, Suit | 'no-trump'>
): { declarer: PlayerId; contract: number; trump: Suit | 'no-trump' | undefined } {
  let highestBid = 0;
  let declarer: PlayerId = 'player';
  let trump: Suit | 'no-trump' | undefined;
  
  for (const [playerId, bid] of Object.entries(bids)) {
    if (bid > highestBid) {
      highestBid = bid;
      declarer = playerId as PlayerId;
      trump = trumpBids[playerId as PlayerId];
    }
  }
  
  return { declarer, contract: highestBid, trump: trump === 'no-trump' ? undefined : trump };
}

// ============================================
// TURN ORDER
// ============================================

export function getNextPlayer(currentPlayer: PlayerId, skip: boolean = false): PlayerId {
  const order: PlayerId[] = ['player', 'ai-west', 'ai-north', 'ai-east'];
  const currentIndex = order.indexOf(currentPlayer);
  const nextIndex = (currentIndex + (skip ? 2 : 1)) % 4;
  return order[nextIndex];
}

export function getPlayerAfterTrick(trick: Trick): PlayerId {
  if (!trick.winner) {
    throw new Error('Trick has no winner yet');
  }
  return trick.winner;
}
