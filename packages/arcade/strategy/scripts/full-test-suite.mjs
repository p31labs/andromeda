#!/usr/bin/env node
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log('\n' + '='.repeat(70));
console.log('P31 GRIDIRON: FULL AUTOMATED TEST SUITE');
console.log('='.repeat(70));

const results = { passed: 0, failed: 0, tests: [] };

function test(name, category) {
  return {
    run: async (fn) => {
      const start = Date.now();
      try {
        await fn();
        const duration = Date.now() - start;
        console.log(`${GREEN}✓${RESET} [${category}] ${name} (${duration}ms)`);
        results.passed++;
        results.tests.push({ name, category, status: 'pass', duration });
      } catch (error) {
        const duration = Date.now() - start;
        console.log(`${RED}✗${RESET} [${category}] ${name} (${duration}ms)`);
        console.log(`  ${RED}${error.message.substring(0, 200)}${RESET}`);
        results.failed++;
        results.tests.push({ name, category, status: 'fail', duration, error: error.message });
      }
    }
  };
}

// PHASE 1: Structure
console.log('\n' + BLUE + '[PHASE 1] PROJECT STRUCTURE' + RESET);

await test('Core files exist', 'structure').run(async () => {
  const files = ['package.json', 'src/App.tsx', 'src/engine/gridiron.ts', 'src/db/schema.ts'];
  for (const f of files) {
    if (!fs.existsSync(join(rootDir, f))) throw new Error(`Missing: ${f}`);
  }
});

await test('Tests exist', 'structure').run(async () => {
  const tests = ['tests/prng/validate-determinism.mjs', 'tests/sim/validate-gridiron.mjs'];
  for (const t of tests) {
    if (!fs.existsSync(join(rootDir, t))) throw new Error(`Missing: ${t}`);
  }
});

// PHASE 2: Schema
console.log('\n' + BLUE + '[PHASE 2] DATABASE SCHEMA' + RESET);

await test('Football tables defined', 'schema').run(async () => {
  const schema = fs.readFileSync(join(rootDir, 'src/db/schema.ts'), 'utf-8');
  const tables = ['franchises', 'players', 'matches', 'drives', 'play_history'];
  for (const t of tables) {
    if (!schema.includes(t)) throw new Error(`Missing: ${t}`);
  }
});

await test('Positions defined', 'schema').run(async () => {
  const schema = fs.readFileSync(join(rootDir, 'src/db/schema.ts'), 'utf-8');
  if (!schema.includes("'QB'")) throw new Error('Missing QB position');
});

// PHASE 3: Engine
console.log('\n' + BLUE + '[PHASE 3] SIMULATION ENGINE' + RESET);

await test('Playbook exists', 'engine').run(async () => {
  const engine = fs.readFileSync(join(rootDir, 'src/engine/gridiron.ts'), 'utf-8');
  if (!engine.includes('PLAYBOOK')) throw new Error('Missing PLAYBOOK');
});

await test('Transition matrix', 'engine').run(async () => {
  const engine = fs.readFileSync(join(rootDir, 'src/engine/gridiron.ts'), 'utf-8');
  if (!engine.includes('TRANSITION_MATRIX')) throw new Error('Missing matrix');
});

await test('Drive simulation', 'engine').run(async () => {
  const engine = fs.readFileSync(join(rootDir, 'src/engine/gridiron.ts'), 'utf-8');
  if (!engine.includes('simulateDrive')) throw new Error('Missing simulateDrive');
});

// PHASE 4: PRNG
console.log('\n' + BLUE + '[PHASE 4] PRNG VALIDATION' + RESET);

await test('PRNG test runs', 'prng').run(async () => {
  execSync('node tests/prng/validate-determinism.mjs', { cwd: rootDir, stdio: 'pipe' });
});

// PHASE 5: Sim
console.log('\n' + BLUE + '[PHASE 5] SIMULATION TESTS' + RESET);

await test('Sim test runs', 'sim').run(async () => {
  execSync('node tests/sim/validate-gridiron.mjs', { cwd: rootDir, stdio: 'pipe' });
});

// PHASE 6: UI
console.log('\n' + BLUE + '[PHASE 6] UI COMPONENTS' + RESET);

await test('Play caller UI', 'ui').run(async () => {
  const ui = fs.readFileSync(join(rootDir, 'src/components/SpoonShell.tsx'), 'utf-8');
  if (!ui.includes('PlayCaller')) throw new Error('Missing PlayCaller');
});

await test('Field renderer', 'ui').run(async () => {
  const ui = fs.readFileSync(join(rootDir, 'src/components/Gridiron.tsx'), 'utf-8');
  if (!ui.includes('FieldSurface')) throw new Error('Missing FieldSurface');
});

// SUMMARY
console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`Total: ${results.passed + results.failed} | ${GREEN}Passed: ${results.passed}${RESET} | ${RED}Failed: ${results.failed}${RESET}`);
console.log(`Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

if (results.failed === 0) {
  console.log('\n' + GREEN + '✓ ALL TESTS PASSED - Gridiron ready' + RESET);
}

console.log('='.repeat(70));
process.exit(results.failed > 0 ? 1 : 0);
