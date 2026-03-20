/**
 * @file sierpinskiTopology — Progressive disclosure fractal for Spaceship Earth navigation.
 *
 * Posner 1:9 topology:
 *   Inspired by Matthew Fisher's Posner cluster model (Ca₉(PO₄)₆ — 9 calcium ions
 *   surrounding a phosphorus core). The UI mirrors this: one phosphorus hub (slot 0)
 *   surrounded by 9 calcium room slots (slots 1-9).
 *
 *   Hub (slot 0) — immutable system controls (Observatory, Bridge, Landing, Copilot)
 *   Slots 1-9    — one-to-one mapping to the 9 sovereign rooms
 *
 * Fractal depth levels:
 *   Depth 0 — only hub + 9 calcium slots visible (first visit)
 *   Depth 1 — each slot can expand: shows 3 sub-slots (IFS scale 1/3)
 *   Depth 2 — full fractal: each sub-slot has 3 more (IFS scale 1/9)
 *
 * IFS (Iterated Function System) positioning:
 *   Slots are placed on a unit circle at angular spacing 2π/9.
 *   Each child node is positioned at 1/3 the parent's scale, offset by the same
 *   angular grid. This creates a Sierpinski-triangle-like self-similar structure.
 *   `SLOT_RADIUS = 0.38` keeps nodes within a normalized [−0.5, 0.5] viewport.
 *
 * Progressive reveal:
 *   `computeRevealState(nodes, interactedSlots)` — sets `revealed = true` and
 *   lerps `brightness` for slots the user has interacted with. Unvisited depth-2
 *   slots start hidden (brightness 0) and fade in as neighbouring slots are explored.
 */

import type { SovereignRoom } from './types';

// ── Posner topology node ──
export interface PosnerNode {
  id: string;           // e.g., "hub", "slot-1", "slot-1.3"
  slot: number;         // 0 = hub, 1-9 = calcium slots
  depth: number;        // 0 = root, 1 = first expansion, 2 = full fractal
  label: string;
  parentId: string | null;
  roomId?: SovereignRoom | string; // mapped room or dynamic slot
  // IFS affine position (relative to parent)
  position: { x: number; y: number };
  scale: number;        // 1/3^depth
  revealed: boolean;    // progressive disclosure state
  brightness: number;   // 0-1, lerped based on engagement
}

// ── Hub contents (Slot 0 — immutable) ──
export const HUB_CONTENTS = [
  { label: 'Room Router', roomId: 'OBSERVATORY' as SovereignRoom },
  { label: 'LOVE Wallet', roomId: 'BRIDGE' as SovereignRoom },
  { label: 'Genesis Block', roomId: 'LANDING' as SovereignRoom },
  { label: 'Centaur Terminal', roomId: 'COPILOT' as SovereignRoom },
] as const;

// ── Calcium slot mapping (1-9) ──
const CALCIUM_SLOTS: { slot: number; label: string; roomId: SovereignRoom | string }[] = [
  { slot: 1, label: 'Observatory', roomId: 'OBSERVATORY' },
  { slot: 2, label: 'Collider', roomId: 'COLLIDER' },
  { slot: 3, label: 'Bonding', roomId: 'BONDING' },
  { slot: 4, label: 'Bridge', roomId: 'BRIDGE' },
  { slot: 5, label: 'Buffer', roomId: 'BUFFER' },
  { slot: 6, label: 'Brain', roomId: 'COPILOT' },
  { slot: 7, label: 'Quantum IDE', roomId: 'LANDING' },
  { slot: 8, label: 'Resonance', roomId: 'RESONANCE' },
  { slot: 9, label: 'Forge', roomId: 'FORGE' },
];

// ── IFS affine transform: 9 positions around center ──
// Positions on unit circle with angular spacing
const SLOT_ANGLES = Array.from({ length: 9 }, (_, i) => (i * Math.PI * 2) / 9 - Math.PI / 2);
const SLOT_RADIUS = 0.38; // normalized radius from hub center

function slotPosition(slotIdx: number): { x: number; y: number } {
  const angle = SLOT_ANGLES[slotIdx];
  return {
    x: Math.cos(angle) * SLOT_RADIUS,
    y: Math.sin(angle) * SLOT_RADIUS,
  };
}

