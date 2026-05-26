// P31 Adaptive AI v3.0 - ML-Style Player Modeling
// Tracks tendencies, adapts difficulty, personality-driven decisions

import { AIContext, AIDecision } from './ai-opponent';

export interface PlayerTendencies {
  playerId: string;
  // Pitching tendencies
  pitchSelection: Record<string, number>; // pitchType -> frequency
  locationPreference: Record<string, number>; // zone -> frequency
  aggressionHistory: number[];

  // Batting tendencies
  swingRateByCount: Record<string, number>; // "0-0", "1-2" -> swing rate
  contactQualityByPitch: Record<string, number[]>; // pitchType -> quality samples
  chaseRate: number; // Swings outside zone
  patienceIndex: number; // Takes per at-bat

  // Meta
  lastUpdated: number;
  sampleSize: number;
  confidenceScore: number; // 0-1 based on sample size
}

export interface AIPersonality {
  type: 'aggressive' | 'defensive' | 'balanced' | 'analytical' | 'chaotic';
  aggressionBias: number; // -0.3 to +0.3
  riskTolerance: number; // 0-1
  adaptationRate: number; // How quickly AI adjusts (0-1)
  exploitTendencies: boolean; // Whether to actively exploit player patterns
}

const PERSONALITIES: Record<string, AIPersonality> = {
  aggressive: {
    type: 'aggressive',
    aggressionBias: 0.25,
    riskTolerance: 0.8,
    adaptationRate: 0.6,
    exploitTendencies: true
  },
  defensive: {
    type: 'defensive',
    aggressionBias: -0.2,
    riskTolerance: 0.3,
    adaptationRate: 0.4,
    exploitTendencies: false
  },
  balanced: {
    type: 'balanced',
    aggressionBias: 0,
    riskTolerance: 0.5,
    adaptationRate: 0.5,
    exploitTendencies: true
  },
  analytical: {
    type: 'analytical',
    aggressionBias: -0.1,
    riskTolerance: 0.4,
    adaptationRate: 0.9,
    exploitTendencies: true
  },
  chaotic: {
    type: 'chaotic',
    aggressionBias: 0.1,
    riskTolerance: 0.7,
    adaptationRate: 0.3,
    exploitTendencies: false
  }
};

export function createPlayerTendencies(playerId: string): PlayerTendencies {
  return {
    playerId,
    pitchSelection: {},
    locationPreference: {},
    aggressionHistory: [],
    swingRateByCount: {},
    contactQualityByPitch: {},
    chaseRate: 0.5,
    patienceIndex: 0.5,
    lastUpdated: Date.now(),
    sampleSize: 0,
    confidenceScore: 0
  };
}

export function selectPersonality(prng: () => number): AIPersonality {
  const keys = Object.keys(PERSONALITIES);
  const selected = keys[Math.floor(prng() * keys.length)];
  return PERSONALITIES[selected];
}

export function updateTendencies(
  tendencies: PlayerTendencies,
  event: GameEvent,
  prng: () => number
): PlayerTendencies {
  const updated = { ...tendencies };
  updated.sampleSize++;

  if (event.type === 'PITCH') {
    // Track pitch selection
    updated.pitchSelection[event.pitchType] =
      (updated.pitchSelection[event.pitchType] || 0) + 1;

    // Track location
    const zoneKey = `${event.location.x}-${event.location.y}`;
    updated.locationPreference[zoneKey] =
      (updated.locationPreference[zoneKey] || 0) + 1;
  }

  if (event.type === 'SWING_DECISION') {
    const countKey = `${event.balls}-${event.strikes}`;
    const currentRate = updated.swingRateByCount[countKey] || 0.5;
    updated.swingRateByCount[countKey] =
      currentRate + (event.didSwing ? 0.1 : -0.1) * 0.1; // Slow update
  }

  if (event.type === 'CONTACT') {
    const qualities = updated.contactQualityByPitch[event.pitchType] || [];
    qualities.push(event.quality);
    // Keep last 20 samples
    updated.contactQualityByPitch[event.pitchType] = qualities.slice(-20);
  }

  // Update confidence based on sample size (saturates at ~50 samples)
  updated.confidenceScore = Math.min(0.95, updated.sampleSize / 50);
  updated.lastUpdated = Date.now();

  return updated;
}

