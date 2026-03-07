// observatory-effects.ts — Bloom, arcs, particles, edge pulse, aurora, labels

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { FaceAssignment } from './observatory-data';
import type { GeodesicResult } from './observatory-geo';

// ═══════════════════════════════════════════════════════════════
// BLOOM PIPELINE
// ═══════════════════════════════════════════════════════════════

export interface BloomPipeline {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

export function createBloomPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): BloomPipeline {
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);

  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  renderPass.clearColor = new THREE.Color(0, 0, 0);
  renderPass.clearAlpha = 0;
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.6,   // strength
    0.4,   // radius
    0.85,  // threshold
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    composer,
    bloomPass,
    resize(w: number, h: number) {
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    },
    dispose() {
      composer.dispose();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// CONNECTION ARCS
// ═══════════════════════════════════════════════════════════════

const ARC_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ARC_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float pulse = smoothstep(0.0, 0.1, fract(vUv.x - uTime * 0.5))
                * (1.0 - smoothstep(0.1, 0.2, fract(vUv.x - uTime * 0.5)));
    float base = 0.2;
    float bright = base + pulse * 2.5;
    gl_FragColor = vec4(uColor * bright, uOpacity * (base + pulse));
  }
`;

export interface ArcMesh {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  targetNodeId: string;
}

export function buildConnectionArc(
  fromPos: THREE.Vector3,
  toPos: THREE.Vector3,
  domeRadius: number,
  color: THREE.Color,
  opacity: number,
  targetNodeId: string,
): ArcMesh {
  const mid = fromPos.clone().add(toPos).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(domeRadius * 1.15);

  const curve = new THREE.QuadraticBezierCurve3(
    fromPos.clone().normalize().multiplyScalar(domeRadius * 1.02),
    mid,
    toPos.clone().normalize().multiplyScalar(domeRadius * 1.02),
  );
  const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.012, 6, false);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color },
      uOpacity: { value: opacity },
    },
    vertexShader: ARC_VERT,
    fragmentShader: ARC_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(tubeGeo, material);
  mesh.userData = { targetNodeId };

  return { mesh, material, targetNodeId };
}

export function disposeArc(arc: ArcMesh) {
  arc.mesh.geometry.dispose();
  arc.material.dispose();
}

// ═══════════════════════════════════════════════════════════════
// DUST MOTES (particle system)
// ═══════════════════════════════════════════════════════════════

const DUST_VERT = /* glsl */`
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vec3 pos = position;
    float t = uTime * aSpeed;
    pos.x += sin(t + aPhase) * 0.08;
    pos.y += cos(t * 0.7 + aPhase * 2.0) * 0.06;
    pos.z += sin(t * 0.5 + aPhase * 3.0) * 0.08;
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 3.0 * (300.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
    vAlpha = 0.12 + 0.08 * sin(t * 0.3 + aPhase);
  }
`;

const DUST_FRAG = /* glsl */`
  varying float vAlpha;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float soft = 1.0 - smoothstep(0.2, 0.5, dist);
    gl_FragColor = vec4(0.3, 0.55, 0.65, vAlpha * soft);
  }