// ── Build topology at given max depth ──
export function buildPosnerTopology(maxDepth: number): PosnerNode[] {
  const nodes: PosnerNode[] = [];

  // Hub (depth 0, slot 0)
  nodes.push({
    id: 'hub',
    slot: 0,
    depth: 0,
    label: 'P31 Hub',
    parentId: null,
    position: { x: 0, y: 0 },
    scale: 1,
    revealed: true,
    brightness: 1,
  });

  // Depth 0: 9 calcium slots
  for (const cs of CALCIUM_SLOTS) {
    const pos = slotPosition(cs.slot - 1);
    nodes.push({
      id: `slot-${cs.slot}`,
      slot: cs.slot,
      depth: 0,
      label: cs.label,
      parentId: 'hub',
      roomId: cs.roomId,
      position: pos,
      scale: 1,
      revealed: true,
      brightness: 0.3, // dim until engaged
    });
  }

  if (maxDepth < 1) return nodes;

  // Depth 1: each slot spawns 9 children (scale 1/3)
  for (const cs of CALCIUM_SLOTS) {
    const parentPos = slotPosition(cs.slot - 1);
    for (let child = 0; child < 9; child++) {
      const childOffset = slotPosition(child);
      const childScale = 1 / 3;
      nodes.push({
        id: `slot-${cs.slot}.${child + 1}`,
        slot: cs.slot * 10 + child + 1,
        depth: 1,
        label: `${cs.label} ${child + 1}`,
        parentId: `slot-${cs.slot}`,
        roomId: cs.roomId,
        position: {
          x: parentPos.x + childOffset.x * childScale,
          y: parentPos.y + childOffset.y * childScale,
        },
        scale: childScale,
        revealed: false,
        brightness: 0,
      });
    }
  }

  if (maxDepth < 2) return nodes;

  // Depth 2: each depth-1 node spawns 9 (scale 1/9)
  const depth1Nodes = nodes.filter(n => n.depth === 1);
  for (const d1 of depth1Nodes) {
    for (let child = 0; child < 9; child++) {
      const childOffset = slotPosition(child);
      const childScale = 1 / 9;
      nodes.push({
        id: `${d1.id}.${child + 1}`,
        slot: d1.slot * 10 + child + 1,
        depth: 2,
        label: `${d1.label}.${child + 1}`,
        parentId: d1.id,
        position: {
          x: d1.position.x + childOffset.x * childScale,
          y: d1.position.y + childOffset.y * childScale,
        },
        scale: childScale,
        revealed: false,
        brightness: 0,
      });
    }
  }

  return nodes;
}

// ── D4.6: Progressive reveal thresholds ──
export interface RevealThresholds {
  depth1SpoonLevel: number;   // min spoon ratio to reveal depth 1
  depth2QuestsCompleted: number; // quests needed for depth 2
}

export const DEFAULT_THRESHOLDS: RevealThresholds = {
  depth1SpoonLevel: 0.3,      // 30% spoons remaining
  depth2QuestsCompleted: 3,   // completed 3 quests
};

// Determine which nodes should be revealed based on engagement
export function computeRevealState(
  nodes: PosnerNode[],
  spoonRatio: number,     // 0-1, current/max
  questsCompleted: number,
  interactedSlots: Set<number>, // slots user has tapped/visited
  thresholds: RevealThresholds = DEFAULT_THRESHOLDS,
): PosnerNode[] {
  return nodes.map(node => {
    if (node.depth === 0) {
      // Always visible, brightness depends on interaction
      const interacted = node.slot === 0 || interactedSlots.has(node.slot);
      return {
        ...node,
        revealed: true,
        brightness: interacted ? 1.0 : 0.3,
      };
    }

    if (node.depth === 1) {
      // Reveal when parent slot interacted + spoon threshold met
      const parentSlot = parseInt(node.parentId?.replace('slot-', '') ?? '0');
      const parentInteracted = interactedSlots.has(parentSlot);
      const spoonOk = spoonRatio >= thresholds.depth1SpoonLevel;
      const revealed = parentInteracted && spoonOk;
      return {
        ...node,
        revealed,
        brightness: revealed ? 0.7 : 0,
      };
    }

    if (node.depth === 2) {
      // Reveal when depth-1 parent revealed + quest threshold
      const parentNode = nodes.find(n => n.id === node.parentId);
      const parentRevealed = parentNode?.revealed ?? false;
      const questOk = questsCompleted >= thresholds.depth2QuestsCompleted;
      const revealed = parentRevealed && questOk;
      return {
        ...node,
        revealed,
        brightness: revealed ? 0.4 : 0,
      };
    }

    return node;
  });
}

// ── D4.4/D4.8: AABB frustum test (2D simplified for CSS overlay) ──
export interface AABB2D {
  minX: number; minY: number;
  maxX: number; maxY: number;
}

export function nodeToAABB(node: PosnerNode, viewportW: number, viewportH: number): AABB2D {
  // Map normalized position to viewport pixels
  const cx = (0.5 + node.position.x) * viewportW;
  const cy = (0.5 + node.position.y) * viewportH;
  const halfSize = node.scale * 40; // base node size in px
  return {
    minX: cx - halfSize,
    minY: cy - halfSize,
    maxX: cx + halfSize,
    maxY: cy + halfSize,
  };
}

export function isAABBVisible(
  aabb: AABB2D,
  viewportW: number,
  viewportH: number,
  margin: number = 50,
): boolean {
  return (
    aabb.maxX >= -margin &&
    aabb.minX <= viewportW + margin &&
    aabb.maxY >= -margin &&
    aabb.minY <= viewportH + margin
  );
}
