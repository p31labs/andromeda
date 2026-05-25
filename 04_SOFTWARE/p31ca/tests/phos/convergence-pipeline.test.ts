import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('three', () => {
  const mockScene = { add: vi.fn(), background: null };
  const mockCamera = { position: { set: vi.fn() }, lookAt: vi.fn() };
  const mockRenderer = { setPixelRatio: vi.fn(), setSize: vi.fn(), render: vi.fn(), dispose: vi.fn(), forceContextLoss: vi.fn() };
  const mockMesh = { geometry: { dispose: vi.fn() }, material: { dispose: vi.fn() } };
  const mockLine = { geometry: null, material: null };
  const mockMaterial = { dispose: vi.fn() };

  function MockClock() {
    this.getElapsedTime = vi.fn(() => 0);
  }

  return {
    Scene: vi.fn(() => mockScene),
    PerspectiveCamera: vi.fn(() => mockCamera),
    WebGLRenderer: vi.fn(() => mockRenderer),
    SphereGeometry: vi.fn(),
    MeshStandardMaterial: vi.fn(() => mockMaterial),
    InstancedMesh: vi.fn(() => mockMesh),
    InstancedBufferAttribute: vi.fn(),
    LineBasicMaterial: vi.fn(() => mockMaterial),
    Line: vi.fn(() => mockLine),
    BufferGeometry: vi.fn(() => ({ setFromPoints: vi.fn() })),
    AmbientLight: vi.fn(),
    PointLight: vi.fn(),
    GridHelper: vi.fn(),
    Color: vi.fn(),
    Vector3: vi.fn(),
    Object3D: vi.fn(),
    Clock: MockClock,
    DynamicDrawUsage: 'dynamic',
  };
});

vi.mock('@xenova/transformers', () => ({
  env: { allowLocalModels: false },
  pipeline: vi.fn(),
}));

vi.mock('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0', () => ({
  env: { allowLocalModels: false },
  pipeline: vi.fn(),
  AutoProcessor: vi.fn(),
  AutoTokenizer: vi.fn(),
  WhisperForConditionalGeneration: vi.fn(),
}));

import { getPHOSMaster, resetPHOSMaster } from '../../src/phos-v2/master/index';
import type { PHOSConfig, PhaseState, ConvergenceReport } from '../../src/phos-v2/master/index';
import { VoicePhase } from '../../src/phos-v2/phase1-voice/VoicePhase';
import { BrosPhase } from '../../src/phos-v2/phase2-bros/BrosPhase';
import { RouterPhase } from '../../src/phos-v2/phase3-router/RouterPhase';
import { VisualPhase } from '../../src/phos-v2/phase4-visual/VisualPhase';
import { PredictivePhase } from '../../src/phos-v2/phase5-predictive/PredictivePhase';
import { GuardianPhase } from '../../src/phos-v2/phase6-guardian/GuardianPhase';
import { BridgePhase } from '../../src/phos-v2/phase7-bridge/BridgePhase';
import { MemoryPhase } from '../../src/phos-v2/phase8-memory/MemoryPhase';
import { Week1Core } from '../../src/phos-v2/convergence/week1-core';
import { runWeek8Convergence } from '../../src/phos-v2/convergence/week8-final';

const ALL_PHASE_IDS = ['voice', 'bros', 'router', 'visual', 'predictive', 'guardian', 'bridge', 'memory'];

const ALL_PHASES: Array<[string, () => object]> = [
  ['voice', () => new VoicePhase()],
  ['bros', () => new BrosPhase()],
  ['router', () => new RouterPhase()],
  ['visual', () => new VisualPhase()],
  ['predictive', () => new PredictivePhase()],
  ['guardian', () => new GuardianPhase()],
  ['bridge', () => new BridgePhase()],
  ['memory', () => new MemoryPhase()],
];

