// P31 Smallball: Live Match Engine
// Real-time simulation with graphics integration
// Deep game mechanics: WPA, clutch, park factors, weather, AI

import * as THREE from 'three';
import { BallTrajectory, BallVisualization, TrajectoryPreview, ExitVelocityDisplay } from './ball-physics';
import { PlayerSprite, SpriteManager, ParticleSystem, HIT_SPARKS, DUST_CLOUD, CATCH_FLASH } from './sprite-system';
import { FieldGeometry, FieldLighting, CameraController, CameraAngle, LODManager } from './graphics-core';
import { DeterministicPRNG } from './prng';

// ============================================
// TYPES
// ============================================

export interface GameSituation {
  inning: number;
  topBottom: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2;
  balls: 0 | 1 | 2 | 3;
  strikes: 0 | 1 | 2;
  runners: { first?: string; second?: string; third?: string }; // player IDs
  homeScore: number;
  awayScore: number;
  pitcherId: string;
  batterId: string;
}

export interface ParkFactors {
  name: string;
  dimensions: {
    left: number;
    leftCenter: number;
    center: number;
    rightCenter: number;
    right: number;
  };
  altitude: number; // feet above sea level
  temperature: number; // average game temp in F
  windSpeed: number; // mph
  windDirection: number; // degrees (0 = blowing to CF)
  surface: 'grass' | 'turf';
  homeRunFactor: number; // 1.0 = neutral, >1 favors hitters
  runFactor: number;
  hitFactor: number;
  doubleFactor: number;
  tripleFactor: number;
  walkFactor: number;
}

export interface WeatherState {
  type: 'CLEAR' | 'CLOUDY' | 'OVERCAST' | 'LIGHT_RAIN' | 'HEAVY_RAIN';
  temperature: number; // Fahrenheit
  windSpeed: number;
  windDirection: number;
  visibility: number; // 1.0 = perfect
  ballCarry: number; // Multiplier on fly ball distance
}

export interface ClutchState {
  isClutchSituation: boolean;
  leverageIndex: number; // 1.0 = average, >2 high leverage
  pressureMultiplier: number; // Applied to clutch attribute
  momentum: number; // -10 to 10, affects confidence
}

export interface PlayerStats {
  contact: number;
  power: number;
  eye: number;
  bunt: number;
  glove: number;
  range: number;
  armStrength: number;
  armAccuracy: number;
  speed: number;
  stamina: number;
  clutch: number;
  baseballIq: number;
}

// ============================================
// STADIUM PRESETS
// ============================================

export const STADIUMS: Record<string, ParkFactors> = {
  SANDLOT: {
    name: 'The Sandlot',
    dimensions: { left: 310, leftCenter: 360, center: 400, rightCenter: 360, right: 310 },
    altitude: 50,
    temperature: 75,
    windSpeed: 5,
    windDirection: 0,
    surface: 'grass',
    homeRunFactor: 1.2,
    runFactor: 1.1,
    hitFactor: 1.05,
    doubleFactor: 1.1,
    tripleFactor: 1.3,
    walkFactor: 0.95,
  },
  WAREHOUSE: {
    name: 'Warehouse District',
    dimensions: { left: 318, leftCenter: 375, center: 410, rightCenter: 373, right: 318 },
    altitude: 35,
    temperature: 72,
    windSpeed: 8,
    windDirection: 45, // To left field
    surface: 'grass',
    homeRunFactor: 1.15,
    runFactor: 1.05,
    hitFactor: 1.0,
    doubleFactor: 1.05,
    tripleFactor: 0.9,
    walkFactor: 1.0,
  },
  MAJOR_DOME: {
    name: 'Major League Dome',
    dimensions: { left: 330, leftCenter: 390, center: 405, rightCenter: 375, right: 325 },
    altitude: 50,
    temperature: 72, // Controlled climate
    windSpeed: 0, // No wind indoors
    windDirection: 0,
    surface: 'turf',
    homeRunFactor: 0.95,
    runFactor: 0.98,
    hitFactor: 1.02,
    doubleFactor: 0.95,
    tripleFactor: 0.85,
    walkFactor: 1.0,
  },
  BAND_BOX: {
    name: 'The Band Box',
    dimensions: { left: 280, leftCenter: 330, center: 360, rightCenter: 330, right: 280 },
    altitude: 500,
    temperature: 80,
    windSpeed: 10,
    windDirection: 180,
    surface: 'grass',
    homeRunFactor: 1.4,
    runFactor: 1.25,
    hitFactor: 1.1,
    doubleFactor: 0.9,
    tripleFactor: 0.8,
    walkFactor: 0.9,
  },
};

