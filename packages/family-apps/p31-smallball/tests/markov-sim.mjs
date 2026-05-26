#!/usr/bin/env node
/**
 * Markov Simulation Engine Validation
 * 
 * Tests the deterministic plate appearance simulation.
 * Usage: node tests/markov-sim.mjs
 */

import seedrandom from 'seedrandom';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('='.repeat(70));
console.log('P31 SMALLBALL: MARKOV SIMULATION VALIDATION');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  ${RED}${error.message}${RESET}`);
    failed++;
  }
}

// Deterministic PRNG wrapper
class DeterministicPRNG {
  constructor(seed) {
    this.rng = seedrandom(seed.toString(), { algorithm: 'alea' });
    this.sequence = [];
  }

  next() {
    const value = this.rng();
    this.sequence.push(value);
    return value;
  }

  nextBool(probability = 0.5) {
    return this.next() < probability;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

// Simple batter/pitcher stats
const createStats = (overrides = {}) => ({
  contact: 50,
  power: 50,
  plateDiscipline: 50,
  speed: 50,
  velocity: 50,
  control: 50,
  movement: 50,
  fielding: 50,
  armStrength: 50,
  ...overrides,
});

// Pitch generation
function generatePitch(pitcherStats, prng) {
  const types = ['FASTBALL', 'CURVEBALL', 'SLIDER', 'CHANGEUP'];
  const type = types[prng.nextInt(0, types.length)];
  
  let velocity = 88 + (pitcherStats.velocity / 100) * 15;
  
  switch (type) {
    case 'FASTBALL': velocity += prng.nextFloat(-1, 3); break;
    case 'CURVEBALL': velocity -= 12 + prng.nextFloat(-2, 2); break;
    case 'SLIDER': velocity -= 5 + prng.nextFloat(-2, 2); break;
    case 'CHANGEUP': velocity -= 8 + prng.nextFloat(-2, 2); break;
  }
  
  const controlFactor = pitcherStats.control / 100;
  const variance = 1 - controlFactor;
  
  return {
    velocity: Math.round(velocity * 10) / 10,
    location: [
      prng.nextFloat(-0.3, 0.3) + prng.nextFloat(-variance, variance),
      prng.nextFloat(-0.3, 0.3) + prng.nextFloat(-variance, variance),
    ],
    type,
  };
}

// Swing decision
function determineSwing(batterStats, pitch, state, prng) {
  const distanceFromCenter = Math.sqrt(
    pitch.location[0] ** 2 + pitch.location[1] ** 2
  );
  
  let swingProb = 0.45;
  const disciplineFactor = (50 - batterStats.plateDiscipline) / 100;
  swingProb += disciplineFactor * 0.15;
  
  if (distanceFromCenter < 0.5) swingProb += 0.25;
  else if (distanceFromCenter < 0.8) swingProb += 0.05;
  else swingProb -= 0.15;
  
  if (state.strikes === 2) swingProb += 0.15;
  
  swingProb = Math.max(0.1, Math.min(0.9, swingProb));
  
  return prng.nextBool(swingProb) ? 'SWING' : 'TAKE';
}

// Add nextFloat method to PRNG class
DeterministicPRNG.prototype.nextFloat = function(min, max) {
  return this.next() * (max - min) + min;
};

// Plate appearance simulation
function simulatePlateAppearance(batterStats, pitcherStats, prng) {
  let state = { balls: 0, strikes: 0 };
  const events = [];
  
  while (state.balls < 4 && state.strikes < 3) {
    const pitch = generatePitch(pitcherStats, prng);
    const swingDecision = determineSwing(batterStats, pitch, state, prng);
    
    // Record the event with current state (before resolution)
    const event = { 
      stateBefore: { ...state }, 
      pitch, 
      swingDecision,
      stateAfter: null,
    };
    
    if (swingDecision === 'TAKE') {
      const distanceFromCenter = Math.sqrt(
        pitch.location[0] ** 2 + pitch.location[1] ** 2
      );
      const isStrike = distanceFromCenter <= 0.55;
      
      if (isStrike) {
        state = { ...state, strikes: state.strikes + 1 };
      } else {
        state = { ...state, balls: state.balls + 1 };
      }
    } else {
      // Swinging - simplified contact logic
      const timingQuality = prng.next() * 200 - 100;
      const contactThreshold = 50 + (batterStats.contact / 100) * 25;
      const isContact = Math.abs(timingQuality) < contactThreshold;
      
      if (!isContact) {
        // Whiff
        state = { ...state, strikes: state.strikes + 1 };
      } else {
        // Ball in play - end at-bat
        event.stateAfter = { ...state, inPlay: true };
        events.push(event);
        return { result: 'IN_PLAY', events, pitches: events.length };
      }
    }
    
    event.stateAfter = { ...state };
    events.push(event);
  }
  
  // Terminal states
  if (state.balls === 4) return { result: 'WALK', events, pitches: events.length };
  if (state.strikes === 3) return { result: 'STRIKEOUT', events, pitches: events.length };
  
  return { result: 'UNKNOWN', events, pitches: events.length };
}

// Tests
console.log('\n[TEST 1] Deterministic simulation with same seed');
{
  const seed = 1526690334;
  const batter = createStats({ contact: 70, power: 60 });
  const pitcher = createStats({ velocity: 80, control: 65 });
  
  const prng1 = new DeterministicPRNG(seed);
  const prng2 = new DeterministicPRNG(seed);
  
  const result1 = simulatePlateAppearance(batter, pitcher, prng1);
  const result2 = simulatePlateAppearance(batter, pitcher, prng2);
  
  test('Same seed produces same result', () => {
    if (result1.result !== result2.result) {
      throw new Error(`Results differ: ${result1.result} vs ${result2.result}`);
    }
    if (result1.pitches !== result2.pitches) {
      throw new Error(`Pitch counts differ: ${result1.pitches} vs ${result2.pitches}`);
    }
  });
}

console.log('\n[TEST 2] Different seeds produce different results');
{
  const batter = createStats();
  const pitcher = createStats();
  
  const results = new Set();
  for (let seed = 1; seed <= 10; seed++) {
    const prng = new DeterministicPRNG(seed);
    const result = simulatePlateAppearance(batter, pitcher, prng);
    results.add(`${result.result}-${result.pitches}`);
  }
  
  test('Multiple seeds produce varied outcomes', () => {
    if (results.size < 3) {
      throw new Error(`Only ${results.size} unique outcomes from 10 seeds`);
    }
  });
}

console.log('\n[TEST 3] Plate discipline affects walk rate');
{
  const seed = 123456789;
  const pitcher = createStats({ control: 50 });
  
  // Low discipline batter
  const lowDisciplineBatter = createStats({ plateDiscipline: 30 });
  const prng1 = new DeterministicPRNG(seed);
  
  // High discipline batter
  const highDisciplineBatter = createStats({ plateDiscipline: 80 });
  const prng2 = new DeterministicPRNG(seed);
  
  let lowDisciplineWalks = 0;
  let highDisciplineWalks = 0;
  const trials = 100;
  
  for (let i = 0; i < trials; i++) {
    const p1 = new DeterministicPRNG(seed + i);
    const p2 = new DeterministicPRNG(seed + i);
    
    const r1 = simulatePlateAppearance(lowDisciplineBatter, pitcher, p1);
    const r2 = simulatePlateAppearance(highDisciplineBatter, pitcher, p2);
    
    if (r1.result === 'WALK') lowDisciplineWalks++;
    if (r2.result === 'WALK') highDisciplineWalks++;
  }
  
  test('High discipline increases walk rate', () => {
    if (highDisciplineWalks <= lowDisciplineWalks) {
      throw new Error(
        `Walks: low=${lowDisciplineWalks}, high=${highDisciplineWalks}. ` +
        `High discipline should produce more walks.`
      );
    }
  });
}

console.log('\n[TEST 4] Contact rating affects strikeout rate');
{
  const seed = 987654321;
  const pitcher = createStats({ velocity: 90, control: 60 });
  
  const lowContactBatter = createStats({ contact: 30 });
  const highContactBatter = createStats({ contact: 90 });
  
  let lowContactK = 0;
  let highContactK = 0;
  const trials = 100;
  
  for (let i = 0; i < trials; i++) {
    const p1 = new DeterministicPRNG(seed + i);
    const p2 = new DeterministicPRNG(seed + i);
    
    const r1 = simulatePlateAppearance(lowContactBatter, pitcher, p1);
    const r2 = simulatePlateAppearance(highContactBatter, pitcher, p2);
    
    if (r1.result === 'STRIKEOUT') lowContactK++;
    if (r2.result === 'STRIKEOUT') highContactK++;
  }
  
  test('Low contact increases strikeout rate', () => {
    if (lowContactK <= highContactK) {
      throw new Error(
        `Strikeouts: low=${lowContactK}, high=${highContactK}. ` +
        `Low contact should produce more strikeouts.`
      );
    }
  });
}

console.log('\n[TEST 5] Pitch count distribution sanity');
{
  const batter = createStats();
  const pitcher = createStats();
  const seed = 555555555;
  
  const pitchCounts = [];
  const trials = 200;
  
  for (let i = 0; i < trials; i++) {
    const prng = new DeterministicPRNG(seed + i);
    const result = simulatePlateAppearance(batter, pitcher, prng);
    pitchCounts.push(result.pitches);
  }
  
  const avgPitches = pitchCounts.reduce((a, b) => a + b, 0) / trials;
  const maxPitches = Math.max(...pitchCounts);
  
  test('Average pitch count in realistic range', () => {
    if (avgPitches < 2 || avgPitches > 8) {
      throw new Error(`Average ${avgPitches} pitches is unrealistic`);
    }
  });
  
  test('No infinite at-bats (max < 20)', () => {
    if (maxPitches >= 20) {
      throw new Error(`Max pitches ${maxPitches} suggests infinite loop bug`);
    }
  });
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`Total tests: ${passed + failed}`);
console.log(`${GREEN}Passed: ${passed}${RESET}`);
console.log(`${failed > 0 ? RED : GREEN}Failed: ${failed}${RESET}`);

if (failed === 0) {
  console.log(`\n${GREEN}✓ Markov simulation validation complete${RESET}`);
  console.log('  Deterministic plate appearance simulation ready');
  process.exit(0);
} else {
  console.log(`\n${RED}✗ Some tests failed${RESET}`);
  process.exit(1);
}
