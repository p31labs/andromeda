// Markov Chain Baseball Simulation Engine
// Deterministic plate appearance resolution

import type {
  Player,
  Stats,
  PlateAppearanceState,
  CountState,
  AtBatResult,
  PlateAppearanceEvent,
  PlateAppearanceOutcome,
  Pitch,
  DefensiveAI,
  MatchHistoryEvent,
  ActionData,
} from '../types';
import { DeterministicPRNG } from './prng';

// ============================================
// COUNT STATE DEFINITIONS
// ============================================

export const VALID_COUNTS: CountState[] = [
  { balls: 0, strikes: 0 }, // 0-0
  { balls: 1, strikes: 0 }, // 1-0
  { balls: 2, strikes: 0 }, // 2-0
  { balls: 3, strikes: 0 }, // 3-0
  { balls: 0, strikes: 1 }, // 0-1
  { balls: 1, strikes: 1 }, // 1-1
  { balls: 2, strikes: 1 }, // 2-1
  { balls: 3, strikes: 1 }, // 3-1
  { balls: 0, strikes: 2 }, // 0-2
  { balls: 1, strikes: 2 }, // 1-2
  { balls: 2, strikes: 2 }, // 2-2
  { balls: 3, strikes: 2 }, // 3-2
];

// ============================================
// TRANSITION MATRIX CALCULATION
// ============================================


// Calculate transition probabilities based on batter/pitcher attributes
export function calculateTransitionMatrix(
  currentState: CountState,
  batterStats: Stats,
  pitcherStats: Stats,
  pitch: Pitch,
  defensiveStrategy: DefensiveAI
): TransitionProbabilities {
  // Base probabilities (league average)
  let ball = 0.36;
  let strike = 0.28;
  let inPlay = 0.36;

  // Adjust for pitch type and velocity
  const velocityFactor = (pitch.velocity - 90) / 20; // normalized around 90mph
  
  switch (pitch.type) {
    case 'FASTBALL':
      inPlay += 0.03 + velocityFactor * 0.02;
      strike += velocityFactor * 0.01;
      break;
    case 'CURVEBALL':
      inPlay -= 0.04;
      strike += 0.03;
      break;
    case 'SLIDER':
      inPlay -= 0.02;
      strike += 0.02;
      break;
    case 'CHANGEUP':
      inPlay += 0.01;
      break;
  }

  // Adjust for pitcher control vs batter discipline
  const controlDelta = (pitcherStats.armAccuracy - batterStats.eye) / 100;
  ball -= controlDelta * 0.05;
  strike += controlDelta * 0.03;

  // Adjust for count (pitcher/batter aggression)
  if (currentState.strikes === 2) {
    // 2-strike count: batter protecting, pitcher trying to put away
    inPlay -= 0.05;
    ball -= 0.03;
    strike += 0.08;
  }

  if (currentState.balls === 3) {
    // 3-ball count: pitcher must throw strikes
    ball += 0.05;
    strike -= 0.03;
  }

  // Adjust for pitch location (strike zone)
  const distanceFromCenter = Math.sqrt(
    pitch.location[0] ** 2 + pitch.location[1] ** 2
  );
  
  if (distanceFromCenter < 0.3) {
    // Center cut: more hittable
    inPlay += 0.08;
    ball -= 0.05;
  } else if (distanceFromCenter > 0.8) {
    // Edge or out of zone
    ball += 0.08;
    inPlay -= 0.06;
  }

  // Normalize to ensure probabilities sum to 1.0
  const total = ball + strike + inPlay;
  ball /= total;
  strike /= total;
  inPlay /= total;

  // Handle terminal states
  const result: TransitionProbabilities = { ball, strike, inPlay };

  // 3 balls + ball = walk
  if (currentState.balls === 3) {
    result.walk = ball;
    result.ball = 0;
  }

  // 2 strikes + strike = strikeout
  if (currentState.strikes === 2) {
    result.strikeout = strike;
    result.strike = 0;
  }

  return result;
}

// ============================================
// PITCH GENERATION
// ============================================