export function generateAdaptivePitchDecision(
  context: AIContext,
  tendencies: PlayerTendencies | null,
  personality: AIPersonality,
  prng: () => number
): AIDecision & { reasoning: string } {
  const { scoreDiff, outs, runners, pitcherFatigue, batterStats } = context;

  // Base probabilities from original AI
  let probs = calculateBaseProbabilities(context);

  // Apply personality bias
  probs.fastball *= (1 + personality.aggressionBias);
  probs.curveball *= (1 - personality.aggressionBias * 0.5);

  // Exploit tendencies if we have data and personality allows
  if (tendencies && personality.exploitTendencies && tendencies.confidenceScore > 0.3) {
    const exploited = exploitTendencies(probs, tendencies, prng);
    probs = exploited as { fastball: number; curveball: number; slider: number; changeup: number };
  }

  // Normalize
  const total = probs.fastball + probs.curveball + probs.slider + probs.changeup;
  probs.fastball /= total;
  probs.curveball /= total;
  probs.slider /= total;
  probs.changeup /= total;

  // Select pitch
  const roll = prng();
  let pitchType: AIDecision['pitchType'];
  if (roll < probs.fastball) pitchType = 'FASTBALL';
  else if (roll < probs.fastball + probs.curveball) pitchType = 'CURVEBALL';
  else if (roll < probs.fastball + probs.curveball + probs.slider) pitchType = 'SLIDER';
  else pitchType = 'CHANGEUP';

  // Select location - exploit if player has weak zones
  let location = selectLocation(tendencies, personality, prng);

  const reasoning = buildReasoning(pitchType, location, tendencies, personality);

  return {
    pitchType,
    location,
    aggression: Math.min(1, Math.max(0, 0.5 + (scoreDiff * 0.1) - (pitcherFatigue * 0.2) + personality.aggressionBias)),
    reasoning
  };
}

function calculateBaseProbabilities(context: AIContext) {
  const { scoreDiff, runners, pitcherFatigue, batterStats } = context;

  let fastball = 0.5, curveball = 0.2, slider = 0.2, changeup = 0.1;

  if (scoreDiff > 0) {
    fastball += 0.1;
    changeup -= 0.05;
  } else if (scoreDiff < 0) {
    curveball += 0.1;
    slider += 0.05;
    fastball -= 0.15;
  }

  if (runners > 0) {
    fastball += 0.1;
    changeup += 0.05;
    curveball -= 0.1;
  }

  if (pitcherFatigue > 0.7) {
    fastball -= 0.15;
    changeup += 0.15;
  }

  if (batterStats.power > 70) {
    fastball -= 0.1;
    curveball += 0.1;
  }

  if (batterStats.plateDiscipline > 70) {
    slider += 0.05;
    changeup += 0.05;
  }

  return { fastball, curveball, slider, changeup };
}

function exploitTendencies(
  probs: { fastball: number; curveball: number; slider: number; changeup: number },
  tendencies: PlayerTendencies,
  prng: () => number
): { fastball: number; curveball: number; slider: number; changeup: number } {
  // If player struggles with breaking balls, throw more
  const curveQuality = average(tendencies.contactQualityByPitch['CURVEBALL'] || []);
  const sliderQuality = average(tendencies.contactQualityByPitch['SLIDER'] || []);

  if (curveQuality < 0.4 && prng() < 0.7) {
    probs.curveball *= 1.3;
  }
  if (sliderQuality < 0.4 && prng() < 0.7) {
    probs.slider *= 1.3;
  }

  // If player is aggressive, pitch outside zone more
  if (tendencies.chaseRate > 0.6) {
    // Will select edge locations
  }

  return probs;
}

function selectLocation(
  tendencies: PlayerTendencies | null,
  personality: AIPersonality,
  prng: () => number
): AIDecision['location'] {
  const locations: AIDesignDecision['location'][] = ['inside', 'outside', 'high', 'low', 'center'];

  // If aggressive personality and we have low confidence in tendencies, throw to edges
  if (personality.type === 'aggressive' && (!tendencies || tendencies.confidenceScore < 0.5)) {
    const edgeLocations: AIDecision['location'][] = ['inside', 'outside', 'high', 'low'];
    return edgeLocations[Math.floor(prng() * edgeLocations.length)];
  }

  return locations[Math.floor(prng() * locations.length)];
}

function buildReasoning(
  pitchType: string,
  location: string,
  tendencies: PlayerTendencies | null,
  personality: AIPersonality
): string {
  const parts: string[] = [];

  parts.push(`Personality: ${personality.type}`);

  if (tendencies && tendencies.confidenceScore > 0.3) {
    parts.push(`Player confidence: ${(tendencies.confidenceScore * 100).toFixed(0)}%`);

    const weakPitch = Object.entries(tendencies.contactQualityByPitch)
      .sort((a, b) => average(a[1]) - average(b[1]))[0];
    if (weakPitch && average(weakPitch[1]) < 0.4) {
      parts.push(`Exploiting weakness: ${weakPitch[0]}`);
    }
  }

  parts.push(`Selected: ${pitchType} ${location}`);

  return parts.join(' | ');
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0.5;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Type for game events
interface GameEvent {
  type: 'PITCH' | 'SWING_DECISION' | 'CONTACT' | 'AT_BAT_END';
  pitchType?: string;
  location?: { x: number; y: number };
  balls?: number;
  strikes?: number;
  didSwing?: boolean;
  quality?: number;
}

// Extend AIDecision with reasoning
interface AIDesignDecision extends AIDecision {
  reasoning?: string;
}

export { PERSONALITIES };
