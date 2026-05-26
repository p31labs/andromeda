#!/usr/bin/env node
/**
 * Master Validation Script
 * Runs all Phase 0 validation gates
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log('\n' + '='.repeat(70));
console.log('P31 SMALLBALL: PHASE 0 VALIDATION SUITE');
console.log('='.repeat(70));
console.log('Running all critical validation gates...\n');

const validations = [
  {
    name: 'PRNG Determinism',
    script: 'tests/prng/validate-determinism.mjs',
    critical: true,
    description: 'Cross-platform seed consistency',
  },
  {
    name: 'PGLite Database',
    script: 'tests/db/validate-pglite.mjs',
    critical: true,
    description: 'Event sourcing + live queries',
  },
  {
    name: 'Markov Simulation',
    script: 'tests/markov-sim.mjs',
    critical: true,
    description: 'Plate appearance engine',
  },
];

let passed = 0;
let failed = 0;
let criticalFailed = false;

for (const validation of validations) {
  console.log(`${BLUE}[${validation.name}]${RESET} ${validation.description}`);
  
  try {
    const result = execSync(
      `node ${validation.script}`,
      { 
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    
    console.log(result);
    console.log(`${GREEN}✓ ${validation.name} passed${RESET}\n`);
    passed++;
  } catch (error) {
    console.log(error.stdout || error.message);
    console.log(`${RED}✗ ${validation.name} failed${RESET}\n`);
    failed++;
    
    if (validation.critical) {
      criticalFailed = true;
    }
  }
}

// Summary
console.log('='.repeat(70));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(70));
console.log(`Total: ${validations.length} | ${GREEN}Passed: ${passed}${RESET} | ${RED}Failed: ${failed}${RESET}`);

if (criticalFailed) {
  console.log(`\n${RED}✗ CRITICAL VALIDATIONS FAILED${RESET}`);
  console.log('  Do not proceed with full implementation');
  console.log('  Fix issues above before continuing\n');
  process.exit(1);
} else if (failed > 0) {
  console.log(`\n${YELLOW}⚠ Some non-critical validations failed${RESET}`);
  console.log('  Review warnings but can proceed\n');
  process.exit(0);
} else {
  console.log(`\n${GREEN}✓ ALL VALIDATIONS PASSED${RESET}`);
  console.log('  Phase 0 gates cleared');
  console.log('  Ready for full implementation\n');
  process.exit(0);
}
