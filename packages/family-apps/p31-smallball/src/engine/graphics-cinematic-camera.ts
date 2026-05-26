// P31 Smallball: Cinematic Camera System
// Broadcast-style camera angles with smooth transitions and dramatic effects
// MLB broadcast inspired: ESPN, FOX, local broadcast aesthetics

import * as THREE from 'three';

// ============================================
// CAMERA ANGLE PRESETS (Broadcast Style)
// ============================================

export enum BroadcastAngle {
  // Primary angles
  CENTER_FIELD = 'center_field',        // Behind CF, classic baseball view
  HOME_PLATE = 'home_plate',            // Behind home, batter's perspective
  FIRST_BASE = 'first_base',            // 1B dugout view
  THIRD_BASE = 'third_base',            // 3B dugout view

  // Dramatic angles
  LOW_FIRST = 'low_first',              // Ground level 1B
  LOW_THIRD = 'low_third',              // Ground level 3B
  CATCHER_CAM = 'catcher_cam',          // Behind the mask
  UMPIRE_SHOULDER = 'umpire_shoulder',  // Over ump's shoulder

  // High angles
  HIGH_HOME = 'high_home',              // High behind home
  HIGH_CENTER = 'high_center',          // High behind CF
  BLIMP = 'blimp',                      // Aerial view

  // Specialty
  DUGOUT = 'dugout',                    // In the dugout
  BULLPEN = 'bullpen',                  // Bullpen view
  FOWL_BALL = 'fowl_ball',              // Following foul balls into stands
  WALK_OFF = 'walk_off',                // Dramatic low angle

  // Dynamic
  BALL_FOLLOW = 'ball_follow',          // Track the ball
  PLAYER_FOLLOW = 'player_follow',      // Track a player
  ORBIT = 'orbit',                      // Rotate around action
}

export interface CameraPreset {
  angle: BroadcastAngle;
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  roll: number;
  description: string;
}

