// P31 Card Table: Bidding Engine
// For Euchre and Bridge Lite

import type { PlayerId, Suit, Card } from '../types';
import { isRightBower, isLeftBower } from './trick-taking';

// ============================================
// EUCHRE BIDDING
// ============================================

export type EuchreBid = 'pass' | 'order-up' | 'alone';

export interface EuchreBiddingState {
  upCard: Card;  // Card turned up from kitty
  dealer: PlayerId;
  currentBidder: PlayerId;
  bids: Record<PlayerId, EuchreBid>;
  phase: 'first-round' | 'second-round' | 'completed';
  trumpSuit?: Suit;
  maker?: PlayerId;  // Player who ordered up
  goingAlone?: boolean;
}

export function createEuchreBidding(upCard: Card, dealer: PlayerId): EuchreBiddingState {
  const order: PlayerId[] = ['player', 'ai-west', 'ai-north', 'ai-east'];
  const dealerIndex = order.indexOf(dealer);
  const firstBidder = order[(dealerIndex + 1) % 4];  // Eldest hand
  
  return {
    upCard,
    dealer,
    currentBidder: firstBidder,
    bids: {} as Record<PlayerId, EuchreBid>,
    phase: 'first-round',
  };
}

export function placeEuchreBid(
  state: EuchreBiddingState,
  playerId: PlayerId,
  bid: EuchreBid,
  chosenTrump?: Suit
): EuchreBiddingState {
  const newBids = { ...state.bids, [playerId]: bid };
  const order: PlayerId[] = ['player', 'ai-west', 'ai-north', 'ai-east'];
  const currentIndex = order.indexOf(playerId);
  const nextBidder = order[(currentIndex + 1) % 4];
  
  // Check if all passed
  const allPassed = Object.keys(newBids).length === 4 &&
    Object.values(newBids).every(b => b === 'pass');
  
  // If ordered up in first round
  if (state.phase === 'first-round' && (bid === 'order-up' || bid === 'alone')) {
    return {
      ...state,
      bids: newBids,
      phase: 'completed',
      trumpSuit: state.upCard.suit,
      maker: playerId,
      goingAlone: bid === 'alone',
    };
  }
  
  // If all passed in first round, move to second round
  if (allPassed && state.phase === 'first-round') {
    return {
      ...state,
      bids: newBids,
      phase: 'second-round',
      currentBidder: nextBidder,
    };
  }
  
  // Second round - can name any suit except up card suit
  if (state.phase === 'second-round') {
    // In second round, 'order-up' means naming a different suit as trump
    if ((bid === 'order-up' || bid === 'alone') && chosenTrump && chosenTrump !== state.upCard.suit) {
      return {
        ...state,
        bids: newBids,
        phase: 'completed',
        trumpSuit: chosenTrump,
        maker: playerId,
        goingAlone: bid === 'alone',
      };
    }
    
    // If all passed in second round, dealer must take it
    if (allPassed && nextBidder === state.dealer) {
      return {
        ...state,
        bids: newBids,
        phase: 'completed',
        trumpSuit: chosenTrump || 'HEARTS',  // Default if nothing chosen
        maker: state.dealer,
      };
    }
  }
  
  return {
    ...state,
    bids: newBids,
    currentBidder: nextBidder,
  };
}

// ============================================
// EUCHRE BID EVALUATION
// ============================================

