// P31 Smallball: AAA Particle Systems
// High-quality effects: Bat sparks, dust clouds, fireworks, weather
// GPU-accelerated with custom shaders

import * as THREE from 'three';

// ============================================
// GPU PARTICLE SYSTEM BASE
// ============================================

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export class GPUParticleSystem extends THREE.Points {
  private particleCount: number;
  private particles: Particle[] = [];
  private pool: number[] = []; // Available particle indices

  // Attributes
  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;
  private sizeAttribute: THREE.BufferAttribute;
  private lifeAttribute: THREE.BufferAttribute;

  constructor(count: number, material: THREE.ShaderMaterial) {
    const geometry = new THREE.BufferGeometry();

    // Initialize attributes
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const lives = new Float32Array(count);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('life', new THREE.BufferAttribute(lives, 1));

    super(geometry, material);

    this.particleCount = count;
    this.positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
    this.colorAttribute = geometry.attributes.color as THREE.BufferAttribute;
    this.sizeAttribute = geometry.attributes.size as THREE.BufferAttribute;
    this.lifeAttribute = geometry.attributes.life as THREE.BufferAttribute;

    // Initialize pool (all particles available)
    for (let i = 0; i < count; i++) {
      this.pool.push(i);
      this.lifeAttribute.setX(i, -1); // Inactive
    }

    this.frustumCulled = false;
  }

  spawn(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, size: number, life: number): void {
    if (this.pool.length === 0) return;

    const index = this.pool.pop()!;

    this.positionAttribute.setXYZ(index, position.x, position.y, position.z);
    this.colorAttribute.setXYZ(index, color.r, color.g, color.b);
    this.sizeAttribute.setX(index, size);
    this.lifeAttribute.setX(index, life);

    // Store particle data
    this.particles[index] = {
      position: position.clone(),
      velocity: velocity.clone(),
      life,
      maxLife: life,
      size,
      color: color.clone(),
    };

    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
    this.lifeAttribute.needsUpdate = true;
  }

  update(deltaTime: number): void {
    let activeCount = 0;

    for (let i = 0; i < this.particleCount; i++) {
      const life = this.lifeAttribute.getX(i);

      if (life > 0) {
        const particle = this.particles[i];

        // Update physics
        particle.position.addScaledVector(particle.velocity, deltaTime);
        particle.life -= deltaTime;

        // Apply gravity
        particle.velocity.y -= 9.8 * deltaTime;

        // Drag
        particle.velocity.multiplyScalar(0.98);

        // Update attributes
        this.positionAttribute.setXYZ(i, particle.position.x, particle.position.y, particle.position.z);
        this.lifeAttribute.setX(i, particle.life);

        // Size decay
        const lifeRatio = particle.life / particle.maxLife;
        this.sizeAttribute.setX(i, particle.size * Math.sqrt(lifeRatio));

        activeCount++;
      } else if (life === 0 || (life < 0 && life > -1)) {
        // Just died, return to pool
        this.lifeAttribute.setX(i, -1);
        this.pool.push(i);
      }
    }

    if (activeCount > 0) {
      this.positionAttribute.needsUpdate = true;
      this.lifeAttribute.needsUpdate = true;
      this.sizeAttribute.needsUpdate = true;
    }
  }
}

// ============================================
// PARTICLE SHADERS
// ============================================

export const PARTICLE_VERTEX_SHADER = `
  attribute float size;
  attribute float life;
  attribute vec3 color;

  varying vec3 vColor;
  varying float vLife;

  void main() {
    vColor = color;
    vLife = life;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation
    gl_PointSize = size * (300.0 / -mvPosition.z);
  }
`;

