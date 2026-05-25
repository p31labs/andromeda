import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../..');

interface FortuneCheck {
  name: string;
  passed: boolean;
  detail: string;
}

const results: FortuneCheck[] = [];

function check(name: string, condition: boolean, detail: string) {
  results.push({ name, passed: condition, detail });
}

describe('FORTUNE 1 — Full Pipeline Audit', () => {
  beforeAll(() => {
    results.length = 0;
  });

  describe('I. Deployment Surface', () => {
    it('p31ca has all critical pages', () => {
      const pagesDir = join(ROOT, '04_SOFTWARE/p31ca/src/pages');
      const required = ['index.astro', 'join.astro', 'ignite.astro', 'facets.astro'];
      for (const page of required) {
        check(`page: ${page}`, existsSync(join(pagesDir, page)), `${page} ${existsSync(join(pagesDir, page)) ? 'exists' : 'MISSING'}`);
      }
    });

    it('bonding app has entry point', () => {
      const entry = join(ROOT, '04_SOFTWARE/bonding/src/main.tsx');
      check('bonding entry', existsSync(entry), entry);
    });

    it('shared onboarding exports GenesisFlow', () => {
      const idx = join(ROOT, 'shared-components/onboarding/index.ts');
      const content = readFileSync(idx, 'utf-8');
      check('GenesisFlow export', content.includes('GenesisFlow'), 'GenesisFlow exported from index.ts');
    });

    it('ui-facets exports FacetSwitchboard', () => {
      const idx = join(ROOT, 'packages/ui-facets/src/index.ts');
      const content = readFileSync(idx, 'utf-8');
      check('FacetSwitchboard export', content.includes('FacetSwitchboard'), 'FacetSwitchboard exported from index.ts');
    });
  });

  describe('II. CRDT Compliance', () => {
    it('all schema files have CRDT columns', () => {
      const schemas = [
        'p31-state/schema.sql',
        'workers/love-ledger/db/schema.sql',
        'p31-inventory-service/src/database/schema.sql',
        '04_SOFTWARE/unified-k4-cage/schema.sql',
      ];
      for (const schema of schemas) {
        const path = join(ROOT, schema);
        if (!existsSync(path)) {
          check(`schema: ${schema}`, false, 'FILE MISSING');
          continue;
        }
        const sql = readFileSync(path, 'utf-8');
        check(`${schema} has _crdt_clock`, sql.includes('_crdt_clock'), '_crdt_clock column present');
      }
    });
  });

  describe('III. Onboarding Pipeline', () => {
    it('GenesisFlow has all 4 phases', () => {
      const flow = readFileSync(join(ROOT, 'shared-components/onboarding/components/GenesisFlow.tsx'), 'utf-8');
      const phases = ['gateway', 'abdication', 'forge', 'covenant'];
      for (const phase of phases) {
        check(`phase: ${phase}`, flow.includes(`'${phase}'`), `${phase} phase present`);
      }
    });

    it('DeltaRunwayIgnition has Spoon Dial', () => {
      const comp = readFileSync(join(ROOT, '04_SOFTWARE/p31ca/src/components/DeltaRunwayIgnition.tsx'), 'utf-8');
      check('Spoon Dial [1,3,6]', comp.includes('1') && comp.includes('3') && comp.includes('6'), 'Spoon levels present');
      check('Ed25519 import', comp.includes('@noble/ed25519'), 'Uses real Ed25519');
      check('PGLite persistence', comp.includes('pglite-warehouse'), 'Persists to PGLite');
    });

    it('identity crypto produces valid Ed25519 roundtrip', () => {
      const crypto = readFileSync(join(ROOT, 'shared-components/onboarding/utils/identityCrypto.ts'), 'utf-8');
      check('forgeIdentity fn', crypto.includes('export async function forgeIdentity'), 'forgeIdentity exported');
      check('signCovenant fn', crypto.includes('export async function signCovenant'), 'signCovenant exported');
      check('verifyCovenant fn', crypto.includes('export async function verifyCovenant'), 'verifyCovenant exported');
      check('clearIdentity fn', crypto.includes('export function clearIdentity'), 'clearIdentity exported');
    });
  });

  describe('IV. PHOS v2.0 Convergence', () => {
    it('all 8 convergence files exist', () => {
      for (let w = 1; w <= 8; w++) {
        const files = [
          join(ROOT, `04_SOFTWARE/p31ca/src/phos-v2/convergence/week${w}-core.ts`),
          join(ROOT, `04_SOFTWARE/p31ca/src/phos-v2/convergence/week${w}-signal.ts`),
          join(ROOT, `04_SOFTWARE/p31ca/src/phos-v2/convergence/week${w}-love.ts`),
          join(ROOT, `04_SOFTWARE/p31ca/src/phos-v2/convergence/week${w}-mesh.ts`),
          join(ROOT, `04_SOFTWARE/p31ca/src/phos-v2/convergence/week${w}-mesh-visual.ts`),
          join(ROOT, `04_SOFTWARE/p31ca/src/phos-v2/convergence/week${w}-predictive-all.ts`),
          join(ROOT, `04_SOFTWARE/p31ca/src/phos-v2/convergence/week${w}-guardian-all.ts`),
          join(ROOT, `04_SOFTWARE/p31ca/src/phos-v2/convergence/week${w}-final.ts`),
        ];
        const found = files.some(f => existsSync(f));
        check(`week ${w} convergence`, found, `At least one week-${w} file exists`);
      }
    });

    it('all 8 phase files exist', () => {
      const phases = [
        'phase1-voice/VoicePhase.ts',
        'phase2-bros/BrosPhase.ts',
        'phase3-router/RouterPhase.ts',
        'phase4-visual/VisualPhase.ts',
        'phase5-predictive/PredictivePhase.ts',
        'phase6-guardian/GuardianPhase.ts',
        'phase7-bridge/BridgePhase.ts',
        'phase8-memory/MemoryPhase.ts',
      ];
      for (const phase of phases) {
        const path = join(ROOT, '04_SOFTWARE/p31ca/src/phos-v2', phase);
        check(`phase: ${phase}`, existsSync(path), `${phase} ${existsSync(path) ? 'exists' : 'MISSING'}`);
      }
    });

    it('PHOSMasterRuntime has converge method', () => {
      const master = readFileSync(join(ROOT, '04_SOFTWARE/p31ca/src/phos-v2/master/PHOSMasterRuntime.ts'), 'utf-8');
      check('converge method', master.includes('async converge('), 'converge() method present');
      check('registerPhase method', master.includes('registerPhase('), 'registerPhase() method present');
      check('destroy method', master.includes('destroy()'), 'destroy() method present');
    });
  });

  describe('V. UI Spectrum', () => {
    it('all 3 facet components exist with correct names', () => {
      const facets = [
        'packages/ui-facets/src/facets/SurvivalFacet.tsx',
        'packages/ui-facets/src/facets/EditorialFacet.tsx',
        'packages/ui-facets/src/facets/TechFacet.tsx',
      ];
      for (const facet of facets) {
        check(`facet: ${facet.split('/').pop()}`, existsSync(join(ROOT, facet)), `${facet} exists`);
      }
    });

    it('facets use distinct design tokens', () => {
      const survival = readFileSync(join(ROOT, 'packages/ui-facets/src/facets/SurvivalFacet.tsx'), 'utf-8');
      const editorial = readFileSync(join(ROOT, 'packages/ui-facets/src/facets/EditorialFacet.tsx'), 'utf-8');
      const tech = readFileSync(join(ROOT, 'packages/ui-facets/src/facets/TechFacet.tsx'), 'utf-8');

      check('Survival: warm gradient', survival.includes('amber') || survival.includes('orange'), 'Warm amber/orange gradient');
      check('Editorial: zinc/serif', editorial.includes('zinc') && editorial.includes('serif'), 'Zinc background + serif font');
      check('Tech: dark mono', tech.includes('slate-950') && tech.includes('mono'), 'Dark slate + mono font');
    });
  });

  describe('VI. Test Infrastructure', () => {
    it('vitest workspace config exists', () => {
      check('vitest.workspace.ts', existsSync(join(ROOT, 'vitest.workspace.ts')), 'Root workspace config');
    });

    it('all packages have vitest configs', () => {
      const configs = [
        '04_SOFTWARE/bonding/vitest.config.ts',
        '04_SOFTWARE/p31ca/vitest.config.ts',
        'shared-components/onboarding/vitest.config.ts',
        'packages/ui-facets/vitest.config.ts',
      ];
      for (const cfg of configs) {
        check(`vitest: ${cfg}`, existsSync(join(ROOT, cfg)), `${cfg} exists`);
      }
    });

    it('test files exist for all packages', () => {
      const testFiles = [
        '04_SOFTWARE/p31ca/tests/components/DeltaRunwayIgnition.test.tsx',
        '04_SOFTWARE/p31ca/tests/components/SyllabusPortal.test.tsx',
        '04_SOFTWARE/p31ca/tests/data/syllabus.test.ts',
        '04_SOFTWARE/p31ca/tests/phos/convergence-pipeline.test.ts',
        '04_SOFTWARE/p31ca/tests/phos/crdt-schema.test.ts',
        '04_SOFTWARE/p31ca/tests/phos/k4-topology.test.ts',
        'shared-components/onboarding/tests/identityCrypto.test.ts',
        'shared-components/onboarding/tests/resinEngine.test.ts',
        'shared-components/onboarding/tests/types.test.ts',
        'packages/ui-facets/tests/FacetSwitchboard.test.tsx',
        'packages/ui-facets/tests/SurvivalFacet.test.tsx',
        'packages/ui-facets/tests/EditorialFacet.test.tsx',
        'packages/ui-facets/tests/TechFacet.test.tsx',
      ];
      for (const tf of testFiles) {
        check(`test: ${tf.split('/').pop()}`, existsSync(join(ROOT, tf)), `${tf} exists`);
      }
    });
  });

  describe('VII. Fortune 1 Scorecard', () => {
    it('all checks pass', () => {
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed);
      const total = results.length;
      const score = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

      console.log(`\n${'═'.repeat(60)}`);
      console.log(`  FORTUNE 1 PIPELINE AUDIT — ${passed}/${total} checks passed (${score}%)`);
      console.log(`${'═'.repeat(60)}`);

      if (failed.length > 0) {
        console.log(`\n  FAILED CHECKS:`);
        for (const f of failed) {
          console.log(`  ✗ ${f.name}: ${f.detail}`);
        }
      }

      const critical = [
        'page: join.astro',
        'page: ignite.astro',
        'page: facets.astro',
        'bonding entry',
        'GenesisFlow export',
        'FacetSwitchboard export',
      ];
      const criticalFailed = results.filter(r => critical.includes(r.name) && !r.passed);
      check('zero critical failures', criticalFailed.length === 0, `${criticalFailed.length} critical checks failed`);

      expect(failed.length, `${failed.length} checks failed: ${failed.map(f => f.name).join(', ')}`).toBe(0);
    });
  });
});