export function evaluateEuchreHand(hand: Card[], upCard: Card): {
  shouldOrderUp: boolean;
  confidence: number;
  recommendedTrump: Suit;
  reasoning: string;
} {
  let confidence = 0;
  let bestTrump = upCard.suit;
  
  // Count trump cards in hand if up card suit becomes trump
  const potentialTrump = upCard.suit;
  let trumpCount = 0;
  let hasRight = false;
  let hasLeft = false;
  let hasAce = false;
  
  for (const card of hand) {
    if (card.suit === potentialTrump) {
      trumpCount++;
      if (card.rank === 11) hasRight = true;
    }
    if (isLeftBower(card, potentialTrump)) {
      trumpCount++;
      hasLeft = true;
    }
    if (card.rank === 14) hasAce = true;
  }
  
  // Also consider up card
  if (upCard.rank === 11 && upCard.suit === potentialTrump) {
    hasRight = true;
    trumpCount++;
  }
  
  // Calculate confidence
  confidence += trumpCount * 15;
  if (hasRight) confidence += 25;
  if (hasLeft) confidence += 20;
  if (hasAce) confidence += 10;
  
  // Build reasoning string
  let reasoningParts: string[] = [];
  if (trumpCount > 0) reasoningParts.push(`${trumpCount} trump cards`);
  if (hasRight) reasoningParts.push('Right bower');
  if (hasLeft) reasoningParts.push('Left bower');
  if (hasAce) reasoningParts.push('Ace');
  const reasoning = reasoningParts.length > 0 
    ? `Hand strength: ${reasoningParts.join(', ')}` 
    : 'Weak hand - consider passing';
  
  return {
    shouldOrderUp: confidence >= 40,
    confidence: Math.min(100, confidence),
    recommendedTrump: bestTrump,
    reasoning,
  };
}

// ============================================
// BRIDGE LITE BIDDING
// ============================================

export type BridgeBid = 'pass' | number;

export interface BridgeBiddingState {
  dealer: PlayerId;
  currentBidder: PlayerId;
  bids: Record<PlayerId, { level: number; trump?: Suit | 'no-trump' }>;
  highestBid: number;
  contract?: {
    level: number;
    trump: Suit | 'no-trump';
    declarer: PlayerId;
    partner: PlayerId;
  };
  phase: 'bidding' | 'completed';
  passCount: number;
}

export function createBridgeBidding(dealer: PlayerId): BridgeBiddingState {
  const order: PlayerId[] = ['player', 'ai-west', 'ai-north', 'ai-east'];
  const dealerIndex = order.indexOf(dealer);
  const firstBidder = order[(dealerIndex + 1) % 4];
  
  return {
    dealer,
    currentBidder: firstBidder,
    bids: {} as Record<PlayerId, { level: number; trump?: Suit | 'no-trump' }>,
    highestBid: 0,
    phase: 'bidding',
    passCount: 0,
  };
}

export function placeBridgeBid(
  state: BridgeBiddingState,
  playerId: PlayerId,
  bid: 'pass' | { level: number; trump: Suit | 'no-trump' }
): BridgeBiddingState {
  const order: PlayerId[] = ['player', 'ai-west', 'ai-north', 'ai-east'];
  const currentIndex = order.indexOf(playerId);
  const nextBidder = order[(currentIndex + 1) % 4];
  
  if (bid === 'pass') {
    const newPassCount = state.passCount + 1;
    
    // 3 consecutive passes ends bidding
    if (newPassCount >= 3 && state.highestBid > 0) {
      // Find declarer (first to bid the contract)
      const contractBid = state.highestBid;
      let declarer: PlayerId = 'player';
      let trump: Suit | 'no-trump' = 'no-trump';
      
      for (const [pid, b] of Object.entries(state.bids)) {
        if (b.level === contractBid) {
          declarer = pid as PlayerId;
          trump = b.trump || 'no-trump';
          break;
        }
      }
      
      const partner: PlayerId = getPartner(declarer);
      
      return {
        ...state,
        passCount: newPassCount,
        phase: 'completed',
        currentBidder: nextBidder,
        contract: {
          level: contractBid,
          trump,
          declarer,
          partner,
        },
      };
    }
    
    return {
      ...state,
      passCount: newPassCount,
      currentBidder: nextBidder,
    };
  }
  
  // Valid bid must be higher
  if (bid.level <= state.highestBid) {
    throw new Error(`Bid ${bid.level} must be higher than ${state.highestBid}`);
  }
  
  const newBids = {
    ...state.bids,
    [playerId]: { level: bid.level, trump: bid.trump },
  };
  
  return {
    ...state,
    bids: newBids,
    highestBid: bid.level,
    passCount: 0,  // Reset pass count
    currentBidder: nextBidder,
  };
}

function getPartner(playerId: PlayerId): PlayerId {
  const partners: Record<PlayerId, PlayerId> = {
    'player': 'ai-east',
    'ai-east': 'player',
    'ai-north': 'ai-west',
    'ai-west': 'ai-north',
  };
  return partners[playerId];
}