// Generate a pitch based on pitcher attributes and strategy
export function generatePitch(
  pitcher: Player,
  pitcherStats: Stats,
  defensiveStrategy: DefensiveAI,
  currentState: CountState,
  prng: DeterministicPRNG
): Pitch {
  // Select pitch type from strategy preference
  const pitchType = prng.pick(defensiveStrategy.pitchPreference) as Pitch['type'];
  
  // Generate velocity based on pitch type and pitcher armStrength stat
  let baseVelocity = 88 + (pitcherStats.armStrength / 100) * 15; // 88-103 mph range
  
  switch (pitchType) {
    case 'FASTBALL':
      baseVelocity += prng.nextFloat(-1, 3);
      break;
    case 'CURVEBALL':
      baseVelocity -= 12 + prng.nextFloat(-2, 2);
      break;
    case 'SLIDER':
      baseVelocity -= 5 + prng.nextFloat(-2, 2);
      break;
    case 'CHANGEUP':
      baseVelocity -= 8 + prng.nextFloat(-2, 2);
      break;
  }

  // Generate location based on pitcher armAccuracy
  const controlFactor = pitcherStats.armAccuracy / 100;
  const variance = 1 - controlFactor;
  
  // Target zone center with variance based on control
  const location: [number, number] = [
    prng.nextFloat(-0.3, 0.3) + prng.nextFloat(-variance, variance),
    prng.nextFloat(-0.3, 0.3) + prng.nextFloat(-variance, variance),
  ];

  return {
    velocity: Math.round(baseVelocity * 10) / 10,
    location,
    type: pitchType,
  };
}

// ============================================
// SWING DECISION
// ============================================

export function determineSwingDecision(
  batterStats: Stats,
  pitch: Pitch,
  currentState: CountState,
  prng: DeterministicPRNG
): 'TAKE' | 'SWING' {
  // Calculate probability of swinging based on:
  // 1. Plate discipline (lower = more selective)
  // 2. Pitch location (edge = harder to decide)
  // 3. Count (two strikes = protective)

  const distanceFromCenter = Math.sqrt(
    pitch.location[0] ** 2 + pitch.location[1] ** 2
  );

  // Base swing probability
  let swingProb = 0.45;

  // Plate discipline factor (50 discipline = neutral)
  const disciplineFactor = (50 - batterStats.eye) / 100;
  swingProb += disciplineFactor * 0.15;

  // Location factor (strikes more likely to be swung at)
  if (distanceFromCenter < 0.5) {
    // In zone: higher swing chance
    swingProb += 0.25;
  } else if (distanceFromCenter < 0.8) {
    // Edge: moderate swing chance
    swingProb += 0.05;
  } else {
    // Out of zone: lower swing chance
    swingProb -= 0.15;
  }

  // Two strike adjustment (protective)
  if (currentState.strikes === 2) {
    swingProb += 0.15; // swing at close pitches to avoid called strike 3
  }

  // 3-0 count adjustment (often take)
  if (currentState.balls === 3 && currentState.strikes === 0) {
    swingProb -= 0.2;
  }

  // Clamp probability
  swingProb = Math.max(0.1, Math.min(0.9, swingProb));

  return prng.nextBool(swingProb) ? 'SWING' : 'TAKE';
}

// ============================================
// BIP (BALL IN PLAY) RESOLUTION
// ============================================

export interface BIPResult {
  result: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN' | 'OUT' | 'FOUL';
  exitVelocity: number;
  launchAngle: number;
}

export interface TransitionProbabilities {
  ball: number;
  strike: number;
  inPlay: number;
  walk?: number;
  strikeout?: number;
}

