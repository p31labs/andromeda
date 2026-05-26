// P31 Gridiron: Enhanced Markov Engine (10000%)
// 12-attribute driven simulation with stadium modifiers

import type {
  FieldState,
  PlayCall,
  PlayOutcome,
  DefensiveGameplan,
  Player,
  Attributes,
  AttributeKey,
  MatchupResult,
  TransitionWeights,
  Stadium,
  StadiumId,
} from '../types';
import { STADIUMS } from '../types';
import { calculateEffectiveAttributes, getAttributeForMatchup } from './fatigue';
import { DeterministicPRNG } from './prng';

export { DeterministicPRNG, createPRNG } from './prng';

// ============================================
// ENHANCED PLAYBOOK
// ============================================

export const PLAYBOOK: PlayCall[] = [
  // RUN PLAYS
  { id: 'INSIDE_ZONE', name: 'Inside Zone', formation: 'SINGLEBACK', personnel: '11', type: 'RUN', description: 'Power run between the tackles', difficulty: 1 },
  { id: 'OUTSIDE_ZONE', name: 'Outside Zone', formation: 'SINGLEBACK', personnel: '11', type: 'RUN', description: 'Stretch play to the edge', difficulty: 2 },
  { id: 'POWER', name: 'Power O', formation: 'I_FORM', personnel: '21', type: 'RUN', description: 'Gap scheme with pulling guard', difficulty: 2 },
  { id: 'DRAW', name: 'Draw', formation: 'SHOTGUN', personnel: '11', type: 'RUN', description: 'Delayed handoff to RB', difficulty: 1 },
  { id: 'QB_SNEAK', name: 'QB Sneak', formation: 'GOAL_LINE', personnel: '22', type: 'RUN', description: 'Short yardage push', difficulty: 1 },

  // PASS PLAYS
  { id: 'SLANTS', name: 'Slants', formation: 'SHOTGUN', personnel: '11', type: 'PASS', description: 'Quick hitting crossing routes', difficulty: 1 },
  { id: 'FOUR_VERTS', name: 'Four Verticals', formation: 'EMPTY', personnel: '10', type: 'PASS', description: 'Deep shot play', difficulty: 3 },
  { id: 'SCREEN', name: 'Screen Pass', formation: 'SHOTGUN', personnel: '11', type: 'PASS', description: 'RB or WR screen', difficulty: 1 },
  { id: 'PLAY_ACTION', name: 'Play Action Shot', formation: 'I_FORM', personnel: '21', type: 'PASS', description: 'Fake run, deep pass', difficulty: 2 },
  { id: 'CURL_FLAT', name: 'Curl-Flat', formation: 'SINGLEBACK', personnel: '12', type: 'PASS', description: 'High-low read concept', difficulty: 2 },

  // SPECIAL
  { id: 'PUNT', name: 'Punt', formation: 'PUNT', personnel: '22', type: 'SPECIAL', description: 'Field position exchange', difficulty: 1 },
  { id: 'FIELD_GOAL', name: 'Field Goal', formation: 'FIELD_GOAL', personnel: '22', type: 'SPECIAL', description: 'Kick for 3 points', difficulty: 1 },
];

// ============================================
// ATTRIBUTE MAPPING FOR MATCHUPS
// ============================================

interface MatchupConfig {
  attacker: AttributeKey[];
  defender: AttributeKey[];
  weight: number;  // How much this matchup affects the play
}

const RUN_MATCHUPS: MatchupConfig[] = [
  { attacker: ['blocking'], defender: ['passRush'], weight: 0.4 },  // OL vs DL
  { attacker: ['agility', 'speed'], defender: ['tackling', 'strength'], weight: 0.4 },  // RB vs LB/S
  { attacker: ['footballIQ'], defender: ['footballIQ'], weight: 0.2 },  // Recognition
];

const PASS_MATCHUPS: MatchupConfig[] = [
  { attacker: ['blocking'], defender: ['passRush'], weight: 0.35 },  // Pass protection
  { attacker: ['passingAccuracy'], defender: ['coverage'], weight: 0.25 },  // QB vs secondary
  { attacker: ['speed', 'catching'], defender: ['speed', 'coverage'], weight: 0.25 },  // WR vs CB
  { attacker: ['footballIQ'], defender: ['footballIQ'], weight: 0.15 },  // Pre-snap read
];

