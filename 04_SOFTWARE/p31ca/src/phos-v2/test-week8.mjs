/**
 * Week 8 Convergence Test
 * Verifies final GA readiness of all 8 phases
 */

import { getPHOSMaster, PHOS_DEV_CONFIG } from './master/index.ts';
import { runWeek8Convergence } from './convergence/week8-final.ts';
import { VoicePhase } from './phase1-voice/VoicePhase.ts';
import { BrosPhase } from './phase2-bros/BrosPhase.ts';
import { RouterPhase } from './phase3-router/RouterPhase.ts';
import { VisualPhase } from './phase4-visual/VisualPhase.ts';
import { PredictivePhase } from './phase5-predictive/PredictivePhase.ts';
import { GuardianPhase } from './phase6-guardian/GuardianPhase.ts';
import { BridgePhase } from './phase7-bridge/BridgePhase.ts';
import { MemoryPhase } from './phase8-memory/MemoryPhase.ts';

async function runTest() {
  console.log('[Week 8 Test] Starting convergence test...');

  // Initialize master runtime
  const master = getPHOSMaster(PHOS_DEV_CONFIG);

  // Register all 8 phases in order
  console.log('[Week 8 Test] Registering VoicePhase...');
  const voicePhase = new VoicePhase();
  await voicePhase.initialize(PHOS_DEV_CONFIG);
  voicePhase.activate();
  master.registerPhase(voicePhase);

  console.log('[Week 8 Test] Registering BrosPhase...');
  const brosPhase = new BrosPhase();
  await brosPhase.initialize(PHOS_DEV_CONFIG);
  brosPhase.activate();
  master.registerPhase(brosPhase);

  console.log('[Week 8 Test] Registering RouterPhase...');
  const routerPhase = new RouterPhase();
  await routerPhase.initialize(PHOS_DEV_CONFIG);
  routerPhase.activate();
  master.registerPhase(routerPhase);

  console.log('[Week 8 Test] Registering VisualPhase...');
  const visualPhase = new VisualPhase();
  await visualPhase.initialize(PHOS_DEV_CONFIG);
  visualPhase.activate();
  master.registerPhase(visualPhase);

  console.log('[Week 8 Test] Registering PredictivePhase...');
  const predictivePhase = new PredictivePhase();
  await predictivePhase.initialize(PHOS_DEV_CONFIG);
  predictivePhase.activate();
  master.registerPhase(predictivePhase);

  console.log('[Week 8 Test] Registering GuardianPhase...');
  const guardianPhase = new GuardianPhase();
  await guardianPhase.initialize(PHOS_DEV_CONFIG);
  guardianPhase.activate();
  master.registerPhase(guardianPhase);

  console.log('[Week 8 Test] Registering BridgePhase...');
  const bridgePhase = new BridgePhase();
  await bridgePhase.initialize(PHOS_DEV_CONFIG);
  bridgePhase.activate();
  master.registerPhase(bridgePhase);

  console.log('[Week 8 Test] Registering MemoryPhase...');
  const memoryPhase = new MemoryPhase();
  await memoryPhase.initialize(PHOS_DEV_CONFIG);
  memoryPhase.activate();
  master.registerPhase(memoryPhase);

  // Run Week 8 convergence (final GA check)
  const report = await runWeek8Convergence(master, {
    enableAllPhases: true,
    gaReadinessCheck: true,
    performanceProfile: 'standard'
  });

  console.log('[Week 8 Test] Summary:', report.summary);
  console.log('[Week 8 Test] Blockers:', report.blockers.length);
  console.log('[Week 8 Test] Integrations:', report.integrations.length);
  console.log('[Week 8 Test] Demo scenarios:', report.demoScenarios.length);
  console.log('[Week 8 Test] GA readiness:', report.gaReadiness?.overallScore || 0);
  console.log('[Week 8 Test] GA Ready:', report.gaReady ? 'YES' : 'NO');

  // Verify success
  const passed = report.passed;
  console.log('[Week 8 Test] Result:', passed ? 'PASSED' : 'FAILED');

  if (passed) {
    console.log('[Week 8 Test] Week 8: PHOS v2.0 GA CONVERGED — GENERAL AVAILABILITY READY');
  } else {
    console.log('[Week 8 Test] Week 8: DIVERGED - release blockers detected');
    console.log('[Week 8 Test] Blockers:', report.blockers);
  }
}

runTest().catch(console.error);