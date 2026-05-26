// P31 Smallball Engine Exports
// Deterministic simulation and game mechanics
// 10000% - Full graphics + deep mechanics

// ============================================
// PRNG & Types
// ============================================

export { DeterministicPRNG, createPRNG, TEST_SEEDS, generateTestSequence } from './prng';
export type { VectorClockEntry } from '../types';

// ============================================
// MARKOV CHAIN SYSTEM
// ============================================

export {
  calculateTransitionMatrix,
  generatePitch,
  determineSwingDecision,
  resolveBallInPlay,
  simulatePlateAppearance,
  simulateMatch,
  VALID_COUNTS,
} from './markov';

export type {
  BIPResult,
  TransitionProbabilities,
  MatchResult,
  InningResult,
} from './markov';

// ============================================
// 12-ATTRIBUTE TRAINING SYSTEM
// ============================================

export {
  // Constants
  MAX_ATTRIBUTE_VALUE,
  MIN_ATTRIBUTE_VALUE,
  DEFAULT_MAX_ENERGY,
  ENERGY_REGEN_CAP,
  MANUAL_TRAINING_BONUS,
  XP_PER_LEVEL,
  // Energy management
  calculateCurrentEnergy,
  canAffordTraining,
  spendEnergy,
  // XP & training
  calculateTrainingXp,
  calculateAttributeDelta,
  applyAttributeCap,
  executeTraining,
  executeOfflineTraining,
  // Stat decay
  calculateStatDecay,
  // Spoon Theory
  getSpoonAdaptation,
  // Validation
  validateTrainingRequest,
} from './training';

export type {
  SpoonAdaptation,
  ValidationError,
  ExecuteTrainingParams,
} from './training';

// ============================================
// FACILITY SYSTEM
// ============================================

export {
  // Facility state
  createInitialFacilities,
  upgradeFacilityLevel,
  upgradePackTier,
  // Progression
  getNextPackTier,
  canAffordPackUpgrade,
  getFacilityStats,
  comparePacks,
  calculateProgressToNextPack,
  getFacilityUpgradeCost,
  canUpgradeFacility,
  getFacilityRecommendations,
} from './facilities';

export type {
  FacilityState,
  FacilityStats,
  Priority,
  FacilityRecommendation,
  PackComparison,
} from './facilities';

// ============================================
// GRAPHICS ENGINE (10000%)
// ============================================

export {
  // Core graphics
  DEFAULT_GRAPHICS_CONFIG,
  FIELD_DIMENSIONS,
  createRenderer,
} from './graphics-core';

export type {
  GraphicsConfig,
  FieldGeometry,
  FieldLighting,
  CameraController,
  CameraAngle,
  LODManager,
} from './graphics-core';

export {
  // Sprite system
  SpriteSheetGenerator,
  SpriteManager,
  HIT_SPARKS,
  DUST_CLOUD,
  CATCH_FLASH,
} from './sprite-system';

export {
  PLAYER_ANIMATIONS,
} from './sprite-system';

export type {
  PlayerAnimation,
  Direction,
  SpriteFrame,
  SpriteSheet,
  BillboardMaterial,
  PlayerSprite,
  ParticleSystem,
} from './sprite-system';

export {
  // Ball physics
  PHYSICS,
} from './ball-physics';

export type {
  LaunchParameters,
  TrajectoryPoint,
  BallTrajectory,
  BallVisualization,
  TrajectoryPreview,
  VelocityVisualizer,
  ExitVelocityDisplay,
} from './ball-physics';

export {
  // Live match engine
  LiveMatchEngine,
  STADIUMS,
} from './live-match';

export type {
  GameSituation,
  ParkFactors,
  WeatherState,
  ClutchState,
  PlayerStats,
  WPACalculator,
} from './live-match';

export {
  // Training visuals
  createTrainingEnvironment,
  createBattingCageEnvironment,
  createTrackEnvironment,
  createBullpenEnvironment,
  createFieldingEnvironment,
  createFilmRoomEnvironment,
} from './training-visuals';

export type {
  TrainingFacilityTier,
  FacilityEnvironment,
} from './training-visuals';

export {
  // Audio system
  DEFAULT_AUDIO_CONFIG,
  SOUND_BANK,
  AudioManager,
  getAudioManager,
  initAudio,
} from './audio-system';

export type {
  AudioConfig,
} from './audio-system';

// ============================================
// ANALYTICS ENGINE
// ============================================

export {
  calculateEMA,
  predictNextValues,
} from './analytics-engine';

export type {
  TimeSeriesPoint,
  PlayerHeatmap,
  TrendPrediction,
  FranchiseAnalytics,
} from './analytics-engine';

// ============================================
// AAA GRAPHICS ENGINE (Cinema Quality)
// ============================================

export {
  // Main engine
  AAAGraphicsEngine,
  // Configuration
  AAA_DEFAULT_CONFIG,
  QUALITY_PRESETS,
  // Enums
  BroadcastAngle,
  TimeOfDay,
  WeatherCondition,
  TRANSITION_PRESETS,
} from './graphics-aaa-integration';

export type {
  AAAGraphicsConfig,
  GameMoment,
  WeatherConfig,
  CameraCue,
} from './graphics-aaa-integration';

// AAA Core components (advanced use)
export {
  PBRMaterialFactory,
  StadiumArchitecture,
  createAAARenderer,
} from './graphics-aaa-core';

export type {
  AtmosphereConfig,
} from './graphics-atmosphere';

// Post-processing (advanced use)
export {
  EffectComposer,
  BloomPass,
  DepthOfFieldPass,
  ColorGradingPass,
} from './graphics-post-processing';

// Cinematic camera (advanced use)
export {
  CinematicCameraController,
  CameraDirector,
  BROADCAST_PRESETS,
  Easing,
} from './graphics-cinematic-camera';

export type {
  CameraTransition,
  CameraPreset,
} from './graphics-cinematic-camera';

// Particles (advanced use)
export {
  ParticleManager,
  HitSparkSystem,
  DustCloudSystem,
  FireworksSystem,
  WeatherSystem,
} from './graphics-particles-aaa';

// Atmosphere (advanced use)
export {
  AtmosphereManager,
  DEFAULT_WEATHER,
  TIME_CONFIGS,
} from './graphics-atmosphere';

// Volumetrics (advanced use)
export {
  VolumetricManager,
  VolumetricLightShaft,
  LensFlareSystem,
} from './graphics-volumetrics';
