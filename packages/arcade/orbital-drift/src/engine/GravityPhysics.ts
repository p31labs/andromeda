import * as THREE from 'three';

const G = 0.0001; // Gravitational constant
const DUST_COUNT = 10000; // Number of dust particles

// Basic PRNG for deterministic initialization
class SimplePRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export interface HeavyBody {
  id: number;
  mass: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  type?: 'SJ' | 'WJ'; // For co-op mode or special heavy bodies
}

export interface DustParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
}

export class GravityPhysics {
  dustPositions: Float32Array;
  dustVelocities: Float32Array;
  heavies: HeavyBody[];
  prng: SimplePRNG;

  constructor(prngSeed: number) {
    this.prng = new SimplePRNG(prngSeed);
    this.dustPositions = new Float32Array(DUST_COUNT * 3);
    this.dustVelocities = new Float32Array(DUST_COUNT * 3);
    this.heavies = [];
    this.initDust();
  }

  private initDust() {
    for (let i = 0; i < DUST_COUNT; i++) {
      const i3 = i * 3;

      // Initial positions (e.g., in a ring around the center)
      const angle = this.prng.next() * Math.PI * 2;
      const radius = 5 + this.prng.next() * 10;
      this.dustPositions[i3] = Math.cos(angle) * radius;
      this.dustPositions[i3 + 1] = (this.prng.next() - 0.5) * 2; // Slight spread on Y axis
      this.dustPositions[i3 + 2] = Math.sin(angle) * radius;

      // Initial velocities (e.g., orbiting the center)
      const orbitalSpeed = 0.005 / Math.sqrt(radius);
      this.dustVelocities[i3] = -Math.sin(angle) * orbitalSpeed;
      this.dustVelocities[i3 + 1] = 0; // No initial vertical velocity
      this.dustVelocities[i3 + 2] = Math.cos(angle) * orbitalSpeed;
    }
  }

  addHeavyBody(heavy: HeavyBody) {
    this.heavies.push(heavy);
  }

  executeGravityTick(delta: number) {
    // 1. Calculate Heavy <-> Heavy interactions O(H^2) - Cheap because H is small
    // For simplicity, this example only updates dust based on heavies. Heavy-heavy interactions can be added.
    for (let i = 0; i < this.heavies.length; i++) {
      for (let j = 0; j < this.heavies.length; j++) {
        if (i === j) continue; // Don't calculate self-gravity

        const h1 = this.heavies[i];
        const h2 = this.heavies[j];

        const dx = h2.x - h1.x;
        const dy = h2.y - h1.y;
        const dz = h2.z - h1.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist > 0.1) { // Avoid division by zero and extreme forces at very close distances
          const forceMagnitude = G * h1.mass * h2.mass / distSq;
          // Apply force to heavy bodies (simplified, normally requires acceleration)
          const fx = forceMagnitude * dx / dist;
          const fy = forceMagnitude * dy / dist;
          const fz = forceMagnitude * dz / dist;

          // Symplectic Euler for heavy bodies too
          this.heavies[i].vx += fx / h1.mass * delta;
          this.heavies[i].vy += fy / h1.mass * delta;
          this.heavies[i].vz += fz / h1.mass * delta;
        }
      }
    }

    // Update heavy body positions after all forces are applied to velocities
    for (let i = 0; i < this.heavies.length; i++) {
        this.heavies[i].x += this.heavies[i].vx * delta;
        this.heavies[i].y += this.heavies[i].vy * delta;
        this.heavies[i].z += this.heavies[i].vz * delta;
    }

    // 2. Calculate Heavy -> Dust interactions O(H * D) - Fast enough for CPU
    // NOTE: Dust -> Dust gravity is IGNORED to prevent O(D^2) lag.
    for (let d = 0; d < DUST_COUNT; d++) {
      const d3 = d * 3;
      let fx = 0, fy = 0, fz = 0;

      for (let h = 0; h < this.heavies.length; h++) {
        const heavy = this.heavies[h];

        const dx = heavy.x - this.dustPositions[d3];
        const dy = heavy.y - this.dustPositions[d3 + 1];
        const dz = heavy.z - this.dustPositions[d3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist > 0.1) { // Avoid division by zero and extreme forces
          const forceMagnitude = G * heavy.mass / distSq;
          fx += forceMagnitude * dx / dist;
          fy += forceMagnitude * dy / dist;
          fz += forceMagnitude * dz / dist;
        }
      }

      // SYMPLECTIC EULER: Update Velocity FIRST, then Position
      this.dustVelocities[d3] += fx * delta;
      this.dustVelocities[d3 + 1] += fy * delta;
      this.dustVelocities[d3 + 2] += fz * delta;

      this.dustPositions[d3] += this.dustVelocities[d3] * delta;
      this.dustPositions[d3 + 1] += this.dustVelocities[d3 + 1] * delta;
      this.dustPositions[d3 + 2] += this.dustVelocities[d3 + 2] * delta;
    }
  }
}

