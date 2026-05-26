// P31 Smallball: AAA Graphics Integration
// Unified API for cinema-quality rendering
// Drop-in replacement for graphics-core.ts with AAA features

import * as THREE from 'three';
import {
  AAAGraphicsConfig,
  AAA_DEFAULT_CONFIG,
  QUALITY_PRESETS,
  PBRMaterialFactory,
  StadiumArchitecture,
  createAAARenderer,
} from './graphics-aaa-core';
import {
  EffectComposer,
  BloomPass,
  DepthOfFieldPass,
  ColorGradingPass,
} from './graphics-post-processing';
import {
  CinematicCameraController,
  CameraDirector,
  BroadcastAngle,
  GameMoment,
  TRANSITION_PRESETS,
} from './graphics-cinematic-camera';
import {
  ParticleManager,
  WeatherSystem as ParticleWeather,
} from './graphics-particles-aaa';
import {
  AtmosphereManager,
  TimeOfDay,
  WeatherCondition,
  WeatherConfig,
} from './graphics-atmosphere';
import {
  VolumetricManager,
} from './graphics-volumetrics';
import { FieldGeometry } from './graphics-core';

// ============================================
// AAA GRAPHICS ENGINE
// ============================================

export class AAAGraphicsEngine {
  // Core Three.js
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // AAA Components
  public config: AAAGraphicsConfig;
  public materialFactory: PBRMaterialFactory;
  public fieldGeometry: FieldGeometry;
  public stadium: StadiumArchitecture;

  // Effects
  public composer: EffectComposer | null = null;
  public particles: ParticleManager;
  public atmosphere: AtmosphereManager;
  public volumetrics: VolumetricManager | null = null;

  // Camera
  public cameraController: CinematicCameraController;
  public cameraDirector: CameraDirector;

  // State
  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private renderLoopId: number | null = null;

  constructor(canvas: HTMLCanvasElement, config?: Partial<AAAGraphicsConfig>) {
    // Initialize config
    this.config = { ...AAA_DEFAULT_CONFIG, ...config };

    // Create core Three.js components
    this.renderer = createAAARenderer(canvas, this.config);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 30, 75);

    // Initialize AAA components
    this.materialFactory = new PBRMaterialFactory();
    this.fieldGeometry = new FieldGeometry(this.config as any);
    this.stadium = new StadiumArchitecture(this.config, this.materialFactory);

    // Create field with PBR materials
    this.createAAAField();

    // Create stadium architecture
    this.createStadium();

    // Initialize post-processing if enabled
    if (this.config.enablePostProcessing) {
      this.setupPostProcessing();
    }

    // Initialize particles
    this.particles = new ParticleManager(this.scene);

    // Initialize atmosphere
    this.atmosphere = new AtmosphereManager(this.scene, this.camera);

    // Initialize volumetrics if enabled
    if (this.config.enableVolumetrics) {
      this.volumetrics = new VolumetricManager(this.scene, this.camera, this.renderer);
      this.setupVolumetrics();
    }

    // Initialize camera system
    this.cameraController = new CinematicCameraController(this.camera, this.config.fieldScale);
    this.cameraDirector = new CameraDirector(this.cameraController);

    // Set initial camera angle
    this.cameraController.setAngle(BroadcastAngle.CENTER_FIELD, 'CUT');