// ============================================
// STADIUM MODIFIER APPLICATION
// ============================================

function applyStadiumModifiers(
  attributes: Attributes,
  stadiumId: StadiumId,
  isHome: boolean
): Attributes {
  const stadium = STADIUMS[stadiumId];
  const modifiers = stadium.modifiers;

  return {
    speed: Math.floor(attributes.speed * (modifiers.speed ?? 1.0)),
    strength: Math.floor(attributes.strength * (modifiers.strength ?? 1.0)),
    agility: Math.floor(attributes.agility * (modifiers.agility ?? 1.0)),
    stamina: Math.floor(attributes.stamina * (modifiers.stamina ?? 1.0)),
    passingAccuracy: Math.floor(attributes.passingAccuracy * (modifiers.passingAccuracy ?? 1.0)),
    catching: Math.floor(attributes.catching * (modifiers.catching ?? 1.0)),
    footballIQ: Math.floor(attributes.footballIQ * (
      modifiers.footballIQ
        ? (isHome ? modifiers.footballIQ.home : modifiers.footballIQ.away)
        : 1.0
    )),
    ballSecurity: attributes.ballSecurity,
    blocking: attributes.blocking,
    tackling: attributes.tackling,
    passRush: attributes.passRush,
    coverage: attributes.coverage,
  };
}

// ============================================
// MATCHUP RESOLUTION
// ============================================

function resolveMatchup(
  attackerAttrs: Attributes,
  defenderAttrs: Attributes,
  attackerKeys: AttributeKey[],
  defenderKeys: AttributeKey[],
  prng: DeterministicPRNG
): MatchupResult {
  // Calculate composite ratings
  const attackerRating = attackerKeys.reduce((sum, key) =>
    sum + attackerAttrs[key], 0
  ) / attackerKeys.length;

  const defenderRating = defenderKeys.reduce((sum, key) =>
    sum + defenderAttrs[key], 0
  ) / defenderKeys.length;

  // Logistic curve for win probability
  const diff = attackerRating - defenderRating;
  const winProbability = 1 / (1 + Math.exp(-0.1 * diff));

  // Determine outcome
  const roll = prng.next();
  const outcome: MatchupResult['outcome'] =
    roll < winProbability * 0.8 ? 'win' :
    roll > 1 - (1 - winProbability) * 0.8 ? 'loss' :
    'draw';

  return {
    matchup: `${attackerKeys.join('+')} vs ${defenderKeys.join('+')}`,
    attackerRating,
    defenderRating,
    winProbability,
    outcome,
  };
}

function calculateCompositeMatchupRating(
  matchups: MatchupResult[],
  weights: number[]
): number {
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  return matchups.reduce((acc, matchup, i) => {
    const weight = weights[i] / totalWeight;
    const outcomeValue =
      matchup.outcome === 'win' ? 1.0 :
      matchup.outcome === 'draw' ? 0.5 :
      0.0;
    return acc + outcomeValue * weight;
  }, 0);
}

// ============================================
// BASE TRANSITION MATRIX
// ============================================

