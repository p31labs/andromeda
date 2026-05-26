/**
 * Week 7 Convergence Test
 * Verifies CWP-GUARDIAN-1, CWP-GUARDIAN-2, CWP-GUARDIAN-3
 */

import { getPHOSMaster, PHOS_DEV_CONFIG } from './master/index.ts';
import { runWeek7Convergence } from './convergence/week7-guardian-all.ts';
import { VoicePhase } from './phase1-voice/VoicePhase.ts';
import { BrosPhase } from './phase2-bros/BrosPhase.ts';
import { RouterPhase } from './phase3-router/RouterPhase.ts';
import { VisualPhase } from './phase4-visual/VisualPhase.ts';
import { PredictivePhase } from './phase5-predictive/PredictivePhase.ts';
import { GuardianPhase } from './phase6-guardian/GuardianPhase.ts';

async function runTest() {
  console.log('[Week 7 Test] Starting convergence test...');

  // Initialize master runtime
  const master = getPHOSMaster(PHOS_DEV_CONFIG);

  // Register all phases in order
  console.log('[Week 7 Test] Registering VoicePhase...');
  const voicePhase = new VoicePhase();
  await voicePhase.initialize(PHOS_DEV_CONFIG);
  voicePhase.activate();
  master.registerPhase(voicePhase);

  console.log('[Week 7 Test] Registering BrosPhase...');
  const brosPhase = new BrosPhase();
  await brosPhase.initialize(PHOS_DEV_CONFIG);
  brosPhase.activate();
  master.registerPhase(brosPhase);

  console.log('[Week 7 Test] Registering RouterPhase...');
  const routerPhase = new RouterPhase();
  await routerPhase.initialize(PHOS_DEV_CONFIG);
  routerPhase.activate();
  master.registerPhase(routerPhase);

  console.log('[Week 7 Test] Registering VisualPhase...');
  const visualPhase = new VisualPhase();
  await visualPhase.initialize(PHOS_DEV_CONFIG);
  visualPhase.activate();
  master.registerPhase(visualPhase);

  console.log('[Week 7 Test] Registering PredictivePhase...');
  const predictivePhase = new PredictivePhase();
  await predictivePhase.initialize(PHOS_DEV_CONFIG);
  predictivePhase.activate();
  master.registerPhase(predictivePhase);

  console.log('[Week 7 Test] Registering GuardianPhase...');
  const guardianPhase = new GuardianPhase();
  await guardianPhase.initialize(PHOS_DEV_CONFIG);
  guardianPhase.activate();
  master.registerPhase(guardianPhase);

  // Run Week 7 convergence
  const report = await runWeek7Convergence(master, {
    enableGuardian: true,
    guardianLevel: 'active',
    alertChannels: ['visual', 'voice']
  });

  console.log('[Week 7 Test] Summary:', report.summary);
  console.log('[Week 7 Test] Blockers:', report.blockers.length);
  console.log('[Week 7 Test] Integrations:', report.integrations.length);
  console.log('[Week 7 Test] Demo scenarios:', report.demoScenarios.length);
  console.log('[Week 7 Test] Mock alerts:', report.mockAlerts?.length || 0, 'alerts');
  console.log('[Week 7 Test] Success criteria:', report.successCriteria);

  // Verify success
  const passed = report.passed;
  console.log('[Week 7 Test] Result:', passed ? 'PASSED' : 'FAILED');

  if (passed) {
    console.log('[Week 7 Test] Week 7: Guardian Dashboard Across All CONVERGED');
  } else {
    console.log('[Week 7 Test] Week 7: DIVERGED - blockers detected');
    console.log('[Week 7 Test] Blockers:', report.blockers);
  }
}

runTest().catch(console.error);