`;

export interface DustMotes {
  points: THREE.Points;
  update: (dt: number) => void;
  dispose: () => void;
}

export function createDustMotes(count: number, radius: number): DustMotes {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Random point inside sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 1 / 3) * radius * 0.92;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.3 + Math.random() * 0.7;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, material);

  let time = 0;
  return {
    points,
    update(dt: number) {
      time += dt;
      material.uniforms.uTime.value = time;
    },
    dispose() {
      geo.dispose();
      material.dispose();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// EDGE PULSE (wireframe shader)
// ═══════════════════════════════════════════════════════════════

const EDGE_VERT = /* glsl */`
  attribute float edgeProgress;
  varying float vProgress;
  void main() {
    vProgress = edgeProgress;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EDGE_FRAG = /* glsl */`
  uniform float uTime;
  varying float vProgress;
  void main() {
    float pulse = smoothstep(0.0, 0.05, fract(vProgress - uTime * 0.08))
                * (1.0 - smoothstep(0.05, 0.1, fract(vProgress - uTime * 0.08)));
    float base = 0.18;
    gl_FragColor = vec4(0.1, 0.18, 0.28, base + pulse * 0.55);
  }
`;

export interface EdgePulse {
  lines: THREE.LineSegments;
  update: (dt: number) => void;
  dispose: () => void;
}

export function createEdgePulse(geo: GeodesicResult): EdgePulse {
  const wirePos: number[] = [];
  const progressAttr: number[] = [];
  const totalEdges = geo.edges.length;

  for (let i = 0; i < totalEdges; i++) {
    const [a, b] = geo.edges[i];
    wirePos.push(geo.verts[a].x, geo.verts[a].y, geo.verts[a].z);
    wirePos.push(geo.verts[b].x, geo.verts[b].y, geo.verts[b].z);
    const p = i / totalEdges;
    progressAttr.push(p, p);
  }

  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePos, 3));
  wireGeo.setAttribute('edgeProgress', new THREE.Float32BufferAttribute(progressAttr, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: EDGE_VERT,
    fragmentShader: EDGE_FRAG,
    transparent: true,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(wireGeo, material);

  let time = 0;
  return {
    lines,
    update(dt: number) {
      time += dt;
      material.uniforms.uTime.value = time;
    },
    dispose() {
      wireGeo.dispose();
      material.dispose();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// AURORA BAND
// ═══════════════════════════════════════════════════════════════

const AURORA_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const AURORA_FRAG = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float wave = sin(vUv.x * 12.56 + uTime * 0.5) * 0.5 + 0.5;
    vec3 col = mix(vec3(0.1, 0.5, 0.4), vec3(0.2, 0.3, 0.8), wave);
    float alpha = 0.06 + 0.04 * sin(vUv.x * 6.28 + uTime * 0.3);
    gl_FragColor = vec4(col, alpha);
  }
`;

export interface Aurora {
  mesh: THREE.Mesh;
  update: (dt: number) => void;
  dispose: () => void;
}

export function createAurora(domeRadius: number): Aurora {
  const geo = new THREE.CylinderGeometry(
    domeRadius * 1.08, domeRadius * 1.08,
    0.15, 64, 1, true,
  );
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: AURORA_VERT,
    fragmentShader: AURORA_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, material);

  let time = 0;
  return {
    mesh,
    update(dt: number) {
      time += dt;
      material.uniforms.uTime.value = time;
    },
    dispose() {
      geo.dispose();
      material.dispose();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// CSS2D LABELS
// ═══════════════════════════════════════════════════════════════

export interface LabelSystem {
  renderer: CSS2DRenderer;
  createLabel: (text: string, color: string, pos: THREE.Vector3) => CSS2DObject;
  mount: (container: HTMLElement) => void;
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

export function createLabelSystem(): LabelSystem {
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelRenderer.domElement.style.zIndex = '1';

  return {
    renderer: labelRenderer,
    createLabel(text: string, color: string, pos: THREE.Vector3) {
      const div = document.createElement('div');
      div.textContent = text;
      div.style.cssText = `
        font-family: 'JetBrains Mono', monospace;
        font-size: 8px;
        color: ${color};
        background: rgba(6,10,18,0.75);
        padding: 1px 5px;
        border-radius: 2px;
        pointer-events: none;
        white-space: nowrap;
        letter-spacing: 0.5px;
        border: 1px solid rgba(255,255,255,0.06);
      `;
      const label = new CSS2DObject(div);
      label.position.copy(pos);
      return label;
    },
    mount(container: HTMLElement) {
      container.appendChild(labelRenderer.domElement);
    },
    render(scene: THREE.Scene, camera: THREE.Camera) {
      labelRenderer.render(scene, camera);
    },
    resize(w: number, h: number) {
      labelRenderer.setSize(w, h);
    },
    dispose() {
      if (labelRenderer.domElement.parentElement) {
        labelRenderer.domElement.parentElement.removeChild(labelRenderer.domElement);
      }
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// GLOW SPRITE FACTORY
// ═══════════════════════════════════════════════════════════════

let _glowTex: THREE.CanvasTexture | null = null;

export function getGlowTexture(): THREE.CanvasTexture {
  if (_glowTex) return _glowTex;
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
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}