const BASE_TRANSITIONS: Record<string, Record<string, TransitionWeights>> = {
  'INSIDE_ZONE': {
    'STACKED': { minYards: -2, maxYards: 5, firstDownChance: 0.35, touchdownChance: 0.02, fumbleChance: 0.01, sackChance: 0, interceptionChance: 0 },
    'LIGHT': { minYards: 2, maxYards: 12, firstDownChance: 0.55, touchdownChance: 0.08, fumbleChance: 0.01, sackChance: 0, interceptionChance: 0 },
    'SPILL': { minYards: 1, maxYards: 8, firstDownChance: 0.45, touchdownChance: 0.05, fumbleChance: 0.01, sackChance: 0, interceptionChance: 0 },
    'BOX': { minYards: 0, maxYards: 6, firstDownChance: 0.40, touchdownChance: 0.03, fumbleChance: 0.01, sackChance: 0, interceptionChance: 0 },
  },
  'OUTSIDE_ZONE': {
    'STACKED': { minYards: -3, maxYards: 8, firstDownChance: 0.40, touchdownChance: 0.05, fumbleChance: 0.015, sackChance: 0, interceptionChance: 0 },
    'LIGHT': { minYards: 0, maxYards: 15, firstDownChance: 0.50, touchdownChance: 0.10, fumbleChance: 0.015, sackChance: 0, interceptionChance: 0 },
    'SPILL': { minYards: 3, maxYards: 18, firstDownChance: 0.60, touchdownChance: 0.12, fumbleChance: 0.015, sackChance: 0, interceptionChance: 0 },
    'BOX': { minYards: -1, maxYards: 10, firstDownChance: 0.45, touchdownChance: 0.06, fumbleChance: 0.015, sackChance: 0, interceptionChance: 0 },
  },
  'DRAW': {
    'COVER_2': { minYards: 2, maxYards: 12, firstDownChance: 0.45, touchdownChance: 0.06, fumbleChance: 0.01, sackChance: 0.02, interceptionChance: 0 },
    'COVER_3': { minYards: 1, maxYards: 10, firstDownChance: 0.40, touchdownChance: 0.04, fumbleChance: 0.01, sackChance: 0.02, interceptionChance: 0 },
    'MAN': { minYards: 0, maxYards: 8, firstDownChance: 0.35, touchdownChance: 0.03, fumbleChance: 0.01, sackChance: 0.03, interceptionChance: 0 },
    'HYBRID': { minYards: 1, maxYards: 11, firstDownChance: 0.42, touchdownChance: 0.05, fumbleChance: 0.01, sackChance: 0.02, interceptionChance: 0 },
  },
  'SLANTS': {
    'COVER_2': { minYards: 4, maxYards: 12, firstDownChance: 0.65, touchdownChance: 0.08, fumbleChance: 0, sackChance: 0.03, interceptionChance: 0.01 },
    'COVER_3': { minYards: 3, maxYards: 10, firstDownChance: 0.60, touchdownChance: 0.05, fumbleChance: 0, sackChance: 0.04, interceptionChance: 0.015 },
    'MAN': { minYards: 5, maxYards: 15, firstDownChance: 0.55, touchdownChance: 0.12, fumbleChance: 0, sackChance: 0.05, interceptionChance: 0.02 },
    'HYBRID': { minYards: 4, maxYards: 11, firstDownChance: 0.58, touchdownChance: 0.06, fumbleChance: 0, sackChance: 0.04, interceptionChance: 0.015 },
  },
  'FOUR_VERTS': {
    'COVER_2': { minYards: 0, maxYards: 40, firstDownChance: 0.25, touchdownChance: 0.20, fumbleChance: 0, sackChance: 0.08, interceptionChance: 0.08 },
    'COVER_3': { minYards: 0, maxYards: 35, firstDownChance: 0.30, touchdownChance: 0.15, fumbleChance: 0, sackChance: 0.06, interceptionChance: 0.06 },
    'MAN': { minYards: 0, maxYards: 50, firstDownChance: 0.20, touchdownChance: 0.25, fumbleChance: 0, sackChance: 0.10, interceptionChance: 0.10 },
    'HYBRID': { minYards: 0, maxYards: 38, firstDownChance: 0.28, touchdownChance: 0.18, fumbleChance: 0, sackChance: 0.07, interceptionChance: 0.07 },
  },
  'SCREEN': {
    'COVER_2': { minYards: 3, maxYards: 20, firstDownChance: 0.50, touchdownChance: 0.15, fumbleChance: 0.005, sackChance: 0.01, interceptionChance: 0.005 },
    'COVER_3': { minYards: 5, maxYards: 25, firstDownChance: 0.55, touchdownChance: 0.18, fumbleChance: 0.005, sackChance: 0.01, interceptionChance: 0.005 },
    'MAN': { minYards: 2, maxYards: 15, firstDownChance: 0.45, touchdownChance: 0.10, fumbleChance: 0.005, sackChance: 0.02, interceptionChance: 0.01 },
    'HYBRID': { minYards: 4, maxYards: 22, firstDownChance: 0.52, touchdownChance: 0.16, fumbleChance: 0.005, sackChance: 0.015, interceptionChance: 0.008 },
  },
};