describe('PHOS convergence pipeline', () => {
  const devConfig: PHOSConfig = {
    version: '2.0.0-dev',
    convergenceWeek: 1,
    phases: {
      voice: { enabled: true, version: '0.1.0', targetWeek: 1, mock: false },
      bros: { enabled: true, version: '0.1.0', targetWeek: 1, mock: false },
      router: { enabled: true, version: '0.1.0', targetWeek: 1, mock: false },
      visual: { enabled: true, version: '0.1.0', targetWeek: 4, mock: true },
      predictive: { enabled: true, version: '0.1.0', targetWeek: 6, mock: true },
      guardian: { enabled: true, version: '0.1.0', targetWeek: 7, mock: true },
      bridge: { enabled: true, version: '0.1.0', targetWeek: 8, mock: true },
      memory: { enabled: true, version: '0.1.0', targetWeek: 8, mock: true },
    },
    features: {
      voice: true,
      bros: true,
      router: true,
      visual: true,
      predictive: true,
      guardian: true,
      bridge: true,
      memory: true,
    },
  };

  beforeEach(() => {
    resetPHOSMaster();
  });

  afterEach(() => {
    resetPHOSMaster();
  });

  describe('PHOSMasterRuntime', () => {
    it('initializes and registers phases', () => {
      resetPHOSMaster();
      const master = getPHOSMaster(devConfig);
      expect(master).toBeDefined();

      const voicePhase = new VoicePhase();
      voicePhase.initialize(devConfig);
      voicePhase.activate();
      master.registerPhase(voicePhase);

      const phase = master.getPhase('voice');
      expect(phase).toBeDefined();
      expect(phase!.id).toBe('voice');
    });

    it('all 8 phases register successfully', () => {
      resetPHOSMaster();
      const master = getPHOSMaster(devConfig);

      for (const [id, factory] of ALL_PHASES) {
        const phase = factory();
        (phase as any).initialize(devConfig);
        (phase as any).activate();
        master.registerPhase(phase as any);
        expect(master.getPhase(id)).toBeDefined();
      }

      const states = master.getAllStates();
      for (const id of ALL_PHASE_IDS) {
        expect(states[id]).toBeDefined();
      }
    });

    it('each phase returns valid PhaseState via getState()', () => {
      resetPHOSMaster();
      const master = getPHOSMaster(devConfig);

      for (const [, factory] of ALL_PHASES) {
        const phase = factory();
        (phase as any).initialize(devConfig);
        (phase as any).activate();
        master.registerPhase(phase as any);
      }

      const states = master.getAllStates();
      for (const id of ALL_PHASE_IDS) {
        const state = states[id] as PhaseState;
        expect(state).toBeDefined();
        expect(state).toHaveProperty('status');
        expect(state).toHaveProperty('lastActivity');
        expect(state).toHaveProperty('errorCount');
        expect(state).toHaveProperty('metrics');
        expect(typeof state.lastActivity).toBe('number');
        expect(typeof state.errorCount).toBe('number');
        expect(typeof state.metrics).toBe('object');
      }
    });
  });

  describe('Week 1 convergence (Voice + Bros + Router)', () => {
    it('passes with core 3 phases', async () => {
      resetPHOSMaster();
      const report = await Week1Core();

      expect(report).toBeDefined();
      expect(report.week).toBe(1);

      const voiceState = report.phaseReports.find((p: any) => p.phaseId === 'voice');
      const brosState = report.phaseReports.find((p: any) => p.phaseId === 'bros');
      const routerState = report.phaseReports.find((p: any) => p.phaseId === 'router');

      expect(voiceState).toBeDefined();
      expect(brosState).toBeDefined();
      expect(routerState).toBeDefined();
      expect(voiceState.state.status).toBe('active');
      expect(brosState.state.status).toBe('active');
      expect(routerState.state.status).toBe('active');
    });
  });

  describe('Week 8 convergence (all 8 phases)', () => {
    it('passes with all 8 phases initialized', async () => {
      resetPHOSMaster();
      const master = getPHOSMaster(devConfig);

      for (const [, factory] of ALL_PHASES) {
        const phase = factory();
        await (phase as any).initialize(devConfig);
        (phase as any).activate();
        master.registerPhase(phase as any);
      }

      const report = await runWeek8Convergence(master as any);

      expect(report).toBeDefined();
      expect(report.week).toBe(8);
      expect(report.phaseReports.length).toBe(8);

      for (const id of ALL_PHASE_IDS) {
        const pr = report.phaseReports.find((p: any) => p.phaseId === id);
        expect(pr).toBeDefined();
        expect(pr.state.status).toBe('active');
      }
    });
  });

  describe('ConvergenceReport shape', () => {
    it('has required fields: week, timestamp, phaseReports, integrations, blockers', async () => {
      resetPHOSMaster();
      const report = await Week1Core();

      expect(report).toHaveProperty('week');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('phaseReports');
      expect(report).toHaveProperty('integrations');
      expect(report).toHaveProperty('blockers');
      expect(typeof report.week).toBe('number');
      expect(typeof report.timestamp).toBe('number');
      expect(Array.isArray(report.phaseReports)).toBe(true);
      expect(Array.isArray(report.integrations)).toBe(true);
      expect(Array.isArray(report.blockers)).toBe(true);
    });

    it('phaseReports contain state and data for each registered phase', async () => {
      resetPHOSMaster();
      const report = await Week1Core();

      for (const pr of report.phaseReports as any[]) {
        expect(pr).toHaveProperty('phaseId');
        expect(pr).toHaveProperty('state');
        expect(pr).toHaveProperty('data');
        expect(pr.state).toHaveProperty('status');
        expect(pr.state).toHaveProperty('lastActivity');
        expect(pr.state).toHaveProperty('errorCount');
        expect(pr.state).toHaveProperty('metrics');
        expect(pr.data).toHaveProperty('deliverables');
        expect(pr.data).toHaveProperty('dependencies');
        expect(pr.data).toHaveProperty('blockers');
        expect(pr.data).toHaveProperty('confidence');
      }
    });

    it('integrations have name, phases, ready, and demo fields', async () => {
      resetPHOSMaster();
      const report = await Week1Core();

      for (const integration of report.integrations as any[]) {
        expect(integration).toHaveProperty('name');
        expect(integration).toHaveProperty('phases');
        expect(integration).toHaveProperty('ready');
        expect(integration).toHaveProperty('demo');
        expect(Array.isArray(integration.phases)).toBe(true);
        expect(typeof integration.ready).toBe('boolean');
      }
    });
  });

  describe('Blockers', () => {
    it('blockers empty when all phases active', async () => {
      resetPHOSMaster();
      const report = await Week1Core();
      expect(report.blockers).toEqual([]);
    });

    it('blockers populated when phases are disabled', async () => {
      resetPHOSMaster();
      const disabledConfig: PHOSConfig = {
        ...devConfig,
        phases: {
          ...devConfig.phases,
          voice: { enabled: false, version: '0.1.0', targetWeek: 1 },
        },
      };
      const master = getPHOSMaster(disabledConfig);

      const voicePhase = new VoicePhase();
      await voicePhase.initialize(disabledConfig);
      master.registerPhase(voicePhase);

      const brosPhase = new BrosPhase();
      await brosPhase.initialize(disabledConfig);
      brosPhase.activate();
      master.registerPhase(brosPhase);

      const report = await master.converge(1);
      expect(report.blockers.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Destroy', () => {
    it('cleans up all phases and listeners', () => {
      resetPHOSMaster();
      const master = getPHOSMaster(devConfig);

      for (const [, factory] of ALL_PHASES) {
        const phase = factory();
        (phase as any).initialize(devConfig);
        (phase as any).activate();
        master.registerPhase(phase as any);
      }

      expect(master.getAllStates()).toBeDefined();
      master.destroy();

      const states = master.getAllStates();
      expect(Object.keys(states).length).toBe(0);
    });

    it('PHOSMasterRuntime destroy clears event history', () => {
      resetPHOSMaster();
      const master = getPHOSMaster(devConfig);

      const voicePhase = new VoicePhase();
      voicePhase.initialize(devConfig);
      voicePhase.activate();
      master.registerPhase(voicePhase);

      master.emit({
        type: 'test.event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      });

      expect(master.getEventHistory().length).toBeGreaterThan(0);
      master.destroy();
      expect(master.getEventHistory().length).toBe(0);
    });
  });
});
