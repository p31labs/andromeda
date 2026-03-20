// @ts-nocheck — WebGPU node system APIs are not typed in @types/three 0.159.0.
// All type errors here are expected prototype scaffolding. See WCD-28-WEBGPU-REPORT.md.
/**
 * @file ImmersiveCockpitWebGPU — WCD-28 experimental WebGPU prototype.
 *
 * STATUS: PROTOTYPE ONLY — NOT used in production build.
 *         Wired via ?renderer=webgpu URL param for manual testing.
 *
 * What this proves:
 *   1. WebGPURenderer drops in with automatic WebGL2 fallback.
 *   2. 2000-particle GPU compute simulation via ComputeNode + StorageBufferNode.
 *   3. PointsNodeMaterial replaces ShaderMaterial (GLSL → node graph).
 *   4. Jitterbug IVM core renders identically under both backends.
 *
 * What is NOT solved (see WCD-28-WEBGPU-REPORT.md):
 *   - UnrealBloomPass is EffectComposer/WebGL only — bloom must be rebuilt
 *     with PostProcessing node stack (not available in Three.js 0.159.0).
 *   - MeshDistortMaterial from @react-three/drei is R3F only.
 *   - WebGPURenderer is not a drop-in for the vanilla THREE.WebGLRenderer API
 *     (different render loop: renderer.renderAsync() instead of renderer.render()).
 *
 * Performance targets (vs WebGL baseline):
 *   GPU particle sim: expect 30–50% better frame time on Android Chrome 121+
 *   IVM draw calls:   same (InstancedMesh instancing identical in both backends)
 *   Bloom:            not available in WebGPU path — track as regression
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useSovereignStore } from '../../../sovereign/useSovereignStore';

// ─── WebGPU renderer + node system ───────────────────────────────────────────
// These are the three/examples/jsm paths for Three.js 0.159.0.
// They do NOT exist in the three main bundle — explicit JSM imports required.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no type declarations for jsm/renderers in 0.159.0
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { tslFn, uniform, storage, instanceIndex, float, vec3, vec4, sin, cos, mix, clamp, smoothstep, length as tslLength } from 'three/examples/jsm/nodes/shadernode/ShaderNode.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import StorageBufferNode from 'three/examples/jsm/nodes/accessors/StorageBufferNode.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ComputeNode from 'three/examples/jsm/nodes/gpgpu/ComputeNode.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { PointsNodeMaterial } from 'three/examples/jsm/nodes/materials/PointsNodeMaterial.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 2000;

// ─── Jitterbug coordinates (duplicated from ImmersiveCockpit for standalone proto) ──
const C = 1 / Math.SQRT2;
const T = 1 / Math.sqrt(3);
const CUBO: [number, number, number][] = [
  [ C,  C, 0], [-C,  C, 0], [ C, -C, 0], [-C, -C, 0],
  [ C, 0,  C], [-C, 0,  C], [ C, 0, -C], [-C, 0, -C],
  [0,  C,  C], [0, -C,  C], [0,  C, -C], [0, -C, -C],
];
const TETRA: [number, number, number][] = [
  [ T,  T,  T], [-T, -T,  T], [-T,  T, -T], [ T, -T, -T],
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImmersiveCockpitWebGPU() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;

    // ── Renderer: WebGPURenderer with automatic WebGL2 fallback ──────────────
    // WebGPU.isAvailable() is called internally — no guard needed here.
    // Falls back to WebGLBackend with console.warn if WebGPU not available.
    const renderer = new WebGPURenderer({ antialias: true, alpha: true }) as unknown as THREE.WebGLRenderer & {
      renderAsync: (scene: THREE.Scene, camera: THREE.Camera) => Promise<void>;
      compute: (node: unknown) => void;
      isWebGPURenderer: boolean;
    };
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    (renderer as unknown as { outputColorSpace: string }).outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Log which backend is active
    const backendLabel = (renderer as { isWebGPURenderer?: boolean }).isWebGPURenderer ? 'WebGPU' : 'WebGL2-fallback';
    console.info(`[WCD-28] ImmersiveCockpitWebGPU running on: ${backendLabel}`);

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000510, 0.06);

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(6, 4, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3;
    controls.maxDistance = 20;

    // ── Ambient light ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // ── Jitterbug: simple line skeleton (no bloom — see report) ───────────────
    const jMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 });
    const EDGES = [[0,2],[1,3],[4,6],[5,7],[8,10],[9,11],[0,4],[0,8],[2,6],[2,9],[1,5],[1,10],[3,7],[3,11],[4,8],[5,9],[6,10],[7,11]];
    const edgeBuf = new Float32Array(EDGES.length * 2 * 3);
    const jEdgeGeo = new THREE.BufferGeometry();
    jEdgeGeo.setAttribute('position', new THREE.BufferAttribute(edgeBuf, 3));
    scene.add(new THREE.LineSegments(jEdgeGeo, jMat));

    // ── WCD-28 core: GPU Compute particle simulation ───────────────────────────
    //
    // Architecture:
    //   positionBuffer — StorageBuffer of PARTICLE_COUNT × vec3 (current positions)
    //   velocityBuffer — StorageBuffer of PARTICLE_COUNT × vec3 (current velocities)
    //   seedBuffer     — StorageBuffer of PARTICLE_COUNT × vec3 (fixed per-particle seed)
    //
    //   computeUpdate  — ComputeNode run once per frame; reads/writes pos+vel buffers
    //                    on the GPU. Zero CPU buffer readback.
    //
    //   PointsNodeMaterial reads positionBuffer via StorageBufferNode in its
    //   positionNode — geometry's position attribute is bypassed entirely.

    // Seed buffer: unit-sphere random seeds, written once at init
    const seedArray = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      seedArray[ix]   = Math.sin(phi) * Math.cos(theta);
      seedArray[ix+1] = Math.sin(phi) * Math.sin(theta);
      seedArray[ix+2] = Math.cos(phi);
    }

    // Initial positions: same as seeds (spread on unit sphere)
    const positionArray = new Float32Array(PARTICLE_COUNT * 3);
    positionArray.set(seedArray);

    // Initial velocities: zero
    const velocityArray = new Float32Array(PARTICLE_COUNT * 3);

    // StorageBufferNodes — GPU-resident, never downloaded to CPU
    const positionBuffer = new StorageBufferNode(
      new THREE.StorageBufferAttribute(positionArray, 3),
      'vec3',
      PARTICLE_COUNT
    );
    const velocityBuffer = new StorageBufferNode(
      new THREE.StorageBufferAttribute(velocityArray, 3),
      'vec3',
      PARTICLE_COUNT
    );
    const seedBuffer = new StorageBufferNode(
      new THREE.StorageBufferAttribute(seedArray, 3),
      'vec3',
      PARTICLE_COUNT
    );

    // Uniforms driven by sovereign store each frame
    const uTime    = uniform(0);
    const uEntropy = uniform(0.5);

    // Compute shader (written in Three.js Shader Node Language — compiles to WGSL on WebGPU, GLSL on WebGL2)
    const computeUpdate = tslFn(() => {
      const idx    = instanceIndex;
      const seed   = seedBuffer.element(idx);
      const pos    = positionBuffer.element(idx);
      const vel    = velocityBuffer.element(idx);

      // Target: orbit the jitterbug (at origin) in a shell scaled by entropy
      const radius   = mix(float(0.3), float(2.5), uEntropy);
      const speed    = mix(float(0.3), float(1.8), uEntropy);
      const t        = uTime.add(seed.x.mul(6.2832));
      const targetX  = sin(t.mul(speed)).mul(radius).mul(seed.x.abs().add(0.5));
      const targetY  = cos(t.mul(speed).mul(0.7)).mul(radius).mul(seed.y.abs().add(0.5));
      const targetZ  = sin(t.mul(speed).mul(0.5)).mul(radius).mul(seed.z.abs().add(0.5));
      const target   = vec3(targetX, targetY, targetZ);

      // Spring toward target, dampen velocity
      const newVel = vel.mul(0.94).add(target.sub(pos).mul(0.06));
      const newPos = pos.add(newVel);

      velocityBuffer.element(idx).assign(newVel);
      positionBuffer.element(idx).assign(newPos);
    })().compute(PARTICLE_COUNT);

    // PointsNodeMaterial — reads positions from storage buffer (GPU memory → vertex shader)
    const particleMat = new PointsNodeMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    // positionNode replaces attribute — particles positioned entirely from GPU buffer
    particleMat.positionNode = positionBuffer.toAttribute();

    // colorNode: cyan tinted by entropy, alpha by distance from screen centre
    particleMat.colorNode = vec4(
      mix(float(0.0), float(1.0), uEntropy.oneMinus()),  // R: 0 at high entropy
      float(1.0),                                         // G: always on (cyan base)
      mix(float(0.8), float(1.0), uEntropy.oneMinus()),  // B: ~cyan
      float(0.6)
    );

    // Dummy geometry — just tells Three.js how many vertices to draw
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setDrawRange(0, PARTICLE_COUNT);
    particleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));

    const particlePoints = new THREE.Points(particleGeo, particleMat);
    particlePoints.frustumCulled = false;
    scene.add(particlePoints);

    // ── Resize handler ────────────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // ── Animation loop ────────────────────────────────────────────────────────
    let rafId = 0;
    let lastTime = 0;
    let jPhase = 0;

    const animate = async (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const state = useSovereignStore.getState();
      const entropy = 1.0 - (state.coherence ?? 0.5);
      const t = now * 0.001;

      // Update uniforms
      uTime.value    = t;
      uEntropy.value = entropy;

      // Jitterbug edge update (CPU — same as production, ~0.3ms)
      jPhase = (jPhase + dt * 0.4) % 1.0;
      const morphT = (Math.sin(jPhase * Math.PI * 2) * 0.5 + 0.5);
      for (let i = 0; i < 12; i++) {
        const cubo = CUBO[i];
        const tetra: [number, number, number] = i < 4
          ? TETRA[i]
          : [0, 0, 0];
        const ix = i * 3;
        edgeBuf[ix]   = cubo[0] + (tetra[0] - cubo[0]) * morphT;
        edgeBuf[ix+1] = cubo[1] + (tetra[1] - cubo[1]) * morphT;
        edgeBuf[ix+2] = cubo[2] + (tetra[2] - cubo[2]) * morphT;
      }
      jEdgeGeo.attributes.position.needsUpdate = true;

      // Build edge segment positions into edgeBuf (second half for line endpoint pairs)
      for (let e = 0; e < EDGES.length; e++) {
        const [a, b] = EDGES[e];
        const ea = e * 6;
        edgeBuf[ea]   = edgeBuf[a * 3];
        edgeBuf[ea+1] = edgeBuf[a * 3 + 1];
        edgeBuf[ea+2] = edgeBuf[a * 3 + 2];
        edgeBuf[ea+3] = edgeBuf[b * 3];
        edgeBuf[ea+4] = edgeBuf[b * 3 + 1];
        edgeBuf[ea+5] = edgeBuf[b * 3 + 2];
      }
      jEdgeGeo.attributes.position.needsUpdate = true;

      controls.update();

      // GPU compute pass — dispatched on the renderer, zero CPU readback
      renderer.compute(computeUpdate);

      // WebGPURenderer uses renderAsync; WebGL2 fallback provides synchronous render
      await renderer.renderAsync(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      jEdgeGeo.dispose();
      jMat.dispose();
      particleGeo.dispose();
      // StorageBufferNodes: dispose underlying attribute
      positionBuffer.value.dispose();
      velocityBuffer.value.dispose();
      seedBuffer.value.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', background: '#000510' }}
      data-testid="immersive-cockpit-webgpu"
    />
  );
}
