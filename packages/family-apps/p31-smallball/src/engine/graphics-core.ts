// P31 Smallball: Graphics Engine Core
// Three.js-based 2.5D billboard rendering system
// Optimized for web performance with LOD and instancing

import * as THREE from 'three';

// ============================================
// CONFIGURATION
// ============================================

export interface GraphicsConfig {
  fieldScale: number;      // World units per foot
  shadowMapSize: number;   // Shadow texture resolution
  maxFPS: number;          // Target framerate
  lodDistance: number[];   // LOD transition distances
  enableParticles: boolean;
  enableShadows: boolean;
  enablePostProcessing: boolean;
}

export const DEFAULT_GRAPHICS_CONFIG: GraphicsConfig = {
  fieldScale: 0.5,         // 1 foot = 0.5 world units
  shadowMapSize: 2048,
  maxFPS: 60,
  lodDistance: [20, 50, 100], // Near, medium, far LOD
  enableParticles: true,
  enableShadows: true,
  enablePostProcessing: false, // Disabled for performance
};

// ============================================
// FIELD GEOMETRY
// ============================================

// MLB field dimensions (in feet, scaled to world)
export const FIELD_DIMENSIONS = {
  homeToPitcher: 60.5,
  homeToFirst: 90,
  homeToSecond: Math.sqrt(90 * 90 + 90 * 90), // 127.28 feet
  homeToThird: 90,
  basePathWidth: 4,
  infieldRadius: 95,
  outfieldMin: 310,
  outfieldMax: 420,
  fenceHeight: { min: 4, max: 37 },
  grassColor: { fair: 0x4a7c59, foul: 0x5a8c69 },
  dirtColor: 0x8b7355,
  warningTrackWidth: 15,
};

export class FieldGeometry {
  private config: GraphicsConfig;
  private scale: number;

  constructor(config: GraphicsConfig = DEFAULT_GRAPHICS_CONFIG) {
    this.config = config;
    this.scale = config.fieldScale;
  }

  // Create the complete field mesh
  createField(): THREE.Group {
    const field = new THREE.Group();

    // Infield dirt (diamond shape)
    field.add(this.createInfieldDirt());

    // Outfield grass
    field.add(this.createOutfieldGrass());

    // Base paths
    field.add(this.createBasePaths());

    // Bases
    field.add(this.createBases());

    // Pitcher's mound
    field.add(this.createPitchersMound());

    // Batter's boxes
    field.add(this.createBattersBoxes());

    // Foul lines
    field.add(this.createFoulLines());

    // Warning track
    field.add(this.createWarningTrack());

    return field;
  }

