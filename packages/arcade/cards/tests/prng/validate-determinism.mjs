#!/usr/bin/env node
// Same as Smallball - PRNG validation

import seedrandom from 'seedrandom';

const TEST_SEEDS = [1526690334, 123456789, 987654321, 0, 1, 999999999];
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('P31 GRIDIRON: PRNG DETERMINISM VALIDATION');
console.log('=' .repeat(50));

let passed = 0;
let failed = 0;

for (const seed of TEST_SEEDS) {
  const rng1 = seedrandom(seed.toString(), { algorithm: 'alea' });
  const rng2 = seedrandom(seed.toString(), { algorithm: 'alea' });
  
  const seq1 = Array(10).fill(0).map(() => rng1());
  const seq2 = Array(10).fill(0).map(() => rng2());
  
  const match = seq1.every((v, i) => Math.abs(v - seq2[i]) < 1e-15);
  
  if (match) {
    console.log(`${GREEN}✓${RESET} Seed ${seed}: Consistent`);
    passed++;
  } else {
    console.log(`${RED}✗${RESET} Seed ${seed}: FAILED`);
    failed++;
  }
}

console.log(`\nPassed: ${passed}/${TEST_SEEDS.length}`);
process.exit(failed > 0 ? 1 : 0);
