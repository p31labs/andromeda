/**
 * P31 Arcade Particle System
 * Love Economy visual effects: care flows, co-op glows, victory fireworks
 */

import * as THREE from 'three';
import { P31Colors } from '../design-tokens';

export interface ParticleConfig {
  count: number;
  maxLifetime: number;
  gravity?: number;
  drag?: number;
}

export interface CareFlowOptions {
  source: THREE.Vector3;
  target: THREE.Vector3;
  color?: THREE.Color;
  particleCount?: number;
  duration?: number;
}

export interface FireworkOptions {
  position: THREE.Vector3;
  colors: THREE.Color[];
  particleCount?: number;
  burstRadius?: number;
}

// Low-poly heart geometry for care flow
function createHeartGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const x = 0, y = 0;
  
  // Heart shape path
  shape.moveTo(x, y + 0.25);
  shape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.25, y, x, y);
  shape.bezierCurveTo(x - 0.25, y, x - 0.25, y + 0.25, x, y + 0.25);
  
  const geom = new THREE.ShapeGeometry(shape);
  geom.scale(0.5, 0.5, 0.5);
  return geom;
}

export class LoveEconomyParticles {
  private scene: THREE.Scene;
  private careFlowGeometry: THREE.BufferGeometry;
  private fireworks: THREE.Points[] = [];
  private careFlows: THREE.Points[] = [];
  private clock = new THREE.Clock();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.careFlowGeometry = new THREE.BufferGeometry();
    createHeartGeometry();
  }

  /**
   * Emit care flow particles from source to target
   * Visualizes sibling bond strengthening (+1 K4 edge)
   */
  emitCareFlow(options: CareFlowOptions): void {
    const {
      source,
      target,
      color = new THREE.Color(P31Colors.orchidSoul),
      particleCount = 20,
      duration = 2000,
    } = options;

    // Create particle data
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];
    const startTimes: number[] = [];
    const lifetimes: number[] = [];

    const now = performance.now();

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Random start position near source
      positions[i3] = source.x + (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] = source.y + (Math.random() - 0.5) * 0.5;
      positions[i3 + 2] = source.z + (Math.random() - 0.5) * 0.5;

      // Velocity toward target with spread
      const targetWithSpread = new THREE.Vector3(
        target.x + (Math.random() - 0.5) * 0.3,
        target.y + (Math.random() - 0.5) * 0.3,
        target.z + (Math.random() - 0.5) * 0.3
      );
      
      const velocity = new THREE.Vector3()
        .subVectors(targetWithSpread, new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]))
        .normalize()
        .multiplyScalar(0.05 + Math.random() * 0.05);
      
      velocities.push(velocity);
      startTimes.push(now + Math.random() * 500); // Staggered start
      lifetimes.push(duration);
    }

    this.careFlowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create material
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(this.careFlowGeometry, material);
    particles.userData = {
      velocities,
      startTimes,
      lifetimes,
      type: 'careFlow',
      createdAt: now,
    };

    this.scene.add(particles);
    this.careFlows.push(particles);
  }

  /**
   * Dual-color victory fireworks
   * Phos + Cyan mix to orchid at center
   */
  emitFirework(options: FireworkOptions): void {
    const {
      position,
      colors,
      particleCount = 100,
    } = options;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];
    const particleColors = new Float32Array(particleCount * 3);
    const lifetimes: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start at burst center
      positions[i3] = position.x;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z;

      // Explosive velocity (sphere distribution)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.1 + Math.random() * 0.2;

      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);

      velocities.push(new THREE.Vector3(vx, vy, vz));

      // Color based on position (dual-color blend)
      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      particleColors[i3] = color.r;
      particleColors[i3 + 1] = color.g;
      particleColors[i3 + 2] = color.b;

      // Random lifetime 1-3 seconds
      lifetimes.push(1000 + Math.random() * 2000);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const firework = new THREE.Points(geometry, material);
    firework.userData = {
      velocities,
      lifetimes,
      createdAt: performance.now(),
      type: 'firework',
    };

    this.scene.add(firework);
    this.fireworks.push(firework);
  }

  /**
   * Sibling co-op victory burst
   * Phos + Cyan → Orchid mix
   */
  emitCoopVictory(position: THREE.Vector3): void {
    const phos = new THREE.Color(P31Colors.phosGreen);
    const cyan = new THREE.Color(P31Colors.cyanVibe);
    const orchid = new THREE.Color(P31Colors.orchidSoul);

    // Primary burst: dual-color
    this.emitFirework({
      position,
      colors: [phos, cyan],
      particleCount: 80,
      burstRadius: 4,
    });

    // Secondary burst: orchid (the mix)
    setTimeout(() => {
      this.emitFirework({
        position: position.clone().add(new THREE.Vector3(0, 1, 0)),
        colors: [orchid],
        particleCount: 40,
        burstRadius: 2,
      });
    }, 200);
  }

  /**
   * Avatar cursor particles
   * Floating geometric shapes above player position
   */
  createAvatarCursor(playerId: 'sj' | 'wj', position: THREE.Vector3): THREE.Mesh {
    const color = playerId === 'sj' ? P31Colors.cyanVibe : P31Colors.phosGreen;
    
    // Icosahedron for S.J., Dodecahedron for W.J.
    const geometry = playerId === 'sj' 
      ? new THREE.IcosahedronGeometry(0.3, 0)
      : new THREE.DodecahedronGeometry(0.3, 0);
    
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      wireframe: true,
    });

    const cursor = new THREE.Mesh(geometry, material);
    cursor.position.copy(position);
    cursor.position.y += 1; // Float above
    
    // Add glow sprite
    const spriteMaterial = new THREE.SpriteMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(spriteMaterial);
    glow.scale.set(1, 1, 1);
    cursor.add(glow);

    this.scene.add(cursor);
    return cursor;
  }

  /**
   * Update all particles
   * Call in animation loop
   */
  update(): void {
    const now = performance.now();
    // Time tracking available
    this.clock.getDelta();

    // Update care flows
    this.careFlows = this.careFlows.filter(particles => {
      const positions = particles.geometry.attributes.position.array as Float32Array;
      const velocities = particles.userData.velocities as THREE.Vector3[];
      const startTimes = particles.userData.startTimes as number[];
      const lifetimes = particles.userData.lifetimes as number[];

      let activeCount = 0;

      for (let i = 0; i < velocities.length; i++) {
        const i3 = i * 3;
        
        // Check if particle should be active
        if (now < startTimes[i]) continue;
        
        const age = now - startTimes[i];
        if (age > lifetimes[i]) {
          // Fade out by moving off-screen
          positions[i3] = 9999;
          continue;
        }

        activeCount++;

        // Move particle
        positions[i3] += velocities[i].x;
        positions[i3 + 1] += velocities[i].y;
        positions[i3 + 2] += velocities[i].z;

        // Slight acceleration toward target (homing)
        velocities[i].multiplyScalar(1.02);
      }

      particles.geometry.attributes.position.needsUpdate = true;

      // Remove if all particles dead
      if (activeCount === 0) {
        this.scene.remove(particles);
        particles.geometry.dispose();
        (particles.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });

    // Update fireworks
    this.fireworks = this.fireworks.filter(firework => {
      const positions = firework.geometry.attributes.position.array as Float32Array;
      const velocities = firework.userData.velocities as THREE.Vector3[];
      const lifetimes = firework.userData.lifetimes as number[];
      const createdAt = firework.userData.createdAt as number;

      let activeCount = 0;
      const age = now - createdAt;

      for (let i = 0; i < velocities.length; i++) {
        const i3 = i * 3;
        
        if (age > lifetimes[i]) {
          positions[i3] = 9999;
          continue;
        }

        activeCount++;

        // Apply velocity + gravity
        positions[i3] += velocities[i].x;
        positions[i3 + 1] += velocities[i].y - 0.001; // gravity
        positions[i3 + 2] += velocities[i].z;

        // Drag
        velocities[i].multiplyScalar(0.98);
      }

      firework.geometry.attributes.position.needsUpdate = true;

      // Fade out material
      const material = firework.material as THREE.PointsMaterial;
      material.opacity = Math.max(0, 1 - age / 3000);

      if (activeCount === 0 || material.opacity <= 0) {
        this.scene.remove(firework);
        firework.geometry.dispose();
        material.dispose();
        return false;
      }
      return true;
    });
  }

  /**
   * Cleanup all particles
   */
  dispose(): void {
    [...this.careFlows, ...this.fireworks].forEach(particles => {
      this.scene.remove(particles);
      particles.geometry.dispose();
      (particles.material as THREE.Material).dispose();
    });
    this.careFlows = [];
    this.fireworks = [];
  }
}

export default LoveEconomyParticles;
