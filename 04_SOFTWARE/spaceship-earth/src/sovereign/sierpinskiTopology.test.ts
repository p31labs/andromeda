/**
 * sierpinskiTopology.test.ts — Unit tests for the Posner 1:9 fractal topology.
 *
 * All functions under test are pure (no DOM, no Three.js, no browser APIs),
 * so these run in the default Vitest `node` environment without stubs.
 */

import { describe, it, expect } from 'vitest';
import {
  buildPosnerTopology,
  computeRevealState,
  nodeToAABB,
  isAABBVisible,
  DEFAULT_THRESHOLDS,
  type PosnerNode,
} from './sierpinskiTopology';

// ── buildPosnerTopology ───────────────────────────────────────────────────

describe('buildPosnerTopology', () => {
  it('depth 0: returns hub + 9 calcium slots (10 nodes)', () => {
    const nodes = buildPosnerTopology(0);
    expect(nodes).toHaveLength(10);
  });

  it('hub node has id "hub", slot 0, depth 0, position {0,0}', () => {
    const [hub] = buildPosnerTopology(0);
    expect(hub.id).toBe('hub');
    expect(hub.slot).toBe(0);
    expect(hub.depth).toBe(0);
    expect(hub.position.x).toBeCloseTo(0);
    expect(hub.position.y).toBeCloseTo(0);
  });

  it('depth 0: hub is revealed and bright; calcium slots are dim', () => {
    const nodes = buildPosnerTopology(0);
    const hub  = nodes.find(n => n.id === 'hub')!;
    expect(hub.revealed).toBe(true);
    expect(hub.brightness).toBe(1);

    const calcium = nodes.filter(n => n.depth === 0 && n.id !== 'hub');
    for (const c of calcium) {
      expect(c.revealed).toBe(true);
      expect(c.brightness).toBeLessThan(1);
    }
  });

  it('depth 1: adds 9 children per calcium slot = 81 depth-1 nodes (9 slots × 9)', () => {
    const nodes = buildPosnerTopology(1);
    const d1 = nodes.filter(n => n.depth === 1);
    expect(d1).toHaveLength(81); // 9 calcium slots × 9 children each
  });

  it('depth 1: all depth-1 nodes start unrevealed (brightness 0)', () => {
    const nodes = buildPosnerTopology(1);
    const d1 = nodes.filter(n => n.depth === 1);
    for (const n of d1) {
      expect(n.revealed).toBe(false);
      expect(n.brightness).toBe(0);
    }
  });

  it('depth 2: adds 729 depth-2 nodes (81 × 9)', () => {
    const nodes = buildPosnerTopology(2);
    const d2 = nodes.filter(n => n.depth === 2);
    expect(d2).toHaveLength(729); // 81 depth-1 nodes × 9 children each
  });

  it('depth 1 scale is 1/3', () => {
    const nodes = buildPosnerTopology(1);
    const d1 = nodes.filter(n => n.depth === 1);
    for (const n of d1) {
      expect(n.scale).toBeCloseTo(1 / 3);
    }
  });

  it('depth 2 scale is 1/9', () => {
    const nodes = buildPosnerTopology(2);
    const d2 = nodes.filter(n => n.depth === 2);
    for (const n of d2) {
      expect(n.scale).toBeCloseTo(1 / 9);
    }
  });

  it('all depth-0 calcium nodes have roomId set', () => {
    const nodes = buildPosnerTopology(0);
    const calcium = nodes.filter(n => n.depth === 0 && n.id !== 'hub');
    for (const c of calcium) {
      expect(c.roomId).toBeTruthy();
    }
  });

  it('slot IDs follow "slot-N" pattern for depth-0', () => {
    const nodes = buildPosnerTopology(0);
    const calcium = nodes.filter(n => n.depth === 0 && n.id !== 'hub');
    for (const c of calcium) {
      expect(c.id).toMatch(/^slot-\d$/);
    }
  });
});

// ── computeRevealState ────────────────────────────────────────────────────