// ============================================
// FIELD POSITION MODIFIERS
// ============================================

interface FieldPositionModifier {
  yardMultiplier: number;
  touchdownBonus: number;
  bigPlayPenalty: number;
}

function getFieldPositionModifier(
  yardLine: number,
  isRedZone: boolean
): FieldPositionModifier {
  // Red zone (inside 20)
  if (isRedZone) {
    return {
      yardMultiplier: 0.5,
      touchdownBonus: 0.15,
      bigPlayPenalty: 0.20,
    };
  }

  // Backed up (inside 10)
  if (yardLine < 10) {
    return {
      yardMultiplier: 0.7,
      touchdownBonus: 0,
      bigPlayPenalty: 0.10,
    };
  }

  // Deep territory (opponent 30 or less)
  if (yardLine > 70) {
    return {
      yardMultiplier: 0.9,
      touchdownBonus: 0.05,
      bigPlayPenalty: 0.05,
    };
  }

  // Open field
  return {
    yardMultiplier: 1.0,
    touchdownBonus: 0,
    bigPlayPenalty: 0,
  };
}

// ============================================
// DEFENSIVE CALL SELECTION
// ============================================

function determineDefensiveCall(
  state: FieldState,
  gameplan: DefensiveGameplan,
  prng: DeterministicPRNG
): string {
  // 2-minute drill: Prevent defense
  if (state.quarter === 2 || state.quarter === 4) {
    const isTwoMinute = state.gameClock <= 120;
    if (isTwoMinute && gameplan.twoMinuteScheme === 'PREVENT') {
      return 'COVER_2';
    }
  }

  // Red zone: Tight coverage
  if (state.yardLine > 80 && gameplan.redZoneScheme === 'TIGHT') {
    return 'MAN';
  }

  // 3rd and long: Blitz
  if (state.down === 3 && state.distance >= 7 && gameplan.thirdDownBlitz) {
    return 'HYBRID';
  }

  // Base call by scheme with variation
  const schemeCalls: Record<string, string[]> = {
    'COVER_2': ['COVER_2', 'COVER_2', 'COVER_2', 'MAN'],
    'COVER_3': ['COVER_3', 'COVER_3', 'COVER_3', 'HYBRID'],
    'MAN': ['MAN', 'MAN', 'MAN', 'COVER_2'],
    'HYBRID': ['HYBRID', 'COVER_3', 'MAN', 'COVER_2'],
  };

  const calls = schemeCalls[gameplan.baseScheme] || ['COVER_3'];
  return prng.pick(calls);
}

// ============================================
// ENHANCED PLAY RESOLUTION
// ============================================

export interface PlayResolutionContext {
  playCall: PlayCall;
  stateBefore: FieldState;
  offense: Player[];
  defense: Player[];
  defensiveGameplan: DefensiveGameplan;
  stadiumId: StadiumId;
  isHome: boolean;
  prng: DeterministicPRNG;
}

// Enhanced play outcome with metadata
export type EnhancedPlayOutcome = PlayOutcome & {
  matchups: MatchupResult[];
  compositeRating: number;
  prngIndex: number;
};

