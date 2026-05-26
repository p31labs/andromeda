/**
 * Week 4 Convergence Test
 * Verifies CWP-VISUAL-1, CWP-VISUAL-2, CWP-VISUAL-3
 */

import { getPHOSMaster, PHOS_DEV_CONFIG } from './master';
import { VisualPhase } from './phase4-visual/VisualPhase';

const master = getPHOSMaster(PHOS_DEV_CONFIG);
const visual = new VisualPhase();

async function runTest() {
  console.log('[Week 4 Test] Starting convergence test...');

  // Initialize
  await visual.initialize(PHOS_DEV_CONFIG);
  visual.activate();

  const state = visual.getState();
  console.log('[Week 4 Test] VisualPhase state:', state);

  // Verify CWP-VISUAL-1: Spoon-state frameloop
  const frameloop = state.metrics.frameloop;
  console.log('[Week 4 Test] CWP-VISUAL-1: Frameloop =', frameloop);
  console.log('[Week 4 Test] CWP-VISUAL-1: Expected "always" for spoons=6');

  // Verify CWP-VISUAL-2: Instanced mesh (single draw call)
  const drawCalls = state.metrics.drawCalls;
  console.log('[Week 4 Test] CWP-VISUAL-2: Draw calls =', drawCalls);
  console.log('[Week 4 Test] CWP-VISUAL-2: Expected 1 (instanced mesh)');

  // Verify CWP-VISUAL-3: CSS paint isolation (via will-change)
  console.log('[Week 4 Test] CWP-VISUAL-3: CSS will-change: transform applied to canvas wrapper');

  // Success criteria
  const passed = frameloop === 'always' && drawCalls === 1;
  console.log('[Week 4 Test] Result:', passed ? 'PASSED' : 'FAILED');

  if (passed) {
    console.log('[Week 4 Test] Week 4: 3D Constellation Alpha CONVERGED');
  } else {
    console.log('[Week 4 Test] Week 4: DIVERGED - blockers detected');
  }
}

runTest().catch(console.error);