// ============================================
// WIN PROBABILITY ADDED (WPA)
// ============================================

export class WPACalculator {
  // Historical win probability lookup table
  // Format: outs_runners_inning_leverage
  private static readonly WPA_TABLE: Record<string, number> = {
    // No outs
    '0_empty_9_0': 0.27, '0_1st_9_0': 0.44, '0_2nd_9_0': 0.63, '0_3rd_9_0': 0.86,
    '0_1st2nd_9_0': 0.63, '0_loaded_9_0': 0.88,
    // One out
    '1_empty_9_0': 0.18, '1_1st_9_0': 0.30, '1_2nd_9_0': 0.45, '1_3rd_9_0': 0.69,
    '1_1st2nd_9_0': 0.45, '1_loaded_9_0': 0.70,
    // Two outs
    '2_empty_9_0': 0.07, '2_1st_9_0': 0.13, '2_2nd_9_0': 0.24, '2_3rd_9_0': 0.41,
    '2_1st2nd_9_0': 0.24, '2_loaded_9_0': 0.43,
  };

  static calculate(gameState: GameSituation): {
    winProbability: number;
    leverageIndex: number;
  } {
    const key = this.buildKey(gameState);
    const baseWP = this.WPA_TABLE[key] ?? 0.5;

    // Adjust for score differential
    const scoreDiff = gameState.topBottom === 'TOP'
      ? gameState.awayScore - gameState.homeScore
      : gameState.homeScore - gameState.awayScore;

    const scoreAdjustment = scoreDiff * 0.05;
    const winProbability = Math.max(0.01, Math.min(0.99, baseWP + scoreAdjustment));

    // Calculate leverage (how much WPA can change)
    const leverageIndex = this.calculateLeverage(gameState);

    return { winProbability, leverageIndex };
  }

  private static buildKey(state: GameSituation): string {
    const outs = state.outs;
    const runners = this.getRunnersString(state.runners);
    const inning = state.inning;
    const diff = Math.abs(state.homeScore - state.awayScore);

    return `${outs}_${runners}_${inning}_${diff}`;
  }

  private static getRunnersString(runners: GameSituation['runners']): string {
    const on = [];
    if (runners.first) on.push('1st');
    if (runners.second) on.push('2nd');
    if (runners.third) on.push('3rd');

    if (on.length === 0) return 'empty';
    if (on.length === 3) return 'loaded';
    return on.join('');
  }

  private static calculateLeverage(state: GameSituation): number {
    // Late and close = high leverage
    const lateInning = state.inning >= 8;
    const closeGame = Math.abs(state.homeScore - state.awayScore) <= 2;
    const runnersOn = Object.keys(state.runners).length > 0;
    const lowOuts = state.outs === 0;

    let leverage = 1.0;

    if (lateInning && closeGame) leverage *= 2.0;
    if (runnersOn) leverage *= 1.5;
    if (lowOuts) leverage *= 1.3;

    return Math.max(0.5, Math.min(5.0, leverage));
  }
}

// ============================================
// LIVE MATCH ENGINE
// ============================================

export class LiveMatchEngine {
  // Scene components
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private field: FieldGeometry;
  private lighting: FieldLighting;
  private cameraController: CameraController;
  private lodManager: LODManager;

  // Game objects
  private spriteManager: SpriteManager;
  private ballViz: BallVisualization;
  private trajectoryPreview: TrajectoryPreview;
  private particles: ParticleSystem[] = [];

  // Game state
  private situation: GameSituation;
  private prng: DeterministicPRNG;
  private park: ParkFactors;
  private weather: WeatherState;
  private isPlaying: boolean = false;
  private simulationSpeed: number = 1.0;

