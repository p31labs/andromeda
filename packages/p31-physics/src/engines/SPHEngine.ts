/**
 * SPH (Smoothed Particle Hydrodynamics) Engine
 * For Liquid Sculptor - Ferrofluid simulation
 */

import {
  FluidParticle,
  MagneticAttractor,
  FluidConfig,
  Vector3,
  SpoonState,
} from '../types/physics';

export interface SPHEngineConfig {
  particleCount: number;
  smoothingRadius: number;
  restDensity: number;
  viscosity: number;
  surfaceTension: number;
  gravity: Vector3;
  timeStep: number;
}

export class SPHEngine {
  private particles: FluidParticle[] = [];
  private config: SPHEngineConfig;
  private attractors: MagneticAttractor[] = [];
  private worker: Worker | null = null;
  private onStepCompleteCallback: ((particles: FluidParticle[]) => void) | null = null;
  private isRunning = false;

  constructor(config: SPHEngineConfig, spoonState: SpoonState) {
    this.config = this.adjustForSpoons(config, spoonState);
    this.initializeParticles();
  }

  private adjustForSpoons(config: SPHEngineConfig, spoons: SpoonState): SPHEngineConfig {
    const multipliers = {
      1: { count: 0.125, viscosity: 2.0, timestep: 0.5 },
      3: { count: 0.5, viscosity: 1.0, timestep: 1.0 },
      6: { count: 1.0, viscosity: 1.0, timestep: 1.0 },
    };
    const m = multipliers[spoons];

    return {
      ...config,
      particleCount: Math.floor(config.particleCount * m.count),
      viscosity: config.viscosity * m.viscosity,
      timeStep: config.timeStep * m.timestep,
    };
  }

  private initializeParticles(): void {
    const { particleCount } = this.config;
    this.particles = [];

    // Create particles in a spherical distribution
    const radius = 2;
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());

