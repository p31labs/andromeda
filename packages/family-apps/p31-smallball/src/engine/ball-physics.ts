// P31 Smallball: Ball Physics Visualization Engine
// Real-time trajectory, spin, Magnus effect, and collision
// Physics-correct visualization with artistic flair

import * as THREE from 'three';

// ============================================
// PHYSICS CONSTANTS
// ============================================

export const PHYSICS = {
  GRAVITY: -32.174,        // ft/s²
  AIR_DENSITY: 0.074,      // lb/ft³ (at sea level)
  BALL_MASS: 0.32,         // lb (5.125 oz)
  BALL_CIRCUMFERENCE: 9.125, // inches
  DRAG_COEFFICIENT: 0.35,  // Cd for baseball
  MAGNUS_COEFFICIENT: 0.12, // Spin effect
  GROUND_BOUNCE: 0.55,     // Restitution coefficient
  GROUND_FRICTION: 0.6,    // Friction on ground
  SCALE: 0.5,              // World units per foot
};

// ============================================
// BALL TRAJECTORY
// ============================================

export interface LaunchParameters {
  position: THREE.Vector3;     // Launch point (feet)
  velocity: THREE.Vector3;   // Initial velocity (ft/s)
  spin: THREE.Vector3;       // Spin axis (rpm)
  exitVelocity: number;      // mph
  launchAngle: number;       // degrees
  sprayAngle: number;        // degrees (0 = dead center)
}

export interface TrajectoryPoint {
  time: number;              // Seconds from launch
  position: THREE.Vector3;   // Position (world units)
  velocity: THREE.Vector3; // Current velocity (ft/s)
  spin: THREE.Vector3;       // Current spin
}

export class BallTrajectory {
  private points: TrajectoryPoint[] = [];
  private launchParams: LaunchParameters;
  private maxTime: number = 6; // Max simulation time
  private dt: number = 1/60;   // Time step

  constructor(params: LaunchParameters) {
    this.launchParams = params;
    this.simulate();
  }

  private simulate(): void {
    const pos = this.launchParams.position.clone();
    const vel = this.launchParams.velocity.clone();
    const spin = this.launchParams.spin.clone();

    // Convert to world scale
    const worldScale = PHYSICS.SCALE;

    for (let t = 0; t < this.maxTime; t += this.dt) {
      // Store point
      this.points.push({
        time: t,
        position: pos.clone().multiplyScalar(worldScale),
        velocity: vel.clone(),
        spin: spin.clone(),
      });

      // Forces
      const speed = vel.length();
      const dragForce = vel.clone().normalize().multiplyScalar(
        -0.5 * PHYSICS.AIR_DENSITY * speed * speed *
        PHYSICS.DRAG_COEFFICIENT * Math.PI * Math.pow(PHYSICS.BALL_CIRCUMFERENCE / (2 * Math.PI * 12), 2)
      );

      // Magnus force (spin-induced lift/side force)
      const magnusForce = new THREE.Vector3()
        .crossVectors(spin, vel)
        .multiplyScalar(PHYSICS.MAGNUS_COEFFICIENT * PHYSICS.AIR_DENSITY * speed);

      // Gravity
      const gravity = new THREE.Vector3(0, PHYSICS.GRAVITY, 0);

      // Acceleration (F = ma)
      const accel = new THREE.Vector3()
        .addVectors(dragForce, magnusForce)
        .divideScalar(PHYSICS.BALL_MASS)
        .add(gravity);

      // Integrate
      vel.add(accel.multiplyScalar(this.dt));
      pos.add(vel.clone().multiplyScalar(this.dt));

      // Ground collision
      if (pos.y <= 0) {
        pos.y = 0;

        // Bounce
        const normal = new THREE.Vector3(0, 1, 0);
        const vDotN = vel.dot(normal);

        if (Math.abs(vDotN) > 1) {
          // Reflect velocity
          const reflection = normal.multiplyScalar(-2 * vDotN);
          vel.add(reflection);

          // Apply restitution
          vel.y *= PHYSICS.GROUND_BOUNCE;

          // Apply friction to horizontal components
          vel.x *= PHYSICS.GROUND_FRICTION;
          vel.z *= PHYSICS.GROUND_FRICTION;

          // Reduce spin
          spin.multiplyScalar(0.7);

          // Store bounce point
          this.points.push({
            time: t,
            position: pos.clone().multiplyScalar(worldScale),
            velocity: vel.clone(),
            spin: spin.clone(),
          });
        } else {
          // Ball stopped
          break;
        }
      }

      // Stop if ball goes too far (out of park)
      if (pos.length() > 500) break;
    }
  }

  getPoints(): TrajectoryPoint[] {
    return this.points;
  }

