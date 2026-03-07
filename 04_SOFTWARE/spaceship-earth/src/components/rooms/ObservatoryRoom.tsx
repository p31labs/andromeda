// ObservatoryRoom.tsx — Geodesic Data Dome Command Center
// Each triangular PANEL on the dome IS a data node.
// The dome is the visualization. Structure = function.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';

import {
  VERTICES, EDGES, AXIS_KEYS, AXIS_CSS, AXIS_LABELS, BUS_CSS,
  getDominantAxis, getConnections, getCountdownLabel,
  type NodeInfo, type FaceAssignment, type AxisKey,
} from './observatory-data';
import { buildGeodesic, assignNodesToFaces, type AssignmentResult } from './observatory-geo';
import {
  createBloomPipeline, createDustMotes, createEdgePulse, createAurora,
  createLabelSystem, buildConnectionArc, disposeArc, getGlowTexture,
  type ArcMesh, type LabelSystem,
} from './observatory-effects';
import AttractorOverlay from './sovereign/overlays/AttractorOverlay';
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SHELL_RADIUS = 3.0;
const GEO_SUBDIVISIONS = 2; // 2V = 80 faces
const INSET = 0.92;
const SHRINK = 0.88;
const DEFAULT_DIST = 7.5;
const FOCUS_DIST = 5.5;
const DUST_COUNT = 200;

