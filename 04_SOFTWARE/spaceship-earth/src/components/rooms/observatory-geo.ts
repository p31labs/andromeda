// observatory-geo.ts — Geodesic dome geometry + node-to-face assignment

import * as THREE from 'three';
import type { NodeInfo, FaceAssignment, VTuple } from './observatory-data';
import { VERTICES, AXIS_KEYS, STATE_GLOW, getNodeColor } from './observatory-data';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PHI = (1 + Math.sqrt(5)) / 2;

const TETRA_VERTS = [
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1 / 3, Math.sqrt(8 / 9)),
  new THREE.Vector3(-Math.sqrt(2 / 3), -1 / 3, -Math.sqrt(2 / 9)),
  new THREE.Vector3(Math.sqrt(2 / 3), -1 / 3, -Math.sqrt(2 / 9)),
];

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface GeoFace {
  indices: [number, number, number];
  centroid: THREE.Vector3;
}

export interface GeodesicResult {
  verts: THREE.Vector3[];
  edges: [number, number][];
  faces: GeoFace[];
}

export interface AssignmentResult {
  assignments: FaceAssignment[];
  faceToNode: Map<number, FaceAssignment>;
  nodeToFace: Map<string, FaceAssignment>;
}

// ═══════════════════════════════════════════════════════════════
// DIRECTION VECTOR (tetrahedral frame)
// ═══════════════════════════════════════════════════════════════

export function nodeDirection(a: number, b: number, c: number, d: number): THREE.Vector3 {
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

export function buildGeodesic(radius: number, subdivisions: number): GeodesicResult {
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

export function assignNodesToFaces(geoFaces: GeoFace[]): AssignmentResult {
  const nodeEntries = Object.entries(VERTICES);
  const assignments: FaceAssignment[] = [];
  const usedFaces = new Set<number>();
  const faceToNode = new Map<number, FaceAssignment>();
  const nodeToFace = new Map<string, FaceAssignment>();

  // Sort nodes by state priority (countdown/missing first to get best face matches)
  const prioritized = nodeEntries.map(([id, data]: [string, VTuple]) => {
    const [label, a, b, c, d, state, bus, notes] = data;
    const dir = nodeDirection(a, b, c, d);
    const priority = state === 'countdown' ? 0 : state === 'missing' ? 1 : state === 'active' ? 2 : 3;
    return { id, label, a, b, c, d, state, bus, notes, dir, priority };
  }).sort((x, y) => x.priority - y.priority);

  for (const n of prioritized) {
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
      nodeToFace.set(n.id, assignment);
    }
  }

  return { assignments, faceToNode, nodeToFace };
}
