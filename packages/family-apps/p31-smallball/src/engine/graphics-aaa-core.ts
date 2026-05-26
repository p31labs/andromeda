// P31 Smallball: AAA Graphics Core
// Cinema-quality rendering with PBR, atmospheric effects, and advanced materials
// Optimized for WebGL 2.0 with graceful fallbacks

import * as THREE from 'three';

// ============================================
// AAA CONFIGURATION
// ============================================

export interface AAAGraphicsConfig {
  // Quality tiers
  quality: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

  // Rendering
  shadowMapSize: number;
  maxFPS: number;
  enablePostProcessing: boolean;
  enableVolumetrics: boolean;
  enableSSAO: boolean;
  enableSSR: boolean;

  // Field
  fieldScale: number;
  grassBladeCount: number;
  grassRenderDistance: number;

  // Lighting
  enableDynamicShadows: boolean;
  shadowCascadeCount: number;
  enableGlobalIllumination: boolean;

  // Atmosphere
  fogDensity: number;
  fogColor: THREE.Color;
  enableGodRays: boolean;
  enableLensFlare: boolean;
}

export const AAA_DEFAULT_CONFIG: AAAGraphicsConfig = {
  quality: 'HIGH',
  shadowMapSize: 4096,
  maxFPS: 60,
  enablePostProcessing: true,
  enableVolumetrics: true,
  enableSSAO: true,
  enableSSR: false, // Expensive, off by default

  fieldScale: 0.5,
  grassBladeCount: 100000,
  grassRenderDistance: 150,

  enableDynamicShadows: true,
  shadowCascadeCount: 4,
  enableGlobalIllumination: false,

  fogDensity: 0.002,
  fogColor: new THREE.Color(0x87ceeb),
  enableGodRays: true,
  enableLensFlare: true,
};

// Quality presets
export const QUALITY_PRESETS: Record<string, AAAGraphicsConfig> = {
  LOW: {
    ...AAA_DEFAULT_CONFIG,
    quality: 'LOW',
    shadowMapSize: 1024,
    enablePostProcessing: false,
    enableVolumetrics: false,
    enableSSAO: false,
    grassBladeCount: 5000,
    enableGodRays: false,
  },
  MEDIUM: {
    ...AAA_DEFAULT_CONFIG,
    quality: 'MEDIUM',
    shadowMapSize: 2048,
    enablePostProcessing: true,
    enableVolumetrics: false,
    enableSSAO: false,
    grassBladeCount: 25000,
    enableGodRays: false,
  },
  HIGH: AAA_DEFAULT_CONFIG,
  ULTRA: {
    ...AAA_DEFAULT_CONFIG,
    quality: 'ULTRA',
    shadowMapSize: 8192,
    enableSSR: true,
    grassBladeCount: 250000,
    enableGlobalIllumination: true,
  },
};

// ============================================
// PBR MATERIAL FACTORY
// ============================================