  getLandingPoint(): TrajectoryPoint | null {
    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].position.y <= 0.1 && this.points[i-1].position.y > 0.1) {
        return this.points[i];
      }
    }
    return null;
  }

  getApex(): TrajectoryPoint {
    return this.points.reduce((apex, point) =>
      point.position.y > apex.position.y ? point : apex
    );
  }

  getDistance(): number {
    const landing = this.getLandingPoint();
    if (landing) {
      return Math.sqrt(
        landing.position.x * landing.position.x +
        landing.position.z * landing.position.z
      ) / PHYSICS.SCALE;
    }
    return 0;
  }

  // Get position at a specific time
  getPositionAtTime(time: number): THREE.Vector3 | null {
    const index = Math.floor(time / this.dt);
    if (index >= 0 && index < this.points.length) {
      return this.points[index].position;
    }
    return null;
  }
}

// ============================================
// BALL VISUALIZATION
// ============================================

export class BallVisualization extends THREE.Group {
  private ballMesh: THREE.Mesh;
  private trail: TrailRenderer;
  private shadow: THREE.Mesh;
  private highlight: THREE.PointLight;

  constructor(scene: THREE.Scene, config: { showTrail?: boolean; showShadow?: boolean } = {}) {
    super();

    // Ball geometry (1.45 inch radius, scaled)
    const radius = (1.45 / 12) * PHYSICS.SCALE; // Convert to feet, then to world
    const geometry = new THREE.SphereGeometry(radius, 32, 32);

    // Ball material with stitching pattern
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.0,
      map: this.createBallTexture(),
    });

    this.ballMesh = new THREE.Mesh(geometry, material);
    this.ballMesh.castShadow = true;
    this.add(this.ballMesh);

    // Trail renderer
    if (config.showTrail !== false) {
      this.trail = new TrailRenderer(100, 0x88ccff);
      this.add(this.trail);
    }

    // Shadow blob
    if (config.showShadow !== false) {
      const shadowGeometry = new THREE.CircleGeometry(radius * 2, 16);
      const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
      });
      this.shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      this.shadow.rotation.x = -Math.PI / 2;
      this.add(this.shadow);
    }

    // Highlight glow
    this.highlight = new THREE.PointLight(0xffffff, 0.5, 10);
    this.ballMesh.add(this.highlight);
  }

  private createBallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    // Draw curved stitching
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 3;

    // Two curved seams
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      const offset = i === 0 ? -20 : 20;

      for (let y = 0; y < 256; y += 4) {
        const x = 128 + offset + Math.sin(y / 20) * 30;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  updateFromTrajectory(trajectory: BallTrajectory, time: number): void {
    const point = trajectory.getPositionAtTime(time);
    if (point) {
      this.position.copy(point);

      // Update ball rotation based on spin
      // (simplified visual rotation)
      this.ballMesh.rotation.x += 0.1;
      this.ballMesh.rotation.z += 0.05;

      // Update trail
      if (this.trail) {
        this.trail.addPoint(point);
        this.trail.update();
      }

      // Update shadow position
      if (this.shadow) {
        this.shadow.position.set(point.x, 0.02, point.z);

        // Scale shadow based on height
        const height = point.y;
        const scale = Math.max(0.5, 2 - height / 10);
        this.shadow.scale.setScalar(scale);
      }
    }
  }

  setHighlightIntensity(intensity: number): void {
    this.highlight.intensity = intensity;
  }

  // Visual effect for home run
  playHomeRunEffect(): void {
    this.highlight.color.setHex(0xffaa00);
    this.highlight.intensity = 2;

    // Scale up slightly
    const targetScale = 1.5;
    const startScale = 1;
    const duration = 500; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);

      const scale = startScale + (targetScale - startScale) * t;
      this.ballMesh.scale.setScalar(scale);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reset after delay
        setTimeout(() => {
          this.ballMesh.scale.setScalar(1);
          this.highlight.color.setHex(0xffffff);
          this.highlight.intensity = 0.5;
        }, 1000);
      }
    };

    animate();
  }
}

// ============================================
// TRAIL RENDERER
// ============================================

class TrailRenderer extends THREE.Line {
  private maxPoints: number;
  private positions: THREE.Vector3[];

  constructor(maxPoints: number, color: number) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxPoints * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });

    super(geometry, material);

    this.maxPoints = maxPoints;
    this.positions = [];
    this.frustumCulled = false;
  }

  addPoint(position: THREE.Vector3): void {
    this.positions.push(position.clone());

    if (this.positions.length > this.maxPoints) {
      this.positions.shift();
    }
  }

  update(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.positions.length; i++) {
      positions[i * 3] = this.positions[i].x;
      positions[i * 3 + 1] = this.positions[i].y;
      positions[i * 3 + 2] = this.positions[i].z;
    }

    // Fill remaining with last point
    if (this.positions.length > 0) {
      const last = this.positions[this.positions.length - 1];
      for (let i = this.positions.length; i < this.maxPoints; i++) {
        positions[i * 3] = last.x;
        positions[i * 3 + 1] = last.y;
        positions[i * 3 + 2] = last.z;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.setDrawRange(0, this.positions.length);
  }

  clear(): this {
    this.positions = [];
    this.geometry.setDrawRange(0, 0);
    return this;
  }
}

