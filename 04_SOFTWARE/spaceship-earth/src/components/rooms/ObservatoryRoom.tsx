// ObservatoryRoom.tsx — Geodesic Data Dome
// Each triangular PANEL on the dome IS a data node.
// The dome is the visualization. Structure = function.

import { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// GRAPH DATA — [label, a, b, c, d, state, bus, notes?]
// ═══════════════════════════════════════════════════════════════

type VTuple = [string, number, number, number, number, string, string, string?];

const VERTICES: Record<string, VTuple> = {
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

const EDGES: [string, string, string][] = [
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
// GEOMETRY + COLORS
// ═══════════════════════════════════════════════════════════════

const PHI = (1 + Math.sqrt(5)) / 2;

const TETRA_VERTS = [
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1 / 3, Math.sqrt(8 / 9)),
  new THREE.Vector3(-Math.sqrt(2 / 3), -1 / 3, -Math.sqrt(2 / 9)),
  new THREE.Vector3(Math.sqrt(2 / 3), -1 / 3, -Math.sqrt(2 / 9)),
];

const AXIS_KEYS = ['a', 'b', 'c', 'd'] as const;
type AxisKey = typeof AXIS_KEYS[number];

const AXIS_COLORS: Record<AxisKey, THREE.Color> = {
  a: new THREE.Color(0xff9944), b: new THREE.Color(0x44aaff),
  c: new THREE.Color(0x44ffaa), d: new THREE.Color(0xff4466),
};
const AXIS_CSS: Record<AxisKey, string> = { a: '#ff9944', b: '#44aaff', c: '#44ffaa', d: '#ff4466' };
const AXIS_LABELS: Record<AxisKey, string> = { a: 'Body', b: 'Mesh', c: 'Forge', d: 'Shield' };

const STATE_GLOW: Record<string, number> = {
  countdown: 2.0, critical: 2.5, todo: 0.8, actionable: 1.5, done: 0.4,
  complete: 0.4, active: 1.0, ongoing: 0.6, monitoring: 0.6, info: 0.3,
  waiting: 0.5, deployed: 0.7, building: 0.9, planned: 0.3, prototype: 0.5,
  stretch: 0.4, missing: 1.2, pending: 1.0,
};
const BUS_CSS: Record<string, string> = { vital: '#ff6633', ac: '#33aacc', dc: '#cccc44' };

function getDominantAxis(a: number, b: number, c: number, d: number): AxisKey {
  const v = { a, b, c, d };
  let max = -1, axis: AxisKey = 'a';
  for (const k of AXIS_KEYS) { if (v[k] > max) { max = v[k]; axis = k; } }
  return axis;
}

function getNodeColor(a: number, b: number, c: number, d: number): THREE.Color {
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

// Direction vector for a node in the tetrahedron frame
function nodeDirection(a: number, b: number, c: number, d: number): THREE.Vector3 {
  const sum = a + b + c + d || 1;
  const dir = new THREE.Vector3(0, 0, 0);
  dir.addScaledVector(TETRA_VERTS[0], a / sum);
  dir.addScaledVector(TETRA_VERTS[1], b / sum);
  dir.addScaledVector(TETRA_VERTS[2], c / sum);
  dir.addScaledVector(TETRA_VERTS[3], d / sum);
  return dir.normalize();
}

// ═══════════════════════════════════════════════════════════════
// BUILD GEODESIC DOME (2V icosahedron = 80 faces)
// ═══════════════════════════════════════════════════════════════

interface GeoFace {
  indices: [number, number, number];
  centroid: THREE.Vector3;
}

function buildGeodesic(radius: number, subdivisions: number) {
  const t = PHI;
  const rawVerts: [number, number, number][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  let verts = rawVerts.map(([x, y, z]) => {
    const l = Math.sqrt(x * x + y * y + z * z);
    return new THREE.Vector3(x / l * radius, y / l * radius, z / l * radius);
  });
  let faces: number[][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  for (let sub = 0; sub < subdivisions; sub++) {
    const midCache: Record<string, number> = {};
    const getMid = (i: number, j: number): number => {
      const key = Math.min(i, j) + '_' + Math.max(i, j);
      if (midCache[key] !== undefined) return midCache[key];
      const mid = verts[i].clone().add(verts[j]).multiplyScalar(0.5)
        .normalize().multiplyScalar(radius);
      const idx = verts.length;
      verts.push(mid);
      midCache[key] = idx;
      return idx;
    };
    const nf: number[][] = [];
    for (const [a, b, c] of faces) {
      const ab = getMid(a, b), bc = getMid(b, c), ca = getMid(c, a);
      nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = nf;
  }

  // Compute edges
  const edgeSet = new Set<string>();
  for (const [a, b, c] of faces) {
    edgeSet.add(Math.min(a, b) + '_' + Math.max(a, b));
    edgeSet.add(Math.min(b, c) + '_' + Math.max(b, c));
    edgeSet.add(Math.min(a, c) + '_' + Math.max(a, c));
  }
  const edges: [number, number][] = [];
  edgeSet.forEach(e => { const [a, b] = e.split('_').map(Number); edges.push([a, b]); });

  // Compute face centroids
  const geoFaces: GeoFace[] = faces.map(f => {
    const [a, b, c] = f;
    const centroid = new THREE.Vector3()
      .add(verts[a]).add(verts[b]).add(verts[c]).divideScalar(3);
    return { indices: [a, b, c] as [number, number, number], centroid };
  });

  return { verts, edges, faces: geoFaces };
}

// ═══════════════════════════════════════════════════════════════
// ASSIGN NODES TO FACES — nearest centroid match
// ═══════════════════════════════════════════════════════════════

interface NodeInfo {
  id: string; label: string;
  a: number; b: number; c: number; d: number;
  state: string; bus: string; notes?: string;
}

interface FaceAssignment {
  faceIdx: number;
  node: NodeInfo;
  color: THREE.Color;
  glow: number;
}

function assignNodesToFaces(geoFaces: GeoFace[]): { assignments: FaceAssignment[]; faceToNode: Map<number, FaceAssignment> } {
  const nodeEntries = Object.entries(VERTICES);
  const assignments: FaceAssignment[] = [];
  const usedFaces = new Set<number>();
  const faceToNode = new Map<number, FaceAssignment>();

  // Sort nodes by state priority (countdown/missing first to get best face matches)
  const prioritized = nodeEntries.map(([id, data]) => {
    const [label, a, b, c, d, state, bus, notes] = data;
    const dir = nodeDirection(a, b, c, d);
    const priority = state === 'countdown' ? 0 : state === 'missing' ? 1 : state === 'active' ? 2 : 3;
    return { id, label, a, b, c, d, state, bus, notes, dir, priority };
  }).sort((x, y) => x.priority - y.priority);

  for (const n of prioritized) {
    // Find nearest unused face
    let bestIdx = -1;
    let bestDot = -2;
    for (let fi = 0; fi < geoFaces.length; fi++) {
      if (usedFaces.has(fi)) continue;
      const dot = geoFaces[fi].centroid.clone().normalize().dot(n.dir);
      if (dot > bestDot) { bestDot = dot; bestIdx = fi; }
    }
    if (bestIdx >= 0) {
      usedFaces.add(bestIdx);
      const color = getNodeColor(n.a, n.b, n.c, n.d);
      const glow = STATE_GLOW[n.state] || 0.5;
      const assignment: FaceAssignment = {
        faceIdx: bestIdx,
        node: { id: n.id, label: n.label, a: n.a, b: n.b, c: n.c, d: n.d, state: n.state, bus: n.bus, notes: n.notes },
        color,
        glow,
      };
      assignments.push(assignment);
      faceToNode.set(bestIdx, assignment);
    }
  }

  return { assignments, faceToNode };
}

// ═══════════════════════════════════════════════════════════════
// CONNECTION LOOKUP
// ═══════════════════════════════════════════════════════════════

interface ConnectionInfo {
  id: string; label: string; type: string; axis: AxisKey;
}

function getConnections(nodeId: string): ConnectionInfo[] {
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
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ObservatoryRoom() {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({
    down: false, x: 0, y: 0,
    rx: 0.4, ry: 0.15, trx: 0.4, try_: 0.15,
    dist: 7.5, tDist: 7.5,
    moved: false,
  });
  const faceMeshesRef = useRef<THREE.Mesh[]>([]);
  const assignmentsRef = useRef<Map<number, FaceAssignment>>(new Map());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycaster = useRef(new THREE.Raycaster());

  const [selected, setSelected] = useState<NodeInfo | null>(null);
  const [filter, setFilter] = useState<AxisKey | null>(null);

  const connections = useMemo(() => selected ? getConnections(selected.id) : [], [selected]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    // No scene.background or fog — let MolecularField show through clean

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0.5, 7.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x334455, 0.6));
    const pt1 = new THREE.PointLight(0x6688cc, 1.0, 25);
    pt1.position.set(3, 4, 5); scene.add(pt1);
    const pt2 = new THREE.PointLight(0xff6644, 0.3, 18);
    pt2.position.set(-4, -2, 3); scene.add(pt2);

    // ── Build dome ──
    const SHELL_RADIUS = 3.0;
    const geo = buildGeodesic(SHELL_RADIUS, 2); // 2V = 80 faces
    const { assignments, faceToNode } = assignNodesToFaces(geo.faces);
    assignmentsRef.current = faceToNode;

    // ── Outer wireframe shell ──
    const wirePos: number[] = [];
    for (const [a, b] of geo.edges) {
      wirePos.push(geo.verts[a].x, geo.verts[a].y, geo.verts[a].z);
      wirePos.push(geo.verts[b].x, geo.verts[b].y, geo.verts[b].z);
    }
    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePos, 3));
    scene.add(new THREE.LineSegments(wireGeo,
      new THREE.LineBasicMaterial({ color: 0x1a2e44, transparent: true, opacity: 0.5 })));

    // ── Render each face as inset glass panel ──
    const INSET = 0.92; // panels sit slightly inside the wireframe shell
    const faceMeshes: THREE.Mesh[] = [];

    for (let fi = 0; fi < geo.faces.length; fi++) {
      const face = geo.faces[fi];
      const [ai, bi, ci] = face.indices;
      // Inset vertices toward center
      const va = geo.verts[ai].clone().multiplyScalar(INSET);
      const vb = geo.verts[bi].clone().multiplyScalar(INSET);
      const vc = geo.verts[ci].clone().multiplyScalar(INSET);

      // Shrink triangle slightly toward its centroid for gap between panels
      const cent = new THREE.Vector3().add(va).add(vb).add(vc).divideScalar(3);
      const shrink = 0.88;
      va.lerp(cent, 1 - shrink);
      vb.lerp(cent, 1 - shrink);
      vc.lerp(cent, 1 - shrink);

      const triGeo = new THREE.BufferGeometry();
      const positions = new Float32Array([
        va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z,
      ]);
      triGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      triGeo.computeVertexNormals();

      const assignment = faceToNode.get(fi);

      let mat: THREE.MeshPhysicalMaterial;
      if (assignment) {
        // Data panel — colored glass
        const glow = assignment.glow;
        mat = new THREE.MeshPhysicalMaterial({
          color: assignment.color,
          emissive: assignment.color.clone().multiplyScalar(0.15 * glow),
          roughness: 0.08,
          metalness: 0.0,
          transmission: 0.3,
          thickness: 0.5,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
      } else {
        // Empty panel — clear glass
        mat = new THREE.MeshPhysicalMaterial({
          color: 0x111111,
          emissive: new THREE.Color(0x000000),
          roughness: 0.05,
          metalness: 0.0,
          transmission: 0.9,
          thickness: 0.2,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.08,
        });
      }

      const mesh = new THREE.Mesh(triGeo, mat);
      mesh.userData = { faceIdx: fi, assignment };
      scene.add(mesh);
      faceMeshes.push(mesh);
    }
    faceMeshesRef.current = faceMeshes;

    // ── Glow dots on key nodes ──
    const glowTex = (() => {
      const sz = 64;
      const c = document.createElement('canvas');
      c.width = sz; c.height = sz;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.2, 'rgba(255,255,255,0.6)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, sz, sz);
      return new THREE.CanvasTexture(c);
    })();

    for (const a of assignments) {
      if (a.glow < 1.2) continue; // only glow on high-priority nodes
      const face = geo.faces[a.faceIdx];
      const pos = face.centroid.clone().normalize().multiplyScalar(SHELL_RADIUS * 1.04);
      const spriteMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: a.color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos);
      sprite.scale.setScalar(0.35);
      scene.add(sprite);
    }

    // ── Animation ──
    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.002;

      // Breathing — subtle scale
      const breath = 1.0 + 0.008 * Math.sin(t * 1.5);
      for (const m of faceMeshes) m.scale.setScalar(breath);

      // Countdown faces pulse
      for (const m of faceMeshes) {
        const a = m.userData.assignment as FaceAssignment | undefined;
        if (a && a.node.state === 'countdown') {
          const pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 3.0 + a.faceIdx * 0.5));
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
          (m.material as THREE.MeshStandardMaterial).opacity = 0.7 + 0.3 * pulse;
        }
      }

      // Camera orbit + zoom
      const m = mouseRef.current;
      m.trx += (m.rx - m.trx) * 0.06;
      m.try_ += (m.ry - m.try_) * 0.06;
      m.tDist += (m.dist - m.tDist) * 0.08;
      const D = m.tDist;
      camera.position.x = D * Math.sin(m.trx) * Math.cos(m.try_);
      camera.position.y = D * Math.sin(m.try_) + 0.3;
      camera.position.z = D * Math.cos(m.trx) * Math.cos(m.try_);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // ── Input ──
    const getXY = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if ('changedTouches' in e && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      const { x, y } = getXY(e);
      const rect = el.getBoundingClientRect();
      const mr = mouseRef.current;
      mr.down = true; mr.x = x - rect.left; mr.y = y - rect.top; mr.moved = false;
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      const mr = mouseRef.current;
      if (!mr.down) return;
      const { x, y } = getXY(e);
      const rect = el.getBoundingClientRect();
      const nx = x - rect.left, ny = y - rect.top;
      const dx = nx - mr.x, dy = ny - mr.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) mr.moved = true;
      mr.rx -= dx * 0.005;
      mr.ry += dy * 0.004;
      mr.ry = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, mr.ry));
      mr.x = nx; mr.y = ny;
    };
    const onUp = () => { mouseRef.current.down = false; };
    const onClick = (e: MouseEvent | TouchEvent) => {
      if (mouseRef.current.moved) return;
      const { x, y } = getXY(e);
      const rect = el.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((x - rect.left) / rect.width) * 2 - 1,
        -((y - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(mouse, camera);
      const hits = raycaster.current.intersectObjects(faceMeshes);
      if (hits.length > 0) {
        const a = hits[0].object.userData.assignment as FaceAssignment | undefined;
        if (a) setSelected(a.node);
        else setSelected(null);
      } else {
        setSelected(null);
      }
    };

    // Scroll wheel zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const mr = mouseRef.current;
      mr.dist += e.deltaY * 0.003;
      mr.dist = Math.max(3.5, Math.min(12, mr.dist));
    };

    // Pinch zoom
    let lastPinchDist = 0;
    const onTouchStart2 = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
      onDown(e);
    };
    const onTouchMove2 = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDist > 0) {
          const mr = mouseRef.current;
          mr.dist *= lastPinchDist / d;
          mr.dist = Math.max(3.5, Math.min(12, mr.dist));
        }
        lastPinchDist = d;
        return;
      }
      onMove(e);
    };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('click', onClick);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart2, { passive: true });
    el.addEventListener('touchmove', onTouchMove2, { passive: true });
    el.addEventListener('touchend', (e: TouchEvent) => { onUp(); onClick(e); });

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('click', onClick);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // ── Axis filter: hide/show panels ──
  useEffect(() => {
    for (const m of faceMeshesRef.current) {
      const a = m.userData.assignment as FaceAssignment | undefined;
      if (!a) {
        m.visible = !filter; // hide empties when filtering
        continue;
      }
      if (!filter) { m.visible = true; continue; }
      m.visible = getDominantAxis(a.node.a, a.node.b, a.node.c, a.node.d) === filter;
    }
  }, [filter]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'transparent', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' }} />

      {/* Axis filters */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8, zIndex: 10 }}>
        {AXIS_KEYS.map(k => (
          <button key={k} onClick={() => setFilter(filter === k ? null : k)} style={{
            background: filter === k ? AXIS_CSS[k] + '22' : 'transparent',
            border: '1px solid ' + (filter === k ? AXIS_CSS[k] : '#1a2a3a'),
            color: AXIS_CSS[k], padding: '3px 10px', borderRadius: 3, fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
            letterSpacing: 1, textTransform: 'uppercase' as const, transition: 'all 0.2s',
          }}>
            {AXIS_LABELS[k]}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{
        position: 'absolute', top: 12, right: 12, color: '#2a3a4a', fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, zIndex: 10,
      }}>
        {Object.keys(VERTICES).length} PANELS &middot; {EDGES.length} EDGES &middot; 80 FACES
      </div>

      {/* Selected panel */}
      {selected && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, right: 12, maxWidth: 420,
          background: 'rgba(6,10,18,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid #1a2a3a', borderRadius: 6, padding: 14, zIndex: 20,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
              {selected.label}
            </span>
            <button onClick={() => setSelected(null)} style={{
              background: 'none', border: 'none', color: '#3a4a5a', cursor: 'pointer', fontSize: 14, padding: '0 4px',
            }}>{'\u2715'}</button>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#5a6a7a', marginBottom: 6 }}>
            <span style={{ color: AXIS_CSS[getDominantAxis(selected.a, selected.b, selected.c, selected.d)] }}>
              {AXIS_LABELS[getDominantAxis(selected.a, selected.b, selected.c, selected.d)]}
            </span>
            <span style={{
              color: selected.state === 'countdown' ? '#ff6633' : selected.state === 'complete' ? '#44cc77'
                : selected.state === 'missing' ? '#ff4466' : selected.state === 'deployed' ? '#44ffaa' : '#8899aa',
            }}>{selected.state}</span>
            <span style={{ color: BUS_CSS[selected.bus] || '#8899aa' }}>{selected.bus}</span>
          </div>
          {selected.notes && <div style={{ color: '#4a5a6a', fontSize: 9, marginBottom: 6 }}>{selected.notes}</div>}
          {connections.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {connections.map((c, i) => (
                <span key={i} onClick={() => {
                  const d = VERTICES[c.id];
                  if (d) setSelected({ id: c.id, label: d[0], a: d[1], b: d[2], c: d[3], d: d[4], state: d[5], bus: d[6], notes: d[7] });
                }} style={{
                  fontSize: 8, padding: '2px 8px', borderRadius: 2, cursor: 'pointer',
                  background: '#0a0e16', border: '1px solid #151e28',
                  color: AXIS_CSS[c.axis], transition: 'all 0.15s', letterSpacing: 0.5,
                }}>
                  {c.label} <span style={{ color: '#2a3a4a', marginLeft: 2 }}>({c.type})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        position: 'absolute', bottom: selected ? 180 : 12, right: 12, color: '#1a2838',
        fontSize: 8, textAlign: 'right' as const, letterSpacing: 1, transition: 'bottom 0.3s',
        lineHeight: 1.8, fontFamily: "'JetBrains Mono', monospace", zIndex: 5,
      }}>
        <div>DRAG ROTATE</div>
        <div>TAP PANEL</div>
      </div>
    </div>
  );
}