export function resolvePlayEnhanced(
  context: PlayResolutionContext
): EnhancedPlayOutcome {
  const {
    playCall,
    stateBefore,
    offense,
    defense,
    defensiveGameplan,
    stadiumId,
    isHome,
    prng,
  } = context;

  const prngIndex = prng.getIndex();

  // Apply fatigue to get effective attributes
  const effectiveOffense = offense.map(p => ({
    player: p,
    attrs: calculateEffectiveAttributes(p),
  }));
  const effectiveDefense = defense.map(p => ({
    player: p,
    attrs: calculateEffectiveAttributes(p),
  }));

  // Apply stadium modifiers
  const stadiumModifiedOffense = effectiveOffense.map(o => ({
    ...o,
    attrs: applyStadiumModifiers(o.attrs, stadiumId, isHome),
  }));
  const stadiumModifiedDefense = effectiveDefense.map(d => ({
    ...d,
    attrs: applyStadiumModifiers(d.attrs, stadiumId, !isHome),
  }));

  // Get key players
  const qb = stadiumModifiedOffense.find(o => o.player.position === 'QB');
  const rb = stadiumModifiedOffense.find(o => o.player.position === 'RB');
  const ol = stadiumModifiedOffense.filter(o => o.player.position === 'OL');
  const dl = stadiumModifiedDefense.filter(d => d.player.position === 'DL');
  const lb = stadiumModifiedDefense.filter(d => d.player.position === 'LB');
  const db = stadiumModifiedDefense.filter(d => d.player.position === 'CB' || d.player.position === 'S');

  // Determine defensive call
  const defensiveCall = determineDefensiveCall(stateBefore, defensiveGameplan, prng);

  // Resolve matchups based on play type
  const matchups: MatchupResult[] = [];
  let matchupConfigs: MatchupConfig[] = [];

  if (playCall.type === 'RUN') {
    matchupConfigs = RUN_MATCHUPS;

    // OL vs DL blocking matchup
    const olAvg = ol.reduce((sum, o) => sum + o.attrs.blocking, 0) / (ol.length || 1);
    const dlAvg = dl.reduce((sum, d) => sum + d.attrs.passRush, 0) / (dl.length || 1);
    matchups.push(resolveMatchup(
      { blocking: olAvg } as Attributes,
      { passRush: dlAvg } as Attributes,
      ['blocking'],
      ['passRush'],
      prng
    ));

    // RB vs LB/S tackling matchup
    if (rb) {
      const rbAttrs = rb.attrs;
      const lbAvg = lb.reduce((sum, l) => sum + l.attrs.tackling, 0) / (lb.length || 1);
      const dbAvg = db.reduce((sum, d) => sum + d.attrs.tackling, 0) / (db.length || 1);
      const defenderAvg = (lbAvg + dbAvg) / 2;

      matchups.push(resolveMatchup(
        rbAttrs,
        { tackling: defenderAvg } as Attributes,
        ['agility', 'speed'],
        ['tackling', 'strength'],
        prng
      ));
    }
  } else if (playCall.type === 'PASS') {
    matchupConfigs = PASS_MATCHUPS;

    // Pass protection
    const olAvg = ol.reduce((sum, o) => sum + o.attrs.blocking, 0) / (ol.length || 1);
    const rushAvg = [...dl, ...lb].reduce((sum, p) => sum + p.attrs.passRush, 0) / (dl.length + lb.length || 1);
    matchups.push(resolveMatchup(
      { blocking: olAvg } as Attributes,
      { passRush: rushAvg } as Attributes,
      ['blocking'],
      ['passRush'],
      prng
    ));

    // QB vs coverage
    if (qb) {
      const covAvg = db.reduce((sum, d) => sum + d.attrs.coverage, 0) / (db.length || 1);
      matchups.push(resolveMatchup(
        qb.attrs,
        { coverage: covAvg } as Attributes,
        ['passingAccuracy', 'footballIQ'],
        ['coverage', 'footballIQ'],
        prng
      ));
    }
  }

  // Calculate composite matchup rating
  const weights = matchupConfigs.map(m => m.weight);
  const compositeRating = calculateCompositeMatchupRating(matchups, weights);

  // Get base transition weights
  const baseWeights = BASE_TRANSITIONS[playCall.id]?.[defensiveCall] || {
    minYards: 0, maxYards: 5, firstDownChance: 0.40, touchdownChance: 0.03,
    fumbleChance: 0.01, sackChance: 0.03, interceptionChance: 0.02
  };

  // Adjust weights based on matchup outcomes
  const adjustedWeights: TransitionWeights = {
    minYards: baseWeights.minYards + (compositeRating - 0.5) * 4,
    maxYards: baseWeights.maxYards + (compositeRating - 0.5) * 10,
    firstDownChance: Math.max(0, Math.min(1, baseWeights.firstDownChance + (compositeRating - 0.5) * 0.2)),
    touchdownChance: Math.max(0, Math.min(1, baseWeights.touchdownChance + (compositeRating - 0.5) * 0.1)),
    fumbleChance: Math.max(0, baseWeights.fumbleChance - (compositeRating - 0.5) * 0.01),
    sackChance: Math.max(0, baseWeights.sackChance - (compositeRating - 0.5) * 0.03),
    interceptionChance: Math.max(0, baseWeights.interceptionChance - (compositeRating - 0.5) * 0.03),
  };

  // Apply field position modifiers
  const isRedZone = stateBefore.yardLine > 80;
  const fpMod = getFieldPositionModifier(stateBefore.yardLine, isRedZone);

  adjustedWeights.maxYards *= fpMod.yardMultiplier;
  adjustedWeights.touchdownChance = Math.min(1, adjustedWeights.touchdownChance + fpMod.touchdownBonus);

  // Special teams
  if (playCall.id === 'PUNT') {
    return {
      type: 'SPECIAL',
      specialType: 'PUNT',
      matchups,
      compositeRating,
      prngIndex,
    } as EnhancedPlayOutcome;
  }

  if (playCall.id === 'FIELD_GOAL') {
    const distance = 100 - stateBefore.yardLine + 17;
    const kicker = stadiumModifiedOffense.find(o => o.player.position === 'K');
    const accuracy = kicker ? kicker.attrs.passingAccuracy : 50;  // Reuse for kicking

    const baseChance = Math.max(0.3, 1 - (distance - 20) * 0.02);
    const adjustedChance = baseChance * (accuracy / 50);

    if (prng.nextBool(adjustedChance)) {
      return {
        type: 'SCORE',
        scoreType: 'FIELD_GOAL',
        matchups,
        compositeRating,
        prngIndex,
      } as EnhancedPlayOutcome;
    }
    return {
      type: 'NO_GAIN',
      matchups,
      compositeRating,
      prngIndex,
    } as EnhancedPlayOutcome;
  }

  // Determine outcome
  const roll = prng.next();

  // Check turnovers first
  if (playCall.type === 'PASS' && roll < adjustedWeights.interceptionChance) {
    return {
      type: 'TURNOVER',
      turnoverType: 'INTERCEPTION',
      matchups,
      compositeRating,
      prngIndex,
    } as EnhancedPlayOutcome;
  }
  if (roll < adjustedWeights.fumbleChance) {
    return {
      type: 'TURNOVER',
      turnoverType: 'FUMBLE',
      matchups,
      compositeRating,
      prngIndex,
    } as EnhancedPlayOutcome;
  }

  // Check sack
  if (playCall.type === 'PASS' && roll < adjustedWeights.sackChance + adjustedWeights.interceptionChance) {
    const sackYards = prng.nextInt(5, 10);
    return {
      type: 'LOSS',
      yards: sackYards,
      matchups,
      compositeRating,
      prngIndex,
    } as EnhancedPlayOutcome;
  }

  // Check touchdown
  if (prng.nextBool(adjustedWeights.touchdownChance)) {
    const yardsToEndzone = 100 - stateBefore.yardLine;
    return {
      type: 'GAIN',
      yards: yardsToEndzone,
      firstDown: true,
      touchdown: true,
      matchups,
      compositeRating,
      prngIndex,
    } as EnhancedPlayOutcome;
  }

  // Regular gain
  const minGain = Math.floor(adjustedWeights.minYards);
  const maxGain = Math.ceil(adjustedWeights.maxYards);
  const yardsGained = prng.nextInt(minGain, maxGain + 1);

  const newDistance = stateBefore.distance - yardsGained;
  const firstDown = newDistance <= 0 || (stateBefore.yardLine + yardsGained >= 100);

  if (yardsGained <= 0) {
    return {
      type: yardsGained === 0 ? 'NO_GAIN' : 'LOSS',
      yards: Math.abs(yardsGained),
      matchups,
      compositeRating,
      prngIndex,
    } as EnhancedPlayOutcome;
  }

  return {
    type: 'GAIN',
    yards: yardsGained,
    firstDown,
    touchdown: false,
    matchups,
    compositeRating,
    prngIndex,
  } as EnhancedPlayOutcome;
}