export function resolveBallInPlay(
  batterStats: Stats,
  pitcherStats: Stats,
  pitch: Pitch,
  swingTiming: number, // 0 = perfect, positive = late, negative = early
  prng: DeterministicPRNG
): BIPResult {
  // Base exit velocity from power and pitch velocity
  const powerFactor = batterStats.power / 100;
  const pitchBonus = pitch.velocity * 0.2;
  let exitVelocity = 70 + powerFactor * 40 + pitchBonus + prng.nextFloat(-5, 5);

  // Timing adjustment
  const timingPenalty = Math.abs(swingTiming) * 20; // ms penalty
  exitVelocity -= timingPenalty * 0.1;

  // Launch angle from timing and power
  let launchAngle = prng.nextFloat(-10, 45);
  if (swingTiming > 0) {
    // Late = more likely uppercut (higher angle)
    launchAngle += prng.nextFloat(0, 15);
  } else {
    // Early = more likely ground ball (lower angle)
    launchAngle -= prng.nextFloat(0, 10);
  }

  // Determine outcome based on exit velocity and launch angle
  let result: BIPResult['result'];

  if (exitVelocity < 60) {
    // Weak contact
    result = prng.nextBool(0.7) ? 'OUT' : 'FOUL';
  } else if (launchAngle < 0) {
    // Ground ball
    const gbOutProb = 0.75 - (exitVelocity - 85) * 0.01;
    result = prng.nextBool(gbOutProb) ? 'OUT' : 'SINGLE';
  } else if (launchAngle < 25) {
    // Line drive
    const outProb = 0.3 - (exitVelocity - 90) * 0.005;
    if (prng.nextBool(outProb)) {
      result = 'OUT';
    } else if (exitVelocity > 100) {
      result = prng.nextBool(0.3) ? 'DOUBLE' : 'SINGLE';
    } else {
      result = 'SINGLE';
    }
  } else if (launchAngle < 40) {
    // Fly ball
    if (exitVelocity > 100 && prng.nextBool(0.15 + powerFactor * 0.15)) {
      result = 'HOMERUN';
    } else if (exitVelocity > 95 && prng.nextBool(0.25)) {
      result = 'TRIPLE';
    } else if (exitVelocity > 90 && prng.nextBool(0.35)) {
      result = 'DOUBLE';
    } else {
      result = prng.nextBool(0.85) ? 'OUT' : 'SINGLE';
    }
  } else {
    // Pop fly
    result = prng.nextBool(0.95) ? 'OUT' : 'FOUL';
  }

  return {
    result,
    exitVelocity: Math.round(exitVelocity * 10) / 10,
    launchAngle: Math.round(launchAngle * 10) / 10,
  };
}

// ============================================
// PLATE APPEARANCE SIMULATION
// ============================================

export function simulatePlateAppearance(
  batter: Player,
  batterStats: Stats,
  pitcher: Player,
  pitcherStats: Stats,
  defensiveStrategy: DefensiveAI,
  prng: DeterministicPRNG
): AtBatResult {
  let state: PlateAppearanceState = { balls: 0, strikes: 0 };
  const events: PlateAppearanceEvent[] = [];
  let sequenceId = 0;

  while (typeof state === 'object') {
    const pitch = generatePitch(pitcher, pitcherStats, defensiveStrategy, state, prng);
    const swingDecision = determineSwingDecision(batterStats, pitch, state, prng);
    
    let nextState: PlateAppearanceState;
    let actionData: ActionData = {};

    if (swingDecision === 'TAKE') {
      // Called ball or strike
      const distanceFromCenter = Math.sqrt(
        pitch.location[0] ** 2 + pitch.location[1] ** 2
      );
      
      // Strike zone roughly radius 0.5
      const isStrike = distanceFromCenter <= 0.55;
      
      if (isStrike) {
        actionData = { swingDecision: 'TAKE', result: 'STRIKE' };
        if (state.strikes === 2) {
          nextState = 'STRIKEOUT';
        } else {
          nextState = { balls: state.balls, strikes: (state.strikes + 1) as 1 | 2 };
        }
      } else {
        actionData = { swingDecision: 'TAKE', result: 'BALL' };
        if (state.balls === 3) {
          nextState = 'WALK';
        } else {
          nextState = { balls: (state.balls + 1) as 1 | 2 | 3, strikes: state.strikes };
        }
      }
    } else {
      // SWING - calculate timing
      const timingQuality = prng.nextFloat(-100, 100); // ms delta from perfect
      const isContact = Math.abs(timingQuality) < 50 + (batterStats.contact / 100) * 25;

      if (!isContact) {
        // Whiff
        actionData = { swingDecision: 'SWING', result: 'STRIKE' };
        if (state.strikes === 2) {
          nextState = 'STRIKEOUT';
        } else {
          nextState = { balls: state.balls, strikes: (state.strikes + 1) as 1 | 2 };
        }
      } else {
        // Ball in play
        const bip = resolveBallInPlay(batterStats, pitcherStats, pitch, timingQuality, prng);
        actionData = {
          swingDecision: 'SWING',
          result: bip.result,
          exitVelocity: bip.exitVelocity,
          launchAngle: bip.launchAngle,
        };
        nextState = 'IN_PLAY';
      }
    }

    const event: PlateAppearanceEvent = {
      sequence: sequenceId,
      timestamp: Date.now(),
      pitch,
      swingDecision,
      state: typeof state === 'object' ? state : { balls: 0, strikes: 0 },
      outcome: actionData.swingDecision,
      result: actionData.result,
      exitVelocity: actionData.exitVelocity,
      roll: prng.getSequence()[prng.getSequence().length - 1] || 0,
    };
    events.push(event);

    state = nextState;
    sequenceId++;
  }

  // Convert final state string to outcome object
  const lastBipEvent = events.find(e => e.result === 'SINGLE' || e.result === 'DOUBLE' || e.result === 'TRIPLE' || e.result === 'HOMERUN' || e.result === 'OUT' || e.result === 'FOUL');
  const finalOutcome: PlateAppearanceOutcome =
    state === 'WALK' ? { type: 'WALK' } :
    state === 'STRIKEOUT' ? { type: 'STRIKEOUT' } :
    state === 'IN_PLAY' ? { type: 'IN_PLAY', result: lastBipEvent?.result as PlateAppearanceOutcome['result'] } :
    { type: 'IN_PLAY' };

  return {
    finalState: finalOutcome,
    events,
    sequence: 0,
    inning: 1,
    isTop: true,
    batterId: '',
    pitcherId: '',
    prngState: 0,
  };
}