  private createInfieldDirt(): THREE.Mesh {
    const radius = FIELD_DIMENSIONS.infieldRadius * this.scale;
    const geometry = new THREE.CircleGeometry(radius, 64);
    const material = new THREE.MeshStandardMaterial({
      color: FIELD_DIMENSIONS.dirtColor,
      roughness: 0.9,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.01; // Slightly above grass
    mesh.receiveShadow = this.config.enableShadows;

    return mesh;
  }

  private createOutfieldGrass(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(
      FIELD_DIMENSIONS.outfieldMax * 2 * this.scale,
      FIELD_DIMENSIONS.outfieldMax * 2 * this.scale,
      32,
      32
    );

    // Create checkerboard grass pattern
    const material = new THREE.MeshStandardMaterial({
      color: FIELD_DIMENSIONS.grassColor.fair,
      roughness: 1.0,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0;
    mesh.receiveShadow = this.config.enableShadows;

    return mesh;
  }

  private createBasePaths(): THREE.Group {
    const group = new THREE.Group();
    const width = FIELD_DIMENSIONS.basePathWidth * this.scale;

    // Paths from home to first, first to second, second to third, third to home
    const paths = [
      { from: this.getHomePlatePosition(), to: this.getFirstBasePosition() },
      { from: this.getFirstBasePosition(), to: this.getSecondBasePosition() },
      { from: this.getSecondBasePosition(), to: this.getThirdBasePosition() },
      { from: this.getThirdBasePosition(), to: this.getHomePlatePosition() },
    ];

    paths.forEach(path => {
      const distance = path.from.distanceTo(path.to);
      const geometry = new THREE.PlaneGeometry(width, distance);
      const material = new THREE.MeshStandardMaterial({
        color: FIELD_DIMENSIONS.dirtColor,
        roughness: 0.95,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;

      // Position at midpoint, rotate to face destination
      mesh.position.copy(path.from).lerp(path.to, 0.5);
      mesh.position.y = 0.02;
      mesh.lookAt(path.to.x, 0.02, path.to.z);

      group.add(mesh);
    });

    return group;
  }

  private createBases(): THREE.Group {
    const group = new THREE.Group();
    const size = 1.5 * this.scale; // 15-inch base

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
    });

    const geometry = new THREE.BoxGeometry(size, 0.1, size);

    const positions = [
      { pos: this.getFirstBasePosition(), name: 'first' },
      { pos: this.getSecondBasePosition(), name: 'second' },
      { pos: this.getThirdBasePosition(), name: 'third' },
    ];

    positions.forEach(({ pos }) => {
      const mesh = new THREE.Mesh(geometry, baseMaterial);
      mesh.position.copy(pos);
      mesh.position.y = 0.05;
      mesh.castShadow = this.config.enableShadows;
      mesh.receiveShadow = this.config.enableShadows;
      group.add(mesh);
    });

    // Home plate (pentagon shape)
    const homeGeometry = this.createHomePlateGeometry();
    const homeMesh = new THREE.Mesh(homeGeometry, baseMaterial);
    homeMesh.position.copy(this.getHomePlatePosition());
    homeMesh.position.y = 0.05;
    group.add(homeMesh);

    return group;
  }

  private createHomePlateGeometry(): THREE.ShapeGeometry {
    const s = this.scale;
    const shape = new THREE.Shape();

    // Home plate is a pentagon: 17-inch front, two 12-inch sides to point
    const width = 1.416 * s; // 17 inches
    const height = 1 * s;   // 12 inches

    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, -height * 0.5);
    shape.lineTo(0, -height);
    shape.lineTo(-width / 2, -height * 0.5);
    shape.lineTo(-width / 2, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }

  private createPitchersMound(): THREE.Mesh {
    const radius = 9 * this.scale; // 9-foot radius
    const height = 0.5 * this.scale; // 10-inch height (scaled)

    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    const material = new THREE.MeshStandardMaterial({
      color: FIELD_DIMENSIONS.dirtColor,
      roughness: 0.9,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.getPitchersMoundPosition());
    mesh.position.y = height / 2;
    mesh.castShadow = this.config.enableShadows;
    mesh.receiveShadow = this.config.enableShadows;

    return mesh;
  }

  private createBattersBoxes(): THREE.Group {
    const group = new THREE.Group();
    const width = 4 * this.scale; // 4 feet wide
    const length = 6 * this.scale; // 6 feet long

    const geometry = new THREE.PlaneGeometry(width, length);
    const material = new THREE.MeshStandardMaterial({
      color: FIELD_DIMENSIONS.dirtColor,
      roughness: 0.95,
    });

    // Left-handed batter's box
    const leftBox = new THREE.Mesh(geometry, material);
    leftBox.rotation.x = -Math.PI / 2;
    leftBox.position.set(
      -2.5 * this.scale,
      0.03,
      -2 * this.scale
    );

    // Right-handed batter's box
    const rightBox = new THREE.Mesh(geometry, material);
    rightBox.rotation.x = -Math.PI / 2;
    rightBox.position.set(
      2.5 * this.scale,
      0.03,
      -2 * this.scale
    );

    group.add(leftBox, rightBox);
    return group;
  }

  private createFoulLines(): THREE.Group {
    const group = new THREE.Group();
    const lineWidth = 0.1 * this.scale;
    const lineLength = FIELD_DIMENSIONS.outfieldMax * this.scale;

    const geometry = new THREE.PlaneGeometry(lineWidth, lineLength);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    // Right field line
    const rightLine = new THREE.Mesh(geometry, material);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.position.set(lineLength / 2, 0.04, 0);
    rightLine.rotation.z = -Math.PI / 4;

    // Left field line
    const leftLine = new THREE.Mesh(geometry, material);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.position.set(0, 0.04, -lineLength / 2);
    leftLine.rotation.z = Math.PI / 4;

    group.add(rightLine, leftLine);
    return group;
  }

  private createWarningTrack(): THREE.Mesh {
    const innerRadius = (FIELD_DIMENSIONS.outfieldMax - FIELD_DIMENSIONS.warningTrackWidth) * this.scale;
    const outerRadius = FIELD_DIMENSIONS.outfieldMax * this.scale;

    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0x5c4033, // Darker dirt for warning track
      roughness: 0.95,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.03;

    return mesh;
  }

  // Position getters
  getHomePlatePosition(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 0);
  }

  getPitchersMoundPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      0,
      0,
      FIELD_DIMENSIONS.homeToPitcher * this.scale
    );
  }

  getFirstBasePosition(): THREE.Vector3 {
    return new THREE.Vector3(
      FIELD_DIMENSIONS.homeToFirst * this.scale,
      0,
      0
    );
  }

  getSecondBasePosition(): THREE.Vector3 {
    return new THREE.Vector3(
      FIELD_DIMENSIONS.homeToFirst * this.scale,
      0,
      -FIELD_DIMENSIONS.homeToFirst * this.scale
    );
  }

  getThirdBasePosition(): THREE.Vector3 {
    return new THREE.Vector3(
      0,
      0,
      -FIELD_DIMENSIONS.homeToFirst * this.scale
    );
  }
}

// ============================================
// LIGHTING SYSTEM
// ============================================

export class FieldLighting {
  private config: GraphicsConfig;

  constructor(config: GraphicsConfig = DEFAULT_GRAPHICS_CONFIG) {
    this.config = config;
  }

  // Create daytime lighting
  createDayLighting(): THREE.Group {
    const group = new THREE.Group();

    // Ambient light (sky)
    const ambient = new THREE.AmbientLight(0x87ceeb, 0.6);
    group.add(ambient);

    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sun.position.set(100, 200, 100);
    sun.castShadow = this.config.enableShadows;

    if (this.config.enableShadows) {
      sun.shadow.mapSize.width = this.config.shadowMapSize;
      sun.shadow.mapSize.height = this.config.shadowMapSize;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 500;
      sun.shadow.camera.left = -200;
      sun.shadow.camera.right = 200;
      sun.shadow.camera.top = 200;
      sun.shadow.camera.bottom = -200;
    }

    group.add(sun);

    // Hemisphere light for sky/ground color
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a7c59, 0.4);
    group.add(hemi);

    return group;
  }

  // Create night game lighting (stadium lights)
  createNightLighting(): THREE.Group {
    const group = new THREE.Group();

    // Dim ambient
    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.2);
    group.add(ambient);

    // Multiple stadium light towers
    const lightPositions = [
      { x: 150, y: 80, z: 150 },
      { x: -150, y: 80, z: 150 },
      { x: 150, y: 80, z: -150 },
      { x: -150, y: 80, z: -150 },
    ];

    lightPositions.forEach(pos => {
      const spot = new THREE.SpotLight(0xffffee, 2);
      spot.position.set(pos.x, pos.y, pos.z);
      spot.target.position.set(0, 0, 0);
      spot.angle = Math.PI / 3;
      spot.penumbra = 0.3;
      spot.castShadow = this.config.enableShadows;
      group.add(spot);
      group.add(spot.target);
    });

    return group;
  }

