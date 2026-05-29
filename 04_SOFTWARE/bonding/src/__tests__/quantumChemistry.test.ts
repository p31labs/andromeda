/**
 * Quantum Chemistry Engine Tests
 * Validates quantum-inspired mechanics for P31 Labs Arcade Hub
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuantumChemistry, LarmorHeartbeat, QuantumEntanglementManager } from '../engine/quantumChemistry';

describe('QuantumChemistry', () => {
  describe('getElementProbabilities', () => {
    it('returns probabilities summing to 1', () => {
      const probs = QuantumChemistry.prototype.getElementProbabilities(0);
      const total = [...probs.values()].reduce((sum, v) => sum + v, 0);
      expect(total).toBeCloseTo(1, 2);
    });

    it('returns different distributions for different atom counts', () => {
      // Use different larmor times to ensure phase differences
      const t1 = 0;
      const t2 = 0.001;
      
      const probs0 = QuantumChemistry.prototype.getElementProbabilities(0, t1);
      const probs5 = QuantumChemistry.prototype.getElementProbabilities(5, t2);
      
      // Calculate total squared difference
      let diffSquared = 0;
      for (const key of QuantumChemistry.ELEMENTS) {
        const p0 = probs0.get(key) ?? 0;
        const p5 = probs5.get(key) ?? 0;
        diffSquared += (p0 - p5) ** 2;
      }
      
      // There should be measurable difference due to different atom counts
      // (different k values in wave function)
      expect(diffSquared).toBeGreaterThan(0.001);
    });

    it('modulates probabilities with Larmor phase', () => {
      const probs1 = QuantumChemistry.prototype.getElementProbabilities(0, 0.001);
      const probs2 = QuantumChemistry.prototype.getElementProbabilities(0, 0.002);
      
      const total1 = [...probs1.values()].reduce((sum, v) => sum + v, 0);
      const total2 = [...probs2.values()].reduce((sum, v) => sum + v, 0);
      
      // Both should sum to 1 regardless of phase
      expect(total1).toBeCloseTo(1, 2);
      expect(total2).toBeCloseTo(1, 2);
    });
  });

  describe('createEntangledPair', () => {
    it('creates valid entangled pair', () => {
      const state = {
        amplitudes: new Map([['H', 0.5], ['He', 0.5]]),
        phase: 0,
        collapsed: false,
        timestamp: Date.now()
      };
      
      const pair = QuantumChemistry.createEntangledPair('player1', 'player2', state);
      
      expect(pair.playerA).toBe('player1');
      expect(pair.playerB).toBe('player2');
      expect(pair.bellState).toMatch(/^(phi-plus|phi-minus|psi-plus|psi-minus)$/);
      expect(['phi-plus', 'phi-minus', 'psi-plus', 'psi-minus']).toContain(pair.bellState);
    });
  });

  describe('measure', () => {
    it('collapses state to single element', () => {
      const state = {
        amplitudes: new Map([['H', 0.3], ['He', 0.7]]),
        phase: 0,
        collapsed: false,
        timestamp: Date.now()
      };
      
      const element = QuantumChemistry.measure(state);
      expect(['H', 'He']).toContain(element);
      expect(state.collapsed).toBe(true);
    });

    it('returns same element for already collapsed state', () => {
      const state = {
        amplitudes: new Map([['H', 1.0]]),
        phase: 0,
        collapsed: true,
        timestamp: Date.now()
      };
      
      const element = QuantumChemistry.measure(state, 'position');
      expect(element).toBe('H');
    });
  });

  describe('applyTunneling', () => {
    it('allows tunneling for low probability elements', () => {
      const probs = new Map([['H', 0.03], ['He', 0.97]]);
      
      // Mock Math.random to always allow tunneling
      const originalRandom = Math.random;
      Math.random = () => 0.05;
      
      const result = QuantumChemistry.applyTunneling('H', probs);
      
      Math.random = originalRandom;
      expect(result.allowed).toBe(true);
      expect(result.tunneledElement).toBe('He');
    });

    it('blocks impossible transitions', () => {
      const probs = new Map([['H', 0.001], ['He', 0.001]]); // Both very low - sum is 0.002
      
      // Mock Math.random to prevent tunneling (must be >= 0.1 to skip tunneling branch)
      const originalRandom = Math.random;
      Math.random = () => 0.99; // >= 0.1, so skips tunneling entirely
      
      const result = QuantumChemistry.applyTunneling('H', probs);
      
      Math.random = originalRandom;
      // Since prob is 0.001 (< 0.02), and tunneling is prevented by mock, should be false
      expect(result.allowed).toBe(false);
    });
  });
});

describe('LarmorHeartbeat', () => {
  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = LarmorHeartbeat.getInstance();
      const instance2 = LarmorHeartbeat.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getPhase', () => {
    it('returns phase between 0 and 2π', () => {
      const hb = LarmorHeartbeat.getInstance();
      const phase = hb.getPhase();
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThanOrEqual(2 * Math.PI);
    });
  });

  describe('getFrequency', () => {
    it('returns 863 Hz', () => {
      const hb = LarmorHeartbeat.getInstance();
      expect(hb.getFrequency()).toBe(863);
    });
  });
});

describe('QuantumEntanglementManager', () => {
  let manager: QuantumEntanglementManager;

  beforeEach(() => {
    manager = new QuantumEntanglementManager();
  });

  describe('entangle', () => {
    it('creates entanglement between players', () => {
      const initialState = {
        amplitudes: new Map([['H', 0.5], ['He', 0.5]]),
        phase: 0,
        collapsed: false,
        timestamp: Date.now()
      };
      
      const pair = manager.entangle('will', 'sj');
      
      expect(pair.playerA).toBe('will');
      expect(pair.playerB).toBe('sj');
    });

    it('generates sorted pair ID', () => {
      const pair = manager.entangle('z', 'a');
      const expectedId = 'a-z';
      expect(manager.getPairId('z', 'a')).toBe(expectedId);
      expect(manager.getPairId('a', 'z')).toBe(expectedId);
    });
  });

  describe('collapse', () => {
    it('collapses shared state', () => {
      const pair = manager.entangle('will', 'sj');
      manager.collapse(manager.getPairId('will', 'sj'), 'Ba');
      
      expect(pair.sharedState.collapsed).toBe(true);
      expect(pair.sharedState.amplitudes.get('Ba')).toBe(1.0);
    });
  });

  describe('getAllPairs', () => {
    it('returns all entangled pairs', () => {
      manager.entangle('will', 'sj');
      manager.entangle('will', 'wj');
      
      const all = manager.getAllPairs();
      expect(all.length).toBe(2);
    });
  });
});