export class PBRMaterialFactory {
  private textureLoader: THREE.TextureLoader;
  private proceduralTextures: Map<string, THREE.Texture> = new Map();

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }

  // Generate procedural grass texture with normal and roughness
  createGrassMaterial(): THREE.MeshStandardMaterial {
    const texture = this.getOrCreateProceduralTexture('grass', () => this.generateGrassTexture());
    const normalMap = this.getOrCreateProceduralTexture('grass_normal', () => this.generateGrassNormalMap());
    const roughnessMap = this.getOrCreateProceduralTexture('grass_roughness', () => this.generateGrassRoughnessMap());

    return new THREE.MeshStandardMaterial({
      map: texture,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
      color: 0x4a7c59,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
  }

  // Generate procedural dirt/clay material
  createDirtMaterial(): THREE.MeshStandardMaterial {
    const texture = this.getOrCreateProceduralTexture('dirt', () => this.generateDirtTexture());
    const normalMap = this.getOrCreateProceduralTexture('dirt_normal', () => this.generateDirtNormalMap());

    return new THREE.MeshStandardMaterial({
      map: texture,
      normalMap: normalMap,
      color: 0x8b7355,
      roughness: 0.95,
      metalness: 0.0,
    });
  }

  // Warning track material (crushed rubber/rock)
  createWarningTrackMaterial(): THREE.MeshStandardMaterial {
    const texture = this.getOrCreateProceduralTexture('warning_track', () => this.generateWarningTrackTexture());

    return new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x5c4033,
      roughness: 1.0,
      metalness: 0.1,
    });
  }

  // Foul pole padding material
  createFoulPoleMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0xffaa00,
      emissiveIntensity: 0.1,
    });
  }

  private getOrCreateProceduralTexture(key: string, generator: () => THREE.CanvasTexture): THREE.Texture {
    if (!this.proceduralTextures.has(key)) {
      this.proceduralTextures.set(key, generator());
    }
    return this.proceduralTextures.get(key)!;
  }

  // Procedural grass texture with variation
  private generateGrassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base green
    ctx.fillStyle = '#4a7c59';
    ctx.fillRect(0, 0, 512, 512);

    // Add noise/variation
    for (let i = 0; i < 50000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = 1 + Math.random() * 2;
      const brightness = Math.random();

      if (brightness > 0.7) {
        ctx.fillStyle = '#5a8c69'; // Lighter
      } else if (brightness < 0.3) {
        ctx.fillStyle = '#3a6c49'; // Darker
      } else {
        ctx.fillStyle = '#4a7c59'; // Base
      }

      ctx.fillRect(x, y, size, size);
    }

    // Add subtle stripes (mowing pattern)
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 512; i += 8) {
      ctx.fillStyle = i % 16 === 0 ? '#000000' : '#ffffff';
      ctx.fillRect(i, 0, 4, 512);
    }
    ctx.globalAlpha = 1.0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    return texture;
  }

  private generateGrassNormalMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Normal map base (flat = 128, 128, 255)
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 256, 256);

    // Add subtle height variation
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 128 + (Math.random() - 0.5) * 30;
      const g = 128 + (Math.random() - 0.5) * 30;
      ctx.fillStyle = `rgb(${r}, ${g}, 255)`;
      ctx.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    return texture;
  }

  private generateGrassRoughnessMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Grass is quite rough
    ctx.fillStyle = 'rgb(230, 230, 230)'; // High roughness
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    return texture;
  }

  private generateDirtTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base dirt color
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, 0, 512, 512);

    // Add clumping/aggregates
    for (let i = 0; i < 10000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = 2 + Math.random() * 4;
      const shade = Math.random();

      if (shade > 0.6) {
        ctx.fillStyle = '#9b8365';
      } else if (shade < 0.3) {
        ctx.fillStyle = '#7b6345';
      } else {
        ctx.fillStyle = '#8b7355';
      }

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    return texture;
  }

  private generateDirtNormalMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 256, 256);

    // More variation for dirt
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 128 + (Math.random() - 0.5) * 50;
      const g = 128 + (Math.random() - 0.5) * 50;
      ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, 255)`;
      ctx.fillRect(x, y, 3, 3);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    return texture;
  }

  private generateWarningTrackTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark rubber/rock mix
    ctx.fillStyle = '#4a3c32';
    ctx.fillRect(0, 0, 512, 512);

    // Add larger aggregates
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = 2 + Math.random() * 3;

      const color = Math.random();
      if (color > 0.7) {
        ctx.fillStyle = '#5a4c42'; // Lighter
      } else {
        ctx.fillStyle = '#3a2c22'; // Darker
      }

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(15, 15);
    return texture;
  }
}

// ============================================
// GRASS WIND SYSTEM (Shader-based)
// ============================================

export const GRASS_VERTEX_SHADER = `
  uniform float time;
  uniform float windStrength;
  uniform vec3 windDirection;

  attribute float bladeHeight;
  attribute float bladeWidth;
  attribute float randomOffset;

  varying vec2 vUv;
  varying float vHeight;

  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vUv = uv;
    vHeight = bladeHeight;

    vec3 pos = position;

    // Wind displacement increases with height
    float windNoise = snoise(vec2(
      instanceMatrix[3][0] * 0.1 + time * 0.5,
      instanceMatrix[3][2] * 0.1 + time * 0.3
    ));

    float heightFactor = pos.y / bladeHeight;
    vec3 windOffset = windDirection * windNoise * windStrength * heightFactor * heightFactor;

    // Add random sway
    float sway = sin(time * (1.0 + randomOffset) + randomOffset * 10.0) * 0.1 * heightFactor;
    windOffset.x += sway;

    pos += windOffset;

    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
  }
