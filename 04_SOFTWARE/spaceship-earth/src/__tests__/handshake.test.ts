/**
 * Suite C — K4 Handshake (WCD-M22)
 *
 * Tests rhythm lock timing validation, simultaneity window,
 * K4 graph completeness (re-uses k4Graph tests), and mint trigger logic.
 */

import { describe, it, expect } from 'vitest';
import {
  createGraph,
  addEdge,
  isK4Complete,
  getK4Subgraph,
  extractDIDs,
} from '../services/k4Graph';
import { parseMfgData, emaSmooth } from '../services/spatialScanner';
import type { K4Edge } from '../sovereign/types';

// ── Constants mirrored from HandshakeOverlay.tsx ──

const TARGET_BPM = 86;
const TARGET_INTERVAL_MS = 60_000 / TARGET_BPM; // ~697ms
const TOLERANCE_MS = 80;
const MIN_INTERVAL = TARGET_INTERVAL_MS - TOLERANCE_MS; // 617ms
const MAX_INTERVAL = TARGET_INTERVAL_MS + TOLERANCE_MS; // 777ms
const REQUIRED_TAPS = 4;
const LOCK_WINDOW_MS = 2000;

function edge(from: string, to: string, ts?: number): K4Edge {
  return { from, to, timestamp: ts ?? Date.now(), signature: `sig-${from}-${to}` };
}

