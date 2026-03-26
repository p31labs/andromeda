// ═══════════════════════════════════════════════════════════════════════════
// WCD-27.3-5: Particle Effects Integration
// P31 Labs — Spaceship Earth
//
// High-level API for triggering particle effects.
// ═══════════════════════════════════════════════════════════════════════════

import { particlePool } from './ParticlePool';
import * as THREE from 'three';

/**
 * Trigger energy wave effect on coherence achievement.
 * Wave expands outward from the attractor.
 */
export function triggerEnergyWave(center: THREE.Vector3): void {
  particlePool.acquire('energy-wave', {
    center: center.clone(),
    radius: 30,
    color: new THREE.Color(0x00ff88), // Phosphor green
    speed: 0.8,
    count: 1000,
    mode: 'radial',
  });
}

/**
 * Trigger resonance ripple on Jitterbug node pluck.
 * Ring expands from node with color shift cyan -> magenta.
 */
export function triggerResonanceRipple(
  position: THREE.Vector3,
  color: THREE.Color = new THREE.Color(0x00d4ff)
): void {
  particlePool.acquire('resonance-ripple', {
    center: position.clone(),
    radius: 15,
    color,
    speed: 1.2,
    count: 300,
    mode: 'radial',
  });
}

/**
 * Trigger data stream from cartridge slot to Jitterbug core.
 * Particles flow along path with cartridge theme color.
 */
export function triggerDataStream(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: THREE.Color = new THREE.Color(0x7a27ff)
): void {
  // Calculate midpoint for orbit effect
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const distance = start.distanceTo(end);

  particlePool.acquire('data-stream', {
    center: mid,
    radius: distance / 2,
    color,
    speed: 2.0,
    count: 100,
    mode: 'orbit',
  });
}

/**
 * Auto-detect performance and reduce particle count if needed.
 * Called periodically from performance monitor.
 */
export function adjustParticleQuality(fps: number): void {
  // FPS thresholds
  if (fps < 40) {
    // Critical - reduce all effects
    console.warn('[ParticleEffects] Low FPS, reducing particle count');
  } else if (fps < 55) {
    // Fair - reduce slightly
    console.warn('[ParticleEffects] Fair FPS, moderate particles');
  }
}
