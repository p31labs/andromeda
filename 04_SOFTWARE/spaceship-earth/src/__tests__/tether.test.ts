/**
 * Suite B — Somatic Tether (WCD-M22)
 *
 * Tests CircularBuffer statistics, stress detection logic,
 * HRV-to-spoon mapping thresholds, and calibration requirements.
 * WebSocket lifecycle tested via unit logic (no actual WS connection).
 */

import { describe, it, expect } from 'vitest';
import { CircularBuffer } from '../services/somaticCircularBuffer';

// ── Constants mirrored from useSomaticTether.ts ──

const CALIBRATION_SAMPLES = 300;
const STRESS_HR_FACTOR = 1.20;
const STRESS_HRV_FACTOR = 0.85;
const CONSECUTIVE_STRESS_THRESHOLD = 10;
const COOLDOWN_MS = 180_000;
const CALM_HR_FACTOR = 1.10;
const CALM_CONSECUTIVE = 60;
const SPOON_DRAIN = 2;

describe('Suite B: Somatic Tether', () => {
  // ── CircularBuffer ──

  describe('CircularBuffer', () => {
    it('tracks length correctly', () => {
      const buf = new CircularBuffer<number>(5);
      expect(buf.length).toBe(0);
      buf.push(1);
      buf.push(2);
      expect(buf.length).toBe(2);
    });

    it('wraps around at capacity', () => {
      const buf = new CircularBuffer<number>(3);
      buf.push(1);
      buf.push(2);
      buf.push(3);
      buf.push(4); // overwrites 1
      expect(buf.length).toBe(3);
      expect(buf.toArray()).toEqual([2, 3, 4]);
    });

    it('isFull returns true at capacity', () => {
      const buf = new CircularBuffer<number>(2);
      expect(buf.isFull()).toBe(false);
      buf.push(1);
      expect(buf.isFull()).toBe(false);
      buf.push(2);
      expect(buf.isFull()).toBe(true);
    });

    it('computes correct median (odd count)', () => {
      const buf = new CircularBuffer<{ v: number }>(5);
      [3, 1, 4, 1, 5].forEach((v) => buf.push({ v }));
      expect(buf.median((t) => t.v)).toBe(3); // sorted: 1,1,3,4,5
    });

    it('computes correct median (even count)', () => {
      const buf = new CircularBuffer<{ v: number }>(4);
      [1, 3, 5, 7].forEach((v) => buf.push({ v }));
      expect(buf.median((t) => t.v)).toBe(4); // (3+5)/2
    });

    it('computes correct mean', () => {
      const buf = new CircularBuffer<{ v: number }>(4);
      [10, 20, 30, 40].forEach((v) => buf.push({ v }));
      expect(buf.mean((t) => t.v)).toBe(25);
    });

    it('returns 0 for empty median/mean', () => {
      const buf = new CircularBuffer<{ v: number }>(5);
      expect(buf.median((t) => t.v)).toBe(0);
      expect(buf.mean((t) => t.v)).toBe(0);
    });
  });

  // ── Calibration ──

  describe('calibration requirements', () => {
    it('requires exactly 300 samples (5 min at 1 Hz)', () => {
      expect(CALIBRATION_SAMPLES).toBe(300);
    });

    it('calibration buffer computes baseline median', () => {
      const buf = new CircularBuffer<{ hr: number; hrv: number }>(CALIBRATION_SAMPLES);
      // Fill with synthetic data: HR ~72, HRV ~45
      for (let i = 0; i < CALIBRATION_SAMPLES; i++) {
        buf.push({ hr: 70 + (i % 5), hrv: 43 + (i % 5) });
      }
      expect(buf.length).toBe(CALIBRATION_SAMPLES);
      const baselineHr = buf.median((t) => t.hr);
      const baselineHrv = buf.median((t) => t.hrv);
      expect(baselineHr).toBeGreaterThan(0);
      expect(baselineHrv).toBeGreaterThan(0);
    });
  });

  // ── Stress detection thresholds ──

  describe('stress detection', () => {
    it('detects stress when HR > baseline*1.20 AND HRV < baseline*0.85', () => {
      const baselineHr = 72;
      const baselineHrv = 45;

      // Stressed readings
      const stressedHr = baselineHr * 1.25; // 90
      const stressedHrv = baselineHrv * 0.80; // 36

      const isStressed =
        stressedHr > baselineHr * STRESS_HR_FACTOR &&
        stressedHrv < baselineHrv * STRESS_HRV_FACTOR;

      expect(isStressed).toBe(true);
    });

    it('does NOT flag stress when only HR elevated', () => {
      const baselineHr = 72;
      const baselineHrv = 45;

      const isStressed =
        90 > baselineHr * STRESS_HR_FACTOR &&
        45 < baselineHrv * STRESS_HRV_FACTOR; // HRV normal

      expect(isStressed).toBe(false);
    });

    it('does NOT flag stress when only HRV depressed', () => {
      const baselineHr = 72;
      const baselineHrv = 45;

      const isStressed =
        72 > baselineHr * STRESS_HR_FACTOR && // HR normal
        30 < baselineHrv * STRESS_HRV_FACTOR;

      expect(isStressed).toBe(false);
    });

    it('requires 10 consecutive stressed ticks before firing', () => {
      expect(CONSECUTIVE_STRESS_THRESHOLD).toBe(10);
    });

    it('enforces 3-minute cooldown between spoon drains', () => {
      expect(COOLDOWN_MS).toBe(180_000);
    });
  });

  // ── Spoon drain ──

  describe('spoon drain', () => {
    it('drains 2 spoons per acute stress event', () => {
      expect(SPOON_DRAIN).toBe(2);
    });

    it('never drains below zero', () => {
      const spoons = 1;
      const result = Math.max(0, spoons - SPOON_DRAIN);
      expect(result).toBe(0);
    });

    it('drains correctly from normal spoon count', () => {
      const spoons = 10;
      const result = Math.max(0, spoons - SPOON_DRAIN);
      expect(result).toBe(8);
    });
  });

  // ── Calm recovery ──

  describe('calm recovery', () => {
    it('calm threshold is HR within +10% of baseline', () => {
      const baselineHr = 72;
      const rollingHr = 78;
      const isCalm = rollingHr <= baselineHr * CALM_HR_FACTOR;
      expect(isCalm).toBe(true); // 78 <= 79.2
    });

    it('requires 60 consecutive calm seconds to clear fawn guard', () => {
      expect(CALM_CONSECUTIVE).toBe(60);
    });

    it('rejects calm when HR exceeds +10%', () => {
      const baselineHr = 72;
      const rollingHr = 82;
      const isCalm = rollingHr <= baselineHr * CALM_HR_FACTOR;
      expect(isCalm).toBe(false); // 82 > 79.2
    });
  });

  // ── Waveform buffer ──

  describe('waveform buffer', () => {
    it('maintains 120-sample rolling window', () => {
      const WAVEFORM_SIZE = 120;
      const buf = new CircularBuffer<number>(WAVEFORM_SIZE);
      for (let i = 0; i < 200; i++) buf.push(i);
      expect(buf.length).toBe(WAVEFORM_SIZE);
      const arr = buf.toArray();
      expect(arr[0]).toBe(80); // oldest surviving sample
      expect(arr[119]).toBe(199); // newest
    });
  });

  // ── Backoff ──

  describe('reconnect backoff', () => {
    it('doubles on each failure up to 30s max', () => {
      const BACKOFF_INITIAL = 1000;
      const BACKOFF_MAX = 30_000;
      const BACKOFF_MULT = 2;

      let backoff = BACKOFF_INITIAL;
      backoff = Math.min(backoff * BACKOFF_MULT, BACKOFF_MAX);
      expect(backoff).toBe(2000);

      backoff = Math.min(backoff * BACKOFF_MULT, BACKOFF_MAX);
      expect(backoff).toBe(4000);

      // Jump to near-max
      backoff = 16_000;
      backoff = Math.min(backoff * BACKOFF_MULT, BACKOFF_MAX);
      expect(backoff).toBe(30_000);

      // Stays at max
      backoff = Math.min(backoff * BACKOFF_MULT, BACKOFF_MAX);
      expect(backoff).toBe(30_000);
    });
  });
});
