/**
 * FluidPhysics Engine
 * CPU-side 10,000 particle simulation using raw Float32Arrays
 * Targets Chromebook Celerons - NO GPGPU/FBO ping-pong
 */

import { Mulberry32 } from './Mulberry32';

// P31 Canon Colors (RGB 0-1)
const COLORS = {
  phos: { r: 0.224, g: 1.0, b: 0.078 },    // #39ff14
  cyan: { r: 0.0, g: 0.961, b: 1.0 },       // #00f5ff
  orchid: { r: 0.855, g: 0.439, b: 0.839 }, // #da70d6
};

// Particle types
export type ParticleType = 0 | 1 | 2; // 0 = Cyan (left), 1 = Phos (right), 2 = Orchid (mixed)

export interface ParticleState {
  // Position (x, y, z)
  x: number;
  y: number;
  z: number;
  // Velocity
  vx: number;
  vy: number;
  vz: number;
  // Color (rgb)
  r: number;
  g: number;
  b: number;
  // Properties
  type: ParticleType;
  life: number; // 0-1 life for fade effects
}

export interface FluidConfig {
  particleCount: number;
  gravity: number;
  drag: number;         // Viscosity
  bounce: number;       // Floor bounce dampening
  bounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
  };
}

export interface ForceEvent {
  x: number;
  y: number;
  z: number;
  radius: number;
  strength: number;
  timeMs: number;
}

export interface VortexConfig {
  active: boolean;
  centerX: number;
  centerY: number;
  strength: number;
  t: number; // Parametric time for heart shape
}

/**
 * FluidPhysics - CPU-side particle system
 * Uses flat Float32Arrays for maximum performance on low-end devices
 */
export class FluidPhysics {
  // Particle count
  readonly count: number;

  // Typed arrays for positions (x3: x, y, z per particle)
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;      // RGB per particle
  properties: Uint8Array;   // type per particle

  // Config
  private config: FluidConfig;

  // Simulation state
  private timeMs: number = 0;
  private prng: Mulberry32;

  // Forces to apply this frame
  private pendingForces: ForceEvent[] = [];
  private vortex: VortexConfig = { active: false, centerX: 0, centerY: 0, strength: 0, t: 0 };

  // Pre-allocated temp vars (avoid GC)
  private tempVec3 = { x: 0, y: 0, z: 0 };

  constructor(seed: number, config: Partial<FluidConfig> = {}) {
    this.config = {
      particleCount: 10000,
      gravity: -0.005,
      drag: 0.98,
      bounce: 0.4,
      bounds: {
        xMin: -15,
        xMax: 15,
        yMin: -10,
        yMax: 15,
        zMin: -5,
        zMax: 5,
      },
      ...config,
    };

    this.count = this.config.particleCount;
    this.prng = new Mulberry32(seed);

    // Allocate arrays
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.properties = new Uint8Array(this.count);

    // Initialize particles
    this.initializeParticles();
  }