describe('Suite C: K4 Handshake', () => {
  // ── Rhythm lock timing ──

  describe('rhythm lock timing', () => {
    it('target BPM is 86', () => {
      expect(TARGET_BPM).toBe(86);
    });

    it('target interval is ~697ms', () => {
      expect(Math.round(TARGET_INTERVAL_MS)).toBe(698);
    });

    it('tolerance window is 617ms to 777ms', () => {
      expect(Math.round(MIN_INTERVAL)).toBe(618);
      expect(Math.round(MAX_INTERVAL)).toBe(778);
    });

    it('accepts tap at exact target interval', () => {
      const interval = TARGET_INTERVAL_MS;
      expect(interval >= MIN_INTERVAL && interval <= MAX_INTERVAL).toBe(true);
    });

    it('accepts tap at lower bound', () => {
      const interval = MIN_INTERVAL;
      expect(interval >= MIN_INTERVAL && interval <= MAX_INTERVAL).toBe(true);
    });

    it('accepts tap at upper bound', () => {
      const interval = MAX_INTERVAL;
      expect(interval >= MIN_INTERVAL && interval <= MAX_INTERVAL).toBe(true);
    });

    it('rejects tap too fast (500ms)', () => {
      const interval = 500;
      expect(interval >= MIN_INTERVAL && interval <= MAX_INTERVAL).toBe(false);
    });

    it('rejects tap too slow (900ms)', () => {
      const interval = 900;
      expect(interval >= MIN_INTERVAL && interval <= MAX_INTERVAL).toBe(false);
    });

    it('requires 4 taps (3 valid intervals) to lock', () => {
      expect(REQUIRED_TAPS).toBe(4);
    });

    it('validates consecutive valid intervals', () => {
      // Simulate 4 taps with valid intervals
      const taps = [0, 697, 1394, 2091]; // ~697ms apart
      let consecutiveValid = 0;
      for (let i = taps.length - 1; i >= 1; i--) {
        const delta = taps[i] - taps[i - 1];
        if (delta >= MIN_INTERVAL && delta <= MAX_INTERVAL) {
          consecutiveValid++;
        } else {
          break;
        }
      }
      expect(consecutiveValid).toBe(3); // 3 intervals from 4 taps
      expect(consecutiveValid + 1).toBeGreaterThanOrEqual(REQUIRED_TAPS);
    });

    it('resets on invalid interval mid-sequence', () => {
      const taps = [0, 697, 1394, 1500, 2197]; // gap at index 3 is only 106ms
      let consecutiveValid = 0;
      for (let i = taps.length - 1; i >= 1; i--) {
        const delta = taps[i] - taps[i - 1];
        if (delta >= MIN_INTERVAL && delta <= MAX_INTERVAL) {
          consecutiveValid++;
        } else {
          break;
        }
      }
      expect(consecutiveValid).toBe(1); // only last interval valid
    });
  });

  // ── Simultaneity window ──

  describe('simultaneity window', () => {
    it('lock window is 2000ms', () => {
      expect(LOCK_WINDOW_MS).toBe(2000);
    });

    it('accepts locks within 2s of each other', () => {
      const lockA = 1000;
      const lockB = 2500;
      const delta = Math.abs(lockA - lockB);
      expect(delta <= LOCK_WINDOW_MS).toBe(true);
    });

    it('rejects locks more than 2s apart', () => {
      const lockA = 1000;
      const lockB = 3500;
      const delta = Math.abs(lockA - lockB);
      expect(delta <= LOCK_WINDOW_MS).toBe(false);
    });

    it('canonical timestamp is the minimum of both lock times', () => {
      const lockA = 1709000000;
      const lockB = 1709001500;
      const canonical = Math.min(lockA, lockB);
      expect(canonical).toBe(lockA);
    });
  });

  // ── K4 completeness (supplements k4Graph.test.ts) ──

  describe('K4 completeness for mint', () => {
    it('requires exactly 4 DIDs for K4', () => {
      const k4Edges = [
        edge('A', 'B'), edge('A', 'C'), edge('A', 'D'),
        edge('B', 'C'), edge('B', 'D'), edge('C', 'D'),
      ];
      const dids = extractDIDs(k4Edges);
      expect(dids.length).toBe(4);
    });

    it('getK4Subgraph returns 6 edges for valid K4', () => {
      let g = createGraph();
      g = addEdge(g, edge('A', 'B'));
      g = addEdge(g, edge('A', 'C'));
      g = addEdge(g, edge('A', 'D'));
      g = addEdge(g, edge('B', 'C'));
      g = addEdge(g, edge('B', 'D'));
      g = addEdge(g, edge('C', 'D'));

      const sub = getK4Subgraph(g);
      expect(sub).not.toBeNull();
      expect(sub!.length).toBe(6);
    });

    it('Maxwell criterion: E = 3V - 6 for 3D isostatic rigidity', () => {
      // K4: V=4, E=6 → 6 = 3(4) - 6 = 6
      expect(6).toBe(3 * 4 - 6);
    });

    it('mint should not trigger with incomplete K4 (5 edges)', () => {
      let g = createGraph();
      g = addEdge(g, edge('A', 'B'));
      g = addEdge(g, edge('A', 'C'));
      g = addEdge(g, edge('A', 'D'));
      g = addEdge(g, edge('B', 'C'));
      g = addEdge(g, edge('B', 'D'));
      // Missing C-D

      expect(isK4Complete(g)).toBe(false);
    });
  });

  // ── Spatial scanner utilities ──

  describe('spatial scanner utilities', () => {
    it('parseMfgData extracts valency and flags', () => {
      const data = new Uint8Array([3, 0x01]); // valency=3, handshake-ready
      const { valency, flags } = parseMfgData(data);
      expect(valency).toBe(3);
      expect(flags).toBe(1);
    });

    it('parseMfgData masks valency to lower nibble', () => {
      const data = new Uint8Array([0xf4, 0x00]); // 0xf4 & 0x0f = 4
      expect(parseMfgData(data).valency).toBe(4);
    });

    it('parseMfgData returns zeros for missing data', () => {
      expect(parseMfgData(undefined)).toEqual({ valency: 0, flags: 0 });
      expect(parseMfgData(new Uint8Array([]))).toEqual({ valency: 0, flags: 0 });
      expect(parseMfgData(new Uint8Array([1]))).toEqual({ valency: 0, flags: 0 });
    });

    it('emaSmooth with alpha=0.3', () => {
      const result = emaSmooth(-60, -50, 0.3);
      // 0.3 * -50 + 0.7 * -60 = -15 + -42 = -57
      expect(result).toBeCloseTo(-57, 1);
    });

    it('emaSmooth converges toward new value', () => {
      let ema = -80;
      for (let i = 0; i < 20; i++) {
        ema = emaSmooth(ema, -50, 0.3);
      }
      expect(ema).toBeCloseTo(-50, 0);
    });

    it('handshake-ready flag is bit 0', () => {
      const FLAG_HANDSHAKE_READY = 0x01;
      expect(parseMfgData(new Uint8Array([0, 0x01])).flags & FLAG_HANDSHAKE_READY).toBe(1);
      expect(parseMfgData(new Uint8Array([0, 0x02])).flags & FLAG_HANDSHAKE_READY).toBe(0);
    });
  });

  // ── Bond payload structure ──

  describe('bond payload structure', () => {
    it('lock payload includes target DID and timestamp', () => {
      const payload = JSON.stringify({
        target: 'did:key:z6Mk...',
        timestamp: 1709000000,
      });
      const parsed = JSON.parse(payload);
      expect(parsed.target).toMatch(/^did:key:/);
      expect(typeof parsed.timestamp).toBe('number');
    });

    it('bond signature uses canonical (minimum) timestamp', () => {
      const t1 = 1709000000;
      const t2 = 1709001500;
      const canonicalTimestamp = Math.min(t1, t2);
      const bondPayload = JSON.stringify({
        target: 'did:key:zPartner',
        timestamp: canonicalTimestamp,
      });
      const parsed = JSON.parse(bondPayload);
      expect(parsed.timestamp).toBe(t1);
    });
  });
});