    // Clock for timing
    this.clock = new THREE.Clock();

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
  }

  // ============================================
  // SCENE SETUP
  // ============================================

  private createAAAField(): void {
    // Use existing field geometry but with PBR materials
    const field = new THREE.Group();

    // Infield dirt with PBR
    const dirtRadius = 95 * this.config.fieldScale;
    const dirtGeo = new THREE.CircleGeometry(dirtRadius, 64);
    const dirtMat = this.materialFactory.createDirtMaterial();
    const dirt = new THREE.Mesh(dirtGeo, dirtMat);
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.y = 0.01;
    dirt.receiveShadow = true;
    field.add(dirt);

    // Outfield grass with PBR
    const grassGeo = new THREE.PlaneGeometry(420 * 2 * this.config.fieldScale, 420 * 2 * this.config.fieldScale, 64, 64);
    const grassMat = this.materialFactory.createGrassMaterial();
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    field.add(grass);

    // Bases
    const baseGeo = new THREE.BoxGeometry(1.5 * this.config.fieldScale, 0.1, 1.5 * this.config.fieldScale);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.1,
    });

    const positions = [
      { x: 90, z: 0 },
      { x: 90, z: -90 },
      { x: 0, z: -90 },
    ];

    positions.forEach(pos => {
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(pos.x * this.config.fieldScale, 0.05, pos.z * this.config.fieldScale);
      base.castShadow = true;
      base.receiveShadow = true;
      field.add(base);
    });

    // Home plate (pentagon)
    const homeGeo = this.createHomePlateGeometry();
    const home = new THREE.Mesh(homeGeo, baseMat);
    home.position.y = 0.05;
    field.add(home);

    // Pitcher's mound
    const moundGeo = new THREE.CylinderGeometry(9 * this.config.fieldScale, 9 * this.config.fieldScale, 0.5 * this.config.fieldScale, 32);
    const moundMat = this.materialFactory.createDirtMaterial();
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.set(0, 0.25 * this.config.fieldScale, 60.5 * this.config.fieldScale);
    mound.castShadow = true;
    mound.receiveShadow = true;
    field.add(mound);

    // Foul poles
    field.add(this.createFoulPole(1));  // Right field
    field.add(this.createFoulPole(-1)); // Left field

    this.scene.add(field);
  }

  private createHomePlateGeometry(): THREE.ShapeGeometry {
    const s = this.config.fieldScale;
    const shape = new THREE.Shape();

    const width = 1.416 * s;
    const height = 1 * s;

    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, -height * 0.5);
    shape.lineTo(0, -height);
    shape.lineTo(-width / 2, -height * 0.5);
    shape.lineTo(-width / 2, 0);

    return new THREE.ShapeGeometry(shape);
  }

  private createFoulPole(side: number): THREE.Group {
    const group = new THREE.Group();

    const distance = 330 * this.config.fieldScale;
    const angle = side === 1 ? -Math.PI / 4 : Math.PI / 4;
    const x = Math.sin(angle) * distance;
    const z = Math.cos(angle) * distance;

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.3, 50, 16);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      roughness: 0.3,
      metalness: 0.1,
    });
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

  private createStadium(): void {
    const stadium = this.stadium.createStadium();
    this.scene.add(stadium);
  }

  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer, this.scene, this.camera);

    // Add bloom
    this.composer.addBloom(0.5, 0.4, 0.8);

    // Add depth of field
    this.composer.addDepthOfField(50, 50, 2.8);

    // Add color grading
    this.composer.addColorGrading(1.1, 1.15, 1.0, 0.0);
  }

  private setupVolumetrics(): void {
    if (!this.volumetrics) return;

    // Add light shafts at stadium light positions
    const lightPositions = [
      new THREE.Vector3(150, 100, 150),
      new THREE.Vector3(-150, 100, 150),
      new THREE.Vector3(150, 100, -150),
      new THREE.Vector3(-150, 100, -150),
    ].map(v => v.multiplyScalar(this.config.fieldScale));

    this.volumetrics.addStadiumLightShafts(lightPositions);

    // Add sun flare
    this.volumetrics.addSunFlare(new THREE.Vector3(100, 200, 100));
  }

  // ============================================
  // RENDER LOOP
  // ============================================

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.render();
  }

  stop(): void {
    this.isRunning = false;
    if (this.renderLoopId !== null) {
      cancelAnimationFrame(this.renderLoopId);
    }
  }

  private render(): void {
    if (!this.isRunning) return;

    this.renderLoopId = requestAnimationFrame(() => this.render());

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Update systems
    this.cameraController.update();
    this.cameraDirector.update();
    this.particles.update(deltaTime);
    this.atmosphere.update(deltaTime);

    if (this.volumetrics) {
      const sunPos = this.atmosphere.sunLight.position.clone();
      const skyMaterial = this.atmosphere.sky.material as THREE.ShaderMaterial;
      const skyColor = skyMaterial.uniforms.topColor.value as THREE.Color;
      this.volumetrics.update(elapsedTime, sunPos, skyColor);
    }

    // Render
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private handleResize(): void {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ============================================
  // PUBLIC API - CAMERA
  // ============================================

  setCameraAngle(angle: BroadcastAngle, transition: keyof typeof TRANSITION_PRESETS = 'SMOOTH'): void {
    this.cameraController.setAngle(angle, transition);
  }

  followBall(ballPosition: THREE.Vector3, velocity: THREE.Vector3): void {
    this.cameraController.followTarget(ballPosition, velocity, new THREE.Vector3(20, 20, 20));
  }

  triggerGameMoment(moment: GameMoment): void {
    this.cameraDirector.triggerMoment(moment);

    // Trigger particle effects based on moment
    switch (moment) {
      case 'CONTACT':
        this.cameraController.shake(0.3, 0.9);
        break;
      case 'HOME_RUN' as GameMoment:
        this.particles.onHomeRun(new THREE.Vector3(0, 50, -100));
        break;
    }
  }

  // ============================================
  // PUBLIC API - ATMOSPHERE
  // ============================================

  setTimeOfDay(time: TimeOfDay): void {
    this.atmosphere.setTimeOfDay(time);
  }

  setWeather(weather: WeatherConfig): void {
    this.atmosphere.setWeather(weather);
  }

  // ============================================
  // PUBLIC API - PARTICLES
  // ============================================

  emitHitSparks(position: THREE.Vector3, direction: THREE.Vector3, exitVelo: number): void {
    this.particles.onBallHit(position, direction, exitVelo);
  }

  emitSlideDust(position: THREE.Vector3, velocity: THREE.Vector3): void {
    this.particles.onSlide(position, velocity);
  }

  celebrateVictory(position: THREE.Vector3): void {
    this.particles.onVictory(position);
  }

  // ============================================
  // PUBLIC API - QUALITY SETTINGS
  // ============================================

  setQuality(preset: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA'): void {
    this.config = QUALITY_PRESETS[preset];

    // Note: shadowMap doesn't have setSize - shadows are controlled by renderer.setSize and mapSize on individual lights

    // Toggle effects
    if (this.composer) {
      this.composer.passes.forEach(p => {
        p.enabled = this.config.enablePostProcessing;
      });
    }

    if (this.volumetrics) {
      this.volumetrics.setEnabled(this.config.enableVolumetrics);
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  dispose(): void {
    this.stop();

    if (this.composer) {
      this.composer.dispose();
    }

    if (this.volumetrics) {
      this.volumetrics.lightShafts.forEach(shaft => shaft.geometry.dispose());
    }

    this.renderer.dispose();
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export {
  BroadcastAngle,
  TimeOfDay,
  WeatherCondition,
  TRANSITION_PRESETS,
  AAA_DEFAULT_CONFIG,
  QUALITY_PRESETS,
};

export type {
  AAAGraphicsConfig,
  GameMoment,
};

// Re-export types from submodules for convenience
export type { WeatherConfig } from './graphics-atmosphere';
export type { CameraCue } from './graphics-cinematic-camera';