export const PARTICLE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vLife;

  void main() {
    // Circular particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    if (dist > 0.5) discard;

    // Soft edge
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

    // Color with life fade
    vec3 finalColor = vColor * alpha;
    float finalAlpha = alpha * smoothstep(0.0, 0.2, vLife);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

export const SPARK_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vLife;

  void main() {
    // Star/spark shape
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    // Add star-like rays
    float angle = atan(coord.y, coord.x);
    float ray = abs(cos(angle * 4.0));

    float shape = mix(dist, ray * 0.3, 0.3);

    if (shape > 0.5) discard;

    // Glow center
    float glow = 1.0 - smoothstep(0.0, 0.3, dist);

    // Color temperature (hot center)
    vec3 hotColor = vec3(1.0, 0.9, 0.5);
    vec3 coolColor = vColor;

    vec3 finalColor = mix(coolColor, hotColor, glow);
    float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * smoothstep(0.0, 0.1, vLife);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// ============================================
// HIT SPARK SYSTEM
// ============================================

export class HitSparkSystem extends GPUParticleSystem {
  constructor(count: number = 100) {
    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: SPARK_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    super(count, material);
  }

  emit(contactPoint: THREE.Vector3, direction: THREE.Vector3, intensity: number = 1): void {
    const particleCount = Math.floor(20 * intensity);

    for (let i = 0; i < particleCount; i++) {
      const spread = 0.5;
      const velocity = direction.clone().multiplyScalar(10 + Math.random() * 20);
      velocity.x += (Math.random() - 0.5) * spread * 10;
      velocity.y += (Math.random() - 0.5) * spread * 10;
      velocity.z += (Math.random() - 0.5) * spread * 10;

      // Heat-based colors
      const heat = Math.random();
      const color = new THREE.Color();
      if (heat > 0.7) {
        color.setHex(0xffffff); // White hot
      } else if (heat > 0.4) {
        color.setHex(0xffaa00); // Orange
      } else {
        color.setHex(0xff4400); // Red
      }

      this.spawn(
        contactPoint.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5)),
        velocity,
        color,
        2 + Math.random() * 3,
        0.3 + Math.random() * 0.5
      );
    }
  }
}

// ============================================
// DUST CLOUD SYSTEM
// ============================================

export class DustCloudSystem extends GPUParticleSystem {
  constructor(count: number = 200) {
    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLife;

        void main() {
          // Soft dust puff
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);

          if (dist > 0.5) discard;

          // Very soft edge
          float alpha = 1.0 - smoothstep(0.1, 0.5, dist);

          // Dust color (brownish tint)
          vec3 dustColor = vec3(0.7, 0.6, 0.5);

          gl_FragColor = vec4(dustColor, alpha * 0.6 * smoothstep(0.0, 0.5, vLife));
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    super(count, material);
  }

  emitSlide(position: THREE.Vector3, velocity: THREE.Vector3): void {
    for (let i = 0; i < 30; i++) {
      const spreadVel = velocity.clone().multiplyScalar(0.5);
      spreadVel.x += (Math.random() - 0.5) * 5;
      spreadVel.y += Math.random() * 3;
      spreadVel.z += (Math.random() - 0.5) * 5;

      const color = new THREE.Color().setHex(0x8b7355);

      this.spawn(
        position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)),
        spreadVel,
        color,
        5 + Math.random() * 5,
        1.0 + Math.random() * 0.5
      );
    }
  }

  emitDive(position: THREE.Vector3): void {
    for (let i = 0; i < 20; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 5,
        (Math.random() - 0.5) * 10
      );

      const color = new THREE.Color().setHex(0x8b7355);

      this.spawn(
        position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5)),
        velocity,
        color,
        4 + Math.random() * 4,
        0.8 + Math.random() * 0.4
      );
    }
  }
}

// ============================================
// CHALK BURST SYSTEM (Foul lines, bases)
// ============================================

export class ChalkBurstSystem extends GPUParticleSystem {
  constructor(count: number = 50) {
    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLife;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);

          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.2, 0.5, dist);

          // Chalk white
          vec3 chalkColor = vec3(0.95, 0.95, 0.9);

          gl_FragColor = vec4(chalkColor, alpha * smoothstep(0.0, 0.3, vLife));
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    super(count, material);
  }

  emitKickUp(position: THREE.Vector3, intensity: number = 1): void {
    for (let i = 0; i < 15 * intensity; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 4,
        (Math.random() - 0.5) * 3
      );

      const color = new THREE.Color().setHex(0xf5f5f5);

      this.spawn(
        position.clone(),
        velocity,
        color,
        1 + Math.random() * 2,
        0.5 + Math.random() * 0.3
      );
    }
  }
}

// ============================================
// FIREWORKS SYSTEM (Home runs, walk-offs)
// ============================================

