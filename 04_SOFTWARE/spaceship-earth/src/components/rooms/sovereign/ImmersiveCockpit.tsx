import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useSovereignStore } from '../../../sovereign/useSovereignStore';
import { setGpuMs } from '../../../services/perfMonitor';
import { prefersReducedMotion } from '../../../hooks/useReducedMotion';

export interface OrbitState {
  rx: number; ry: number;
  trx: number; try_: number;
  tDist: number;
  flyFrom: { rx: number; ry: number; dist: number } | null;
  flyTo: { rx: number; ry: number; dist: number } | null;
  flyT: number;
}

/**
 * ImmersiveCockpitUI — Vanilla Three.js + raw RAF cockpit renderer.
 *
 * NOT React Three Fiber — uses a single useEffect + manual RAF loop to avoid
 * the R3F reconciler overhead in a performance-critical, always-on canvas.
 *
 * Scene contents:
 *   IVM Lattice    — InstancedMesh of 13³ body-diagonal spheres (every point where
 *                    x+y+z is even in a ±6 cube lattice) scaled 1.5× apart.
 *                    Chromatic HSV→RGB shader driven by uTime + uEntropy uniforms.
 *   Jitterbug Core — 12 nodes morphing cuboctahedron→octahedron→tetrahedron.
 *                    Geometry is animated via per-frame lerp through COORDS tables.
 *                    Edges are updated zero-alloc (direct Float32Array writes).
 *
 * Kinematics math constants:
 *   C = 1/√2 ≈ 0.707 — edge half-length of a cuboctahedron with unit circumradius.
 *                       Cuboctahedron vertices sit at all permutations of (±C, ±C, 0).
 *   T = 1/√3 ≈ 0.577 — coordinate of a tetrahedron with unit circumradius.
 *                       Tetra vertices: all sign-combinations of (T, T, T) with
 *                       even parity (4 of 8 combinations).
 *   COORDS.cubo[i]  — 12 cuboctahedron vertex positions (norm ≈ 1.0)
 *   COORDS.octa[i]  — 12 octahedron positions (6 unique + 6 mapped duplicates for
 *                       continuity of lerp — nodes 4-11 converge to face/edge centres)
 *   COORDS.tetra[i] — 4 tetra vertices (indices 0-3); nodes 4-11 collapse to origin
 *
 * Performance budget targets (Android tablet, 60fps):
 *   DPR cap: 1.5×     Bloom: 50% viewport res    Sphere segments: 6×5
 *   Idle throttle: 30fps after 2s of no interaction
 *   IVM LOD: skip uniform updates every other frame when camera > 12 units
 */

// Module-scope scratch objects — reused every frame, never GC'd
const _origin    = new THREE.Vector3(0, 0, 0);
const _defaultCam = new THREE.Vector3(6, 4, 10);
const _scratch   = new THREE.Vector3();
const _colA      = new THREE.Color();
const _colB      = new THREE.Color();
// Jitterbug InstancedMesh scratch (matrix composition — zero heap alloc per frame)
const _jQuat     = new THREE.Quaternion();  // identity — never mutated
const _jScaleV   = new THREE.Vector3(1, 1, 1);
const _jMat4     = new THREE.Matrix4();

