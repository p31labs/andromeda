// observatory-data.ts — Graph data, types, constants, helpers

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type VTuple = [string, number, number, number, number, string, string, string?];

export interface NodeInfo {
  id: string; label: string;
  a: number; b: number; c: number; d: number;
  state: string; bus: string; notes?: string;
}

export interface ConnectionInfo {
  id: string; label: string; type: string; axis: AxisKey;
}

export interface FaceAssignment {
  faceIdx: number;
  node: NodeInfo;
  color: THREE.Color;
  glow: number;
}

export const AXIS_KEYS = ['a', 'b', 'c', 'd'] as const;
export type AxisKey = typeof AXIS_KEYS[number];

// ═══════════════════════════════════════════════════════════════
// GRAPH DATA — [label, a, b, c, d, state, bus, notes?]
// ═══════════════════════════════════════════════════════════════

export const VERTICES: Record<string, VTuple> = {
  'med-calcitriol': ['Calcitriol', 4, 0, 0, 0, 'ongoing', 'vital', '12hr dose cycle'],
  'med-effexor': ['Effexor XR', 4, 0, 0, 0, 'ongoing', 'vital'],
  'med-vyvanse': ['Vyvanse', 3, 0, 1, 0, 'ongoing', 'vital'],
  'med-calcium': ['Ca/Mg', 4, 0, 0, 0, 'ongoing', 'vital'],
  'spoon-budget': ['Spoon Budget', 4, 0, 0, 0, 'active', 'vital', '12/20'],
  'audhd': ['AuDHD Dx', 4, 0, 0, 0, 'active', 'vital', '2025'],
  'hypopara': ['Hypoparathyroid', 4, 0, 0, 0, 'ongoing', 'vital', 'Since 2003'],
  'exec-dys': ['Exec Dysfunction', 3, 0, 1, 0, 'active', 'vital'],
  'fawn': ['Fawn Response', 3, 1, 0, 0, 'monitoring', 'vital'],
  'decoherence': ['Decoherence', 3, 0, 0, 1, 'monitoring', 'ac'],
  'snap': ['SNAP', 3, 1, 0, 0, 'active', 'vital'],
  'medicaid': ['Medicaid', 3, 1, 0, 0, 'active', 'vital', 'All 3 covered'],
  'kids-bash': ['S.J.', 0, 4, 0, 0, 'monitoring', 'vital', 'T-7 to birthday'],
  'kids-willow': ['W.J.', 0, 4, 0, 0, 'monitoring', 'vital'],
  'brenda': ['B.O.', 0, 4, 0, 0, 'active', 'vital', 'Support person'],
  'tyler': ['T.', 0, 3, 1, 0, 'active', 'ac', 'Beta tester'],
  'robby': ['R.A.', 0, 2, 0, 2, 'complete', 'ac', 'Signed 3112B'],
  'bonding-game': ['BONDING', 0, 3, 1, 0, 'deployed', 'ac', '488 tests, live'],
  'bonding-mp': ['Multiplayer', 0, 3, 1, 0, 'deployed', 'ac'],
  'bonding-quest': ['Quest Chains', 0, 2, 2, 0, 'stretch', 'dc'],
  'kids-encopresis': ['Encopresis Doc', 1, 3, 0, 0, 'active', 'ac'],
  'p31-labs': ['P31 Labs', 1, 1, 2, 0, 'active', 'ac', '501(c)(3)'],
  'spaceship': ['Spaceship Earth', 0, 1, 3, 0, 'deployed', 'ac', 'p31ca.org'],
  'buffer': ['The Buffer', 2, 1, 1, 0, 'building', 'dc', '~85%'],
  'node-one': ['Node One', 1, 0, 3, 0, 'prototype', 'dc', 'ESP32-S3'],
  'whale': ['Whale Channel', 0, 2, 2, 0, 'planned', 'dc'],
  'centaur': ['The Centaur', 1, 1, 2, 0, 'active', 'ac'],
  'andromeda': ['Andromeda Mono', 0, 0, 4, 0, 'active', 'ac', '927 tests'],
  'genesis': ['Genesis Block', 0, 1, 3, 0, 'deployed', 'ac', 'SHA-256 chain'],
  'love-econ': ['L.O.V.E.', 1, 1, 2, 0, 'deployed', 'ac', 'Soulbound'],
  'phosphorus31': ['phosphorus31.org', 0, 0, 3, 1, 'deployed', 'ac'],
  'p31ca-site': ['p31ca.org', 0, 1, 3, 0, 'deployed', 'ac'],
  'hcb': ['HCB Fiscal', 0, 0, 2, 2, 'pending', 'ac', 'ref 4XDUXX'],
  'stripe-wallet': ['Stripe Wallet', 0, 0, 3, 1, 'planned', 'dc'],
  'cloudflare': ['Cloudflare Pages', 0, 0, 4, 0, 'active', 'ac'],
  'relay': ['CF Worker Relay', 0, 0, 4, 0, 'deployed', 'ac'],
  'posner': ['Posner Molecule', 2, 0, 2, 0, 'active', 'dc', 'Ca9(PO4)6'],
  'larmor': ['863 Hz', 1, 0, 1, 2, 'active', 'dc', 'Larmor canonical'],
  'ivm': ['IVM Geometry', 0, 0, 4, 0, 'active', 'dc'],
  'wye-delta': ['Wye to Delta', 0, 1, 3, 0, 'active', 'dc'],
  'soulsafe': ['SOULSAFE', 0, 0, 2, 2, 'active', 'ac'],
  'opm-3112a': ['SF 3112A', 1, 0, 0, 3, 'complete', 'ac'],
  'opm-3112b': ['SF 3112B', 0, 0, 0, 4, 'complete', 'ac'],
  'opm-3112c': ['SF 3112C', 1, 0, 0, 3, 'complete', 'ac'],
  'opm-3112d': ['SF 3112D', 0, 0, 0, 4, 'missing', 'ac', 'Agency owes'],
  'opm-3112e': ['SF 3112E', 0, 0, 0, 4, 'missing', 'ac', 'Agency owes'],
  'opm-sf3107': ['SF 3107', 0, 0, 0, 4, 'todo', 'ac'],
  'opm-deadline': ['OPM Sep 26', 0, 0, 0, 4, 'countdown', 'vital'],
  'opm-mail': ['Mail Boyers PA', 0, 0, 0, 4, 'actionable', 'ac'],
  'court-mar12': ['March 12 Hearing', 1, 1, 0, 3, 'countdown', 'vital', 'T-9'],
  'court-contempt': ['Contempt Response', 0, 0, 0, 4, 'complete', 'ac', 'Docket 74'],
  'court-vexatious': ['Vexatious Response', 0, 0, 0, 4, 'complete', 'ac', 'Docket 69'],
  'court-ada': ['ADA Accommodation', 1, 0, 0, 3, 'complete', 'ac'],
  'court-void': ['Void Ab Initio', 0, 0, 0, 4, 'active', 'ac', 'Core strategy'],
  'court-tsp': ['TSP Fraud Evidence', 0, 0, 1, 3, 'complete', 'ac', 'IRS-verified'],
  'ssa-psych': ['SSA Psych Exam', 4, 0, 0, 0, 'complete', 'ac', 'Feb 20'],
  'ssa-medical': ['SSA Medical Exam', 4, 0, 0, 0, 'complete', 'ac', 'Feb 26'],
  'ssa-decision': ['SSA Determination', 3, 0, 0, 1, 'waiting', 'ac'],
};