// MLB broadcast-inspired camera positions (scaled for game)
export const BROADCAST_PRESETS: Record<BroadcastAngle, CameraPreset> = {
  [BroadcastAngle.CENTER_FIELD]: {
    angle: BroadcastAngle.CENTER_FIELD,
    position: new THREE.Vector3(0, 30, 150),
    target: new THREE.Vector3(0, 0, 0),
    fov: 50,
    roll: 0,
    description: 'Classic center field broadcast view',
  },
  [BroadcastAngle.HOME_PLATE]: {
    angle: BroadcastAngle.HOME_PLATE,
    position: new THREE.Vector3(0, 20, -60),
    target: new THREE.Vector3(0, 0, 0),
    fov: 45,
    roll: 0,
    description: "Behind home plate, pitcher's perspective",
  },
  [BroadcastAngle.FIRST_BASE]: {
    angle: BroadcastAngle.FIRST_BASE,
    position: new THREE.Vector3(80, 15, 0),
    target: new THREE.Vector3(0, 0, 0),
    fov: 55,
    roll: 0,
    description: 'First base dugout angle',
  },
  [BroadcastAngle.THIRD_BASE]: {
    angle: BroadcastAngle.THIRD_BASE,
    position: new THREE.Vector3(-80, 15, 0),
    target: new THREE.Vector3(0, 0, 0),
    fov: 55,
    roll: 0,
    description: 'Third base dugout angle',
  },
  [BroadcastAngle.LOW_FIRST]: {
    angle: BroadcastAngle.LOW_FIRST,
    position: new THREE.Vector3(40, 2, 20),
    target: new THREE.Vector3(0, 1, 0),
    fov: 60,
    roll: 0,
    description: 'Ground level first base - diving plays',
  },
  [BroadcastAngle.LOW_THIRD]: {
    angle: BroadcastAngle.LOW_THIRD,
    position: new THREE.Vector3(-40, 2, 20),
    target: new THREE.Vector3(0, 1, 0),
    fov: 60,
    roll: 0,
    description: 'Ground level third base - diving plays',
  },
  [BroadcastAngle.CATCHER_CAM]: {
    angle: BroadcastAngle.CATCHER_CAM,
    position: new THREE.Vector3(0, 4, -5),
    target: new THREE.Vector3(0, 3, 18),
    fov: 70,
    roll: 0,
    description: "Behind catcher's mask",
  },
  [BroadcastAngle.UMPIRE_SHOULDER]: {
    angle: BroadcastAngle.UMPIRE_SHOULDER,
    position: new THREE.Vector3(1.5, 5, -3),
    target: new THREE.Vector3(0, 2, 18),
    fov: 65,
    roll: 0,
    description: "Over umpire's shoulder",
  },
  [BroadcastAngle.HIGH_HOME]: {
    angle: BroadcastAngle.HIGH_HOME,
    position: new THREE.Vector3(0, 60, -50),
    target: new THREE.Vector3(0, 0, 0),
    fov: 40,
    roll: 0,
    description: 'High behind home plate',
  },
  [BroadcastAngle.HIGH_CENTER]: {
    angle: BroadcastAngle.HIGH_CENTER,
    position: new THREE.Vector3(0, 80, 80),
    target: new THREE.Vector3(0, 0, 0),
    fov: 35,
    roll: 0,
    description: 'High center field overview',
  },
  [BroadcastAngle.BLIMP]: {
    angle: BroadcastAngle.BLIMP,
    position: new THREE.Vector3(0, 300, 0),
    target: new THREE.Vector3(0, 0, 0),
    fov: 25,
    roll: 0,
    description: 'Aerial blimp view',
  },
  [BroadcastAngle.DUGOUT]: {
    angle: BroadcastAngle.DUGOUT,
    position: new THREE.Vector3(25, 5, -30),
    target: new THREE.Vector3(0, 0, 0),
    fov: 50,
    roll: 0,
    description: 'Inside the dugout',
  },
  [BroadcastAngle.BULLPEN]: {
    angle: BroadcastAngle.BULLPEN,
    position: new THREE.Vector3(120, 8, 80),
    target: new THREE.Vector3(0, 3, 18),
    fov: 45,
    roll: 0,
    description: 'Bullpen perspective',
  },
  [BroadcastAngle.FOWL_BALL]: {
    angle: BroadcastAngle.FOWL_BALL,
    position: new THREE.Vector3(50, 15, -80),
    target: new THREE.Vector3(0, 20, 0),
    fov: 55,
    roll: 0,
    description: 'Following foul balls',
  },
  [BroadcastAngle.WALK_OFF]: {
    angle: BroadcastAngle.WALK_OFF,
    position: new THREE.Vector3(0, 1, 25),
    target: new THREE.Vector3(0, 2, 0),
    fov: 75,
    roll: 0,
    description: 'Dramatic walk-off low angle',
  },
  [BroadcastAngle.BALL_FOLLOW]: {
    angle: BroadcastAngle.BALL_FOLLOW,
    position: new THREE.Vector3(0, 10, 0),
    target: new THREE.Vector3(0, 5, 50),
    fov: 50,
    roll: 0,
    description: 'Dynamic ball tracking',
  },
  [BroadcastAngle.PLAYER_FOLLOW]: {
    angle: BroadcastAngle.PLAYER_FOLLOW,
    position: new THREE.Vector3(30, 10, 30),
    target: new THREE.Vector3(0, 0, 0),
    fov: 50,
    roll: 0,
    description: 'Dynamic player tracking',
  },
  [BroadcastAngle.ORBIT]: {
    angle: BroadcastAngle.ORBIT,
    position: new THREE.Vector3(100, 30, 0),
    target: new THREE.Vector3(0, 0, 0),
    fov: 45,
    roll: 0,
    description: 'Rotating orbit view',
  },
};

// ============================================
// CINEMATIC CAMERA CONTROLLER
// ============================================

export interface CameraTransition {
  duration: number;
  easing: (t: number) => number;
  useDollyZoom: boolean;
}

export const TRANSITION_PRESETS: Record<string, CameraTransition> = {
  CUT: { duration: 0, easing: t => t, useDollyZoom: false },
  SMOOTH: { duration: 1.5, easing: t => t * t * (3 - 2 * t), useDollyZoom: false },
  DRAMATIC: { duration: 2.5, easing: t => 1 - Math.pow(1 - t, 3), useDollyZoom: true },
  SLOW_MO: { duration: 4.0, easing: t => t, useDollyZoom: false },
  SNAP: { duration: 0.3, easing: t => t * t, useDollyZoom: false },
};

export class CinematicCameraController {
  private camera: THREE.PerspectiveCamera;
  private fieldScale: number;

  // Current state
  private currentPosition: THREE.Vector3;
  private currentTarget: THREE.Vector3;
  private currentFOV: number;

  // Transition state
  private isTransitioning: boolean = false;
  private transitionStart: number = 0;
  private transitionFrom: { position: THREE.Vector3; target: THREE.Vector3; fov: number } | null = null;
  private transitionTo: { position: THREE.Vector3; target: THREE.Vector3; fov: number } | null = null;
  private transitionConfig: CameraTransition | null = null;

  // Dynamic tracking
  private trackTarget: THREE.Vector3 | null = null;
  private trackLead: THREE.Vector3 | null = null;
  private trackSpeed: number = 0.1;

  // Shake effect
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.9;

  // Zoom state
  private baseFOV: number = 50;
  private targetFOV: number = 50;