  /**
   * Initialize particles with deterministic placement
   */
  private initializeParticles(): void {
    const halfCount = Math.floor(this.count / 2);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      // Type: first half = Cyan (left), second half = Phos (right)
      const type: ParticleType = i < halfCount ? 0 : 1;
      this.properties[i] = type;

      // Position: Cyan on left, Phos on right with random spread
      const side = type === 0 ? -1 : 1;
      this.positions[i3] = side * (5 + this.prng.next() * 8);     // x
      this.positions[i3 + 1] = 8 + this.prng.next() * 4;        // y (height)
      this.positions[i3 + 2] = (this.prng.next() - 0.5) * 6;      // z

      // Initial velocity
      this.velocities[i3] = (this.prng.next() - 0.5) * 0.1;
      this.velocities[i3 + 1] = -this.prng.next() * 0.2;
      this.velocities[i3 + 2] = (this.prng.next() - 0.5) * 0.1;

      // Color based on type
      const color = type === 0 ? COLORS.cyan : COLORS.phos;
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
    }
  }

  /**
   * Apply external force (mouse drag, pour, etc)
   */
  applyForce(force: ForceEvent): void {
    this.pendingForces.push(force);
  }

  /**
   * Trigger care vortex (heart shape)
   */
  triggerVortex(centerX: number = 0, centerY: number = 0, strength: number = 1.0): void {
    this.vortex = {
      active: true,
      centerX,
      centerY,
      strength,
      t: 0,
    };
  }

  /**
   * Stop vortex
   */
  stopVortex(): void {
    this.vortex.active = false;
  }

  /**
   * Main physics step - called every frame
   * Updates positions and colors
   */
  step(deltaTimeMs: number): void {
    const dt = Math.min(deltaTimeMs, 50) / 16.67; // Normalize to ~60fps
    this.timeMs += deltaTimeMs;

    const { gravity, drag, bounce, bounds } = this.config;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      // Get current state
      let px = this.positions[i3];
      let py = this.positions[i3 + 1];
      let pz = this.positions[i3 + 2];
      let vx = this.velocities[i3];
      let vy = this.velocities[i3 + 1];
      let vz = this.velocities[i3 + 2];
      const type = this.properties[i] as ParticleType;

      // 1. Apply Gravity
      vy += gravity * dt;

      // 2. Apply Drag (Viscosity)
      vx *= drag;
      vy *= drag;
      vz *= drag;

      // 3. Apply Vortex Force (if active)
      if (this.vortex.active) {
        const vdx = px - this.vortex.centerX;
        const vdy = py - this.vortex.centerY;
        const dist = Math.sqrt(vdx * vdx + vdy * vdy);

        // Heart shape parametric target
        const t = (i / this.count) * Math.PI * 2 + this.vortex.t;
        const heartX = this.vortex.centerX + 16 * Math.pow(Math.sin(t), 3) * 0.1;
        const heartY = this.vortex.centerY + (
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)
        ) * 0.1;

        // Pull towards heart shape
        const pullX = heartX - px;
        const pullY = heartY - py;
        const pullStrength = this.vortex.strength * 0.002 * dt;

        vx += pullX * pullStrength;
        vy += pullY * pullStrength;

        // Tangential swirl
        const swirl = 0.05 * this.vortex.strength * dt;
        vx += -vdy * swirl;
        vy += vdx * swirl;
      }

      // 4. Apply Pending Forces (mouse drags, etc)
      for (const force of this.pendingForces) {
        const fdx = px - force.x;
        const fdy = py - force.y;
        const fdz = pz - force.z;
        const distSq = fdx * fdx + fdy * fdy + fdz * fdz;

        if (distSq < force.radius * force.radius) {
          const dist = Math.sqrt(distSq) + 0.001;
          const strength = (1 - dist / force.radius) * force.strength;

          // Repulsion force
          vx += (fdx / dist) * strength * dt;
          vy += (fdy / dist) * strength * dt;
          vz += (fdz / dist) * strength * dt;
        }
      }

      // 5. Update Positions
      px += vx * dt;
      py += vy * dt;
      pz += vz * dt;

      // 6. Floor Collisions (Bounce)
      if (py < bounds.yMin) {
        py = bounds.yMin;
        vy = Math.abs(vy) * bounce;
        // Friction on floor
        vx *= 0.9;
        vz *= 0.9;
      }

      // Wall collisions
      if (px < bounds.xMin) {
        px = bounds.xMin;
        vx = Math.abs(vx) * bounce;
      } else if (px > bounds.xMax) {
        px = bounds.xMax;
        vx = -Math.abs(vx) * bounce;
      }

      if (pz < bounds.zMin) {
        pz = bounds.zMin;
        vz = Math.abs(vz) * bounce;
      } else if (pz > bounds.zMax) {
        pz = bounds.zMax;
        vz = -Math.abs(vz) * bounce;
      }

      // 7. LOVE ECONOMY COLOR MIXING
      // If particle crosses center zone, blend towards Orchid
      const centerZoneWidth = 4.0;
      const distFromCenter = Math.abs(px);

      if (distFromCenter < centerZoneWidth) {
        const mixFactor = 1 - (distFromCenter / centerZoneWidth);
        const targetColor = COLORS.orchid;
        const sourceColor = type === 0 ? COLORS.cyan : COLORS.phos;

        this.colors[i3] = this.lerp(this.colors[i3], targetColor.r, mixFactor * 0.05 * dt);
        this.colors[i3 + 1] = this.lerp(this.colors[i3 + 1], targetColor.g, mixFactor * 0.05 * dt);
        this.colors[i3 + 2] = this.lerp(this.colors[i3 + 2], targetColor.b, mixFactor * 0.05 * dt);

        // Mark as mixed type
        if (mixFactor > 0.7) {
          this.properties[i] = 2; // Orchid
        }
      } else {
        // Gradually return to original color outside center zone
        const sourceColor = type === 0 ? COLORS.cyan : COLORS.phos;
        this.colors[i3] = this.lerp(this.colors[i3], sourceColor.r, 0.02 * dt);
        this.colors[i3 + 1] = this.lerp(this.colors[i3 + 1], sourceColor.g, 0.02 * dt);
        this.colors[i3 + 2] = this.lerp(this.colors[i3 + 2], sourceColor.b, 0.02 * dt);
      }

      // Write back
      this.positions[i3] = px;
      this.positions[i3 + 1] = py;
      this.positions[i3 + 2] = pz;
      this.velocities[i3] = vx;
      this.velocities[i3 + 1] = vy;
      this.velocities[i3 + 2] = vz;
    }

    // Clear forces
    this.pendingForces = [];

    // Increment vortex time
    if (this.vortex.active) {
      this.vortex.t += 0.02 * dt;
    }
  }

  /**
   * Linear interpolation helper
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Pour particles from an emitter
   */
  pour(
    emitterX: number,
    emitterY: number,
    emitterZ: number,
    count: number,
    type: ParticleType
  ): void {
    let poured = 0;
    const color = type === 0 ? COLORS.cyan : COLORS.phos;

    // Find inactive or reset particles at the top
    for (let i = 0; i < this.count && poured < count; i++) {
      const i3 = i * 3;
      const py = this.positions[i3 + 1];

      // Reset particles that fell below floor
      if (py < this.config.bounds.yMin + 0.5 || this.properties[i] === 2) {
        this.positions[i3] = emitterX + (this.prng.next() - 0.5) * 2;
        this.positions[i3 + 1] = emitterY + this.prng.next() * 3;
        this.positions[i3 + 2] = emitterZ + (this.prng.next() - 0.5) * 2;

        this.velocities[i3] = (this.prng.next() - 0.5) * 0.2;
        this.velocities[i3 + 1] = -0.5 - this.prng.next() * 0.5;
        this.velocities[i3 + 2] = (this.prng.next() - 0.5) * 0.2;

        this.colors[i3] = color.r;
        this.colors[i3 + 1] = color.g;
        this.colors[i3 + 2] = color.b;
        this.properties[i] = type;

        poured++;
      }
    }
  }

  /**
   * Get current simulation time
   */
  getTimeMs(): number {
    return this.timeMs;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    cyan: number;
    phos: number;
    orchid: number;
  } {
    let cyan = 0, phos = 0, orchid = 0;
    for (let i = 0; i < this.count; i++) {
      const type = this.properties[i];
      if (type === 0) cyan++;
      else if (type === 1) phos++;
      else if (type === 2) orchid++;
    }
    return {
      total: this.count,
      cyan,
      phos,
      orchid,
    };
  }

  /**
   * Serialize state for saving
   */
  serialize(): {
    positions: Float32Array;
    velocities: Float32Array;
    colors: Float32Array;
    properties: Uint8Array;
    timeMs: number;
  } {
    return {
      positions: new Float32Array(this.positions),
      velocities: new Float32Array(this.velocities),
      colors: new Float32Array(this.colors),
      properties: new Uint8Array(this.properties),
      timeMs: this.timeMs,
    };
  }

  /**
   * Deserialize state
   */
  deserialize(state: {
    positions: Float32Array;
    velocities: Float32Array;
    colors: Float32Array;
    properties: Uint8Array;
    timeMs: number;
  }): void {
    this.positions.set(state.positions);
    this.velocities.set(state.velocities);
    this.colors.set(state.colors);
    this.properties.set(state.properties);
    this.timeMs = state.timeMs;
  }
}

// Export factory function
export function createFluidPhysics(seed: number, config?: Partial<FluidConfig>): FluidPhysics {
  return new FluidPhysics(seed, config);
}
