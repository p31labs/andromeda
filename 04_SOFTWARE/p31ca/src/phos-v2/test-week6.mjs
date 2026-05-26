/**
 * Week 6 Convergence Test
 * Verifies CWP-PREDICTIVE-1, CWP-PREDICTIVE-2, CWP-PREDICTIVE-3
 */

import { getPHOSMaster, PHOS_DEV_CONFIG } from './master/index.ts';
import { runWeek6Convergence } from './convergence/week6-predictive-all.ts';
import { VoicePhase } from './phase1-voice/VoicePhase.ts';
import { BrosPhase } from './phase2-bros/BrosPhase.ts';
import { RouterPhase } from './phase3-router/RouterPhase.ts';
import { VisualPhase } from './phase4-visual/VisualPhase.ts';
import { PredictivePhase } from './phase5-predictive/PredictivePhase.ts';

async function runTest() {
  console.log('[Week 6 Test] Starting convergence test...');

  // Initialize master runtime
  const master = getPHOSMaster(PHOS_DEV_CONFIG);

  // Register all phases in order
  console.log('[Week 6 Test] Registering VoicePhase...');
  const voicePhase = new VoicePhase();
  await voicePhase.initialize(PHOS_DEV_CONFIG);
  voicePhase.activate();
  master.registerPhase(voicePhase);

  console.log('[Week 6 Test] Registering BrosPhase...');
  const brosPhase = new BrosPhase();
  await brosPhase.initialize(PHOS_DEV_CONFIG);
  brosPhase.activate();
  master.registerPhase(brosPhase);

  console.log('[Week 6 Test] Registering RouterPhase...');
  const routerPhase = new RouterPhase();
  await routerPhase.initialize(PHOS_DEV_CONFIG);
  routerPhase.activate();
  master.registerPhase(routerPhase);

  console.log('[Week 6 Test] Registering VisualPhase...');
  const visualPhase = new VisualPhase();
  await visualPhase.initialize(PHOS_DEV_CONFIG);
  visualPhase.activate();
  master.registerPhase(visualPhase);

  console.log('[Week 6 Test] Registering PredictivePhase...');
  const predictivePhase = new PredictivePhase();
  await predictivePhase.initialize(PHOS_DEV_CONFIG);
  predictivePhase.activate();
  master.registerPhase(predictivePhase);

  // Run Week 6 convergence
  const report = await runWeek6Convergence(master, {
    enablePredictions: true,
    predictionModel: 'hybrid',
    contextWindowMinutes: 15
  });

  console.log('[Week 6 Test] Summary:', report.summary);
  console.log('[Week 6 Test] Blockers:', report.blockers.length);
  console.log('[Week 6 Test] Integrations:', report.integrations.length);
  console.log('[Week 6 Test] Demo scenarios:', report.demoScenarios.length);
  console.log('[Week 6 Test] Mock context:', Object.keys(report.mockContext || {}).length, 'fields');
  console.log('[Week 6 Test] Mock suggestions:', report.mockSuggestions?.length || 0, 'suggestions');
  console.log('[Week 6 Test] Success criteria:', report.successCriteria);

  // Verify success
  const passed = report.passed;
  console.log('[Week 6 Test] Result:', passed ? 'PASSED' : 'FAILED');

  if (passed) {
    console.log('[Week 6 Test] Week 6: Predictive Suggestions Across All CONVERGED');
  } else {
    console.log('[Week 6 Test] Week 6: DIVERGED - blockers detected');
    console.log('[Week 6 Test] Blockers:', report.blockers);
  }
}

runTest().catch(console.error);