  constructor(camera: THREE.PerspectiveCamera, fieldScale: number = 0.5) {
    this.camera = camera;
    this.fieldScale = fieldScale;

    this.currentPosition = camera.position.clone();
    this.currentTarget = new THREE.Vector3(0, 0, 0);
    this.currentFOV = camera.fov;
    this.baseFOV = camera.fov;
  }

  // Set camera to a specific broadcast angle
  setAngle(angle: BroadcastAngle, transition: keyof typeof TRANSITION_PRESETS = 'SMOOTH'): void {
    const preset = BROADCAST_PRESETS[angle];
    const transitionConfig = TRANSITION_PRESETS[transition];

    // Scale positions
    const targetPos = preset.position.clone().multiplyScalar(this.fieldScale);
    const targetLookAt = preset.target.clone().multiplyScalar(this.fieldScale);
    const targetFOV = preset.fov;

    this.startTransition(targetPos, targetLookAt, targetFOV, transitionConfig);
  }

  // Follow a moving target (ball, player)
  followTarget(
    targetPosition: THREE.Vector3,
    velocity: THREE.Vector3,
    offset: THREE.Vector3 = new THREE.Vector3(10, 10, 10)
  ): void {
    // Calculate lead position based on velocity
    const lead = velocity.clone().multiplyScalar(0.5);
    const targetPos = targetPosition.clone().add(lead);

    // Smoothly interpolate current position toward target
    const desiredPosition = targetPos.clone().add(offset);
    this.currentPosition.lerp(desiredPosition, this.trackSpeed);

    // Look at target with lead
    const lookTarget = targetPos.clone().add(velocity.clone().multiplyScalar(0.3));

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(lookTarget);

    // Dynamic FOV based on velocity (faster = wider)
    const speed = velocity.length();
    const targetFOV = this.baseFOV + speed * 0.5;
    this.targetFOV = THREE.MathUtils.lerp(this.targetFOV, targetFOV, 0.1);
    this.camera.fov = this.targetFOV;
    this.camera.updateProjectionMatrix();
  }

  // Dramatic zoom effect (dolly zoom / Vertigo effect)
  dollyZoom(targetDistance: number, targetFOV: number, duration: number = 2.0): void {
    const startFOV = this.camera.fov;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic

      // Interpolate FOV
      this.camera.fov = THREE.MathUtils.lerp(startFOV, targetFOV, eased);
      this.camera.updateProjectionMatrix();

      // Adjust distance to maintain subject size
      // (Simplified - full implementation would track subject)
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // Camera shake for impact moments
  shake(intensity: number, decay: number = 0.9): void {
    this.shakeIntensity = intensity;
    this.shakeDecay = decay;
  }

  // Slow motion zoom
  slowMotionZoom(factor: number = 2): void {
    this.targetFOV = this.baseFOV / factor;
  }

  // Reset from slow motion
  resetZoom(duration: number = 1.0): void {
    const startFOV = this.camera.fov;
    const targetFOV = this.baseFOV;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const t = Math.min(1, elapsed / duration);

      this.camera.fov = THREE.MathUtils.lerp(startFOV, targetFOV, t);
      this.camera.updateProjectionMatrix();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // Start a camera transition
  private startTransition(
    targetPos: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    targetFOV: number,
    config: CameraTransition
  ): void {
    this.transitionFrom = {
      position: this.currentPosition.clone(),
      target: this.currentTarget.clone(),
      fov: this.camera.fov,
    };

    this.transitionTo = {
      position: targetPos,
      target: targetLookAt,
      fov: targetFOV,
    };

    this.transitionConfig = config;
    this.isTransitioning = true;
    this.transitionStart = Date.now();
  }

  // Update camera (call every frame)
  update(): void {
    if (this.isTransitioning && this.transitionFrom && this.transitionTo && this.transitionConfig) {
      const elapsed = (Date.now() - this.transitionStart) / 1000;
      const t = Math.min(1, elapsed / this.transitionConfig.duration);
      const eased = this.transitionConfig.easing(t);

      // Interpolate position
      this.currentPosition.lerpVectors(this.transitionFrom.position, this.transitionTo.position, eased);
      this.currentTarget.lerpVectors(this.transitionFrom.target, this.transitionTo.target, eased);

      // Interpolate FOV
      this.camera.fov = THREE.MathUtils.lerp(this.transitionFrom.fov, this.transitionTo.fov, eased);

      if (t >= 1) {
        this.isTransitioning = false;
        this.transitionFrom = null;
        this.transitionTo = null;
        this.transitionConfig = null;
      }
    }

    // Apply shake
    let finalPosition = this.currentPosition.clone();
    if (this.shakeIntensity > 0.01) {
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity
      );
      finalPosition.add(shakeOffset);
      this.shakeIntensity *= this.shakeDecay;
    }

    // Apply to camera
    this.camera.position.copy(finalPosition);
    this.camera.lookAt(this.currentTarget);
    this.camera.updateProjectionMatrix();
  }

  // Get current broadcast angle name
  getCurrentAngle(): string {
    // Find closest matching preset
    let closestAngle = BroadcastAngle.CENTER_FIELD;
    let minDistance = Infinity;

    for (const [angle, preset] of Object.entries(BROADCAST_PRESETS)) {
      const presetPos = preset.position.clone().multiplyScalar(this.fieldScale);
      const dist = this.currentPosition.distanceTo(presetPos);
      if (dist < minDistance) {
        minDistance = dist;
        closestAngle = angle as BroadcastAngle;
      }
    }

    return closestAngle;
  }
}

// ============================================
// CAMERA DIRECTOR (Automated broadcast switching)
// ============================================

export type GameMoment =
  | 'PRE_PITCH'
  | 'PITCH'
  | 'SWING'
  | 'CONTACT'
  | 'BALL_IN_AIR'
  | 'CATCH'
  | 'HIT_GROUND'
  | 'RUN'
  | 'CELEBRATION'
  | 'REPLAY';

export interface CameraCue {
  moment: GameMoment;
  angle: BroadcastAngle;
  transition: keyof typeof TRANSITION_PRESETS;
  duration?: number;
  shake?: number;
  dollyZoom?: { distance: number; fov: number };
}

export class CameraDirector {
  private controller: CinematicCameraController;
  private cues: CameraCue[] = [];
  private currentCueIndex: number = 0;
  private isPlaying: boolean = false;