`;

export const GRASS_FRAGMENT_SHADER = `
  uniform vec3 colorBottom;
  uniform vec3 colorTop;
  uniform float roughness;

  varying vec2 vUv;
  varying float vHeight;

  void main() {
    // Gradient from bottom to top
    vec3 color = mix(colorBottom, colorTop, vUv.y);

    // Add subtle variation
    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
    color = mix(color, color * (0.9 + noise * 0.2), 0.3);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ============================================
// STADIUM ARCHITECTURE
// ============================================

export class StadiumArchitecture {
  private config: AAAGraphicsConfig;
  private materialFactory: PBRMaterialFactory;

  constructor(config: AAAGraphicsConfig, materialFactory: PBRMaterialFactory) {
    this.config = config;
    this.materialFactory = materialFactory;
  }

  createStadium(): THREE.Group {
    const stadium = new THREE.Group();

    // Seating bowl
    stadium.add(this.createSeatingBowl());

    // Foul poles
    stadium.add(this.createFoulPoles());

    // Dugouts
    stadium.add(this.createDugouts());

    // Scoreboard
    stadium.add(this.createScoreboard());

    // Light towers (for night games)
    stadium.add(this.createLightTowers());

    return stadium;
  }

  private createSeatingBowl(): THREE.Group {
    const bowl = new THREE.Group();

    // Create tiered seating sections
    const tiers = 20;
    const sections = 24;
    const radius = 120 * this.config.fieldScale;

    const seatMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a3a5c, // Dark blue seats
      roughness: 0.6,
      metalness: 0.1,
    });

    const concreteMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.9,
      metalness: 0.0,
    });

    for (let s = 0; s < sections; s++) {
      const angle = (s / sections) * Math.PI * 2;
      const sectionAngle = (Math.PI * 2) / sections;

      // Skip sections behind home plate and too far foul
      const angleDeg = (angle * 180) / Math.PI;
      if (angleDeg > 45 && angleDeg < 135) continue; // Behind home

      for (let t = 0; t < tiers; t++) {
        const tierRadius = radius + t * 3;
        const height = t * 0.5;

        // Seating section
        const seatGeo = new THREE.CylinderGeometry(
          tierRadius + 2,
          tierRadius,
          0.4,
          8,
          1,
          false,
          0,
          sectionAngle * 0.9
        );

        const seats = new THREE.Mesh(seatGeo, seatMaterial);
        seats.position.y = height;
        seats.rotation.y = angle;
        bowl.add(seats);

        // Concrete riser
        const riserGeo = new THREE.CylinderGeometry(
          tierRadius + 2.2,
          tierRadius - 0.2,
          0.5,
          8,
          1,
          false,
          0,
          sectionAngle * 0.9
        );
        const riser = new THREE.Mesh(riserGeo, concreteMaterial);
        riser.position.y = height - 0.45;
        riser.rotation.y = angle;
        bowl.add(riser);
      }
    }

    return bowl;
  }

  private createFoulPoles(): THREE.Group {
    const poles = new THREE.Group();

    const poleHeight = 50 * this.config.fieldScale;
    const poleRadius = 0.3 * this.config.fieldScale;

    // Left field foul pole
    const leftPole = this.createSingleFoulPole(-1);
    poles.add(leftPole);

    // Right field foul pole
    const rightPole = this.createSingleFoulPole(1);
    poles.add(rightPole);

    return poles;
  }

  private createSingleFoulPole(side: number): THREE.Group {
    const group = new THREE.Group();

    const distance = 330 * this.config.fieldScale;
    const angle = side === 1 ? -Math.PI / 4 : Math.PI / 4;
    const x = Math.sin(angle) * distance;
    const z = Math.cos(angle) * distance;

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.3, 50, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 25, z);
    group.add(pole);

    // Netting
    const netGeo = new THREE.PlaneGeometry(3, 15);
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(x, 35, z);
    net.rotation.y = angle + Math.PI / 2;
    group.add(net);

    return group;
  }

  private createDugouts(): THREE.Group {
    const dugouts = new THREE.Group();

    // Home dugout (first base side)
    const homeDugout = this.createSingleDugout(1);
    dugouts.add(homeDugout);

    // Away dugout (third base side)
    const awayDugout = this.createSingleDugout(-1);
    dugouts.add(awayDugout);

    return dugouts;
  }

  private createSingleDugout(side: number): THREE.Group {
    const group = new THREE.Group();

    const x = side * 25 * this.config.fieldScale;
    const z = -10 * this.config.fieldScale;

    // Roof
    const roofGeo = new THREE.BoxGeometry(20 * this.config.fieldScale, 0.5, 8 * this.config.fieldScale);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(x, 4, z);
    group.add(roof);

    // Bench
    const benchGeo = new THREE.BoxGeometry(18 * this.config.fieldScale, 1, 2);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(x, 0.5, z - 2);
    group.add(bench);

    // Fence
    const fenceGeo = new THREE.BoxGeometry(20 * this.config.fieldScale, 3, 0.1);
    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x004400,
      transparent: true,
      opacity: 0.7,
    });
    const fence = new THREE.Mesh(fenceGeo, fenceMat);
    fence.position.set(x, 1.5, z + 4);
    group.add(fence);

    return group;
  }

  private createScoreboard(): THREE.Group {
    const group = new THREE.Group();

    const x = 0;
    const z = -200 * this.config.fieldScale;

    // Main board
    const boardGeo = new THREE.BoxGeometry(40 * this.config.fieldScale, 25 * this.config.fieldScale, 2);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(x, 30, z);
    group.add(board);

    // LED screen area
    const screenGeo = new THREE.PlaneGeometry(35 * this.config.fieldScale, 20 * this.config.fieldScale);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x002200,
      emissiveIntensity: 0.3,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(x, 30, z + 1.1);
    group.add(screen);

    return group;
  }

  private createLightTowers(): THREE.Group {
    const towers = new THREE.Group();

    const positions = [
      { x: 150, z: 150 },
      { x: -150, z: 150 },
      { x: 150, z: -150 },
      { x: -150, z: -150 },
    ];

    positions.forEach(pos => {
      const tower = this.createSingleLightTower(
        pos.x * this.config.fieldScale,
        pos.z * this.config.fieldScale
      );
      towers.add(tower);
    });

    return towers;
  }

  private createSingleLightTower(x: number, z: number): THREE.Group {
    const group = new THREE.Group();

    // Base
    const baseGeo = new THREE.CylinderGeometry(3, 4, 2, 8);
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const base = new THREE.Mesh(baseGeo, concreteMat);
    base.position.set(x, 1, z);
    group.add(base);

    // Tower
    const towerGeo = new THREE.CylinderGeometry(1, 3, 80, 8);
    const tower = new THREE.Mesh(towerGeo, concreteMat);
    tower.position.set(x, 41, z);
    group.add(tower);

    // Light array
    const lightArrayGeo = new THREE.BoxGeometry(8, 2, 4);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const lightArray = new THREE.Mesh(lightArrayGeo, metalMat);
    lightArray.position.set(x, 82, z);
    lightArray.lookAt(0, 0, 0);
    group.add(lightArray);

    // Individual lights (visual only, actual lights in lighting system)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        const lightGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 16);
        const lightMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 1,
        });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(
          x + (i - 1.5) * 2,
          83,
          z + (j - 0.5) * 2
        );
        light.lookAt(0, 0, 0);
        group.add(light);
      }
    }

    return group;
  }
}

// ============================================
// ENHANCED RENDERER SETUP
// ============================================

export function createAAARenderer(canvas: HTMLCanvasElement, config: AAAGraphicsConfig): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });

  renderer.setSize(canvas.width, canvas.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.quality === 'ULTRA' ? 2 : 1.5));

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  return renderer;
}
