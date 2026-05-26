/**
 * Week 5 Convergence Test
 * Verifies CWP-MESH-1, CWP-MESH-2, CWP-MESH-3
 */

import { getPHOSMaster, PHOS_DEV_CONFIG } from './master/index.ts';
import { runWeek5Convergence } from './convergence/week5-mesh-visual.ts';
import { VoicePhase } from './phase1-voice/VoicePhase.ts';
import { BrosPhase } from './phase2-bros/BrosPhase.ts';
import { RouterPhase } from './phase3-router/RouterPhase.ts';
import { VisualPhase } from './phase4-visual/VisualPhase.ts';

async function runTest() {
  console.log('[Week 5 Test] Starting convergence test...');

  // Initialize master runtime
  const master = getPHOSMaster(PHOS_DEV_CONFIG);

  // Register all phases in order
  console.log('[Week 5 Test] Registering VoicePhase...');
  const voicePhase = new VoicePhase();
  await voicePhase.initialize(PHOS_DEV_CONFIG);
  voicePhase.activate();
  master.registerPhase(voicePhase);

  console.log('[Week 5 Test] Registering BrosPhase...');
  const brosPhase = new BrosPhase();
  await brosPhase.initialize(PHOS_DEV_CONFIG);
  brosPhase.activate();
  master.registerPhase(brosPhase);

  console.log('[Week 5 Test] Registering RouterPhase...');
  const routerPhase = new RouterPhase();
  await routerPhase.initialize(PHOS_DEV_CONFIG);
  routerPhase.activate();
  master.registerPhase(routerPhase);

  console.log('[Week 5 Test] Registering VisualPhase...');
  const visualPhase = new VisualPhase();
  await visualPhase.initialize(PHOS_DEV_CONFIG);
  visualPhase.activate();
  master.registerPhase(visualPhase);

  // Run Week 5 convergence
  const report = await runWeek5Convergence(master, {
    testTopologyUpdates: true,
    refreshInterval: 5000
  });

  console.log('[Week 5 Test] Summary:', report.summary);
  console.log('[Week 5 Test] Blockers:', report.blockers.length);
  console.log('[Week 5 Test] Integrations:', report.integrations.length);
  console.log('[Week 5 Test] Demo scenarios:', report.demoScenarios.length);
  console.log('[Week 5 Test] Mock topology:', report.mockTopology.vertices.length, 'vertices,', report.mockTopology.edges.length, 'edges');
  console.log('[Week 5 Test] Success criteria:', report.successCriteria);

  // Verify success
  const passed = report.passed;
  console.log('[Week 5 Test] Result:', passed ? 'PASSED' : 'FAILED');

  if (passed) {
    console.log('[Week 5 Test] Week 5: Mesh-Visual Live Topology CONVERGED');
  } else {
    console.log('[Week 5 Test] Week 5: DIVERGED - blockers detected');
    console.log('[Week 5 Test] Blockers:', report.blockers);
  }
}

runTest().catch(console.error);
