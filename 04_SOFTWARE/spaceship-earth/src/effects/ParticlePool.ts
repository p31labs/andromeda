// ═══════════════════════════════════════════════════════════════════════════
// WCD-27.2: Particle Pool
// P31 Labs — Spaceship Earth
//
// Pre-allocated pool of GPU particle systems for performance.
// Acquire/release pattern to avoid instantiation during gameplay.
// ═══════════════════════════════════════════════════════════════════════════

import { GPUParticleSystem, type ParticleSystemConfig } from './GPUParticleSystem';
import * as THREE from 'three';

const MAX_SYSTEMS = 8; // Pool size

type ParticleEffectType = 'energy-wave' | 'resonance-ripple' | 'data-stream';

interface PooledSystem {
  id: string;
  system: GPUParticleSystem;
  type: ParticleEffectType;
  active: boolean;
  startTime: number;
  duration: number;
}

class ParticlePoolClass {
  private systems: PooledSystem[] = [];
  private available: GPUParticleSystem[] = [];
  private group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ParticlePool';

    // Pre-allocate systems
    for (let i = 0; i < MAX_SYSTEMS; i++) {
      // Create with default config, will be reconfigured on acquire
      const system = new GPUParticleSystem({
        count: 500,
        speed: 0.5,
        color: new THREE.Color(0x00ff88),
        size: 2.0,
        center: new THREE.Vector3(),
        radius: 10,
        mode: 'orbit',
      });
      system.setVisible(false);
      this.available.push(system);
      this.group.add(system.points);
    }
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Acquire a particle system for a specific effect.
   */
  acquire(
    type: ParticleEffectType,
    config: Partial<ParticleSystemConfig> = {}
  ): GPUParticleSystem | null {
    // Find available system
    const availableIdx = this.available.findIndex(s => !this.systems.some(p => p.system === s));
    if (availableIdx === -1) {
      console.warn('[ParticlePool] No available systems');
      return null;
    }

    const system = this.available[availableIdx];

    // Configure based on effect type
    const defaultConfigs: Record<ParticleEffectType, Partial<ParticleSystemConfig>> = {
      'energy-wave': {
        count: 1000,
        speed: 0.8,
        color: new THREE.Color(0x00ff88),
        size: 3.0,
        radius: 30,
        mode: 'radial',
      },
      'resonance-ripple': {
        count: 300,
        speed: 1.2,
        color: new THREE.Color(0x00d4ff),
        size: 4.0,
        radius: 15,
        mode: 'radial',
      },
      'data-stream': {
        count: 100,
        speed: 2.0,
        color: new THREE.Color(0x7a27ff),
        size: 2.5,
        radius: 20,
        mode: 'orbit',
      },
    };

    const effectConfig = { ...defaultConfigs[type], ...config };

    // Apply config
    system.setColor(effectConfig.color || new THREE.Color(0x00ff88));
    system.setSpeed(effectConfig.speed || 0.5);
    system.setCenter(effectConfig.center || new THREE.Vector3(0, 0, 0));
    system.setRadius(effectConfig.radius || 10);
    system.setMode(effectConfig.mode || 'orbit');
    system.setVisible(true);

    // Mark as active
    const pooled: PooledSystem = {
      id: `particle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      system,
      type,
      active: true,
      startTime: performance.now(),
      duration: type === 'energy-wave' ? 2000 : type === 'resonance-ripple' ? 1500 : 1000,
    };

    this.systems.push(pooled);
    return system;
  }

  /**
   * Release a particle system back to the pool.
   */
  release(system: GPUParticleSystem): void {
    const pooled = this.systems.find(p => p.system === system);
    if (pooled) {
      pooled.active = false;
      system.setVisible(false);
    }
  }

  /**
   * Update all active particle systems.
   * Called from RAF loop.
   */
  update(delta: number): void {
    const now = performance.now();

    // Update active systems
    this.systems.forEach(pooled => {
      if (!pooled.active) return;

      // Update the system
      pooled.system.update(delta);

      // Check duration
      const age = now - pooled.startTime;
      if (age >= pooled.duration) {
        pooled.active = false;
        pooled.system.setVisible(false);
      }
    });

    // Cleanup inactive from tracking array
    this.systems = this.systems.filter(p => p.active);
  }

  /**
   * Get active system count for performance monitoring.
   */
  getActiveCount(): number {
    return this.systems.filter(p => p.active).length;
  }

  /**
   * Dispose all systems.
   */
  dispose(): void {
    this.systems.forEach(pooled => {
      pooled.system.dispose();
    });
    this.systems = [];
    this.available = [];
  }
}

export const particlePool = new ParticlePoolClass();