describe('computeRevealState', () => {
  it('depth-0 nodes always revealed regardless of spoon ratio', () => {
    const nodes = buildPosnerTopology(1);
    const result = computeRevealState(nodes, 0, 0, new Set());
    const d0 = result.filter(n => n.depth === 0);
    for (const n of d0) {
      expect(n.revealed).toBe(true);
    }
  });

  it('hub brightness is always 1.0 (slot 0)', () => {
    const nodes = buildPosnerTopology(0);
    const result = computeRevealState(nodes, 0, 0, new Set());
    const hub = result.find(n => n.id === 'hub')!;
    expect(hub.brightness).toBe(1.0);
  });

  it('interacted depth-0 slot has brightness 1.0', () => {
    const nodes = buildPosnerTopology(0);
    const result = computeRevealState(nodes, 1, 0, new Set([1]));
    const slot1 = result.find(n => n.id === 'slot-1')!;
    expect(slot1.brightness).toBe(1.0);
  });

  it('un-interacted depth-0 slot has brightness 0.3', () => {
    const nodes = buildPosnerTopology(0);
    const result = computeRevealState(nodes, 1, 0, new Set());
    const slot1 = result.find(n => n.id === 'slot-1')!;
    expect(slot1.brightness).toBe(0.3);
  });

  it('depth-1 nodes NOT revealed when parent not interacted', () => {
    const nodes = buildPosnerTopology(1);
    const result = computeRevealState(nodes, 1, 0, new Set());
    const d1 = result.filter(n => n.depth === 1);
    for (const n of d1) {
      expect(n.revealed).toBe(false);
    }
  });

  it('depth-1 nodes NOT revealed when spoon ratio below threshold', () => {
    const nodes = buildPosnerTopology(1);
    // Below depth1SpoonLevel (0.3), even with parent interacted
    const result = computeRevealState(nodes, 0.1, 0, new Set([1]));
    const d1ParentSlot1 = result.filter(n => n.depth === 1 && n.parentId === 'slot-1');
    for (const n of d1ParentSlot1) {
      expect(n.revealed).toBe(false);
    }
  });

  it('depth-1 nodes revealed when parent interacted + spoon OK', () => {
    const nodes = buildPosnerTopology(1);
    const result = computeRevealState(nodes, 0.5, 0, new Set([1]));
    const d1ParentSlot1 = result.filter(n => n.depth === 1 && n.parentId === 'slot-1');
    for (const n of d1ParentSlot1) {
      expect(n.revealed).toBe(true);
      expect(n.brightness).toBe(0.7);
    }
  });

  it('depth-2 nodes revealed when d1 parent revealed + quests OK', () => {
    // computeRevealState reads parent.revealed from the INPUT nodes array.
    // So: first compute the depth-1 reveal pass, then feed that output back
    // as the input for depth-2 checking.
    const nodes = buildPosnerTopology(2);
    const allSlots = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const spoon = 1;
    const quests = DEFAULT_THRESHOLDS.depth2QuestsCompleted;

    // Pass 1: resolve depth-1 revealed state
    const pass1 = computeRevealState(nodes, spoon, quests, allSlots);
    // Pass 2: depth-2 nodes read parent.revealed from pass1 result
    const pass2 = computeRevealState(pass1, spoon, quests, allSlots);

    const revealedD2 = pass2.filter(n => n.depth === 2 && n.revealed);
    expect(revealedD2.length).toBeGreaterThan(0);
  });

  it('depth-2 nodes NOT revealed when quests below threshold', () => {
    const nodes = buildPosnerTopology(2);
    const allSlots = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const result = computeRevealState(nodes, 1, 0, allSlots);
    const d2 = result.filter(n => n.depth === 2);
    for (const n of d2) {
      expect(n.revealed).toBe(false);
    }
  });
});

// ── nodeToAABB / isAABBVisible ────────────────────────────────────────────

describe('nodeToAABB', () => {
  it('hub at (0,0) maps to center of viewport', () => {
    const hub: PosnerNode = {
      id: 'hub', slot: 0, depth: 0, label: 'Hub', parentId: null,
      position: { x: 0, y: 0 }, scale: 1, revealed: true, brightness: 1,
    };
    const aabb = nodeToAABB(hub, 400, 800);
    // cx = 0.5 × 400 = 200, cy = 0.5 × 800 = 400
    expect(aabb.minX).toBeLessThan(200);
    expect(aabb.maxX).toBeGreaterThan(200);
    expect(aabb.minY).toBeLessThan(400);
    expect(aabb.maxY).toBeGreaterThan(400);
  });

  it('depth-2 node has much smaller AABB than hub (scale 1/9)', () => {
    const hub: PosnerNode = {
      id: 'hub', slot: 0, depth: 0, label: 'Hub', parentId: null,
      position: { x: 0, y: 0 }, scale: 1, revealed: true, brightness: 1,
    };
    const small: PosnerNode = {
      id: 'slot-1.1.1', slot: 111, depth: 2, label: 'Sub', parentId: 'slot-1.1',
      position: { x: 0, y: 0 }, scale: 1 / 9, revealed: true, brightness: 0.4,
    };
    const hubAABB   = nodeToAABB(hub, 400, 800);
    const smallAABB = nodeToAABB(small, 400, 800);
    const hubSize   = hubAABB.maxX - hubAABB.minX;
    const smallSize = smallAABB.maxX - smallAABB.minX;
    expect(smallSize).toBeLessThan(hubSize);
  });
});

describe('isAABBVisible', () => {
  const W = 400, H = 800;

  it('AABB fully inside viewport is visible', () => {
    expect(isAABBVisible({ minX: 100, minY: 100, maxX: 300, maxY: 700 }, W, H)).toBe(true);
  });

  it('AABB fully outside to the left is not visible', () => {
    expect(isAABBVisible({ minX: -200, minY: 100, maxX: -100, maxY: 700 }, W, H)).toBe(false);
  });

  it('AABB partially overlapping left edge is visible (default margin 50)', () => {
    // minX = -40 (inside margin 50), maxX = 100
    expect(isAABBVisible({ minX: -40, minY: 100, maxX: 100, maxY: 700 }, W, H)).toBe(true);
  });

  it('AABB outside right edge beyond margin is not visible', () => {
    expect(isAABBVisible({ minX: 460, minY: 100, maxX: 600, maxY: 700 }, W, H)).toBe(false);
  });

  it('AABB outside top edge beyond margin is not visible', () => {
    expect(isAABBVisible({ minX: 100, minY: -200, maxX: 300, maxY: -60 }, W, H)).toBe(false);
  });
});
