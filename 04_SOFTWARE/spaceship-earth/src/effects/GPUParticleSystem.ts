// ═══════════════════════════════════════════════════════════════════════════
// WCD-27.1: GPU Particle System
// P31 Labs — Spaceship Earth
//
// GPU-based particle system using THREE.Points with custom shaders.
// Supports thousands of particles with physics simulation in vertex shader.
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Vertex shader - physics simulation
const vertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform vec3 uColor;
  uniform float uSize;
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform int uMode; // 0=orbit, 1=radial, 2=torus

  attribute vec3 aVelocity;
  attribute float aPhase;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Physics based on mode
    if (uMode == 0) {
      // Orbit around center
      float angle = uTime * uSpeed + aPhase;
      float r = uRadius * (0.5 + 0.5 * sin(aPhase * 6.28));
      pos.x = uCenter.x + r * cos(angle);
      pos.y = uCenter.y + r * sin(angle * 0.5);
      pos.z = uCenter.z + r * sin(angle) * 0.3;
    } else if (uMode == 1) {
      // Radial outward (for energy wave)
      float t = mod(uTime * uSpeed + aPhase, 2.0);
      vec3 dir = normalize(position - uCenter);
      pos = uCenter + dir * t * uRadius;
      vAlpha = 1.0 - t / 2.0;
    } else if (uMode == 2) {
      // Torus
      float angle = uTime * uSpeed + aPhase;
      float R = uRadius;
      float r = uRadius * 0.3;
      float tubeAngle = aPhase * 6.28;
      pos.x = uCenter.x + (R + r * cos(tubeAngle)) * cos(angle);
      pos.y = uCenter.y + r * sin(tubeAngle);
      pos.z = uCenter.z + (R + r * cos(tubeAngle)) * sin(angle);
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation
    gl_PointSize = uSize * (300.0 / -mvPosition.z);

    // Pass to fragment
    vColor = uColor;
    vAlpha = 1.0;
  }
`;

// Fragment shader
const fragmentShader = `
  uniform vec3 uColor;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Circular particle with soft edge
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    alpha *= vAlpha;

    gl_FragColor = vec4(vColor, alpha);
  }
`;

export interface ParticleSystemConfig {
  count: number;
  speed: number;
  color: THREE.Color;
  size: number;
  center?: THREE.Vector3;
  radius?: number;
  mode?: 'orbit' | 'radial' | 'torus';
}

export class GPUParticleSystem {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private phases: Float32Array;

  constructor(config: ParticleSystemConfig) {
    const {
      count = 1000,
      speed = 1.0,
      color = new THREE.Color(0x00ff88),
      size = 2.0,
      center = new THREE.Vector3(0, 0, 0),
      radius = 10,
      mode = 'orbit',
    } = config;

    // Create geometry
    this.geometry = new THREE.BufferGeometry();

    // Initialize arrays
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.phases = new Float32Array(count);

    // Fill with random positions within radius
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Random position in sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());

      this.positions[i3] = center.x + r * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = center.y + r * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = center.z + r * Math.cos(phi);

      // Random velocity
      this.velocities[i3] = (Math.random() - 0.5) * 2;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 2;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 2;

      // Random phase
      this.phases[i] = Math.random();
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.velocities, 3));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(this.phases, 1));

    // Create shader material
    const modeInt = mode === 'orbit' ? 0 : mode === 'radial' ? 1 : 2;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uColor: { value: color },
        uSize: { value: size },
        uCenter: { value: center },
        uRadius: { value: radius },
        uMode: { value: modeInt },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  update(delta: number): void {
    this.material.uniforms.uTime.value += delta;
  }

  setColor(color: THREE.Color): void {
    this.material.uniforms.uColor.value = color;
  }

  setSpeed(speed: number): void {
    this.material.uniforms.uSpeed.value = speed;
  }

  setCenter(center: THREE.Vector3): void {
    this.material.uniforms.uCenter.value = center;
  }

  setRadius(radius: number): void {
    this.material.uniforms.uRadius.value = radius;
  }

  setMode(mode: 'orbit' | 'radial' | 'torus'): void {
    const modeInt = mode === 'orbit' ? 0 : mode === 'radial' ? 1 : 2;
    this.material.uniforms.uMode.value = modeInt;
  }

  setVisible(visible: boolean): void {
    this.points.visible = visible;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