export const EDGES: [string, string, string][] = [
  ['med-calcitriol', 'hypopara', 'treats'], ['med-calcium', 'hypopara', 'treats'],
  ['med-effexor', 'audhd', 'treats'], ['med-vyvanse', 'audhd', 'treats'],
  ['audhd', 'exec-dys', 'causes'], ['audhd', 'fawn', 'causes'],
  ['fawn', 'decoherence', 'triggers'], ['exec-dys', 'spoon-budget', 'drains'],
  ['kids-bash', 'bonding-game', 'plays'], ['kids-willow', 'bonding-game', 'plays'],
  ['bonding-game', 'bonding-mp', 'includes'], ['bonding-game', 'bonding-quest', 'includes'],
  ['bonding-game', 'love-econ', 'earns'], ['bonding-mp', 'relay', 'uses'],
  ['opm-3112a', 'opm-3112b', 'requires'], ['opm-3112b', 'opm-3112c', 'requires'],
  ['opm-3112c', 'opm-3112d', 'requires'], ['opm-3112d', 'opm-3112e', 'requires'],
  ['opm-3112e', 'opm-sf3107', 'requires'], ['opm-sf3107', 'opm-mail', 'then'],
  ['opm-deadline', 'opm-mail', 'deadline'],
  ['court-mar12', 'court-contempt', 'includes'], ['court-mar12', 'court-vexatious', 'includes'],
  ['court-mar12', 'court-ada', 'includes'], ['court-mar12', 'court-void', 'strategy'],
  ['court-void', 'court-tsp', 'evidence'],
  ['p31-labs', 'spaceship', 'builds'], ['p31-labs', 'buffer', 'builds'],
  ['p31-labs', 'node-one', 'builds'], ['p31-labs', 'bonding-game', 'builds'],
  ['p31-labs', 'whale', 'plans'], ['p31-labs', 'centaur', 'uses'],
  ['spaceship', 'genesis', 'uses'], ['spaceship', 'love-econ', 'displays'],
  ['andromeda', 'spaceship', 'contains'], ['andromeda', 'bonding-game', 'contains'],
  ['phosphorus31', 'cloudflare', 'hosted'], ['p31ca-site', 'cloudflare', 'hosted'],
  ['p31-labs', 'hcb', 'fiscal'], ['p31-labs', 'stripe-wallet', 'planned'],
  ['relay', 'cloudflare', 'hosted'], ['genesis', 'relay', 'sends'],
  ['posner', 'larmor', 'resonates'], ['posner', 'ivm', 'geometry'],
  ['ivm', 'wye-delta', 'topology'], ['soulsafe', 'andromeda', 'governs'],
  ['brenda', 'court-ada', 'support'], ['tyler', 'bonding-mp', 'tests'],
  ['robby', 'opm-3112b', 'signed'],
  ['ssa-psych', 'audhd', 'evaluates'], ['ssa-medical', 'hypopara', 'evaluates'],
  ['ssa-decision', 'ssa-psych', 'depends'], ['ssa-decision', 'ssa-medical', 'depends'],
  ['snap', 'spoon-budget', 'sustains'], ['medicaid', 'med-calcitriol', 'covers'],
  ['medicaid', 'kids-bash', 'covers'], ['medicaid', 'kids-willow', 'covers'],
];

