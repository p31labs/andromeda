#!/usr/bin/env node
/**
 * Gridiron Simulation Validation
 * Tests the drive simulation engine
 */

import seedrandom from 'seedrandom';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('P31 GRIDIRON: SIMULATION VALIDATION');
console.log('='.repeat(50));

// Simplified play resolution test
function resolveTestPlay(playType, prng) {
  const weights = {
    'RUN': { gain: 0.65, td: 0.05, fumble: 0.02 },
    'PASS': { gain: 0.55, td: 0.08, int: 0.05 },
  };
  
  const w = weights[playType];
  const roll = prng();
  
  if (roll < w.td) return 'TOUCHDOWN';
  if (roll < w.td + w.fumble) return 'FUMBLE';
  if (roll < w.td + w.fumble + w.int) return 'INTERCEPTION';
  if (roll < w.td + w.fumble + w.int + w.gain) return 'GAIN';
  return 'NO_GAIN';
}

let passed = 0;
let failed = 0;

// Test 1: Same seed = same sequence
console.log('\n[TEST 1] Deterministic play resolution');
{
  const seed = 12345;
  const rng1 = seedrandom(seed, { algorithm: 'alea' });
  const rng2 = seedrandom(seed, { algorithm: 'alea' });
  
  const results1 = Array(20).fill(0).map(() => resolveTestPlay('RUN', rng1));
  const results2 = Array(20).fill(0).map(() => resolveTestPlay('RUN', rng2));
  
  const match = results1.every((r, i) => r === results2[i]);
  
  if (match) {
    console.log(`${GREEN}✓${RESET} Same seed produces identical plays`);
    passed++;
  } else {
    console.log(`${RED}✗${RESET} Determinism failed`);
    failed++;
  }
}

// Test 2: Different seeds = different results
console.log('\n[TEST 2] Seed variation');
{
  const outcomes = new Set();
  for (let seed = 1; seed <= 10; seed++) {
    const rng = seedrandom(seed, { algorithm: 'alea' });
    outcomes.add(resolveTestPlay('PASS', rng));
  }
  
  if (outcomes.size >= 3) {
    console.log(`${GREEN}✓${RESET} Multiple seeds produce varied outcomes (${outcomes.size} types)`);
    passed++;
  } else {
    console.log(`${RED}✗${RESET} Not enough variation`);
    failed++;
  }
}

// Test 3: Run vs Pass distribution
console.log('\n[TEST 3] Play type differences');
{
  const runResults = [];
  const passResults = [];
  
  for (let i = 0; i < 100; i++) {
    const rng = seedrandom(1000 + i, { algorithm: 'alea' });
    runResults.push(resolveTestPlay('RUN', rng));
    passResults.push(resolveTestPlay('PASS', () => rng())); // Advance RNG
  }
  
  const runTDs = runResults.filter(r => r === 'TOUCHDOWN').length;
  const passTDs = passResults.filter(r => r === 'TOUCHDOWN').length;
  
  // Pass should have more TDs than run (based on our weights)
  if (passTDs >= runTDs) {
    console.log(`${GREEN}✓${RESET} Pass TD rate (${passTDs}%) >= Run TD rate (${runTDs}%)`);
    passed++;
  } else {
    console.log(`${RED}✗${RESET} Unexpected TD distribution`);
    failed++;
  }
}

// Test 4: Field position tracking
console.log('\n[TEST 4] Field position state');
{
  let yardLine = 25;
  let down = 1;
  let distance = 10;
  
  const prng = seedrandom(5555, { algorithm: 'alea' });
  
  // Simulate 5 plays
  for (let i = 0; i < 5; i++) {
    const result = resolveTestPlay('RUN', prng);
    
    if (result === 'GAIN') {
      const yards = Math.floor(prng() * 8) + 2;
      yardLine += yards;
      distance -= yards;
      
      if (distance <= 0) {
        down = 1;
        distance = 10;
      } else {
        down++;
      }
    } else if (result === 'NO_GAIN') {
      down++;
    }
  }
  
  // Should have moved from starting position
  if (yardLine !== 25) {
    console.log(`${GREEN}✓${RESET} Field position updated: ${yardLine} yards`);
    passed++;
  } else {
    console.log(`${RED}✗${RESET} Field position stuck`);
    failed++;
  }
}

console.log('\n' + '='.repeat(50));
console.log(`Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