  // Create dramatic clutch lighting
  createClutchLighting(): THREE.Group {
    const group = new THREE.Group();

    // Dark surroundings
    const ambient = new THREE.AmbientLight(0x000000, 0.1);
    group.add(ambient);

    // Spotlight on home plate area
    const spot = new THREE.SpotLight(0xffffff, 3);
    spot.position.set(0, 100, 100);
    spot.target.position.set(0, 0, 0);
    spot.angle = Math.PI / 6;
    spot.penumbra = 0.2;
    group.add(spot);
    group.add(spot.target);

    return group;
  }
}

// ============================================
// CAMERA SYSTEM
// ============================================

export enum CameraAngle {
  BEHIND_PLATE = 'behind_plate',
  CENTER_FIELD = 'center_field',
  FIRST_BASE = 'first_base',
  THIRD_BASE = 'third_base',
  HIGH_HOME = 'high_home',
  DUGOUT = 'dugout',
  BROADCAST = 'broadcast',
  ORBIT = 'orbit',
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;
  private fieldScale: number;

  constructor(camera: THREE.PerspectiveCamera, fieldScale: number = 0.5) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 0, 0);
    this.fieldScale = fieldScale;
  }

  setAngle(angle: CameraAngle, target?: THREE.Vector3): void {
    if (target) {
      this.target.copy(target);
    }

    const positions: Record<CameraAngle, THREE.Vector3> = {
      [CameraAngle.BEHIND_PLATE]: new THREE.Vector3(0, 15 * this.fieldScale, -40 * this.fieldScale),
      [CameraAngle.CENTER_FIELD]: new THREE.Vector3(0, 30 * this.fieldScale, 200 * this.fieldScale),
      [CameraAngle.FIRST_BASE]: new THREE.Vector3(150 * this.fieldScale, 20 * this.fieldScale, 0),
      [CameraAngle.THIRD_BASE]: new THREE.Vector3(-150 * this.fieldScale, 20 * this.fieldScale, 0),
      [CameraAngle.HIGH_HOME]: new THREE.Vector3(0, 100 * this.fieldScale, -50 * this.fieldScale),
      [CameraAngle.DUGOUT]: new THREE.Vector3(-80 * this.fieldScale, 10 * this.fieldScale, -30 * this.fieldScale),
      [CameraAngle.BROADCAST]: new THREE.Vector3(80 * this.fieldScale, 60 * this.fieldScale, 180 * this.fieldScale),
      [CameraAngle.ORBIT]: new THREE.Vector3(
        Math.sin(Date.now() * 0.0001) * 150 * this.fieldScale,
        50 * this.fieldScale,
        Math.cos(Date.now() * 0.0001) * 150 * this.fieldScale
      ),
    };

    const pos = positions[angle];
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }

  followBall(ballPosition: THREE.Vector3, velocity: THREE.Vector3): void {
    // Dynamic camera that follows ball with lead based on velocity
    const lead = velocity.clone().multiplyScalar(0.5);
    const targetPos = ballPosition.clone().add(lead);

    // Smooth follow
    this.camera.position.lerp(
      new THREE.Vector3(
        targetPos.x + 20 * this.fieldScale,
        targetPos.y + 30 * this.fieldScale,
        targetPos.z + 30 * this.fieldScale
      ),
      0.1
    );
    this.camera.lookAt(ballPosition);
  }

  slowMotionZoom(factor: number = 2): void {
    // Adjust FOV for slow-motion dramatic effect
    const baseFOV = 50;
    this.camera.fov = baseFOV / factor;
    this.camera.updateProjectionMatrix();
  }

  resetFOV(): void {
    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();
  }
}

