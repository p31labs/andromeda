// ═══════════════════════════════════════════════════════════════════
// WCD-PASS-04: Delta Cards Data
// P31 Labs — Cognitive Passport System
//
// Delta topology: Peer-to-peer support request system.
// Cards represent high-efficiency communication packets.
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// Bandwidth Types
// ─────────────────────────────────────────────────────────────────
export type Bandwidth = 'LOW' | 'MEDIUM' | 'HIGH';

// ─────────────────────────────────────────────────────────────────
// Delta Card Types
// ─────────────────────────────────────────────────────────────────
export type DeltaCardType = 'REQUEST' | 'OFFER' | 'ALERT';

// ─────────────────────────────────────────────────────────────────
// Delta Card Data Interface
// ─────────────────────────────────────────────────────────────────
export interface DeltaCardData {
  id: string;
  type: DeltaCardType;
  title: string;
  description: string;
  bandwidth: Bandwidth;
  spoonCost: number;
  larmorReward: number;
  payload: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
}

// ─────────────────────────────────────────────────────────────────
// Bandwidth Labels
// ─────────────────────────────────────────────────────────────────
export const BANDWIDTH_LABELS: Record<Bandwidth, string> = {
  LOW: 'Low Bandwidth',
  MEDIUM: 'Medium Bandwidth',
  HIGH: 'High Bandwidth',
};

// ─────────────────────────────────────────────────────────────────
// Type Color Mapping
// ─────────────────────────────────────────────────────────────────
export const TYPE_COLORS: Record<DeltaCardType, string> = {
  REQUEST: '#F59E0B', // Amber - requesting help
  OFFER: '#00D4FF',   // Cyan - offering support
  ALERT: '#EF4444',   // Red - urgent alert
};

// ─────────────────────────────────────────────────────────────────
// Sample Delta Cards
// ─────────────────────────────────────────────────────────────────
export const SAMPLE_DELTA_CARDS: DeltaCardData[] = [
  {
    id: 'need-backup',
    type: 'REQUEST',
    title: 'Need Backup',
    description: 'Requesting immediate support. High priority.',
    bandwidth: 'HIGH',
    spoonCost: 5,
    larmorReward: 10,
    payload: {
      category: 'support',
      priority: 'high',
      responseTimeframe: 'immediate',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'quick-checkin',
    type: 'REQUEST',
    title: 'Quick Check-in',
    description: 'Simple wellness check. Low effort needed.',
    bandwidth: 'LOW',
    spoonCost: 1,
    larmorReward: 2,
    payload: {
      category: 'wellness',
      priority: 'low',
      responseTimeframe: 'when-available',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'spoon-emergency',
    type: 'ALERT',
    title: 'Spoon Emergency',
    description: 'Critical cognitive overload. Need immediate intervention.',
    bandwidth: 'HIGH',
    spoonCost: 8,
    larmorReward: 20,
    payload: {
      category: 'emergency',
      priority: 'critical',
      responseTimeframe: 'immediate',
      requiresAction: true,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'offer-listening',
    type: 'OFFER',
    title: 'Offer: Listening',
    description: 'Available to listen and provide support.',
    bandwidth: 'MEDIUM',
    spoonCost: 3,
    larmorReward: 5,
    payload: {
      category: 'support',
      availability: 'available',
      capacity: 1,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'offer-resources',
    type: 'OFFER',
    title: 'Offer: Resources',
    description: 'Sharing helpful resources and information.',
    bandwidth: 'LOW',
    spoonCost: 2,
    larmorReward: 3,
    payload: {
      category: 'resources',
      type: 'information-sharing',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'meltdown-warning',
    type: 'ALERT',
    title: 'Meltdown Warning',
    description: 'Showing early signs of overwhelm. Gentle support appreciated.',
    bandwidth: 'MEDIUM',
    spoonCost: 4,
    larmorReward: 8,
    payload: {
      category: 'early-warning',
      priority: 'medium',
      responseTimeframe: 'soon',
      needsGentleApproach: true,
    },
    createdAt: new Date().toISOString(),
  },
];

// ─────────────────────────────────────────────────────────────────
// Card Factory
// ─────────────────────────────────────────────────────────────────
export function createDeltaCard(
  type: DeltaCardType,
  title: string,
  description: string,
  bandwidth: Bandwidth,
  spoonCost: number,
  larmorReward: number,
  payload: Record<string, unknown> = {}
): DeltaCardData {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    description,
    bandwidth,
    spoonCost,
    larmorReward,
    payload,
    createdAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────
// Card Filtering
// ─────────────────────────────────────────────────────────────────
export function filterCardsByType(cards: DeltaCardData[], type: DeltaCardType): DeltaCardData[] {
  return cards.filter((card) => card.type === type);
}

export function filterCardsByBandwidth(
  cards: DeltaCardData[],
  bandwidth: Bandwidth
): DeltaCardData[] {
  return cards.filter((card) => card.bandwidth === bandwidth);
}

export function filterCardsByMaxSpoons(
  cards: DeltaCardData[],
  maxSpoons: number
): DeltaCardData[] {
  return cards.filter((card) => card.spoonCost <= maxSpoons);
}

// ─────────────────────────────────────────────────────────────────
// Card Sorting
// ─────────────────────────────────────────────────────────────────
export function sortBySpoonCost(cards: DeltaCardData[], ascending = true): DeltaCardData[] {
  return [...cards].sort((a, b) =>
    ascending ? a.spoonCost - b.spoonCost : b.spoonCost - a.spoonCost
  );
}

export function sortByLarmorReward(cards: DeltaCardData[], ascending = false): DeltaCardData[] {
  return [...cards].sort((a, b) =>
    ascending ? a.larmorReward - b.larmorReward : b.larmorReward - a.larmorReward
  );
}