  // Animation frame
  private animationId: number | null = null;
  private lastTime: number = 0;

  // Event callbacks
  public onPlayResult: ((result: PlayResult) => void) | null = null;
  public onCameraChange: ((angle: CameraAngle) => void) | null = null;
  public onWPAChange: ((wpa: { winProbability: number; leverageIndex: number }) => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    seed: number,
    park: ParkFactors = STADIUMS.SANDLOT
  ) {
    // Setup Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Initialize systems
    this.field = new FieldGeometry({ fieldScale: 0.5, shadowMapSize: 2048, maxFPS: 60, lodDistance: [20, 50, 100], enableParticles: true, enableShadows: true, enablePostProcessing: false });
    this.lighting = new FieldLighting();
    this.cameraController = new CameraController(this.camera, 0.5);
    this.lodManager = new LODManager(this.camera);
    this.spriteManager = new SpriteManager(this.scene);

    // Build field
    this.buildField();

    // Initialize ball visualization
    this.ballViz = new BallVisualization(this.scene);
    this.scene.add(this.ballViz);

    this.trajectoryPreview = new TrajectoryPreview();
    this.scene.add(this.trajectoryPreview);

    // Initialize game state
    this.prng = new DeterministicPRNG(seed);
    this.park = park;
    this.weather = this.generateWeather();
    this.situation = this.createInitialSituation();

    // Set initial camera
    this.cameraController.setAngle(CameraAngle.BEHIND_PLATE);

    // Start render loop
    this.startRenderLoop();
  }

  private buildField(): void {
    // Add field mesh
    const fieldMesh = this.field.createField();
    this.scene.add(fieldMesh);

    // Add lighting
    const lights = this.lighting.createDayLighting();
    this.scene.add(lights);

    // Add background (simple gradient sky)
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
      fog: false,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
  }

  private createInitialSituation(): GameSituation {
    return {
      inning: 1,
      topBottom: 'TOP',
      outs: 0,
      balls: 0,
      strikes: 0,
      runners: {},
      homeScore: 0,
      awayScore: 0,
      pitcherId: 'pitcher-1',
      batterId: 'batter-1',
    };
  }

  private generateWeather(): WeatherState {
    return {
      type: 'CLEAR',
      temperature: 75,
      windSpeed: 5,
      windDirection: Math.random() * 360,
      visibility: 1.0,
      ballCarry: 1.0,
    };
  }

  // ============================================
  // SIMULATION CONTROL
  // ============================================

  start(): void {
    this.isPlaying = true;
  }

  pause(): void {
    this.isPlaying = false;
  }

  setSpeed(speed: number): void {
    this.simulationSpeed = speed;
  }

  // ============================================
  // RENDER LOOP
  // ============================================

  private startRenderLoop(): void {
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);

      const deltaTime = (time - this.lastTime) / 1000 * this.simulationSpeed;
      this.lastTime = time;

      if (this.isPlaying) {
        // Update sprites
        this.spriteManager.update(time / 1000);

        // Update particles
        this.particles.forEach(p => p.update(deltaTime));

        // Update LOD
        this.lodManager.update();
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate(0);
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }

  // ============================================
  // CORE SIMULATION
  // ============================================

  async simulateAtBat(batterStats: PlayerStats, pitcherStats: PlayerStats): Promise<PlayResult> {
    this.isPlaying = true;

    // Camera: Behind plate for wind-up
    this.cameraController.setAngle(CameraAngle.BEHIND_PLATE);
    this.onCameraChange?.(CameraAngle.BEHIND_PLATE);

    // Calculate clutch state
    const clutchState = this.calculateClutchState();

    // Modified stats based on clutch
    const effectiveBatter = this.applyClutch(batterStats, clutchState);
    const effectivePitcher = this.applyClutch(pitcherStats, clutchState);

    // Generate pitch
    const pitch = this.generatePitch(effectivePitcher);

    // Wait for pitch delivery animation
    await this.animatePitchDelivery(pitch);

    // Batter decision
    const swingDecision = this.generateSwingDecision(effectiveBatter, pitch);

    if (swingDecision === 'TAKE') {
      return this.resolveCalledPitch(pitch);
    }

    // Swinging - determine contact
    const contact = this.generateContact(effectiveBatter, pitch, clutchState);

    if (!contact.madeContact) {
      // Miss - strike
      return this.resolveStrike(pitch, 'SWINGING');
    }

    // Ball in play!
    const hit = this.generateHit(contact, effectiveBatter, effectivePitcher);

    // Visualize the hit
    await this.visualizeHit(hit);

    // Resolve the play
    const result = await this.resolveBallInPlay(hit);

    return result;
  }