      this.particles.push({
        id: `p-${i}`,
        position: {
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi),
        },
        velocity: { x: 0, y: 0, z: 0 },
        mass: 1.0,
        density: this.config.restDensity,
        pressure: 0,
        color: { r: 0.3, g: 0.3, b: 0.3, a: 1.0 },
      });
    }
  }

  public addAttractor(position: Vector3, strength: number, radius = 2.0): MagneticAttractor {
    const attractor: MagneticAttractor = {
      id: crypto.randomUUID(),
      position,
      strength,
      decayRate: strength > 0 ? 0.98 : 0.95,
      radius,
      createdAt: Date.now(),
    };
    this.attractors.push(attractor);
    return attractor;
  }

  public removeAttractor(id: string): void {
    this.attractors = this.attractors.filter(a => a.id !== id);
  }

  public setWorker(worker: Worker): void {
    this.worker = worker;
    this.worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'STEP_COMPLETE') {
        this.particles = e.data.particles;
        this.attractors = e.data.attractors.filter(
          (a: MagneticAttractor) => Math.abs(a.strength) > 0.01
        );
        if (this.onStepCompleteCallback) {
          this.onStepCompleteCallback(this.particles);
        }
      }
    };
  }

  public step(): void {
    if (this.worker) {
      this.worker.postMessage({
        type: 'STEP',
        particles: this.particles,
        attractors: this.attractors,
        config: this.config,
      });
    } else {
      // Synchronous fallback
      this.particles = this.calculateSPH(this.particles, this.attractors, this.config);
      this.attractors = this.decayAttractors(this.attractors);
      if (this.onStepCompleteCallback) {
        this.onStepCompleteCallback(this.particles);
      }
    }
  }

  public onStepComplete(callback: (particles: FluidParticle[]) => void): void {
    this.onStepCompleteCallback = callback;
  }

  public start(): void {
    this.isRunning = true;
    const loop = () => {
      if (!this.isRunning) return;
      this.step();
      requestAnimationFrame(loop);
    };
    loop();
  }

  public stop(): void {
    this.isRunning = false;
  }

  public getParticles(): FluidParticle[] {
    return this.particles;
  }

  public getAttractors(): MagneticAttractor[] {
    return this.attractors;
  }

  public updateConfig(updates: Partial<SPHEngineConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // === Physics Calculations ===

  private calculateSPH(
    particles: FluidParticle[],
    attractors: MagneticAttractor[],
    config: SPHEngineConfig
  ): FluidParticle[] {
    const dt = config.timeStep;
    const h = config.smoothingRadius;
    const h2 = h * h;

    return particles.map((particle, i) => {
      let force: Vector3 = { x: 0, y: 0, z: 0 };
      let density = 0;

      // Calculate density and SPH forces
      particles.forEach((other, j) => {
        if (i === j) {
          density += particle.mass * this.poly6Kernel(0, h);
          return;
        }

        const dx = other.position.x - particle.position.x;
        const dy = other.position.y - particle.position.y;
        const dz = other.position.z - particle.position.z;
        const dist2 = dx * dx + dy * dy + dz * dz;

        if (dist2 < h2) {
          const dist = Math.sqrt(dist2);
          density += other.mass * this.poly6Kernel(dist, h);

          // Pressure force
          const pressureGradient = this.spikyGradient(dist, h);
          const pressureForce = (particle.pressure + other.pressure) / (2 * other.density);

          force.x -= pressureForce * pressureGradient * dx / dist;
          force.y -= pressureForce * pressureGradient * dy / dist;
          force.z -= pressureForce * pressureGradient * dz / dist;

          // Viscosity force
          const viscosityLaplacian = this.viscosityLaplacian(dist, h);
          const viscFactor = config.viscosity * other.mass / other.density;

          force.x += viscFactor * (other.velocity.x - particle.velocity.x) * viscosityLaplacian;
          force.y += viscFactor * (other.velocity.y - particle.velocity.y) * viscosityLaplacian;
          force.z += viscFactor * (other.velocity.z - particle.velocity.z) * viscosityLaplacian;
        }
      });

      // Update density and pressure
      const newDensity = Math.max(density, config.restDensity * 0.1);
      const pressure = 0.5 * (newDensity - config.restDensity);

      // Magnetic forces from attractors
      attractors.forEach(attractor => {
        const dx = attractor.position.x - particle.position.x;
        const dy = attractor.position.y - particle.position.y;
        const dz = attractor.position.z - particle.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < attractor.radius && dist > 0.001) {
          const strength = attractor.strength * (1 - dist / attractor.radius);
          const magForce = strength / (dist * dist + 0.01);
          force.x += magForce * dx / dist;
          force.y += magForce * dy / dist;
          force.z += magForce * dz / dist;
        }
      });

      // Gravity
      force.x += config.gravity.x;
      force.y += config.gravity.y;
      force.z += config.gravity.z;

      // Integrate
      const newVelocity = {
        x: particle.velocity.x + (force.x / particle.mass) * dt,
        y: particle.velocity.y + (force.y / particle.mass) * dt,
        z: particle.velocity.z + (force.z / particle.mass) * dt,
      };

      // Damping
      newVelocity.x *= 0.995;
      newVelocity.y *= 0.995;
      newVelocity.z *= 0.995;

      return {
        ...particle,
        density: newDensity,
        pressure,
        velocity: newVelocity,
        position: {
          x: particle.position.x + newVelocity.x * dt,
          y: particle.position.y + newVelocity.y * dt,
          z: particle.position.z + newVelocity.z * dt,
        },
      };
    });
  }

  private decayAttractors(attractors: MagneticAttractor[]): MagneticAttractor[] {
    return attractors
      .map(a => ({ ...a, strength: a.strength * a.decayRate }))
      .filter(a => Math.abs(a.strength) > 0.01);
  }

  // === SPH Kernels ===

  private poly6Kernel(r: number, h: number): number {
    if (r >= h) return 0;
    const factor = 315 / (64 * Math.PI * Math.pow(h, 9));
    const diff = h * h - r * r;
    return factor * diff * diff * diff;
  }

  private spikyGradient(r: number, h: number): number {
    if (r >= h || r < 0.0001) return 0;
    const factor = -45 / (Math.PI * Math.pow(h, 6));
    const diff = h - r;
    return factor * diff * diff;
  }

  private viscosityLaplacian(r: number, h: number): number {
    if (r >= h) return 0;
    const factor = 45 / (Math.PI * Math.pow(h, 6));
    return factor * (h - r);
  }
}

export default SPHEngine;