export class FireworksSystem extends THREE.Group {
  private shells: Array<{
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    stage: 'rising' | 'burst' | 'particles' | 'done';
    particles: Array<{
      position: THREE.Vector3;
      velocity: THREE.Vector3;
      life: number;
      color: THREE.Color;
    }>;
    color: THREE.Color;
  }> = [];

  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particleSystem: THREE.Points;

  constructor() {
    super();

    // Create particle system for burst particles
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(3000 * 3);
    const colors = new Float32Array(3000 * 3);

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.add(this.particleSystem);
  }

  launch(position: THREE.Vector3, type: 'HOME_RUN' | 'WALK_OFF' | 'VICTORY' = 'HOME_RUN'): void {
    const colors = [
      new THREE.Color(0xff0000),
      new THREE.Color(0x00ff00),
      new THREE.Color(0x0000ff),
      new THREE.Color(0xffff00),
      new THREE.Color(0xff00ff),
      new THREE.Color(0x00ffff),
    ];

    const shellCount = type === 'VICTORY' ? 5 : type === 'WALK_OFF' ? 3 : 1;

    for (let s = 0; s < shellCount; s++) {
      setTimeout(() => {
        this.shells.push({
          position: position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 50, 0, (Math.random() - 0.5) * 50)),
          velocity: new THREE.Vector3((Math.random() - 0.5) * 10, 40 + Math.random() * 20, (Math.random() - 0.5) * 10),
          stage: 'rising',
          particles: [],
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }, s * 300);
    }
  }

  update(deltaTime: number): void {
    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    let particleIndex = 0;

    this.shells = this.shells.filter(shell => {
      if (shell.stage === 'rising') {
        shell.position.addScaledVector(shell.velocity, deltaTime);
        shell.velocity.y -= 20 * deltaTime; // Gravity

        if (shell.velocity.y <= 0) {
          // Burst!
          shell.stage = 'burst';
          this.createBurst(shell);
        }
        return true;
      } else if (shell.stage === 'particles') {
        // Update burst particles
        shell.particles = shell.particles.filter(p => {
          p.position.addScaledVector(p.velocity, deltaTime);
          p.velocity.y -= 15 * deltaTime; // Gravity
          p.life -= deltaTime;

          if (p.life > 0 && particleIndex < 3000) {
            positions[particleIndex * 3] = p.position.x;
            positions[particleIndex * 3 + 1] = p.position.y;
            positions[particleIndex * 3 + 2] = p.position.z;
            colors[particleIndex * 3] = p.color.r * p.life;
            colors[particleIndex * 3 + 1] = p.color.g * p.life;
            colors[particleIndex * 3 + 2] = p.color.b * p.life;
            particleIndex++;
            return true;
          }
          return false;
        });

        if (shell.particles.length === 0) {
          shell.stage = 'done';
          return false;
        }
        return true;
      }
      return false;
    });

    // Clear remaining slots
    for (let i = particleIndex; i < 3000; i++) {
      positions[i * 3 + 1] = -1000; // Hide
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  private createBurst(shell: typeof this.shells[0]): void {
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 15 + Math.random() * 10;

      const velocity = new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.cos(phi),
        speed * Math.sin(phi) * Math.sin(theta)
      );

      shell.particles.push({
        position: shell.position.clone(),
        velocity,
        life: 1.0 + Math.random() * 0.5,
        color: shell.color.clone(),
      });
    }

    shell.stage = 'particles';
  }
}

// ============================================
// WEATHER PARTICLES (Rain, Snow)
// ============================================

export class WeatherSystem extends THREE.Points {
  private weatherType: 'RAIN' | 'SNOW' | 'NONE';
  private particleCount: number;
  private wind: THREE.Vector3;
  private bounds: { min: THREE.Vector3; max: THREE.Vector3 };

