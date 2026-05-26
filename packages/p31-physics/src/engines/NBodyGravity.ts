/**
 * N-Body Gravity Engine
 * For Orbital Drift - Gravitational slingshot navigation
 */

import {
  Planet,
  Probe,
  Vector3,
  TrajectoryPrediction,
} from '../types/physics';

export interface GravityConfig {
  G: number;
  timeStep: number;
  maxTrailLength: number;
}

export class NBodyGravity {
  private planets: Planet[] = [];
  private probe: Probe | null = null;
  private config: GravityConfig;
  private onImpactCallback: ((planet: Planet) => void) | null = null;

  constructor(config: Partial<GravityConfig> = {}) {
    this.config = {
      G: 1.0,
      timeStep: 0.01,
      maxTrailLength: 1000,
      ...config,
    };
  }

  public setPlanets(planets: Planet[]): void {
    this.planets = planets;
  }

  public setProbe(probe: Probe): void {
    this.probe = probe;
  }

  public onImpact(callback: (planet: Planet) => void): void {
    this.onImpactCallback = callback;
  }

  public step(dt?: number): void {
    const timeStep = dt ?? this.config.timeStep;

    // Update planet positions (they move too, but slowly)
    this.planets.forEach(planet => {
      planet.position.x += planet.velocity.x * timeStep;
      planet.position.y += planet.velocity.y * timeStep;
      planet.position.z += planet.velocity.z * timeStep;
    });

    if (!this.probe) return;

    const probe = this.probe;
    let totalForce: Vector3 = { x: 0, y: 0, z: 0 };

    // Calculate gravitational forces from all planets
    this.planets.forEach(planet => {
      const dx = planet.position.x - probe.position.x;
      const dy = planet.position.y - probe.position.y;
      const dz = planet.position.z - probe.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < planet.radius) {
        // Impact!
        if (this.onImpactCallback) {
          this.onImpactCallback(planet);
        }
        return;
      }

      // F = G * m1 * m2 / r^2
      const force = this.config.G * planet.mass * probe.mass / (dist * dist);

      totalForce.x += force * dx / dist;
      totalForce.y += force * dy / dist;
      totalForce.z += force * dz / dist;

      // Atmospheric drag
      if (planet.atmosphere && dist < planet.radius * 1.5) {
        const altitudeRatio = (dist - planet.radius) / (planet.radius * 0.5);
        const drag = planet.atmosphere.density * planet.atmosphere.dragCoefficient *
          (1 - altitudeRatio) * this.calculateDrag(probe.velocity);

        totalForce.x -= drag * probe.velocity.x;
        totalForce.y -= drag * probe.velocity.y;
        totalForce.z -= drag * probe.velocity.z;
      }
    });

    // Apply thrusters if active
    if (probe.thrusterActive && probe.fuel > 0) {
      const velocityMag = Math.sqrt(
        probe.velocity.x * probe.velocity.x +
        probe.velocity.y * probe.velocity.y +
        probe.velocity.z * probe.velocity.z
      );

      if (velocityMag > 0.001) {
        const thrustX = (probe.velocity.x / velocityMag) * probe.thrusterStrength;
        const thrustY = (probe.velocity.y / velocityMag) * probe.thrusterStrength;
        const thrustZ = (probe.velocity.z / velocityMag) * probe.thrusterStrength;

        totalForce.x += thrustX;
        totalForce.y += thrustY;
        totalForce.z += thrustZ;

        probe.fuel -= 0.1 * timeStep;
      }
    }

    // F = ma, so a = F/m
    probe.velocity.x += totalForce.x / probe.mass * timeStep;
    probe.velocity.y += totalForce.y / probe.mass * timeStep;
    probe.velocity.z += totalForce.z / probe.mass * timeStep;

    // Update position
    probe.position.x += probe.velocity.x * timeStep;
    probe.position.y += probe.velocity.y * timeStep;
    probe.position.z += probe.velocity.z * timeStep;

