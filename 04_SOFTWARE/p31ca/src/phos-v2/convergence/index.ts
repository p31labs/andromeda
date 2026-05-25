export { Week1Core } from './week1-core.ts';
export { runWeek2Convergence } from './week2-signal.ts';
export { runWeek3Convergence } from './week3-love.ts';
export { runWeek4Convergence } from './week4-mesh.ts';
export { runWeek5Convergence } from './week5-mesh-visual.ts';
export { runWeek6Convergence } from './week6-predictive-all.ts';
export { runWeek7Convergence } from './week7-guardian-all.ts';
export { runWeek8Convergence } from './week8-final.ts';

export interface ConvergenceDemo {
  week: number;
  name: string;
  script: string;
  expectedResult: string;
  phasesRequired: string[];
}

export const CONVERGENCE_DEMOS: ConvergenceDemo[] = [
  {
    week: 1,
    name: 'Core Runtime',
    script: 'PHOS, what is my current persona?',
    expectedResult: 'Shows current Bros persona (default: W.J.)',
    phasesRequired: ['voice', 'bros', 'router']
  },
  {
    week: 2,
    name: 'Signal Mesh Activation',
    script: 'PHOS, activate signal mesh',
    expectedResult: 'Voice commands route through persona-activated mesh pathways',
    phasesRequired: ['voice', 'bros', 'router']
  },
  {
    week: 3,
    name: 'LOVE Ledger Integration',
    script: 'PHOS, show my LOVE balance',
    expectedResult: 'CRDT-synced ledger shows dual-currency state',
    phasesRequired: ['voice', 'bros', 'router']
  },
  {
    week: 4,
    name: 'Mesh Topology Live',
    script: 'PHOS, show mesh health',
    expectedResult: 'Live K4 mesh visualization from RouterPhase',
    phasesRequired: ['router', 'visual']
  },
  {
    week: 5,
    name: 'Mesh-Visual Live Topology',
    script: 'PHOS, show packet flow',
    expectedResult: '3D shows real-time routing between family members',
    phasesRequired: ['router', 'visual']
  },
  {
    week: 6,
    name: 'Predictive Suggestions',
    script: 'PHOS, what should I do?',
    expectedResult: 'Context-aware suggestions across all phases',
    phasesRequired: ['voice', 'bros', 'router', 'visual', 'predictive']
  },
  {
    week: 7,
    name: 'Guardian Dashboard',
    script: 'PHOS, guardian view',
    expectedResult: 'Oversight dashboard monitors all phases',
    phasesRequired: ['guardian', 'voice', 'bros', 'router', 'visual', 'predictive']
  },
  {
    week: 8,
    name: 'PHOS v2.0 GA',
    script: 'PHOS, show me what matters most',
    expectedResult: 'Complete ecosystem — all 8 phases integrated',
    phasesRequired: ['voice', 'bros', 'router', 'visual', 'predictive', 'guardian', 'bridge', 'memory']
  }
];