  constructor(type: 'RAIN' | 'SNOW' = 'RAIN', particleCount: number = 5000) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    // Initialize random positions
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 400;
      positions[i + 1] = Math.random() * 200;
      positions[i + 2] = (Math.random() - 0.5) * 400;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: type === 'RAIN' ? 0xaaccff : 0xffffff,
      size: type === 'RAIN' ? 0.5 : 2,
      transparent: true,
      opacity: type === 'RAIN' ? 0.6 : 0.8,
      blending: THREE.AdditiveBlending,
    });

    super(geometry, material);

    this.weatherType = type;
    this.particleCount = particleCount;
    this.wind = new THREE.Vector3(5, 0, 0);
    this.bounds = {
      min: new THREE.Vector3(-200, 0, -200),
      max: new THREE.Vector3(200, 200, 200),
    };
  }

  update(deltaTime: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      if (this.weatherType === 'RAIN') {
        // Rain falls fast
        positions[idx + 1] -= 100 * deltaTime; // Y
        positions[idx] += this.wind.x * deltaTime; // X
        positions[idx + 2] += this.wind.z * deltaTime; // Z
      } else {
        // Snow falls slow with drift
        positions[idx + 1] -= 10 * deltaTime;
        positions[idx] += this.wind.x * deltaTime + Math.sin(Date.now() * 0.001 + i) * 0.1;
        positions[idx + 2] += this.wind.z * deltaTime + Math.cos(Date.now() * 0.001 + i) * 0.1;
      }

      // Reset if below ground
      if (positions[idx + 1] < this.bounds.min.y) {
        positions[idx] = (Math.random() - 0.5) * (this.bounds.max.x - this.bounds.min.x);
        positions[idx + 1] = this.bounds.max.y;
        positions[idx + 2] = (Math.random() - 0.5) * (this.bounds.max.z - this.bounds.min.z);
      }

      // Wrap horizontally
      if (positions[idx] > this.bounds.max.x) positions[idx] = this.bounds.min.x;
      if (positions[idx] < this.bounds.min.x) positions[idx] = this.bounds.max.x;
      if (positions[idx + 2] > this.bounds.max.z) positions[idx + 2] = this.bounds.min.z;
      if (positions[idx + 2] < this.bounds.min.z) positions[idx + 2] = this.bounds.max.z;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  setWind(wind: THREE.Vector3): void {
    this.wind.copy(wind);
  }

  setIntensity(intensity: number): void {
    this.visible = intensity > 0;
    (this.material as THREE.PointsMaterial).opacity = Math.min(1, intensity);
  }
}

// ============================================
// PARTICLE MANAGER
// ============================================

export class ParticleManager {
  public hitSparks: HitSparkSystem;
  public dustClouds: DustCloudSystem;
  public chalkBursts: ChalkBurstSystem;
  public fireworks: FireworksSystem;
  public weather: WeatherSystem;

  constructor(scene: THREE.Scene, enableWeather: boolean = false) {
    this.hitSparks = new HitSparkSystem(100);
    this.dustClouds = new DustCloudSystem(200);
    this.chalkBursts = new ChalkBurstSystem(50);
    this.fireworks = new FireworksSystem();
    this.weather = new WeatherSystem('RAIN', 3000);

    scene.add(this.hitSparks);
    scene.add(this.dustClouds);
    scene.add(this.chalkBursts);
    scene.add(this.fireworks);

    if (enableWeather) {
      scene.add(this.weather);
    } else {
      this.weather.visible = false;
    }
  }

  update(deltaTime: number): void {
    this.hitSparks.update(deltaTime);
    this.dustClouds.update(deltaTime);
    this.chalkBursts.update(deltaTime);
    this.fireworks.update(deltaTime);

    if (this.weather.visible) {
      this.weather.update(deltaTime);
    }
  }

  // Event triggers
  onBallHit(contactPoint: THREE.Vector3, direction: THREE.Vector3, exitVelo: number): void {
    const intensity = Math.min(2, exitVelo / 100);
    this.hitSparks.emit(contactPoint, direction, intensity);
  }

  onSlide(position: THREE.Vector3, velocity: THREE.Vector3): void {
    this.dustClouds.emitSlide(position, velocity);
  }

  onDive(position: THREE.Vector3): void {
    this.dustClouds.emitDive(position);
  }

  onHomeRun(position: THREE.Vector3): void {
    this.fireworks.launch(position, 'HOME_RUN');
  }

  onWalkOff(position: THREE.Vector3): void {
    this.fireworks.launch(position, 'WALK_OFF');
  }

  onVictory(position: THREE.Vector3): void {
    this.fireworks.launch(position, 'VICTORY');
  }
}