// ============================================
// TRAJECTORY PREVIEW
// ============================================

export class TrajectoryPreview extends THREE.Group {
  private curve: THREE.CatmullRomCurve3;
  private line: THREE.Line;
  private dots: THREE.Points;

  constructor() {
    super();

    // Create curve
    this.curve = new THREE.CatmullRomCurve3([], false, 'catmullrom', 0.5);

    // Line geometry for the path
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.5,
      linewidth: 2,
    });
    this.line = new THREE.Line(lineGeometry, lineMaterial);
    this.add(this.line);

    // Dots at key points
    const dotGeometry = new THREE.BufferGeometry();
    const dotMaterial = new THREE.PointsMaterial({
      color: 0xffff00,
      size: 0.5,
    });
    this.dots = new THREE.Points(dotGeometry, dotMaterial);
    this.add(this.dots);
  }

  setFromTrajectory(trajectory: BallTrajectory): void {
    const points = trajectory.getPoints();

    // Update curve
    this.curve.points = points.map(p => p.position);

    // Generate smooth line
    const curvePoints = this.curve.getPoints(100);
    const linePositions = new Float32Array(curvePoints.length * 3);

    for (let i = 0; i < curvePoints.length; i++) {
      linePositions[i * 3] = curvePoints[i].x;
      linePositions[i * 3 + 1] = curvePoints[i].y;
      linePositions[i * 3 + 2] = curvePoints[i].z;
    }

    this.line.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(linePositions, 3)
    );

    // Key dots (launch, apex, landing)
    const keyPoints = [
      points[0],
      trajectory.getApex(),
      trajectory.getLandingPoint(),
    ].filter(Boolean) as TrajectoryPoint[];

    const dotPositions = new Float32Array(keyPoints.length * 3);
    for (let i = 0; i < keyPoints.length; i++) {
      dotPositions[i * 3] = keyPoints[i].position.x;
      dotPositions[i * 3 + 1] = keyPoints[i].position.y;
      dotPositions[i * 3 + 2] = keyPoints[i].position.z;
    }

    this.dots.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(dotPositions, 3)
    );
  }

  setVisibility(visible: boolean): void {
    this.line.visible = visible;
    this.dots.visible = visible;
  }

  // Fade out over time
  fadeOut(duration: number = 2000): void {
    const startTime = Date.now();
    const startOpacity = 0.5;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);

      (this.line.material as THREE.LineBasicMaterial).opacity =
        startOpacity * (1 - t);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.setVisibility(false);
        (this.line.material as THREE.LineBasicMaterial).opacity = startOpacity;
      }
    };

    animate();
  }
}

// ============================================
// VELOCITY VISUALIZER
// ============================================

export class VelocityVisualizer extends THREE.ArrowHelper {
  constructor() {
    super(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      5,
      0xff0000,
      1,
      0.5
    );
  }

  updateFromVector(origin: THREE.Vector3, velocity: THREE.Vector3, scale: number = 0.1): void {
    this.position.copy(origin);

    const len = velocity.length() * scale;
    this.setLength(len, len * 0.2, len * 0.1);

    const direction = velocity.clone().normalize();
    this.setDirection(direction);
  }
}

// ============================================
// EXIT VELOCITY DISPLAY
// ============================================

export class ExitVelocityDisplay extends THREE.Group {
  private textSprite: THREE.Sprite;
  private velocity: number;

  constructor(velocity: number) {
    super();
    this.velocity = velocity;

    this.textSprite = this.createTextSprite(`${Math.round(velocity)} mph`);
    this.add(this.textSprite);

    // Animation
    this.animateIn();
  }

  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(0, 0, 256, 128, 16);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 4;
    ctx.roundRect(0, 0, 256, 128, 16);
    ctx.stroke();

    // Text
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(8, 4, 1);

    return sprite;
  }

  private animateIn(): void {
    this.scale.setScalar(0);

    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);

      // Elastic ease out
      const scale = t === 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.sin((t - 0.1) / 0.4 * Math.PI * 2);

      this.scale.setScalar(scale);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Fade out after delay
        setTimeout(() => this.animateOut(), 2000);
      }
    };

    animate();
  }

  private animateOut(): void {
    const duration = 300;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);

      (this.textSprite.material as THREE.SpriteMaterial).opacity = 1 - t;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.visible = false;
      }
    };

    animate();
  }
}
