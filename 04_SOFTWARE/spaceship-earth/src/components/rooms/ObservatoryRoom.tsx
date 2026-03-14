// ObservatoryRoom.tsx — Geodesic Data Dome Command Center
// Each triangular PANEL on the dome IS a data node.
// The dome is the visualization. Structure = function.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { theme } from '../../lib/theme';
import { disposeHierarchy } from '../../lib/three-utils';

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
const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;
const DUST_COUNT = IS_MOBILE ? 60 : 200;

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
    el.appendChild(renderer.domElement);

    // ── Bloom pipeline ──
    const bloom = createBloomPipeline(renderer, scene, camera, W, H);

    // ── CSS2D label system ──
    const labelSystem = createLabelSystem();
    labelSystem.resize(W, H);
    labelSystem.mount(el);
    labelSystemRef.current = labelSystem;

    // ── Lighting ──
    const ambLight = new THREE.AmbientLight(0x334455, 0.6);
    scene.add(ambLight);
    const pt1 = new THREE.PointLight(theme.getColor('--blue'), 1.0, 25);
    pt1.position.set(3, 4, 5); scene.add(pt1);
    const pt2 = new THREE.PointLight(theme.getColor('--coral'), 0.3, 18);
    pt2.position.set(-4, -2, 3); scene.add(pt2);

    const onTheme = () => {
      pt1.color.copy(theme.getColor('--blue'));
      pt2.color.copy(theme.getColor('--coral'));
    };
    window.addEventListener('p31-theme-change', onTheme);

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

    // ── Molecular starfield ──
    const FIELD_COUNT = IS_MOBILE ? 150 : 600;
    const fieldPos = new Float32Array(FIELD_COUNT * 3);
    const fieldCol = new Float32Array(FIELD_COUNT * 3);
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
    }
    const fieldGeo = new THREE.BufferGeometry();
    fieldGeo.setAttribute('position', new THREE.BufferAttribute(fieldPos, 3));
    fieldGeo.setAttribute('color', new THREE.BufferAttribute(fieldCol, 3));
    
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 32; dotCanvas.height = 32;
    const dotCtx = dotCanvas.getContext('2d')!;
    const grad = dotCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
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
        a.node.state === 'countdown' ? 'var(--orange)' : 'var(--neon-ghost)',
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
      const dt = 0.016; 
      t += 0.002;

      // 1. Breathing
      const breath = 1.0 + 0.008 * Math.sin(t * 1.5);
      for (const m of faceMeshes) m.scale.setScalar(breath);

      // 2. Camera momentum
      const mr = mouseRef.current;
      if (mr.flyTo) {
        mr.flyT += 0.03;
        const alpha = Math.min(1, mr.flyT);
        const ease = 1 - Math.pow(1 - alpha, 3);
        mr.trx = THREE.MathUtils.lerp(mr.flyFrom!.rx, mr.flyTo.rx, ease);
        mr.try_ = THREE.MathUtils.lerp(mr.flyFrom!.ry, mr.flyTo.ry, ease);
        mr.tDist = THREE.MathUtils.lerp(mr.flyFrom!.dist, mr.flyTo.dist, ease);
        if (alpha >= 1) mr.flyTo = null;
      }

      mr.rx += (mr.trx - mr.rx) * 0.1;
      mr.ry += (mr.try_ - mr.ry) * 0.1;
      mr.dist += (mr.tDist - mr.dist) * 0.1;

      camera.position.x = mr.dist * Math.sin(mr.rx) * Math.cos(mr.ry);
      camera.position.y = mr.dist * Math.sin(mr.ry);
      camera.position.z = mr.dist * Math.cos(mr.rx) * Math.cos(mr.ry);
      camera.lookAt(0, 0, 0);

      // 3. Effects
      edgePulse.update(dt);
      dust.update(dt);
      aurora.update(dt);
      aurora.mesh.rotation.y += 0.001;

      // 4. Render
      bloom.composer.render();
      labelSystem.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      bloom.resize(w, h);
      labelSystem.resize(w, h);
    };
    window.addEventListener('resize', onResize);

    const mr = mouseRef.current;

    const onPointerDown = (e: PointerEvent) => {
      mr.down = true; mr.moved = false;
      mr.x = e.clientX; mr.y = e.clientY;
      mr.flyTo = null;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!mr.down) return;
      const dx = e.clientX - mr.x, dy = e.clientY - mr.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) mr.moved = true;
      mr.trx -= dx * 0.005;
      mr.try_ = Math.max(-1.5, Math.min(1.5, mr.try_ + dy * 0.005));
      mr.x = e.clientX; mr.y = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      mr.down = false;
      if (!mr.moved) {
        const rect = renderer.domElement.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const py = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.current.setFromCamera(new THREE.Vector2(px, py), camera);
        const hits = raycaster.current.intersectObjects(faceMeshes);
        if (hits.length > 0) {
          const ass = hits[0].object.userData.assignment as FaceAssignment | undefined;
          if (ass) setSelected(ass.node);
          else setSelected(null);
        } else {
          setSelected(null);
        }
      }
    };
    const onWheel = (e: WheelEvent) => {
      mr.tDist = Math.max(4, Math.min(20, mr.tDist + e.deltaY * 0.005));
      mr.flyTo = null;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('p31-theme-change', onTheme);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      
      // M18 Performance: Recursive GPU memory reclamation
      if (sceneRef.current) {
        disposeHierarchy(sceneRef.current);
      }

      // Explicitly dispose of external resource managers
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

    for (const arc of arcsRef.current) {
      scene.remove(arc.mesh);
      disposeArc(arc);
    }
    arcsRef.current = [];

    for (const lbl of labelsRef.current) {
      scene.remove(lbl);
    }
    labelsRef.current = [];

    if (!selected) {
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

    const mr = mouseRef.current;
    const targetRx = Math.atan2(fromCentroid.x, fromCentroid.z);
    const targetRy = Math.asin(Math.max(-1, Math.min(1, fromCentroid.y / fromCentroid.length())));
    mr.flyFrom = { rx: mr.trx, ry: mr.try_, dist: mr.tDist };
    mr.flyTo = { rx: targetRx, ry: targetRy, dist: FOCUS_DIST };
    mr.flyT = 0;

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
  // FILTER LOGIC
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
  }, [filter, searchQuery, stateFilters, busFilters]);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'transparent', overflow: 'hidden', touchAction: 'none', fontFamily: 'var(--font-data)' }}>
      <div ref={mountRef} style={{ width: '100%', height: IS_MOBILE ? 'calc(100% - 56px)' : 'calc(100% - 120px)', cursor: 'grab', touchAction: 'none', marginTop: IS_MOBILE ? 56 : 120 }} />

      {/* ── Top bar: axis filters ── */}
      <div style={{
        position: 'absolute', top: IS_MOBILE ? 4 : 12, left: IS_MOBILE ? 4 : 12, right: IS_MOBILE ? 4 : undefined,
        display: 'flex', gap: IS_MOBILE ? 4 : 12, flexWrap: 'wrap', zIndex: 10,
      }}>
        {AXIS_KEYS.map(k => (
          <button key={k} onClick={() => setFilter(filter === k ? null : k)} className="glass-btn" style={{
            background: filter === k ? AXIS_CSS[k] + '22' : 'transparent',
            borderColor: filter === k ? AXIS_CSS[k] : 'var(--neon-ghost)',
            color: AXIS_CSS[k], padding: IS_MOBILE ? '6px 10px' : '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: IS_MOBILE ? 9 : 11,
            minHeight: 'auto', minWidth: 'auto',
          }}>
            {AXIS_LABELS[k]}
          </button>
        ))}
        {!IS_MOBILE && (
          <button onClick={() => setShowAttractor(!showAttractor)} className="glass-btn" style={{
            background: showAttractor ? 'var(--orange)22' : 'transparent',
            borderColor: showAttractor ? 'var(--orange)' : 'var(--neon-ghost)',
            color: showAttractor ? 'var(--orange)' : 'var(--dim)',
            padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: 11, minHeight: 'auto'
          }}>
            {showAttractor ? 'ATTRACTOR ON' : 'ATTRACTOR OFF'}
          </button>
        )}
      </div>

      {/* ── Count (hidden on mobile) ── */}
      {!IS_MOBILE && (
        <div style={{
          position: 'absolute', top: 12, right: 12, color: 'var(--dim)', fontSize: 10,
          letterSpacing: 1, zIndex: 10, textShadow: '0 0 8px var(--neon-ghost)',
        }}>
          {Object.keys(VERTICES).length} PANELS &middot; {EDGES.length} EDGES &middot; 80 FACES
        </div>
      )}

      {/* ── Search bar ── */}
      {!IS_MOBILE && (
        <div style={{ position: 'absolute', top: 60, left: 12, zIndex: 10 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="search nodes..."
            className="glass-input"
            style={{ width: 200, padding: '6px 10px', fontSize: 11, background: 'var(--s1)' }}
          />
        </div>
      )}

      {/* ── State + bus filters ── */}
      <div style={{ position: 'absolute', top: IS_MOBILE ? 40 : 100, left: IS_MOBILE ? 4 : 12, display: 'flex', gap: 4, flexWrap: 'wrap', zIndex: 10, maxWidth: IS_MOBILE ? '100%' : 320 }}>
        {STATE_FILTER_OPTS.map(s => {
          const active = stateFilters.has(s);
          const col = s === 'countdown' ? 'var(--orange)' : s === 'complete' ? 'var(--cyan)'
            : s === 'missing' ? 'var(--coral)' : s === 'deployed' ? 'var(--cyan)' : 'var(--dim)';
          return (
            <button key={s} onClick={() => toggleStateFilter(s)} className="glass-btn" style={{
              background: active ? col + '22' : 'transparent',
              borderColor: active ? col : 'var(--neon-ghost)',
              color: col, padding: '3px 8px', borderRadius: 2, fontSize: IS_MOBILE ? 8 : 9,
              minHeight: 'auto', minWidth: 'auto',
            }}>
              {s}
            </button>
          );
        })}
        <span style={{ width: 4 }} />
        {BUS_FILTER_OPTS.map(b => {
          const active = busFilters.has(b);
          const col = BUS_CSS[b] || 'var(--dim)';
          return (
            <button key={b} onClick={() => toggleBusFilter(b)} className="glass-btn" style={{
              background: active ? col + '22' : 'transparent',
              borderColor: active ? col : 'var(--neon-ghost)',
              color: col, padding: '3px 8px', borderRadius: 2, fontSize: IS_MOBILE ? 8 : 9,
              minHeight: 'auto', minWidth: 'auto',
            }}>
              {b}
            </button>
          );
        })}
      </div>

      {/* ── Selected node panel ── */}
      {selected && (
        <div className="glass-card" style={{
          position: 'absolute', bottom: 16, left: 16, right: 16, maxWidth: 400,
          padding: 16, zIndex: 20, borderRadius: 'var(--radius-lg)', background: 'var(--s2)', border: '1px solid var(--neon-ghost)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>
              {selected.label}
              {getCountdownLabel(selected.id) && (
                <span style={{ color: 'var(--orange)', marginLeft: 8, fontSize: 11 }}>
                  {getCountdownLabel(selected.id)}
                </span>
              )}
            </span>
            <button onClick={() => setSelected(null)} className="glass-btn" style={{
              border: 'none', color: 'var(--dim)', padding: '0 8px', minHeight: 'auto', minWidth: 'auto'
            }}>{'\u2715'}</button>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--dim)', marginBottom: 8 }}>
            <span style={{ color: AXIS_CSS[getDominantAxis(selected.a, selected.b, selected.c, selected.d)] }}>
              {AXIS_LABELS[getDominantAxis(selected.a, selected.b, selected.c, selected.d)]}
            </span>
            <span style={{
              color: selected.state === 'countdown' ? 'var(--orange)' : selected.state === 'complete' ? 'var(--cyan)'
                : selected.state === 'missing' ? 'var(--coral)' : selected.state === 'deployed' ? 'var(--cyan)' : 'var(--dim)',
            }}>{selected.state}</span>
            <span style={{ color: BUS_CSS[selected.bus] || 'var(--dim)' }}>{selected.bus}</span>
          </div>
          {selected.notes && <div style={{ color: 'var(--dim)', fontSize: 10, marginBottom: 10, lineHeight: 1.4 }}>{selected.notes}</div>}
          {connections.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {connections.map((c, i) => (
                <button key={i} onClick={() => {
                  const d = VERTICES[c.id];
                  if (d) setSelected({ id: c.id, label: d[0], a: d[1], b: d[2], c: d[3], d: d[4], state: d[5], bus: d[6], notes: d[7] });
                }} className="glass-btn" style={{
                  fontSize: 9, padding: '4px 10px', borderRadius: 4,
                  background: 'var(--s1)', borderColor: 'var(--neon-ghost)',
                  color: AXIS_CSS[c.axis], minHeight: 'auto', minWidth: 'auto'
                }}>
                  {c.label} <span style={{ color: 'var(--dim)', marginLeft: 2 }}>({c.type})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Instructions ── */}
      <div style={{
        position: 'absolute', bottom: selected ? 200 : 16, right: 16, color: 'var(--neon-faint)',
        fontSize: 9, textAlign: 'right' as const, letterSpacing: 1, transition: 'bottom var(--trans-base)',
        lineHeight: 1.8, zIndex: 5,
      }}>
        <div>DRAG ROTATE</div>
        <div>TAP PANEL</div>
        <div>SCROLL ZOOM</div>
      </div>

      {/* ── Attractor Overlay ── */}
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