// ============================================
// RENDERER SETUP
// ============================================

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });

  renderer.setSize(canvas.width, canvas.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  return renderer;
}

// ============================================
// LOD SYSTEM
// ============================================

export class LODManager {
  private lodLevels: Map<string, THREE.LOD> = new Map();
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  addLOD(id: string, lod: THREE.LOD): void {
    this.lodLevels.set(id, lod);
  }

  removeLOD(id: string): void {
    this.lodLevels.delete(id);
  }

  update(): void {
    this.lodLevels.forEach(lod => lod.update(this.camera));
  }

  // Create LOD for a player sprite
  createPlayerLOD(baseGeometry: THREE.BufferGeometry, materials: THREE.Material[]): THREE.LOD {
    const lod = new THREE.LOD();

    // High detail (close)
    const mesh0 = new THREE.Mesh(baseGeometry, materials[0]);
    lod.addLevel(mesh0, 0);

    // Medium detail
    if (materials[1]) {
      const mesh1 = new THREE.Mesh(baseGeometry, materials[1]);
      lod.addLevel(mesh1, 30);
    }

    // Low detail (far)
    if (materials[2]) {
      const mesh2 = new THREE.Mesh(baseGeometry, materials[2]);
      lod.addLevel(mesh2, 80);
    }

    return lod;
  }
}