// ============================================
// MATCH SIMULATION
// ============================================

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  innings: InningResult[];
  events: MatchHistoryEvent[];
}

export interface InningResult {
  inning: number;
  topScore: number;
  bottomScore: number;
}

export function simulateMatch(
  homeLineup: Player[],
  awayLineup: Player[],
  homePitcher: Player,
  awayPitcher: Player,
  homeDefense: DefensiveAI,
  awayDefense: DefensiveAI,
  prng: DeterministicPRNG
): MatchResult {
  const innings: InningResult[] = [];
  const events: MatchHistoryEvent[] = [];
  let homeScore = 0;
  let awayScore = 0;

  // Simulate 9 innings (or more if tied)
  for (let inning = 1; inning <= 9 || homeScore === awayScore; inning++) {
    const inningResult: InningResult = { inning, topScore: 0, bottomScore: 0 };

    // Top of inning (away batting)
    let awayBatterIndex = 0;
    let outs = 0;
    let runners: (number | null)[] = [null, null, null]; // 1st, 2nd, 3rd

    while (outs < 3) {
      const batter = awayLineup[awayBatterIndex % 9];
      const result = simulatePlateAppearance(
        batter,
        batter.baseStats as Stats,
        homePitcher,
        homePitcher.baseStats as Stats,
        homeDefense,
        prng
      );

      // Process result
      if (result.finalState.type === 'WALK') {
        // Advance runners
        if (runners[0] !== null && runners[1] !== null && runners[2] !== null) {
          awayScore++;
        }
        runners = [awayBatterIndex, ...runners.slice(0, 2)] as (number | null)[];
      } else if (result.finalState.type === 'IN_PLAY') {
        const bipResult = result.events[result.events.length - 1];
        // Simplified base running - just count as an out for now
        outs++;
      } else if (result.finalState.type === 'STRIKEOUT') {
        outs++;
      }

      awayBatterIndex++;
    }

    inningResult.topScore = awayScore - (innings.reduce((a, i) => a + i.topScore, 0));

    // Bottom of inning (home batting) - only if not bottom 9 with lead
    if (inning < 9 || awayScore >= homeScore) {
      // Similar logic for home team...
    }

    innings.push(inningResult);
  }

  return {
    homeScore,
    awayScore,
    innings,
    events,
  };
}