const STATE_FILTER_OPTS = ['countdown', 'active', 'deployed', 'complete', 'missing'] as const;
const BUS_FILTER_OPTS = ['vital', 'ac', 'dc'] as const;

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ObservatoryRoom() {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({
    down: false, x: 0, y: 0,
    rx: 0.4, ry: 0.15, trx: 0.4, try_: 0.15,
    dist: DEFAULT_DIST, tDist: DEFAULT_DIST,
    moved: false,
    // Fly-to state
    flyFrom: null as { rx: number; ry: number; dist: number } | null,
    flyTo: null as { rx: number; ry: number; dist: number } | null,
    flyT: 0,
  });

  // Scene refs (populated in useEffect, used in other effects)
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const faceMeshesRef = useRef<THREE.Mesh[]>([]);
  const assignmentsRef = useRef<AssignmentResult | null>(null);
  const arcsRef = useRef<ArcMesh[]>([]);
  const labelsRef = useRef<CSS2DObject[]>([]);
  const labelSystemRef = useRef<LabelSystem | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const geoRef = useRef<ReturnType<typeof buildGeodesic> | null>(null);

  // UI state
  const [selected, setSelected] = useState<NodeInfo | null>(null);
  const [filter, setFilter] = useState<AxisKey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilters, setStateFilters] = useState<Set<string>>(new Set());
  const [busFilters, setBusFilters] = useState<Set<string>>(new Set());
  const [showAttractor, setShowAttractor] = useState(false);
  
  // Mark 1 Attractor Simulator state
  const [entropy, setEntropy] = useState(0.35);
  const [magneticField, setMagneticField] = useState(50);
  const [coherence, setCoherence] = useState(4.0);

  const connections = useMemo(() => selected ? getConnections(selected.id) : [], [selected]);

  // ── Toggle helpers ──
  const toggleStateFilter = useCallback((s: string) => {
    setStateFilters(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }, []);
  const toggleBusFilter = useCallback((b: string) => {
    setBusFilters(prev => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b); else next.add(b);
      return next;
    });
  }, []);

  // ══════════════════════════════════════════════════════════════
  // MAIN SCENE SETUP
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;

    // ── Scene + Camera + Renderer ──
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0.5, DEFAULT_DIST);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // ── Bloom pipeline ──
    const bloom = createBloomPipeline(renderer, scene, camera, W, H);

    // ── CSS2D label system ──
    const labelSystem = createLabelSystem();
    labelSystem.resize(W, H);
    labelSystem.mount(el);
    labelSystemRef.current = labelSystem;

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0x334455, 0.6));
    const pt1 = new THREE.PointLight(0x6688cc, 1.0, 25);
    pt1.position.set(3, 4, 5); scene.add(pt1);
    const pt2 = new THREE.PointLight(0xff6644, 0.3, 18);
    pt2.position.set(-4, -2, 3); scene.add(pt2);

    // ── Build geodesic dome ──
    const geo = buildGeodesic(SHELL_RADIUS, GEO_SUBDIVISIONS);
    geoRef.current = geo;
    const assignResult = assignNodesToFaces(geo.faces);
    assignmentsRef.current = assignResult;
    const { assignments, faceToNode } = assignResult;

    // ── Edge wireframe with pulse shader ──
    const edgePulse = createEdgePulse(geo);
    scene.add(edgePulse.lines);

    // ── Render face panels ──
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
          roughness: 0.08,
          metalness: 0.0,
          transmission: 0.3,
          thickness: 0.5,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          toneMapped: !isHot, // hot nodes bypass tone mapping for bloom
        });
      } else {
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

    // ── Glow sprites on high-priority nodes ──
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
      scene.add(sprite);
    }

    // ── Dust motes ──
    const dust = createDustMotes(DUST_COUNT, SHELL_RADIUS);
    scene.add(dust.points);

    // ── Aurora band ──
    const aurora = createAurora(SHELL_RADIUS);
    scene.add(aurora.mesh);

    // ── Molecular starfield (same as MolecularField, rendered inside scene) ──
    const FIELD_COUNT = 600;
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
    // Circle texture so particles are round, not square
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 32; dotCanvas.height = 32;
    const dotCtx = dotCanvas.getContext('2d')!;
    const grad = dotCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(0,255,255,1)');
    grad.addColorStop(0.4, 'rgba(0,255,255,0.3)');
    grad.addColorStop(1, 'rgba(0,255,255,0)');
    dotCtx.fillStyle = grad;
    dotCtx.fillRect(0, 0, 32, 32);
    const dotTex = new THREE.CanvasTexture(dotCanvas);
    const fieldMat = new THREE.PointsMaterial({
      vertexColors: true, size: 0.15, sizeAttenuation: true,
      transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
      map: dotTex,
    });
    const fieldPoints = new THREE.Points(fieldGeo, fieldMat);
    scene.add(fieldPoints);

    // ── Persistent labels on countdown nodes ──
    for (const a of assignments) {
      const countdown = getCountdownLabel(a.node.id);
      if (!countdown) continue;
      const pos = geo.faces[a.faceIdx].centroid.clone().normalize().multiplyScalar(SHELL_RADIUS * 1.1);
      const label = labelSystem.createLabel(
        `${a.node.label} ${countdown}`,
        a.node.state === 'countdown' ? '#ff6633' : 'rgba(0,255,255,0.25)',
        pos,
      );
      scene.add(label);
    }

    // ══════════════════════════════════════════════════════════════
    // ANIMATION LOOP
    // ══════════════════════════════════════════════════════════════

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const dt = 0.016; // ~60fps step
      t += 0.002;

      // 1. Breathing
      const breath = 1.0 + 0.008 * Math.sin(t * 1.5);
      for (const m of faceMeshes) m.scale.setScalar(breath);

      // 2. Countdown face pulse
      for (const m of faceMeshes) {
        const a = m.userData.assignment as FaceAssignment | undefined;
        if (a && a.node.state === 'countdown') {
          const pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 3.0 + a.faceIdx * 0.5));
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 * pulse;
          (m.material as THREE.MeshStandardMaterial).opacity = 0.7 + 0.3 * pulse;
        }
      }

      // 3. Camera fly-to interpolation
      const m = mouseRef.current;
      if (m.flyTo && m.flyFrom) {
        m.flyT = Math.min(1, m.flyT + 0.018);
        const ease = 1 - Math.pow(1 - m.flyT, 3); // ease-out cubic
        m.rx = m.flyFrom.rx + (m.flyTo.rx - m.flyFrom.rx) * ease;
        m.ry = m.flyFrom.ry + (m.flyTo.ry - m.flyFrom.ry) * ease;
        m.dist = m.flyFrom.dist + (m.flyTo.dist - m.flyFrom.dist) * ease;
        if (m.flyT >= 1) { m.flyTo = null; m.flyFrom = null; }
      }

      // 4. Camera orbit + zoom
      m.trx += (m.rx - m.trx) * 0.06;
      m.try_ += (m.ry - m.try_) * 0.06;
      m.tDist += (m.dist - m.tDist) * 0.08;
      const D = m.tDist;
      camera.position.x = D * Math.sin(m.trx) * Math.cos(m.try_);
      camera.position.y = D * Math.sin(m.try_) + 0.3;
      camera.position.z = D * Math.cos(m.trx) * Math.cos(m.try_);
      camera.lookAt(0, 0, 0);

      // 5. Update effects
      edgePulse.update(dt);
      dust.update(dt);
      aurora.update(dt);

      // 5b. Drift molecular field
      const fpos = fieldGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < FIELD_COUNT; i++) {
        const i3 = i * 3;
        fpos.array[i3] += fieldVel[i3];
        fpos.array[i3 + 1] += fieldVel[i3 + 1];
        fpos.array[i3 + 2] += fieldVel[i3 + 2];
        const x = fpos.array[i3], y = fpos.array[i3 + 1], z = fpos.array[i3 + 2];
        if (x * x + y * y + z * z > 60 * 60) {
          const s = 8 / Math.sqrt(x * x + y * y + z * z);
          fpos.array[i3] *= s; fpos.array[i3 + 1] *= s; fpos.array[i3 + 2] *= s;
        }
      }
      fpos.needsUpdate = true;

      // 6. Update arc pulse uniforms
      for (const arc of arcsRef.current) {
        arc.material.uniforms.uTime.value += dt;
      }

      // 7. Render
      renderer.clear();
      bloom.composer.render();
      labelSystem.render(scene, camera);
    };
    animate();

    // ══════════════════════════════════════════════════════════════
    // INPUT HANDLERS
    // ══════════════════════════════════════════════════════════════

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
      // Cancel fly-to on user drag
      mr.flyTo = null; mr.flyFrom = null;
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

      // Check arcs first (click to navigate)
      const arcMeshes = arcsRef.current.map(a => a.mesh);
      if (arcMeshes.length > 0) {
        const arcHits = raycaster.current.intersectObjects(arcMeshes);
        if (arcHits.length > 0) {
          const targetId = arcHits[0].object.userData.targetNodeId as string;
          const d = VERTICES[targetId];
          if (d) {
            setSelected({ id: targetId, label: d[0], a: d[1], b: d[2], c: d[3], d: d[4], state: d[5], bus: d[6], notes: d[7] });
            return;
          }
        }
      }

      // Check face panels
      const hits = raycaster.current.intersectObjects(faceMeshes);
      if (hits.length > 0) {
        const a = hits[0].object.userData.assignment as FaceAssignment | undefined;
        if (a) setSelected(a.node);
        else setSelected(null);
      } else {
        setSelected(null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const mr = mouseRef.current;
      mr.dist += e.deltaY * 0.003;
      mr.dist = Math.max(3.5, Math.min(12, mr.dist));
      mr.flyTo = null; mr.flyFrom = null;
    };

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
      bloom.resize(w, h);
      labelSystem.resize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(frameRef.current);
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('click', onClick);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      edgePulse.dispose();
      dust.dispose();
      aurora.dispose();
      fieldGeo.dispose();
      fieldMat.dispose();
      dotTex.dispose();
      bloom.dispose();
      labelSystem.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // ══════════════════════════════════════════════════════════════
  // CONNECTION ARCS + FLY-TO (keyed on selected)
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    const scene = sceneRef.current;
    const assignResult = assignmentsRef.current;
    const geo = geoRef.current;
    const labelSystem = labelSystemRef.current;
    if (!scene || !assignResult || !geo) return;

    // Dispose previous arcs
    for (const arc of arcsRef.current) {
      scene.remove(arc.mesh);
      disposeArc(arc);
    }
    arcsRef.current = [];

    // Dispose previous connection labels
    for (const lbl of labelsRef.current) {
      scene.remove(lbl);
    }
    labelsRef.current = [];

    if (!selected) {
      // Fly back to default
      const mr = mouseRef.current;
      if (mr.tDist < DEFAULT_DIST - 0.5) {
        mr.flyFrom = { rx: mr.rx, ry: mr.ry, dist: mr.tDist };
        mr.flyTo = { rx: mr.rx, ry: mr.ry, dist: DEFAULT_DIST };
        mr.flyT = 0;
      }
      return;
    }

    const { nodeToFace } = assignResult;
    const selectedAssignment = nodeToFace.get(selected.id);
    if (!selectedAssignment) return;

    const fromCentroid = geo.faces[selectedAssignment.faceIdx].centroid;

    // Fly to selected node
    const mr = mouseRef.current;
    const targetRx = Math.atan2(fromCentroid.x, fromCentroid.z);
    const targetRy = Math.asin(Math.max(-1, Math.min(1, fromCentroid.y / fromCentroid.length())));
    mr.flyFrom = { rx: mr.trx, ry: mr.try_, dist: mr.tDist };
    mr.flyTo = { rx: targetRx, ry: targetRy, dist: FOCUS_DIST };
    mr.flyT = 0;

    // Build arcs to connected nodes
    const conns = getConnections(selected.id);
    const newArcs: ArcMesh[] = [];

    for (const conn of conns) {
      const connAssignment = nodeToFace.get(conn.id);
      if (!connAssignment) continue;

      const toCentroid = geo.faces[connAssignment.faceIdx].centroid;
      const arc = buildConnectionArc(
        fromCentroid, toCentroid, SHELL_RADIUS,
        connAssignment.color.clone(), 0.9,
        conn.id,
      );
      scene.add(arc.mesh);
      newArcs.push(arc);

      // Add label at arc midpoint
      if (labelSystem) {
        const mid = fromCentroid.clone().add(toCentroid).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(SHELL_RADIUS * 1.18);
        const label = labelSystem.createLabel(
          conn.label,
          AXIS_CSS[conn.axis],
          mid,
        );
        scene.add(label);
        labelsRef.current.push(label);
      }
    }

    arcsRef.current = newArcs;
  }, [selected]);

  // ══════════════════════════════════════════════════════════════
  // FILTER LOGIC (axis + search + state + bus)
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    const hasAnyFilter = !!filter || !!q || stateFilters.size > 0 || busFilters.size > 0;

    for (const m of faceMeshesRef.current) {
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

      m.visible = true; // keep shape
      const mat = m.material as THREE.MeshPhysicalMaterial;
      if (visible) {
        mat.opacity = 0.8;
        mat.emissive.copy(a.color).multiplyScalar(a.glow >= 1.2 ? 0.4 : 0.15 * a.glow);
      } else {
        mat.opacity = 0.04;
        mat.emissive.setScalar(0);
      }
    }
  }, [filter, searchQuery, stateFilters, busFilters]);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'transparent', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: 'calc(100% - 120px)', cursor: 'grab', touchAction: 'none', marginTop: 120 }} />

      {/* ── Top bar: axis filters ── */}
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 20, zIndex: 10 }}>
        {AXIS_KEYS.map(k => (
          <button key={k} onClick={() => setFilter(filter === k ? null : k)} style={{
            background: filter === k ? AXIS_CSS[k] + '22' : 'transparent',
            border: '1px solid ' + (filter === k ? AXIS_CSS[k] : 'rgba(0,255,255,0.1)'),
            color: AXIS_CSS[k], padding: '16px 20px', borderRadius: 3, fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
            letterSpacing: 1, textTransform: 'uppercase' as const, transition: 'all 0.2s',
            minHeight: '48px',
            minWidth: '48px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {AXIS_LABELS[k]}
          </button>
        ))}
        <button onClick={() => setShowAttractor(!showAttractor)} style={{
          background: showAttractor ? '#ff6633' + '22' : 'transparent',
          border: '1px solid ' + (showAttractor ? '#ff6633' : 'rgba(0,255,255,0.1)'),
          color: showAttractor ? '#ff6633' : 'rgba(0,255,255,0.25)',
          padding: '16px 20px', borderRadius: 3, fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
          letterSpacing: 1, textTransform: 'uppercase' as const, transition: 'all 0.2s',
          minHeight: '48px',
          minWidth: '48px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {showAttractor ? 'ATTRACTOR ON' : 'ATTRACTOR OFF'}
        </button>
      </div>

      {/* ── Count ── */}
      <div style={{
        position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.12)', fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, zIndex: 10,
        textShadow: '0 0 8px rgba(0,255,255,0.05)',
      }}>
        {Object.keys(VERTICES).length} PANELS &middot; {EDGES.length} EDGES &middot; 80 FACES
      </div>

      {/* ── Search bar ── */}
      <div style={{ position: 'absolute', top: 42, left: 12, zIndex: 10 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="search nodes..."
          style={{
            background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,255,255,0.1)',
            borderRadius: 3, padding: '8px 12px', color: 'rgba(0,255,255,0.25)', width: 240,
            fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
            outline: 'none', letterSpacing: 0.5,
          }}
        />
      </div>

      {/* ── State + bus filters ── */}
      <div style={{ position: 'absolute', top: 68, left: 12, display: 'flex', gap: 4, flexWrap: 'wrap', zIndex: 10, maxWidth: 320 }}>
        {STATE_FILTER_OPTS.map(s => {
          const active = stateFilters.has(s);
          const col = s === 'countdown' ? '#ff6633' : s === 'complete' ? '#00FFFF'
            : s === 'missing' ? '#FF4444' : s === 'deployed' ? '#00FFFF' : 'rgba(0,255,255,0.25)';
          return (
            <button key={s} onClick={() => toggleStateFilter(s)} style={{
              background: active ? col + '22' : 'transparent',
              border: '1px solid ' + (active ? col : 'rgba(0,255,255,0.04)'),
              color: col, padding: '3px 8px', borderRadius: 2, fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
              letterSpacing: 0.5, transition: 'all 0.2s',
            }}>
              {s}
            </button>
          );
        })}
        <span style={{ width: 4 }} />
        {BUS_FILTER_OPTS.map(b => {
          const active = busFilters.has(b);
          const col = BUS_CSS[b] || 'rgba(0,255,255,0.25)';
          return (
            <button key={b} onClick={() => toggleBusFilter(b)} style={{
              background: active ? col + '22' : 'transparent',
              border: '1px solid ' + (active ? col : 'rgba(0,255,255,0.04)'),
              color: col, padding: '3px 8px', borderRadius: 2, fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
              letterSpacing: 0.5, transition: 'all 0.2s',
            }}>
              {b}
            </button>
          );
        })}
      </div>

      {/* ── Selected node panel ── */}
      {selected && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, right: 12, maxWidth: 420,
          background: 'rgba(6,10,18,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0,255,255,0.1)', borderRadius: 6, padding: 14, zIndex: 20,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#d8ffd8', fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
              {selected.label}
              {getCountdownLabel(selected.id) && (
                <span style={{ color: '#ff6633', marginLeft: 8, fontSize: 11 }}>
                  {getCountdownLabel(selected.id)}
                </span>
              )}
            </span>
            <button onClick={() => setSelected(null)} style={{
              background: 'none', border: 'none', color: 'rgba(0,255,255,0.18)', cursor: 'pointer', fontSize: 14, padding: '0 4px',
            }}>{'\u2715'}</button>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'rgba(0,255,255,0.18)', marginBottom: 6 }}>
            <span style={{ color: AXIS_CSS[getDominantAxis(selected.a, selected.b, selected.c, selected.d)] }}>
              {AXIS_LABELS[getDominantAxis(selected.a, selected.b, selected.c, selected.d)]}
            </span>
            <span style={{
              color: selected.state === 'countdown' ? '#ff6633' : selected.state === 'complete' ? '#00FFFF'
                : selected.state === 'missing' ? '#FF4444' : selected.state === 'deployed' ? '#00FFFF' : 'rgba(0,255,255,0.25)',
            }}>{selected.state}</span>
            <span style={{ color: BUS_CSS[selected.bus] || 'rgba(0,255,255,0.25)' }}>{selected.bus}</span>
          </div>
          {selected.notes && <div style={{ color: 'rgba(0,255,255,0.18)', fontSize: 9, marginBottom: 6 }}>{selected.notes}</div>}
          {connections.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {connections.map((c, i) => (
                <span key={i} onClick={() => {
                  const d = VERTICES[c.id];
                  if (d) setSelected({ id: c.id, label: d[0], a: d[1], b: d[2], c: d[3], d: d[4], state: d[5], bus: d[6], notes: d[7] });
                }} style={{
                  fontSize: 8, padding: '2px 8px', borderRadius: 2, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(0,255,255,0.05)',
                  color: AXIS_CSS[c.axis], transition: 'all 0.15s', letterSpacing: 0.5,
                }}>
                  {c.label} <span style={{ color: 'rgba(255,255,255,0.12)', marginLeft: 2 }}>({c.type})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Instructions ── */}
      <div style={{
        position: 'absolute', bottom: selected ? 180 : 12, right: 12, color: 'rgba(255,255,255,0.08)',
        fontSize: 8, textAlign: 'right' as const, letterSpacing: 1, transition: 'bottom 0.3s',
        lineHeight: 1.8, fontFamily: "'JetBrains Mono', monospace", zIndex: 5,
      }}>
        <div>DRAG ROTATE</div>
        <div>TAP PANEL</div>
        <div>SCROLL ZOOM</div>
      </div>

      {/* ── Mark 1 Attractor Simulator Overlay ── */}
      <AttractorOverlay
        show={showAttractor}
        entropy={entropy}
        magneticField={magneticField}
        coherence={coherence}
        onEntropyChange={setEntropy}
        onMagneticFieldChange={setMagneticField}
        onCoherenceChange={setCoherence}
        onClose={() => setShowAttractor(false)}
      />
    </div>
  );
}