  // ============================================
  // MECHANICS
  // ============================================

  private calculateClutchState(): ClutchState {
    const wpa = WPACalculator.calculate(this.situation);

    const isClutch = wpa.leverageIndex > 1.5;
    const pressureMultiplier = isClutch
      ? 1 + (wpa.leverageIndex - 1) * 0.2
      : 1.0;

    return {
      isClutchSituation: isClutch,
      leverageIndex: wpa.leverageIndex,
      pressureMultiplier,
      momentum: 0, // Would track from previous plays
    };
  }

  private applyClutch(stats: PlayerStats, clutch: ClutchState): PlayerStats {
    const clutchBonus = (stats.clutch - 50) / 50 * clutch.pressureMultiplier;

    return {
      ...stats,
      contact: Math.max(1, Math.min(99, stats.contact + clutchBonus * 10)),
      power: Math.max(1, Math.min(99, stats.power + clutchBonus * 10)),
      eye: Math.max(1, Math.min(99, stats.eye + clutchBonus * 5)),
      bunt: stats.bunt,
      glove: stats.glove,
      range: stats.range,
      armStrength: stats.armStrength,
      armAccuracy: stats.armAccuracy,
      speed: stats.speed,
      stamina: stats.stamina,
      clutch: stats.clutch,
      baseballIq: stats.baseballIq,
    };
  }

  private generatePitch(pitcherStats: PlayerStats): {
    type: 'FASTBALL' | 'CURVEBALL' | 'SLIDER' | 'CHANGEUP';
    velocity: number;
    location: THREE.Vector3;
  } {
    const types = ['FASTBALL', 'CURVEBALL', 'SLIDER', 'CHANGEUP'] as const;
    const type = types[Math.floor(this.prng.next() * types.length)];

    let baseVelocity = 88 + (pitcherStats.armStrength / 100) * 15;

    switch (type) {
      case 'FASTBALL': baseVelocity += this.prng.nextFloat(-1, 3); break;
      case 'CURVEBALL': baseVelocity -= 12 + this.prng.nextFloat(-2, 2); break;
      case 'SLIDER': baseVelocity -= 5 + this.prng.nextFloat(-2, 2); break;
      case 'CHANGEUP': baseVelocity -= 8 + this.prng.nextFloat(-2, 2); break;
    }

    // Control affects location precision
    const control = pitcherStats.armAccuracy / 100;
    const variance = 1 - control;

    const location = new THREE.Vector3(
      this.prng.nextFloat(-0.3, 0.3) + this.prng.nextFloat(-variance, variance),
      this.prng.nextFloat(-0.3, 0.3) + this.prng.nextFloat(-variance, variance),
      0
    );

    return { type, velocity: Math.round(baseVelocity * 10) / 10, location };
  }

  private generateSwingDecision(batterStats: PlayerStats, pitch: any): 'TAKE' | 'SWING' {
    const distanceFromCenter = pitch.location.length();

    let swingProb = 0.45;
    swingProb += (50 - batterStats.eye) / 100 * 0.15;

    if (distanceFromCenter < 0.5) swingProb += 0.25;
    else if (distanceFromCenter < 0.8) swingProb += 0.05;
    else swingProb -= 0.15;

    return this.prng.nextBool(swingProb) ? 'SWING' : 'TAKE';
  }

  private generateContact(
    batterStats: PlayerStats,
    pitch: any,
    clutch: ClutchState
  ): { madeContact: boolean; quality: number; timing: number } {
    const timing = this.prng.nextFloat(-100, 100);
    const contactThreshold = 50 + (batterStats.contact / 100) * 25;

    const madeContact = Math.abs(timing) < contactThreshold;
    const quality = madeContact
      ? 100 - Math.abs(timing) + (batterStats.power / 100) * 20
      : 0;

    return { madeContact, quality, timing };
  }