export function ImmersiveCockpitUI({ isIdle }: { isIdle?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const ptrState = useRef({ isDragging: false, prevX: 0, prevY: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // ── Quality tier from URL ──────────────────────────────
    const urlParams = new URLSearchParams(window.location.search);
    const quality = urlParams.get('quality') || 'medium';
    const pixelRatio = quality === 'low' ? 1.0 : quality === 'high' ? Math.min(2, window.devicePixelRatio) : 1.5;
    const bloomScale = quality === 'low' ? 0.25 : quality === 'high' ? 1.0 : 0.5;
    // ────────────────────────────────────────────────────────

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030308, 0.035);

    // 0.01 Near Clipping is critical for Godhead inside-out perspective
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.rotation.order = 'YXZ'; 
    camera.position.set(6, 4, 10);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
      // mediump halves GPU register pressure on every shader —
      // acceptable for this OLED neon aesthetic; no precision-critical geometry
      precision: 'mediump',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    mountRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomRes = new THREE.Vector2(
      Math.round(window.innerWidth * bloomScale),
      Math.round(window.innerHeight * bloomScale),
    );
    const bloomPass = new UnrealBloomPass(bloomRes, 1.5, 0.4, 0.1);
    composer.addPass(bloomPass);

    // ── GPU timer query (EXT_disjoint_timer_query_webgl2) ─────────────────────
    // Result is one frame behind (async GPU pipeline). Silently skipped when the
    // extension is unavailable (iOS, older Android). Warning logged if > 16ms.
    const gl = renderer.getContext() as WebGL2RenderingContext;
    type GpuTimerExt = {
      TIME_ELAPSED_EXT: number;
      GPU_DISJOINT_EXT: number;
      QUERY_RESULT_EXT: number;
      QUERY_RESULT_AVAILABLE_EXT: number;
    };
    const gpuExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') as GpuTimerExt | null;
    let _gpuQuery: WebGLQuery | null = null;
    let _pendingQuery: WebGLQuery | null = null;
    // ──────────────────────────────────────────────────────────────────────────

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0x222244, 2));
    scene.add(new THREE.PointLight(0x00ffff, 5, 20));

    // --- IVM LATTICE (INSTANCED MESH) ---
    const ivmPositions: THREE.Vector3[] = [];
    for (let x = -6; x <= 6; x++) {
      for (let y = -6; y <= 6; y++) {
        for (let z = -6; z <= 6; z++) {
          if ((x + y + z) % 2 === 0) ivmPositions.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    
    const ivmGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const ivmMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    
    // Inject Chromatic Shaders
    ivmMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uEntropy = { value: 0 };
      shader.vertexShader = `varying vec3 vWorldPos;\n` + shader.vertexShader.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>\nvWorldPos = (instanceMatrix * vec4(position, 1.0)).xyz;`
      );
      shader.fragmentShader = `
        #pragma optimize(on)
        uniform float uTime;
        uniform float uEntropy;
        varying vec3 vWorldPos;
        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
      ` + shader.fragmentShader.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
        float dist = length(vWorldPos);
        vec3 cyberColor = hsv2rgb(vec3(fract(dist * 0.05 - uTime * 0.3), 1.0, 1.0));
        vec3 faultColor = mix(vec3(1.0, 0.0, 0.3), vec3(1.0, 0.5, 0.0), fract(dist*0.1 - uTime));
        vec3 finalColor = mix(cyberColor, faultColor, uEntropy);
        vec4 diffuseColor = vec4(finalColor, opacity);
        `
      );
    };

    const ivmInstanced = new THREE.InstancedMesh(ivmGeo, ivmMat, ivmPositions.length);
    const dummy = new THREE.Object3D();
    ivmPositions.forEach((pos, i) => {
      dummy.position.copy(pos).multiplyScalar(1.5);
      dummy.updateMatrix();
      ivmInstanced.setMatrixAt(i, dummy.matrix);
    });
    // Instance matrices never change after setup — hint GPU to cache them
    ivmInstanced.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    scene.add(ivmInstanced);

    // --- JITTERBUG CORE ---
    const C = 1/Math.sqrt(2); const T = 1/Math.sqrt(3);
    const COORDS = {
      cubo: [new THREE.Vector3(C,C,0), new THREE.Vector3(C,-C,0), new THREE.Vector3(-C,C,0), new THREE.Vector3(-C,-C,0), new THREE.Vector3(C,0,C), new THREE.Vector3(C,0,-C), new THREE.Vector3(-C,0,C), new THREE.Vector3(-C,0,-C), new THREE.Vector3(0,C,C), new THREE.Vector3(0,C,-C), new THREE.Vector3(0,-C,C), new THREE.Vector3(0,-C,-C)],
      octa: [new THREE.Vector3(1,0,0), new THREE.Vector3(0,-1,0), new THREE.Vector3(0,1,0), new THREE.Vector3(-1,0,0), new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,-1), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,-1), new THREE.Vector3(0,-1,0), new THREE.Vector3(0,0,1)],
      tetra: [new THREE.Vector3(T,T,T), new THREE.Vector3(T,-T,-T), new THREE.Vector3(-T,T,-T), new THREE.Vector3(-T,-T,T), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]
    };

    const jGroup = new THREE.Group();
    // Single InstancedMesh for all 12 Jitterbug nodes — 12 draw calls → 1
    // 6×5 segments: visually identical to 16×16 at 1–10m; 4× fewer verts
    const jNodeGeo = new THREE.SphereGeometry(0.08, 6, 5);
    const jNodeMat = new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const jInstanced = new THREE.InstancedMesh(jNodeGeo, jNodeMat, 12);
    // Matrices update every frame — DynamicDrawUsage hints GPU driver to use streaming path
    jInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Initialise instanceColor (setColorAt auto-creates, but pre-alloc avoids a mid-frame realloc)
    jInstanced.setColorAt(0, _colA.setHex(0xffd700));
    const jIsCore = Array.from({ length: 12 }, (_, i) => i < 4);
    // Per-node position cache — avoids reading back from matrix every frame
    const jPos: THREE.Vector3[] = Array.from({ length: 12 }, () => new THREE.Vector3());
    // Per-node opacity cache — used by edge culling pass (< 0.05 → scale-to-zero in matrix)
    const jOpacity = new Float32Array(12).fill(1);
    // Per-node scale cache — core nodes grow up to 1.5× in phase 1
    const jNodeScale = new Float32Array(12).fill(1);
    jGroup.add(jInstanced);

    const jEdgeGeo = new THREE.BufferGeometry();
    const jEPos = new Float32Array(66*6);
    const jECol = new Float32Array(66*6);
    jEdgeGeo.setAttribute('position', new THREE.BufferAttribute(jEPos, 3));
    jEdgeGeo.setAttribute('color', new THREE.BufferAttribute(jECol, 3));
    const jEdges = new THREE.LineSegments(jEdgeGeo, new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:0.8, blending:THREE.AdditiveBlending }));
    jGroup.add(jEdges);
    scene.add(jGroup);

    // ── GPU Particle System (WCD-26: 2000 particles, shader-computed positions) ──
    // Positions are computed entirely in the vertex shader from per-particle seed
    // attributes + time/entropy uniforms.  CPU cost per frame: 3 uniform writes.
    // The 'position' buffer stores unit-sphere seed data (orbit parameters),
    // not actual positions — frustumCulled=false prevents incorrect culling.
    const GPU_COUNT = 2000;
    const gpuSeeds  = new Float32Array(GPU_COUNT * 3);
    const gpuPhases = new Float32Array(GPU_COUNT);
    for (let i = 0; i < GPU_COUNT; i++) {
      const ix = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      gpuSeeds[ix]   = Math.sin(phi) * Math.cos(theta);
      gpuSeeds[ix+1] = Math.sin(phi) * Math.sin(theta);
      gpuSeeds[ix+2] = Math.cos(phi);
      gpuPhases[i] = Math.random() * Math.PI * 2;
    }
    const gpuGeo = new THREE.BufferGeometry();
    gpuGeo.setAttribute('position', new THREE.BufferAttribute(gpuSeeds, 3));
    gpuGeo.setAttribute('aPhase',   new THREE.BufferAttribute(gpuPhases, 1));

    const gpuMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:    { value: 0.0 },
        uEntropy: { value: 0.5 },
        uColor:   { value: new THREE.Color(0x00ffff) },
      },
      vertexShader: `
        attribute float aPhase;
        uniform float uTime;
        uniform float uEntropy;
        varying float vAlpha;
        void main() {
          vec3 seed = position; // unit-sphere seed stored in position attribute
          float t       = uTime + aPhase;
          float radius  = mix(0.2, 2.0, uEntropy) * (0.5 + abs(seed.x) * 1.2);
          float speed   = mix(0.4, 2.0, uEntropy) * (0.7 + abs(seed.y) * 0.6);
          float theta_  = t * speed + seed.y * 6.2832;
          float phi_    = acos(clamp(seed.z, -0.9999, 0.9999)) + sin(t * 0.25 + aPhase) * 0.4;
          vec3 pos = vec3(
            radius * sin(phi_) * cos(theta_),
            radius * sin(phi_) * sin(theta_),
            radius * cos(phi_)
          );
          vAlpha = mix(0.85, 0.35, uEntropy) * (0.4 + 0.6 * abs(sin(t * 1.8 + aPhase)));
          vec4 mvPos   = modelViewMatrix * vec4(pos, 1.0);
          gl_Position  = projectionMatrix * mvPos;
          gl_PointSize = 20.0 / (-mvPos.z);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const gpuPoints = new THREE.Points(gpuGeo, gpuMat);
    gpuPoints.frustumCulled = false;
    scene.add(gpuPoints);

    // ── Energy Waves (coherence rings, WCD-26) ────────────────────────────────
    // 3 torus rings expand from origin when entropy < 0.3 (high coherence state).
    // Single shared geometry — material cloned per ring for independent opacity.
    const WAVE_COUNT = 3;
    const waveGeo = new THREE.TorusGeometry(1.0, 0.015, 6, 64);
    const waveMeshes = Array.from({ length: WAVE_COUNT }, () => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(waveGeo, mat);
      m.rotation.x = Math.PI / 2;
      scene.add(m);
      return m;
    });
    // ────────────────────────────────────────────────────────

    // --- GODHEAD PANORAMIC CONTROLS (WCD-27: multi-pointer pinch + two-finger orbit) ---
    const dom = renderer.domElement;
    // Tracks last user interaction time for idle throttle (30fps after 2s of no input)
    const lastInteractionMs = { current: performance.now() };
    const frameCount = { current: 0 };

    // Multi-pointer state: Map<pointerId, {x, y}>
    // In GODHEAD: 1 finger = look around, 2 finger = pinch FOV + midpoint look
    // In orbit:   OrbitControls handles touch natively; our handlers don't apply rotation
    const activePointers = new Map<number, { x: number; y: number }>();
    let prevPinchDist = -1;
    let prevMidX = 0, prevMidY = 0;

    const handleStart = (e: PointerEvent) => {
      lastInteractionMs.current = performance.now();
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 1) {
        ptrState.current.isDragging = true;
        ptrState.current.prevX = e.clientX;
        ptrState.current.prevY = e.clientY;
      } else if (activePointers.size === 2) {
        ptrState.current.isDragging = false; // suppress single-pointer orbit while pinching
        const pts = [...activePointers.values()];
        const dx = pts[1]!.x - pts[0]!.x;
        const dy = pts[1]!.y - pts[0]!.y;
        prevPinchDist = Math.sqrt(dx * dx + dy * dy);
        prevMidX = (pts[0]!.x + pts[1]!.x) / 2;
        prevMidY = (pts[0]!.y + pts[1]!.y) / 2;
      }
    };
    const handleMove = (e: PointerEvent) => {
      lastInteractionMs.current = performance.now();
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const isGodhead = useSovereignStore.getState().viewPerspective === 'GODHEAD';

      if (activePointers.size === 1 && ptrState.current.isDragging && isGodhead) {
        // Single-finger: look around (existing behaviour)
        camera.rotation.y -= (e.clientX - ptrState.current.prevX) * 0.005;
        camera.rotation.x -= (e.clientY - ptrState.current.prevY) * 0.005;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        ptrState.current.prevX = e.clientX;
        ptrState.current.prevY = e.clientY;
      } else if (activePointers.size === 2 && isGodhead) {
        // Two-finger: pinch → FOV zoom, midpoint delta → look direction
        const pts = [...activePointers.values()];
        const dx = pts[1]!.x - pts[0]!.x;
        const dy = pts[1]!.y - pts[0]!.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const midX = (pts[0]!.x + pts[1]!.x) / 2;
        const midY = (pts[0]!.y + pts[1]!.y) / 2;
        if (prevPinchDist > 0) {
          // Pinch: adjust FOV (panoramic zoom)
          const pinchDelta = prevPinchDist - dist;
          camera.fov = Math.max(20, Math.min(90, camera.fov + pinchDelta * 0.12));
          camera.updateProjectionMatrix();
          // Midpoint delta: look direction
          camera.rotation.y -= (midX - prevMidX) * 0.004;
          camera.rotation.x -= (midY - prevMidY) * 0.004;
          camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
        prevPinchDist = dist;
        prevMidX = midX;
        prevMidY = midY;
      }
    };
    const handleEnd = (e: PointerEvent) => {
      lastInteractionMs.current = performance.now();
      activePointers.delete(e.pointerId);
      prevPinchDist = -1;
      if (activePointers.size === 1) {
        // Restore single-pointer tracking when one finger lifts
        const [ptr] = activePointers.values();
        ptrState.current.isDragging = true;
        ptrState.current.prevX = ptr!.x;
        ptrState.current.prevY = ptr!.y;
      } else if (activePointers.size === 0) {
        ptrState.current.isDragging = false;
      }
    };

    dom.addEventListener('pointerdown', handleStart);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);

    // ── Flash state ────────────────────────────────────────
    let flashIntensity = 0;
    let prevMountedSlotCount = 0;
    // ────────────────────────────────────────────────────────

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      frameCount.current++;

      // ── Reduced-motion: throttle to ~5fps and skip particle/wave updates ─────
      const reduceMotion = prefersReducedMotion();
      if (reduceMotion && (frameCount.current % 12) !== 0) return;

      // ── Idle throttle: 30fps after 2s of no pointer interaction ──────────────
      // Halves GPU work during passive viewing without perceptible quality loss.
      const idleMs = performance.now() - lastInteractionMs.current;
      const userIdle = idleMs > 2000;
      if (!reduceMotion && userIdle && (frameCount.current & 1) === 1) return; // skip odd frames = 30fps

      const state = useSovereignStore.getState();

      // Time delta: slow on prop-idle (overlay passive), slow on user-idle, full on active
      timeRef.current += (isIdle || userIdle) ? 0.008 : 0.016;
      const t = timeRef.current;
      const entropy = 1.0 - (state.coherence ?? 0.5);   // coherence 0–1, lower = more entropy

      // ── Theme accent → Three.js node color ───────────────
      // Parse hex string from store once per frame (cheap: 3 parseInt calls).
      // Replaces hardcoded 0xffd700 with the user-selected accent so skin
      // changes propagate to the Jitterbug without a scene rebuild.
      const accentHex = parseInt((state.accentColor ?? '#FFD700').replace('#', ''), 16);
      // ──────────────────────────────────────────────────────

      // ── Update bloom from entropy ────────────────────────
      (bloomPass as any).intensity = 1.0 + entropy * 2.0;   // 1.0 – 3.0
      (bloomPass as any).radius    = 0.2  + entropy * 1.3;  // 0.2 – 1.5

      // ── Flash on new cartridge mount ─────────────────────
      const mountedCount = Object.values(state.dynamicSlots).filter(Boolean).length;
      if (mountedCount > prevMountedSlotCount) flashIntensity = 1.0;
      prevMountedSlotCount = mountedCount;
      flashIntensity *= 0.95;
      if (flashIntensity < 0.01) flashIntensity = 0;

      // ── IVM LOD: skip shader uniform update every other frame when camera is far ─
      // At > 12 units the chromatic animation detail is not perceivable (fog + distance)
      const camDist = camera.position.length();
      const ivmFar = camDist > 12 && (frameCount.current & 1) === 1;
      if (!ivmFar && ivmInstanced.material instanceof THREE.Material && (ivmInstanced.material as any).uniforms) {
        (ivmInstanced.material as any).uniforms.uTime.value = t;
        (ivmInstanced.material as any).uniforms.uEntropy.value = entropy;
      }

      // Camera Mode Lerping
      if (state.viewPerspective === 'GODHEAD') {
        controls.enabled = false;
        camera.position.lerp(_origin, 0.1);
      } else {
        controls.enabled = true;
        camera.position.lerp(_defaultCam, 0.05);
        controls.update();
      }

      // Jitterbug Kinematics
      const prog = Math.max(0, Math.min(1, ((2026 - 2009) / 17))); // Default to current year
      let phase=0, lerp=0, scale=0.6, heat=0;
      if(prog<0.3) { phase=0; lerp=0; }
      else if(prog<0.7) { phase=0; lerp=(prog-0.3)/0.4; heat=lerp; scale=0.6-lerp*0.15; }
      else if(prog<0.95) { phase=1; lerp=(prog-0.7)/0.25; heat=1-lerp; scale=0.45-lerp*0.15; }
      else { phase=2; lerp=1; scale=0.3; }

      const sep = 0; // Default domain separation

      for (let i = 0; i < 12; i++) {
        _scratch.set(0, 0, 0);
        if (phase === 0) _scratch.lerpVectors(COORDS.cubo[i], COORDS.octa[i], lerp);
        else if (phase === 1) _scratch.lerpVectors(COORDS.octa[i], COORDS.tetra[i], lerp);
        else _scratch.copy(COORDS.tetra[i]);
        _scratch.multiplyScalar(scale * (1 + sep * 0.5));

        if (heat > 0) {
          _scratch.x += (Math.random() - 0.5) * 0.2 * heat;
          _scratch.y += (Math.random() - 0.5) * 0.2 * heat;
          _scratch.z += (Math.random() - 0.5) * 0.2 * heat;
        }
        jPos[i].copy(_scratch);

        // Determine per-node color, opacity, and scale for this frame
        let nodeOpacity = 1;
        jNodeScale[i] = 1;
        if (prog < 0.7) {
          _colA.setHex(accentHex);
        } else if (prog < 0.95) {
          if (jIsCore[i]) {
            _colA.setHex(accentHex);
            jNodeScale[i] = 1 + lerp * 0.5;
          } else {
            _colA.setHex(0xff0055);
            nodeOpacity = 1 - lerp;
          }
        } else {
          nodeOpacity = jIsCore[i] ? 1 : 0;
          _colA.setHex(jIsCore[i] ? 0xffffff : 0x000000);
        }
        // Apply flash to core nodes — reuses module-scope _colB, zero alloc
        if (flashIntensity > 0 && jIsCore[i]) {
          _colA.lerp(_colB.setHex(0xffffff), flashIntensity);
        }
        jOpacity[i] = nodeOpacity;

        // Compose matrix — scale-to-zero hides invisible nodes (1 instanced draw, 0 rasterised frags)
        // _jQuat is module-scope identity quaternion, never mutated
        _jScaleV.setScalar(nodeOpacity < 0.05 ? 0 : jNodeScale[i]);
        _jMat4.compose(jPos[i], _jQuat, _jScaleV);
        jInstanced.setMatrixAt(i, _jMat4);

        // Multiply colour by opacity — additive blending means dim = transparent
        _colA.multiplyScalar(nodeOpacity);
        jInstanced.setColorAt(i, _colA);
      }
      jInstanced.instanceMatrix.needsUpdate = true;
      if (jInstanced.instanceColor) jInstanced.instanceColor.needsUpdate = true;

      // ── GPU particle uniforms — skipped when reduced-motion; particles freeze ──
      if (!reduceMotion) {
        gpuMat.uniforms.uTime.value    = t;
        gpuMat.uniforms.uEntropy.value = entropy;
        gpuMat.uniforms.uColor.value.set(accentHex);
      }

      // ── Energy waves — hidden entirely when reduced-motion ────────────────────
      for (let wi = 0; wi < WAVE_COUNT; wi++) {
        if (reduceMotion) {
          (waveMeshes[wi].material as THREE.MeshBasicMaterial).opacity = 0;
          continue;
        }
        const phase   = ((t * 0.4 + wi / WAVE_COUNT) % 1.0);
        const s       = phase * 3.5;
        const cStrength = Math.max(0, (0.3 - entropy) * 3.33);
        const wOpacity  = cStrength * (1.0 - phase) * 0.5;
        waveMeshes[wi].scale.setScalar(Math.max(0.01, s));
        (waveMeshes[wi].material as THREE.MeshBasicMaterial).opacity = wOpacity;
      }

      // Zero-alloc edge buffer writes — no spread, no .toArray() heap allocation per frame.
      // At 60fps with up to 66 edges this was the primary GC pressure source in the loop.
      // Zero-alloc edge buffer writes — reads from jPos[] + jOpacity[] caches set above.
      // No mesh property lookups, no spread, no .toArray() — pure typed-array writes.
      let idx = 0;
      for (let i = 0; i < 12; i++) {
        if (jOpacity[i] < 0.1) continue;
        for (let j = i + 1; j < 12; j++) {
          if (jOpacity[j] < 0.1) continue;
          const d = jPos[i].distanceTo(jPos[j]);
          if (d > 0.05 && d < scale * 1.8 * (1 + sep * 0.5)) {
            const base = idx * 6;
            jEPos[base]   = jPos[i].x; jEPos[base+1] = jPos[i].y; jEPos[base+2] = jPos[i].z;
            jEPos[base+3] = jPos[j].x; jEPos[base+4] = jPos[j].y; jEPos[base+5] = jPos[j].z;
            const col = heat > 0
              ? _colA.setHex(accentHex).lerp(_colB.set(0xff0055), heat)
              : _colA.setHex(prog >= 0.95 ? 0xffffff : accentHex);
            jECol[base]   = col.r; jECol[base+1] = col.g; jECol[base+2] = col.b;
            jECol[base+3] = col.r; jECol[base+4] = col.g; jECol[base+5] = col.b;
            idx++;
          }
        }
      }
      for(let i=idx*6; i<66*6; i++) { jEPos[i]=0; jECol[i]=0; }
      jEdges.geometry.attributes.position.needsUpdate = true; jEdges.geometry.attributes.color.needsUpdate = true;

      jGroup.rotation.y += 0.005;
      ivmInstanced.rotation.y -= 0.001;
      
      if (entropy > 0) {
        const j = (Math.random()-0.5)*entropy*0.1;
        jGroup.rotation.z += j;
      }

      // GPU timer: resolve last frame's query (one-frame lag is unavoidable)
      if (gpuExt && _pendingQuery) {
        const available = gl.getQueryParameter(_pendingQuery, gpuExt.QUERY_RESULT_AVAILABLE_EXT) as boolean;
        const disjoint  = gl.getParameter(gpuExt.GPU_DISJOINT_EXT) as boolean;
        if (available && !disjoint) {
          const ns = gl.getQueryParameter(_pendingQuery, gpuExt.QUERY_RESULT_EXT) as number;
          const ms = ns / 1e6;
          setGpuMs(ms);
          if (ms > 16) console.warn(`[P31] GPU frame ${ms.toFixed(1)}ms — over 16ms budget`);
        }
        if (available || disjoint) { gl.deleteQuery(_pendingQuery); _pendingQuery = null; }
      }
      // Begin GPU timer for this frame
      if (gpuExt) {
        _gpuQuery = gl.createQuery();
        if (_gpuQuery) gl.beginQuery(gpuExt.TIME_ELAPSED_EXT, _gpuQuery);
      }

      composer.render();

      // End GPU timer
      if (gpuExt && _gpuQuery) {
        gl.endQuery(gpuExt.TIME_ELAPSED_EXT);
        _pendingQuery = _gpuQuery;
        _gpuQuery = null;
      }
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(
        Math.round(window.innerWidth * bloomScale),
        Math.round(window.innerHeight * bloomScale)
      );
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      dom.removeEventListener('pointerdown', handleStart);
      cancelAnimationFrame(animationId);
      if (_pendingQuery) { gl.deleteQuery(_pendingQuery); _pendingQuery = null; }
      // IVM
      ivmGeo.dispose();
      ivmMat.dispose();
      gpuGeo.dispose();
      gpuMat.dispose();
      waveGeo.dispose();
      waveMeshes.forEach(w => (w.material as THREE.MeshBasicMaterial).dispose());
      // Jitterbug — single geo + mat pair (was 12 clones before → 12× VRAM usage)
      jNodeGeo.dispose();
      jNodeMat.dispose();
      jEdgeGeo.dispose();
      // Post-processing render targets
      composer.dispose();
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [isIdle]);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 0, cursor: 'crosshair', background: '#030308' }} />;
}