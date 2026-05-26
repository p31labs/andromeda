/**
 * P31 Physics Shared Types
 * Core type definitions for all P31 Arcade games
 * Schema: p31.physics/1.0.0
 */

export type SpoonState = 1 | 3 | 6;

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

// === SPH Fluid Dynamics (Liquid Sculptor) ===

export interface FluidParticle {
  id: string;
  position: Vector3;
  velocity: Vector3;
  mass: number;
  density: number;
  pressure: number;
  color: { r: number; g: number; b: number; a: number };
}

export interface MagneticAttractor {
  id: string;
  position: Vector3;
  strength: number;
  decayRate: number;
  radius: number;
  createdAt: number;
}

export interface FluidConfig {
  particleCount: number;
  smoothingRadius: number;
  restDensity: number;
  viscosity: number;
  surfaceTension: number;
  gravity: Vector3;
  timeStep: number;
}

// === Wave Physics (Resonance Rings) ===

export type Waveform = 'sine' | 'square' | 'triangle' | 'sawtooth';

export interface WaveEmitter {
  id: string;
  position: Vector2;
  frequency: number;
  amplitude: number;
  phase: number;
  waveform: Waveform;
  isPlaying: boolean;
  color: string;
}

export interface WaveField {
  resolution: number;
  damping: number;
  boundary: 'reflect' | 'absorb' | 'periodic';
  obstacles: Obstacle[];
}

export interface Obstacle {
  id: string;
  position: Vector2;
  radius: number;
  type: 'reflector' | 'absorber' | 'lens';
}

// === Word/Semantic Physics (Magnetic Poetry) ===

export type WordCategory = 'nature' | 'emotion' | 'abstract' | 'action' | 'descriptor';

export interface Word {
  id: string;
  text: string;
  category: WordCategory;
  embedding: number[];
  mass: number;
  magneticStrength: number;
  texture: 'rough' | 'smooth' | 'bumpy';
  color: string;
}

export interface WordBall {
  word: Word;
  position: Vector3;
  velocity: Vector3;
  isFrozen: boolean;
  isSelected: boolean;
  connections: string[];
}

export interface MagneticConnection {
  wordA: string;
  wordB: string;
  strength: number;
  isActive: boolean;
}

// === N-Body Gravity (Orbital Drift) ===

export interface Planet {
  id: string;
  name: string;
  mass: number;
  radius: number;
  position: Vector3;
  velocity: Vector3;
  color: string;
  atmosphere?: {
    density: number;
    dragCoefficient: number;
  };
  rings?: boolean;
  moons?: Planet[];
}

export interface Probe {
  id: string;
  mass: number;
  position: Vector3;
  velocity: Vector3;
  fuel: number;
  thrusterStrength: number;
  thrusterActive?: boolean;
  trail: Vector3[];
  maxTrailLength: number;
}

export type MissionType = 'transfer' | 'slalom' | 'capture' | 'escape' | 'ballet';

export interface Mission {
  id: string;
  type: MissionType;
  name: string;
  description: string;
  planets: Planet[];
  startPoint: Vector3;
  objectives: Objective[];
  constraints: {
    maxFuel: number;
    timeLimit?: number;
    maxThrusts?: number;
  };
  difficulty: 1 | 2 | 3;
}

export interface Poem {
  id: string;
  words: WordBall[];
  structure: 'haiku' | 'free' | 'couplet' | 'epic';
  score: number;
  semanticCoherence: number;
  createdAt: string;
  isPublic: boolean;
}

export interface Objective {
  id: string;
  type: 'reach' | 'orbit' | 'pass' | 'escape';
  targetPosition?: Vector3;
  targetPlanetId?: string;
  tolerance: number;
  completed: boolean;
  completionTime?: number;
}

export interface TrajectoryPrediction {
  points: Array<Vector3 & { t: number }>;
  encounters: Array<{
    planetId: string;
    time: number;
    distance: number;
    type: 'flyby' | 'impact' | 'capture';
  }>;
  fuelRequired: number;
}

// === Cross-Game XP System ===

export interface XPEvent {
  amount: number;
  source: 'liquid-sculptor' | 'resonance-rings' | 'magnetic-poetry' | 'orbital-drift';
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ThereminNote {
  frequency: number;
  startTime: number;
  duration: number;
  emitterId: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  game: string;
  unlockedAt?: string;
}

// === Game State Base ===

export interface BaseGameState {
  spoonState: SpoonState;
  mode: string;
  audioEnabled: boolean;
  isPaused: boolean;
}

// === Spoon Adaptation Config ===

export interface SpoonConfig<T> {
  1: T;
  3: T;
  6: T;
}

export function getSpoonConfig<T>(config: SpoonConfig<T>, spoons: SpoonState): T {
  return config[spoons];
}

// === Physics Constants ===

export const PHYSICS_CONSTANTS = {
  G: 1.0, // Gravitational constant (scaled)
  SPH_SMOOTHING_KERNEL: {
    POLY6: 'poly6',
    SPIKY: 'spiky',
    VISCOSITY: 'viscosity',
  },
  WAVE_SPEED: 0.5,
  MAX_EMITTERS: 16,
  MAX_PARTICLES: 3000,
} as const;

// === Utility Functions ===

export function distance(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distance2D(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
