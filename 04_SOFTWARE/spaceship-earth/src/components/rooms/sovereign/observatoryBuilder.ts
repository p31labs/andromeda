// observatoryBuilder.ts — Builds the production Observatory geodesic dome
// directly into the ImmersiveCockpit's vanilla Three.js scene.
// Reads filter/selection state from observatoryStore.

import * as THREE from 'three';
import {
  VERTICES, EDGES, getConnections, getCountdownLabel, getDominantAxis,
  type NodeInfo, type FaceAssignment,
} from '../observatory-data';
import { buildGeodesic, assignNodesToFaces, type AssignmentResult, type GeodesicResult } from '../observatory-geo';
import {
  createBloomPipeline, createDustMotes, createEdgePulse, createAurora,
  createLabelSystem, buildConnectionArc, disposeArc, getGlowTexture,
  type BloomPipeline, type ArcMesh, type LabelSystem,
} from '../observatory-effects';
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { useObservatoryStore } from './observatoryStore';

// Constants matching original ObservatoryRoom
const SHELL_RADIUS = 3.0;
const GEO_SUBDIVISIONS = 2; // 2V = 80 faces
const INSET = 0.92;
const SHRINK = 0.88;
const DEFAULT_DIST = 7.5;
const FOCUS_DIST = 5.5;
const DUST_COUNT = 200;
const FIELD_COUNT = 600;

import type { OrbitState } from './ImmersiveCockpit';

export interface ObservatoryHandle {
  update: (dt: number, time: number) => void;
  renderBloom: () => void;
  renderLabels: (scene: THREE.Scene, camera: THREE.Camera) => void;
  handleClick: (mouse: THREE.Vector2, camera: THREE.Camera) => void;
  mountLabels: (el: HTMLElement) => void;
  resizeBloom: (w: number, h: number) => void;
  resizeLabels: (w: number, h: number) => void;
  dispose: () => void;
}