  private generateHit(
    contact: any,
    batterStats: PlayerStats,
    pitcherStats: PlayerStats
  ): HitData {
    const powerFactor = batterStats.power / 100;
    const pitchBonus = 0; // Simplified

    const exitVelo = 70 + powerFactor * 40 + pitchBonus + this.prng.nextFloat(-5, 5);

    let launchAngle = this.prng.nextFloat(-10, 45);
    if (contact.timing > 0) launchAngle += this.prng.nextFloat(0, 15);
    else launchAngle -= this.prng.nextFloat(0, 10);

    // Calculate spray angle (pull/opposite)
    const pullTendency = (batterStats.contact - 50) / 50; // Higher contact = more pull
    const sprayAngle = pullTendency * 30 + this.prng.nextFloat(-15, 15);

    // Apply park factors
    const adjustedExitVelo = exitVelo * this.weather.ballCarry;
    const adjustedAngle = launchAngle + (this.park.altitude / 1000) * 2;

    return {
      exitVelocity: Math.round(adjustedExitVelo * 10) / 10,
      launchAngle: Math.round(adjustedAngle * 10) / 10,
      sprayAngle,
      spin: new THREE.Vector3(0, 0, 2000), // Simplified backspin
      contactQuality: contact.quality,
    };
  }

  // ============================================
  // VISUALIZATION
  // ============================================

  private async animatePitchDelivery(pitch: any): Promise<void> {
    // Show pitcher's windup
    this.cameraController.setAngle(CameraAngle.BEHIND_PLATE);

    return new Promise(resolve => setTimeout(resolve, 500 / this.simulationSpeed));
  }

  private async visualizeHit(hit: HitData): Promise<void> {
    // Convert to launch parameters
    const velocityFps = hit.exitVelocity * 1.467; // mph to ft/s
    const launchRad = hit.launchAngle * Math.PI / 180;
    const sprayRad = hit.sprayAngle * Math.PI / 180;

    const velocity = new THREE.Vector3(
      Math.sin(sprayRad) * Math.cos(launchRad) * velocityFps,
      Math.sin(launchRad) * velocityFps,
      Math.cos(sprayRad) * Math.cos(launchRad) * velocityFps
    );

    // Create trajectory
    const trajectory = new BallTrajectory({
      position: new THREE.Vector3(0, 3, 0),
      velocity,
      spin: hit.spin,
      exitVelocity: hit.exitVelocity,
      launchAngle: hit.launchAngle,
      sprayAngle: hit.sprayAngle,
    });

    // Show trajectory preview briefly
    this.trajectoryPreview.setFromTrajectory(trajectory);
    this.trajectoryPreview.setVisibility(true);

    // Camera follows the ball
    this.cameraController.setAngle(CameraAngle.ORBIT);

    // Animate ball flight
    let time = 0;
    const maxTime = 5;

    return new Promise(resolve => {
      const animateBall = () => {
        time += 0.016 * this.simulationSpeed;

        this.ballViz.updateFromTrajectory(trajectory, time);
        this.cameraController.followBall(this.ballViz.position, velocity);

        // Exit velocity display
        if (time < 0.5) {
          const display = new ExitVelocityDisplay(hit.exitVelocity);
          display.position.copy(this.ballViz.position).add(new THREE.Vector3(0, 2, 0));
          this.scene.add(display);
          setTimeout(() => this.scene.remove(display), 3000);
        }

        // Check for landing
        if (time >= maxTime || trajectory.getLandingPoint()?.time <= time) {
          // Hit particles
          this.spawnHitParticles(this.ballViz.position);

          // Home run check
          const distance = trajectory.getDistance();
          if (this.isHomeRun(distance, hit.sprayAngle)) {
            this.ballViz.playHomeRunEffect();
          }

          resolve();
        } else {
          requestAnimationFrame(animateBall);
        }
      };

      animateBall();
    });
  }