// ═══════════════════════════════════════════════════════════════
// COLORS & CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const AXIS_COLORS: Record<AxisKey, THREE.Color> = {
  a: new THREE.Color(0xff9944), b: new THREE.Color(0x44aaff),
  c: new THREE.Color(0x44ffaa), d: new THREE.Color(0xff4466),
};
export const AXIS_CSS: Record<AxisKey, string> = { a: '#ff9944', b: '#44aaff', c: '#44ffaa', d: '#ff4466' };
export const AXIS_LABELS: Record<AxisKey, string> = { a: 'Body', b: 'Mesh', c: 'Forge', d: 'Shield' };

export const STATE_GLOW: Record<string, number> = {
  countdown: 2.0, critical: 2.5, todo: 0.8, actionable: 1.5, done: 0.4,
  complete: 0.4, active: 1.0, ongoing: 0.6, monitoring: 0.6, info: 0.3,
  waiting: 0.5, deployed: 0.7, building: 0.9, planned: 0.3, prototype: 0.5,
  stretch: 0.4, missing: 1.2, pending: 1.0,
};
export const BUS_CSS: Record<string, string> = { vital: '#ff6633', ac: '#33aacc', dc: '#cccc44' };

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function getDominantAxis(a: number, b: number, c: number, d: number): AxisKey {
  const v = { a, b, c, d };
  let max = -1, axis: AxisKey = 'a';
  for (const k of AXIS_KEYS) { if (v[k] > max) { max = v[k]; axis = k; } }
  return axis;
}

export function getNodeColor(a: number, b: number, c: number, d: number): THREE.Color {
  const sum = a + b + c + d || 1;
  const col = new THREE.Color(0, 0, 0);
  for (const k of AXIS_KEYS) {
    const w = ({ a, b, c, d })[k] / sum;
    col.r += AXIS_COLORS[k].r * w;
    col.g += AXIS_COLORS[k].g * w;
    col.b += AXIS_COLORS[k].b * w;
  }
  return col;
}

export function getConnections(nodeId: string): ConnectionInfo[] {
  return EDGES
    .filter(([s, t]) => s === nodeId || t === nodeId)
    .map(([s, t, type]) => {
      const otherId = s === nodeId ? t : s;
      const other = VERTICES[otherId];
      if (!other) return null;
      return { id: otherId, label: other[0], type, axis: getDominantAxis(other[1], other[2], other[3], other[4]) };
    })
    .filter((c): c is ConnectionInfo => c !== null);
}

// ═══════════════════════════════════════════════════════════════
// COUNTDOWN DATES
// ═══════════════════════════════════════════════════════════════

const COUNTDOWN_DATES: Record<string, string> = {
  'court-mar12': '2026-03-12',
  'opm-deadline': '2026-09-26',
  'kids-bash': '2026-03-10',
};

export function getCountdownLabel(nodeId: string): string | null {
  const dateStr = COUNTDOWN_DATES[nodeId];
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `T+${Math.abs(diffDays)}`;
  return `T-${diffDays}`;
}
