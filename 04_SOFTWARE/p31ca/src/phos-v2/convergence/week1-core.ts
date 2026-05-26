/**
 * Convergence Week 1: Core Runtime
 * Voice + Bros + Router integration
 * Strict Registration: BrosPhase MUST register before RouterPhase
 */

import { getPHOSMaster, PHOS_DEV_CONFIG } from '../master';
import { VoicePhase } from '../phase1-voice/VoicePhase';
import { BrosPhase } from '../phase2-bros/BrosPhase';
import { RouterPhase } from '../phase3-router/RouterPhase';
import type { PHOSMasterRuntime, ConvergenceReport } from '../master';

export async function Week1Core(): Promise<ConvergenceReport> {
  console.log('[Convergence W1] Core Runtime integration starting...');
  console.log('[Convergence W1] Hardware: AMD RX 6600 XT, 8GB VRAM');

  // Initialize master runtime
  const master = getPHOSMaster(PHOS_DEV_CONFIG);

  // Strict Registration Order: Bros before Router (K4 persona states must seed first)
  console.log('[Convergence W1] Registering VoicePhase...');
  const voicePhase = new VoicePhase();
  await voicePhase.initialize(PHOS_DEV_CONFIG);
  voicePhase.activate();
  master.registerPhase(voicePhase);

  console.log('[Convergence W1] Registering BrosPhase (must seed K4 personas)...');
  const brosPhase = new BrosPhase();
  await brosPhase.initialize(PHOS_DEV_CONFIG);
  brosPhase.activate();
  master.registerPhase(brosPhase);

  console.log('[Convergence W1] Registering RouterPhase (depends on Bros)...');
  const routerPhase = new RouterPhase();
  await routerPhase.initialize(PHOS_DEV_CONFIG);
  routerPhase.activate();
  master.registerPhase(routerPhase);

  // Run convergence
  const report = await master.converge(1);

  // Week 1 specific checks
  const voiceState = master.getAllStates()['voice'];
  const brosState = master.getAllStates()['bros'];
  const routerState = master.getAllStates()['router'];

  const success = voiceState?.status === 'active' &&
                  brosState?.status === 'active' &&
                  routerState?.status === 'active';

  if (success) {
    console.log('[Convergence W1] ✅ Core Runtime ready');
    console.log('[Convergence W1] Demo: Voice → Bros persona switch');
    console.log('[Convergence W1] Confidence:', report.phaseReports
      .filter(p => ['voice', 'bros', 'router'].includes(p.phaseId))
      .reduce((sum, p) => sum + p.data.confidence, 0) / 3);
  } else {
    console.log('[Convergence W1] ❌ Core not ready');
    console.log('  Voice:', voiceState?.status);
    console.log('  Bros:', brosState?.status);
    console.log('  Router:', routerState?.status);
  }

  return report;
}