  private spawnHitParticles(position: THREE.Vector3): void {
    const particles = new ParticleSystem(50, HIT_SPARKS, 1);
    particles.emit(position, new THREE.Vector3(0, 1, 0), 2, 10);
    this.scene.add(particles);
    this.particles.push(particles);

    // Dust cloud if ground ball
    if (position.y < 2) {
      const dust = new ParticleSystem(30, DUST_CLOUD, 2);
      dust.emit(position, new THREE.Vector3(0, 0.3, 0), 3, 5);
      this.scene.add(dust);
      this.particles.push(dust);
    }
  }

  private isHomeRun(distance: number, sprayAngle: number): boolean {
    // Check fence distance at spray angle
    const absAngle = Math.abs(sprayAngle);
    let fenceDist: number;

    if (absAngle < 15) fenceDist = this.park.dimensions.center;
    else if (absAngle < 30) fenceDist = (this.park.dimensions.center + this.park.dimensions.leftCenter) / 2;
    else if (absAngle < 45) fenceDist = this.park.dimensions.leftCenter;
    else fenceDist = this.park.dimensions.left;

    return distance > fenceDist;
  }

  // ============================================
  // RESULT RESOLUTION
  // ============================================

  private resolveCalledPitch(pitch: any): PlayResult {
    const isStrike = pitch.location.length() < 0.55;

    if (isStrike) {
      this.situation.strikes = Math.min(2, this.situation.strikes + 1) as 0 | 1 | 2;
      return { type: 'STRIKE', description: 'Called strike' };
    } else {
      this.situation.balls = Math.min(3, this.situation.balls + 1) as 0 | 1 | 2 | 3;
      return { type: 'BALL', description: 'Ball' };
    }
  }

  private resolveStrike(pitch: any, type: 'CALLED' | 'SWINGING'): PlayResult {
    this.situation.strikes = Math.min(2, this.situation.strikes + 1) as 0 | 1 | 2;

    if (this.situation.strikes === 2) {
      this.situation.outs = Math.min(2, this.situation.outs + 1) as 0 | 1 | 2;
      this.resetCount();
      return { type: 'STRIKEOUT', description: `${type} strike three!` };
    }

    return { type: 'STRIKE', description: `${type} strike` };
  }

  private async resolveBallInPlay(hit: HitData): Promise<PlayResult> {
    const distance = hit.exitVelocity; // Simplified - would use full physics

    // Determine result based on hit characteristics
    let result: PlayResult;

    if (this.isHomeRun(distance, hit.sprayAngle)) {
      result = { type: 'HOME_RUN', description: 'Home run!' };
      this.scoreRun();
    } else if (hit.launchAngle > 25 && distance > 250) {
      result = { type: 'FLY_OUT', description: 'Fly out' };
      this.situation.outs = Math.min(2, this.situation.outs + 1) as 0 | 1 | 2;
    } else if (hit.exitVelocity > 95 && hit.launchAngle < 10) {
      result = { type: 'LINE_DRIVE', description: 'Line drive single' };
      this.advanceRunners(1);
    } else {
      result = { type: 'GROUND_BALL', description: 'Ground ball out' };
      this.situation.outs = Math.min(2, this.situation.outs + 1) as 0 | 1 | 2;
    }

    this.resetCount();

    // Update WPA
    const wpa = WPACalculator.calculate(this.situation);
    this.onWPAChange?.(wpa);

    return result;
  }

  private scoreRun(): void {
    if (this.situation.topBottom === 'TOP') {
      this.situation.awayScore++;
    } else {
      this.situation.homeScore++;
    }
  }

  private advanceRunners(bases: number): void {
    // Simplified - would handle force plays, etc.
    if (bases >= 1) this.situation.runners.first = this.situation.batterId;
  }

  private resetCount(): void {
    this.situation.balls = 0;
    this.situation.strikes = 0;
  }
}

// ============================================
// TYPES
// ============================================

interface HitData {
  exitVelocity: number;
  launchAngle: number;
  sprayAngle: number;
  spin: THREE.Vector3;
  contactQuality: number;
}

interface PlayResult {
  type: string;
  description: string;
}