export function buildObservatoryScene(
  roomGroup: THREE.Group,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  orbit: OrbitState,
): ObservatoryHandle {
  // ── Geodesic dome ──
  const geo = buildGeodesic(SHELL_RADIUS, GEO_SUBDIVISIONS);
  const assignResult = assignNodesToFaces(geo.faces);
  const { assignments, faceToNode } = assignResult;

  // ── Edge wireframe with pulse shader ──
  const edgePulse = createEdgePulse(geo);
  roomGroup.add(edgePulse.lines);

  // ── Face panels ──
  const faceMeshes: THREE.Mesh[] = [];

  for (let fi = 0; fi < geo.faces.length; fi++) {
    const face = geo.faces[fi];
    const [ai, bi, ci] = face.indices;
    const va = geo.verts[ai].clone().multiplyScalar(INSET);
    const vb = geo.verts[bi].clone().multiplyScalar(INSET);
    const vc = geo.verts[ci].clone().multiplyScalar(INSET);

    const cent = new THREE.Vector3().add(va).add(vb).add(vc).divideScalar(3);
    va.lerp(cent, 1 - SHRINK);
    vb.lerp(cent, 1 - SHRINK);
    vc.lerp(cent, 1 - SHRINK);

    const triGeo = new THREE.BufferGeometry();
    triGeo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z]), 3,
    ));
    triGeo.computeVertexNormals();

    const assignment = faceToNode.get(fi);
    let mat: THREE.MeshPhysicalMaterial;
    if (assignment) {
      const glow = assignment.glow;
      const isHot = glow >= 1.2;
      mat = new THREE.MeshPhysicalMaterial({
        color: assignment.color,
        emissive: assignment.color.clone().multiplyScalar(isHot ? 0.4 : 0.15 * glow),
        emissiveIntensity: isHot ? 1.5 * glow : 1.0,
        roughness: 0.08, metalness: 0.0,
        transmission: 0.3, thickness: 0.5,
        side: THREE.DoubleSide, transparent: true, opacity: 0.8,
        toneMapped: !isHot,
      });
    } else {
      mat = new THREE.MeshPhysicalMaterial({
        color: 0x111111, emissive: new THREE.Color(0x000000),
        roughness: 0.05, metalness: 0.0,
        transmission: 0.9, thickness: 0.2,
        side: THREE.DoubleSide, transparent: true, opacity: 0.08,
      });
    }

    const mesh = new THREE.Mesh(triGeo, mat);
    mesh.userData = { faceIdx: fi, assignment };
    roomGroup.add(mesh);
    faceMeshes.push(mesh);
  }

  // ── Glow sprites ──
  const glowTex = getGlowTexture();
  for (const a of assignments) {
    if (a.glow < 1.2) continue;
    const pos = geo.faces[a.faceIdx].centroid.clone().normalize().multiplyScalar(SHELL_RADIUS * 1.04);
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTex, color: a.color,
      transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(pos);
    sprite.scale.setScalar(0.35);
    roomGroup.add(sprite);
  }

  // ── Dust motes ──
  const dust = createDustMotes(DUST_COUNT, SHELL_RADIUS);
  roomGroup.add(dust.points);

  // ── Aurora band ──
  const aurora = createAurora(SHELL_RADIUS);
  roomGroup.add(aurora.mesh);

  // ── Molecular starfield ──
  const fieldPos = new Float32Array(FIELD_COUNT * 3);
  const fieldCol = new Float32Array(FIELD_COUNT * 3);
  const fieldVel = new Float32Array(FIELD_COUNT * 3);
  for (let i = 0; i < FIELD_COUNT; i++) {
    const i3 = i * 3;
    const r = 6 + Math.random() * 50;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    fieldPos[i3] = r * Math.sin(ph) * Math.cos(th);
    fieldPos[i3 + 1] = r * Math.sin(ph) * Math.sin(th);
    fieldPos[i3 + 2] = r * Math.cos(ph);
    const hue = Math.random() < 0.7 ? 0.58 + Math.random() * 0.1 : 0.08 + Math.random() * 0.06;
    const c = new THREE.Color().setHSL(hue, 0.35, 0.12 + Math.random() * 0.08);
    fieldCol[i3] = c.r; fieldCol[i3 + 1] = c.g; fieldCol[i3 + 2] = c.b;
    fieldVel[i3] = (Math.random() - 0.5) * 0.003;
    fieldVel[i3 + 1] = (Math.random() - 0.5) * 0.003;
    fieldVel[i3 + 2] = (Math.random() - 0.5) * 0.003;
  }
  const fieldGeo = new THREE.BufferGeometry();
  fieldGeo.setAttribute('position', new THREE.BufferAttribute(fieldPos, 3));
  fieldGeo.setAttribute('color', new THREE.BufferAttribute(fieldCol, 3));
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = 32; dotCanvas.height = 32;
  const dotCtx = dotCanvas.getContext('2d')!;
  const grad = dotCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(0,255,255,1)');
  grad.addColorStop(0.4, 'rgba(0,255,255,0.6)');
  grad.addColorStop(1, 'rgba(0,255,255,0)');
  dotCtx.fillStyle = grad;
  dotCtx.fillRect(0, 0, 32, 32);
  const dotTex = new THREE.CanvasTexture(dotCanvas);
  const fieldMat = new THREE.PointsMaterial({
    vertexColors: true, size: 0.15, sizeAttenuation: true,
    transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false, map: dotTex,
  });
  const fieldPoints = new THREE.Points(fieldGeo, fieldMat);
  roomGroup.add(fieldPoints);

  // ── Bloom pipeline ──
  const W = renderer.domElement.width;
  const H = renderer.domElement.height;
  const bloom = createBloomPipeline(renderer, scene, camera, W, H);

  // ── Label system ──
  const labelSystem = createLabelSystem();

  // ── Persistent countdown labels ──
  for (const a of assignments) {
    const countdown = getCountdownLabel(a.node.id);
    if (!countdown) continue;
    const pos = geo.faces[a.faceIdx].centroid.clone().normalize().multiplyScalar(SHELL_RADIUS * 1.1);
    const label = labelSystem.createLabel(
      `${a.node.label} ${countdown}`,
      a.node.state === 'countdown' ? '#ff6633' : '#8899aa',
      pos,
    );
    scene.add(label);
  }

  // ── Connection arcs (reactive to selection) ──
  let arcs: ArcMesh[] = [];
  let arcLabels: CSS2DObject[] = [];
  let lastSelectedId: string | null = null;

  const raycaster = new THREE.Raycaster();

  // orbit is shared from cockpit (passed as parameter)

  // ── Filter application ──
  const applyFilters = () => {
    const { filter, searchQuery, stateFilters, busFilters } = useObservatoryStore.getState();
    const q = searchQuery.toLowerCase().trim();
    const hasAnyFilter = !!filter || !!q || stateFilters.size > 0 || busFilters.size > 0;

    for (const m of faceMeshes) {
      const a = m.userData.assignment as FaceAssignment | undefined;
      if (!a) {
        m.visible = !hasAnyFilter;
        continue;
      }
      const node = a.node;
      let visible = true;
      if (filter && getDominantAxis(node.a, node.b, node.c, node.d) !== filter) visible = false;
      if (q && ![node.label, node.id, node.notes ?? '', node.state, node.bus]
        .some(s => s.toLowerCase().includes(q))) visible = false;
      if (stateFilters.size > 0 && !stateFilters.has(node.state)) visible = false;
      if (busFilters.size > 0 && !busFilters.has(node.bus)) visible = false;

      m.visible = true;
      const mat = m.material as THREE.MeshPhysicalMaterial;
      if (visible) {
        mat.opacity = 0.8;
        mat.emissive.copy(a.color).multiplyScalar(a.glow >= 1.2 ? 0.4 : 0.15 * a.glow);
      } else {
        mat.opacity = 0.04;
        mat.emissive.setScalar(0);
      }
    }
  };

  // Subscribe to filter changes
  const unsubFilters = useObservatoryStore.subscribe(() => applyFilters());

  // ── Selection arcs ──
  const updateArcs = (selected: NodeInfo | null) => {
    // Dispose previous arcs
    for (const arc of arcs) { scene.remove(arc.mesh); disposeArc(arc); }
    arcs = [];
    for (const lbl of arcLabels) { scene.remove(lbl); }
    arcLabels = [];

    if (!selected) {
      if (orbit.tDist < DEFAULT_DIST - 0.5) {
        orbit.flyFrom = { rx: orbit.rx, ry: orbit.ry, dist: orbit.tDist };
        orbit.flyTo = { rx: orbit.rx, ry: orbit.ry, dist: DEFAULT_DIST };
        orbit.flyT = 0;
      }
      lastSelectedId = null;
      return;
    }

    if (selected.id === lastSelectedId) return;
    lastSelectedId = selected.id;

    const { nodeToFace } = assignResult;
    const selectedAssignment = nodeToFace.get(selected.id);
    if (!selectedAssignment) return;

    const fromCentroid = geo.faces[selectedAssignment.faceIdx].centroid;

    // Fly to selected node
    const targetRx = Math.atan2(fromCentroid.x, fromCentroid.z);
    const targetRy = Math.asin(Math.max(-1, Math.min(1, fromCentroid.y / fromCentroid.length())));
    orbit.flyFrom = { rx: orbit.trx, ry: orbit.try_, dist: orbit.tDist };
    orbit.flyTo = { rx: targetRx, ry: targetRy, dist: FOCUS_DIST };
    orbit.flyT = 0;

    // Build arcs
    const conns = getConnections(selected.id);
    for (const conn of conns) {
      const connAssignment = nodeToFace.get(conn.id);
      if (!connAssignment) continue;
      const toCentroid = geo.faces[connAssignment.faceIdx].centroid;
      const arc = buildConnectionArc(
        fromCentroid, toCentroid, SHELL_RADIUS,
        connAssignment.color.clone(), 0.9, conn.id,
      );
      scene.add(arc.mesh);
      arcs.push(arc);

      const mid = fromCentroid.clone().add(toCentroid).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(SHELL_RADIUS * 1.18);
      const label = labelSystem.createLabel(conn.label, '#44aaff', mid);
      scene.add(label);
      arcLabels.push(label);
    }
  };

  // Subscribe to selection changes
  let prevSelectedId: string | null = null;
  const unsubSelection = useObservatoryStore.subscribe((state) => {
    const newId = state.selectedNode?.id ?? null;
    if (newId !== prevSelectedId) {
      prevSelectedId = newId;
      updateArcs(state.selectedNode);
    }
  });

  return {
    update(dt: number, time: number) {
      // Breathing
      const breath = 1.0 + 0.008 * Math.sin(time * 1.5);
      for (const m of faceMeshes) m.scale.setScalar(breath);

      // Countdown face pulse
      for (const m of faceMeshes) {
        const a = m.userData.assignment as FaceAssignment | undefined;
        if (a && a.node.state === 'countdown') {
          const pulse = 0.6 + 0.4 * Math.abs(Math.sin(time * 3.0 + a.faceIdx * 0.5));
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 * pulse;
          (m.material as THREE.MeshStandardMaterial).opacity = 0.7 + 0.3 * pulse;
        }
      }

      // Camera fly-to and orbit positioning handled by cockpit

      // Effects
      edgePulse.update(dt);
      dust.update(dt);
      aurora.update(dt);

      // Drift molecular field
      const fpos = fieldGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < FIELD_COUNT; i++) {
        const i3 = i * 3;
        (fpos.array as Float32Array)[i3] += fieldVel[i3];
        (fpos.array as Float32Array)[i3 + 1] += fieldVel[i3 + 1];
        (fpos.array as Float32Array)[i3 + 2] += fieldVel[i3 + 2];
        const x = fpos.array[i3], y = fpos.array[i3 + 1], z = fpos.array[i3 + 2];
        if (x * x + y * y + z * z > 60 * 60) {
          const s = 8 / Math.sqrt(x * x + y * y + z * z);
          (fpos.array as Float32Array)[i3] *= s;
          (fpos.array as Float32Array)[i3 + 1] *= s;
          (fpos.array as Float32Array)[i3 + 2] *= s;
        }
      }
      fpos.needsUpdate = true;

      // Arc pulse
      for (const arc of arcs) {
        arc.material.uniforms.uTime.value += dt;
      }
    },

    renderBloom() {
      renderer.clear();
      bloom.composer.render();
    },

    renderLabels(scene: THREE.Scene, camera: THREE.Camera) {
      labelSystem.render(scene, camera);
    },

    handleClick(mouse: THREE.Vector2, camera: THREE.Camera) {
      raycaster.setFromCamera(mouse, camera);

      // Check arcs first
      const arcMeshes = arcs.map(a => a.mesh);
      if (arcMeshes.length > 0) {
        const arcHits = raycaster.intersectObjects(arcMeshes);
        if (arcHits.length > 0) {
          const targetId = arcHits[0].object.userData.targetNodeId as string;
          const d = VERTICES[targetId];
          if (d) {
            useObservatoryStore.getState().setSelected({
              id: targetId, label: d[0], a: d[1], b: d[2], c: d[3], d: d[4], state: d[5], bus: d[6], notes: d[7],
            });
            return;
          }
        }
      }

      // Check face panels
      const hits = raycaster.intersectObjects(faceMeshes);
      if (hits.length > 0) {
        const a = hits[0].object.userData.assignment as FaceAssignment | undefined;
        useObservatoryStore.getState().setSelected(a ? a.node : null);
      } else {
        useObservatoryStore.getState().setSelected(null);
      }
    },

    mountLabels(el: HTMLElement) {
      labelSystem.resize(el.clientWidth, el.clientHeight);
      labelSystem.mount(el);
    },

    resizeBloom(w: number, h: number) {
      bloom.resize(w, h);
    },

    resizeLabels(w: number, h: number) {
      labelSystem.resize(w, h);
    },

    dispose() {
      unsubFilters();
      unsubSelection();
      // Dispose arcs
      for (const arc of arcs) { scene.remove(arc.mesh); disposeArc(arc); }
      for (const lbl of arcLabels) { scene.remove(lbl); }
      // Dispose effects
      edgePulse.dispose();
      dust.dispose();
      aurora.dispose();
      fieldGeo.dispose();
      fieldMat.dispose();
      dotTex.dispose();
      bloom.dispose();
      labelSystem.dispose();
      // Reset store
      useObservatoryStore.getState().reset();
    },
  };
}