// ============================================
// BRIDGE HAND EVALUATION
// ============================================

export function evaluateBridgeHand(hand: Card[]): {
  highCardPoints: number;
  distribution: Record<Suit, number>;
  recommendedBid: number;
  recommendedTrump?: Suit | 'no-trump';
  reasoning: string;
} {
  let highCardPoints = 0;
  const distribution: Record<Suit, number> = { HEARTS: 0, DIAMONDS: 0, CLUBS: 0, SPADES: 0 };
  
  for (const card of hand) {
    // High card points
    if (card.rank === 14) highCardPoints += 4;  // Ace
    else if (card.rank === 13) highCardPoints += 3;  // King
    else if (card.rank === 12) highCardPoints += 2;  // Queen
    else if (card.rank === 11) highCardPoints += 1;  // Jack
    
    // Distribution
    distribution[card.suit]++;
  }
  
  // Find longest suit
  let longestSuit: Suit = 'SPADES';
  let maxCount = 0;
  for (const [suit, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      longestSuit = suit as Suit;
    }
  }
  
  // Recommend bid based on HCP
  let recommendedBid = 0;
  let recommendedTrump: Suit | 'no-trump' | undefined;
  
  if (highCardPoints >= 15 && highCardPoints <= 17 && maxCount < 5) {
    recommendedBid = 1;
    recommendedTrump = 'no-trump';
  } else if (highCardPoints >= 20 && highCardPoints <= 22) {
    recommendedBid = 2;
    recommendedTrump = 'no-trump';
  } else if (highCardPoints >= 13) {
    recommendedBid = 1;
    recommendedTrump = maxCount >= 5 ? longestSuit : undefined;
  } else if (highCardPoints >= 6 && highCardPoints < 13) {
    recommendedBid = 0;  // Pass
  }
  
  // Build reasoning
  let reasoning: string;
  if (recommendedBid === 0) {
    reasoning = `${highCardPoints} HCP - insufficient for opening bid`;
  } else if (recommendedTrump === 'no-trump') {
    reasoning = `${highCardPoints} HCP, balanced distribution - bid ${recommendedBid} no-trump`;
  } else {
    reasoning = `${highCardPoints} HCP with ${maxCount}-card ${recommendedTrump} suit - bid ${recommendedBid}`;
  }
  
  return {
    highCardPoints,
    distribution,
    recommendedBid,
    recommendedTrump,
    reasoning,
  };
}

// ============================================
// BID SUGGESTION
// ============================================

export function suggestBid(
  hand: Card[],
  gameId: 'euchre' | 'bridge-lite',
  currentState?: EuchreBiddingState | BridgeBiddingState,
  upCard?: Card
): { bid: string; confidence: number; reasoning: string } {
  if (gameId === 'euchre' && upCard) {
    const evaluation = evaluateEuchreHand(hand, upCard);
    
    if (evaluation.shouldOrderUp) {
      return {
        bid: evaluation.confidence > 70 ? 'alone' : 'order-up',
        confidence: evaluation.confidence,
        reasoning: `Have ${Math.floor(evaluation.confidence / 15)} trump cards with ${evaluation.confidence > 50 ? 'bower strength' : 'solid support'}`,
      };
    }
    
    return {
      bid: 'pass',
      confidence: 100 - evaluation.confidence,
      reasoning: 'Weak trump support, passing to partner',
    };
  }
  
  if (gameId === 'bridge-lite') {
    const evaluation = evaluateBridgeHand(hand);
    
    if (evaluation.recommendedBid === 0) {
      return {
        bid: 'pass',
        confidence: 80,
        reasoning: `Only ${evaluation.highCardPoints} HCP, insufficient strength`,
      };
    }
    
    const trumpStr = evaluation.recommendedTrump === 'no-trump' ? 'no-trump' : evaluation.recommendedTrump;
    return {
      bid: `${evaluation.recommendedBid} ${trumpStr}`,
      confidence: Math.min(90, 50 + evaluation.highCardPoints * 2),
      reasoning: `${evaluation.highCardPoints} HCP with ${Math.max(...Object.values(evaluation.distribution))}-card suit`,
    };
  }
  
  return {
    bid: 'pass',
    confidence: 50,
    reasoning: 'Default pass',
  };
}