    // Update trail
    probe.trail.push({ ...probe.position });
    if (probe.trail.length > probe.maxTrailLength) {
      probe.trail.shift();
    }
  }

  private calculateDrag(velocity: Vector3): number {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    return speed * 0.01; // Simplified drag coefficient
  }

  public predictTrajectory(duration: number, steps: number): TrajectoryPrediction {
    if (!this.probe) {
      return { points: [], encounters: [], fuelRequired: 0 };
    }

    // Clone current state
    const simProbe: Probe = {
      ...this.probe,
      position: { ...this.probe.position },
      velocity: { ...this.probe.velocity },
      trail: [],
    };

    const simPlanets = this.planets.map(p => ({
      ...p,
      position: { ...p.position },
      velocity: { ...p.velocity },
    }));

    const points: Array<Vector3 & { t: number }> = [];
    const encounters: TrajectoryPrediction['encounters'] = [];
    const dt = duration / steps;

    for (let i = 0; i < steps; i++) {
      // Simulate one step (simplified, no thrusters)
      simPlanets.forEach(planet => {
        planet.position.x += planet.velocity.x * dt;
        planet.position.y += planet.velocity.y * dt;
        planet.position.z += planet.velocity.z * dt;
      });

      let totalForce: Vector3 = { x: 0, y: 0, z: 0 };

      simPlanets.forEach(planet => {
        const dx = planet.position.x - simProbe.position.x;
        const dy = planet.position.y - simProbe.position.y;
        const dz = planet.position.z - simProbe.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist > 0.001) {
          const force = this.config.G * planet.mass * simProbe.mass / (dist * dist);
          totalForce.x += force * dx / dist;
          totalForce.y += force * dy / dist;
          totalForce.z += force * dz / dist;
        }
      });

      simProbe.velocity.x += totalForce.x / simProbe.mass * dt;
      simProbe.velocity.y += totalForce.y / simProbe.mass * dt;
      simProbe.velocity.z += totalForce.z / simProbe.mass * dt;

      simProbe.position.x += simProbe.velocity.x * dt;
      simProbe.position.y += simProbe.velocity.y * dt;
      simProbe.position.z += simProbe.velocity.z * dt;

      points.push({
        x: simProbe.position.x,
        y: simProbe.position.y,
        z: simProbe.position.z,
        t: i * dt,
      });

      // Check for encounters
      simPlanets.forEach(planet => {
        const dist = Math.sqrt(
          Math.pow(simProbe.position.x - planet.position.x, 2) +
          Math.pow(simProbe.position.y - planet.position.y, 2) +
          Math.pow(simProbe.position.z - planet.position.z, 2)
        );

        if (dist < planet.radius * 3) {
          const existing = encounters.find((e: { planetId: string }) => e.planetId === planet.id);
          if (!existing) {
            encounters.push({
              planetId: planet.id,
              time: i * dt,
              distance: dist,
              type: dist < planet.radius ? 'impact' : 'flyby',
            });
          }
        }
      });
    }

    return {
      points,
      encounters,
      fuelRequired: 0,
    };
  }

  public getProbe(): Probe | null {
    return this.probe;
  }

  public getPlanets(): Planet[] {
    return this.planets;
  }

  public applyImpulse(impulse: Vector3): void {
    if (!this.probe) return;
    this.probe.velocity.x += impulse.x / this.probe.mass;
    this.probe.velocity.y += impulse.y / this.probe.mass;
    this.probe.velocity.z += impulse.z / this.probe.mass;
  }

  public calculateOrbitalVelocity(planetId: string, altitude: number): Vector3 | null {
    const planet = this.planets.find(p => p.id === planetId);
    if (!planet || !this.probe) return null;

    const distance = planet.radius + altitude;
    const speed = Math.sqrt(this.config.G * planet.mass / distance);

    // Calculate direction perpendicular to planet-probe line
    const dx = this.probe.position.x - planet.position.x;
    const dy = this.probe.position.y - planet.position.y;
    const dz = this.probe.position.z - planet.position.z;

    // Cross product with up vector to get perpendicular direction
    const up: Vector3 = { x: 0, y: 1, z: 0 };
    const perp: Vector3 = {
      x: dy * up.z - dz * up.y,
      y: dz * up.x - dx * up.z,
      z: dx * up.y - dy * up.x,
    };

    const perpMag = Math.sqrt(perp.x * perp.x + perp.y * perp.y + perp.z * perp.z);
    if (perpMag === 0) return null;

    return {
      x: (perp.x / perpMag) * speed,
      y: (perp.y / perpMag) * speed,
      z: (perp.z / perpMag) * speed,
    };
  }

  public isInOrbit(planetId: string, tolerance = 0.1): boolean {
    const planet = this.planets.find(p => p.id === planetId);
    if (!planet || !this.probe) return false;

    const distance = Math.sqrt(
      Math.pow(this.probe.position.x - planet.position.x, 2) +
      Math.pow(this.probe.position.y - planet.position.y, 2) +
      Math.pow(this.probe.position.z - planet.position.z, 2)
    );

    const velocity = Math.sqrt(
      this.probe.velocity.x * this.probe.velocity.x +
      this.probe.velocity.y * this.probe.velocity.y +
      this.probe.velocity.z * this.probe.velocity.z
    );

    const orbitalSpeed = Math.sqrt(this.config.G * planet.mass / distance);
    return Math.abs(velocity - orbitalSpeed) / orbitalSpeed < tolerance;
  }
}

export default NBodyGravity;