  // Auto-switching for live gameplay
  private autoMode: boolean = true;
  private lastMoment: GameMoment | null = null;
  private momentTimer: number = 0;

  constructor(controller: CinematicCameraController) {
    this.controller = controller;
    this.setupDefaultCues();
  }

  private setupDefaultCues(): void {
    // Default broadcast sequence
    this.cues = [
      { moment: 'PRE_PITCH', angle: BroadcastAngle.CENTER_FIELD, transition: 'SMOOTH' },
      { moment: 'PITCH', angle: BroadcastAngle.CATCHER_CAM, transition: 'SNAP' },
      { moment: 'SWING', angle: BroadcastAngle.HOME_PLATE, transition: 'SNAP' },
      { moment: 'CONTACT', angle: BroadcastAngle.LOW_FIRST, transition: 'SNAP', shake: 0.5 },
      { moment: 'BALL_IN_AIR', angle: BroadcastAngle.BALL_FOLLOW, transition: 'SMOOTH' },
      { moment: 'CATCH', angle: BroadcastAngle.CENTER_FIELD, transition: 'SMOOTH' },
      { moment: 'HIT_GROUND', angle: BroadcastAngle.LOW_FIRST, transition: 'SMOOTH' },
      { moment: 'RUN', angle: BroadcastAngle.FIRST_BASE, transition: 'SMOOTH' },
      { moment: 'CELEBRATION', angle: BroadcastAngle.WALK_OFF, transition: 'DRAMATIC' },
    ];
  }

  // Trigger a game moment
  triggerMoment(moment: GameMoment): void {
    if (!this.autoMode) return;

    const cue = this.cues.find(c => c.moment === moment);
    if (cue) {
      this.executeCue(cue);
    }

    this.lastMoment = moment;
  }

  private executeCue(cue: CameraCue): void {
    this.controller.setAngle(cue.angle, cue.transition);

    if (cue.shake) {
      this.controller.shake(cue.shake);
    }

    if (cue.dollyZoom) {
      this.controller.dollyZoom(cue.dollyZoom.distance, cue.dollyZoom.fov);
    }
  }

  // Add custom cue
  addCue(cue: CameraCue): void {
    this.cues.push(cue);
  }

  // Set auto mode
  setAutoMode(enabled: boolean): void {
    this.autoMode = enabled;
  }

  // Play a scripted sequence
  playSequence(cues: CameraCue[]): void {
    this.cues = cues;
    this.currentCueIndex = 0;
    this.isPlaying = true;
    this.autoMode = false;

    this.advanceSequence();
  }

  private advanceSequence(): void {
    if (this.currentCueIndex >= this.cues.length) {
      this.isPlaying = false;
      return;
    }

    const cue = this.cues[this.currentCueIndex];
    this.executeCue(cue);

    this.currentCueIndex++;

    // Schedule next cue
    const duration = cue.duration || 3.0;
    setTimeout(() => this.advanceSequence(), duration * 1000);
  }

  // Update (call every frame)
  update(): void {
    this.controller.update();
  }
}

// ============================================
// UTILITY: EASING FUNCTIONS
// ============================================

export const Easing = {
  linear: (t: number): number => t,
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};
