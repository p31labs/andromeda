/**
 * @file ricci.test.ts — Unit tests for Discrete Ricci Flow Math (dRfge)
 */
import { describe, it, expect } from 'vitest';
import { RicciMath, getAnimatedCurvature, type RicciInput } from '../lib/engine/ricci';

describe('RicciMath', () => {
  describe('calculateCurvature', () => {
    it('returns ~1.0 for ideal network (latency=0, noise=0)', () => {
      const k = RicciMath.calculateCurvature(0, 0);
      expect(k).toBeCloseTo(1.0, 1);
      expect(k).toBeGreaterThanOrEqual(0.9);
    });

    it('returns ~0.5 for extreme degradation (latency=10000, noise=1)', () => {
      const k = RicciMath.calculateCurvature(10000, 1);
      expect(k).toBeCloseTo(0.5, 1);
    });

    it('clamps NaN latency to 0', () => {
      const k = RicciMath.calculateCurvature(NaN, 0);
      expect(k).toBeCloseTo(1.0, 1);
    });

    it('clamps undefined noise to 0.5 (default)', () => {
      // @ts-expect-error - testing invalid input
      const k = RicciMath.calculateCurvature(100, undefined);
      expect(k).toBeLessThan(1.0);
      expect(k).toBeGreaterThan(0.5);
    });

    it('clamps negative latency to 0', () => {
      const k = RicciMath.calculateCurvature(-500, 0);
      expect(k).toBeCloseTo(1.0, 1);
    });

    it('clamps noise > 1 to 1', () => {
      const k = RicciMath.calculateCurvature(1000, 2.5);
      const k2 = RicciMath.calculateCurvature(1000, 1);
      expect(k).toBeCloseTo(k2, 5);
    });

    it('clamps noise < 0 to 0', () => {
      const k = RicciMath.calculateCurvature(1000, -0.5);
      const k2 = RicciMath.calculateCurvature(1000, 0);
      expect(k).toBeCloseTo(k2, 5);
    });

    it('returns value within [0.5, 1.5] for all inputs', () => {
      const testCases = [
        { latency: 0, noise: 0 },
        { latency: 5000, noise: 0.8 },
        { latency: 10000, noise: 1 },
        { latency: -100, noise: -1 },
        { latency: NaN, noise: NaN },
        { latency: 1e6, noise: 10 },
      ];
      for (const tc of testCases) {
        const k = RicciMath.calculateCurvature(tc.latency, tc.noise);
        expect(k).toBeGreaterThanOrEqual(0.5);
        expect(k).toBeLessThanOrEqual(1.5);
      }
    });

    it('latency penalty becomes severe after 2000ms', () => {
      const k200 = RicciMath.calculateCurvature(200, 0);
      const k2000 = RicciMath.calculateCurvature(2000, 0);
      expect(k2000).toBeLessThan(k200);
      expect(k2000).toBeLessThan(0.7);
    });
  });

  describe('getResilience', () => {
    it('returns ISOSTATIC for 4 or more nodes', () => {
      expect(RicciMath.getResilience(4)).toBe('100% - ISOSTATIC');
      expect(RicciMath.getResilience(5)).toBe('100% - ISOSTATIC');
      expect(RicciMath.getResilience(100)).toBe('100% - ISOSTATIC');
    });

    it('returns STABLE for exactly 3 nodes', () => {
      expect(RicciMath.getResilience(3)).toBe('57.7% - STABLE');
    });

    it('returns DEGRADED for 0-2 nodes', () => {
      expect(RicciMath.getResilience(0)).toBe('DEGRADED');
      expect(RicciMath.getResilience(1)).toBe('DEGRADED');
      expect(RicciMath.getResilience(2)).toBe('DEGRADED');
    });

    it('handles fractional node counts by flooring', () => {
      expect(RicciMath.getResilience(3.9)).toBe('100% - ISOSTATIC');
      expect(RicciMath.getResilience(3.1)).toBe('57.7% - STABLE');
      expect(RicciMath.getResilience(2.9)).toBe('DEGRADED');
    });

    it('handles negative node counts as DEGRADED', () => {
      expect(RicciMath.getResilience(-5)).toBe('DEGRADED');
    });
  });

  describe('getScaleFactor', () => {
    it('returns 0.8 for curvature = 1.0', () => {
      expect(RicciMath.getScaleFactor(1.0)).toBeCloseTo(0.8, 5);
    });

    it('returns <0.8 for curvature < 1.0', () => {
      expect(RicciMath.getScaleFactor(0.7)).toBeLessThan(0.8);
    });

    it('returns >0.8 for curvature > 1.0', () => {
      expect(RicciMath.getScaleFactor(1.3)).toBeGreaterThan(0.8);
    });

    it('clamps scale factor to [0.6, 1.4]', () => {
      expect(RicciMath.getScaleFactor(0.2)).toBeCloseTo(0.6, 5);
      expect(RicciMath.getScaleFactor(2.0)).toBeCloseTo(1.4, 5);
    });

    it('handles NaN curvature gracefully', () => {
      // @ts-expect-error - testing edge case
      const scale = RicciMath.getScaleFactor(NaN);
      expect(scale).toBeCloseTo(0.8, 5);
    });
  });

  describe('calculate (full pipeline)', () => {
    it('returns expected output for valid input', () => {
      const input: RicciInput = { latency: 150, noise: 0.3, activeNodes: 4 };
      const output = RicciMath.calculate(input);
      expect(output).toHaveProperty('curvature');
      expect(output).toHaveProperty('resilience');
      expect(output).toHaveProperty('scale');
      expect(output.curvature).toBeGreaterThanOrEqual(0.5);
      expect(output.curvature).toBeLessThanOrEqual(1.5);
    });

    it('handles malformed input without throwing', () => {
      // @ts-expect-error - completely invalid input
      const output = RicciMath.calculate(null);
      expect(output.curvature).toBeCloseTo(0.85, 1);
      expect(output.resilience).toBe('DEGRADED');
    });
  });
});

describe('getAnimatedCurvature', () => {
  it('returns base curvature when time = 0', () => {
    const animated = getAnimatedCurvature(1.0, 0);
    expect(animated).toBeCloseTo(1.0, 1);
  });

  it('oscillates around base curvature over time', () => {
    const base = 1.0;
    const t1 = 0;
    const t2 = Math.PI;
    const val1 = getAnimatedCurvature(base, t1);
    const val2 = getAnimatedCurvature(base, t2);
    expect(val2).not.toBe(val1);
    expect(Math.abs(val2 - base)).toBeLessThanOrEqual(0.09);
  });

  it('clamps animated curvature to [0.5, 1.5] even with extreme time', () => {
    const animated = getAnimatedCurvature(1.5, 1e6);
    expect(animated).toBeLessThanOrEqual(1.5);
    const animatedLow = getAnimatedCurvature(0.5, 1e6);
    expect(animatedLow).toBeGreaterThanOrEqual(0.5);
  });

  it('handles NaN time gracefully', () => {
    const animated = getAnimatedCurvature(1.0, NaN);
    expect(animated).toBeCloseTo(1.0, 5);
  });
});
});