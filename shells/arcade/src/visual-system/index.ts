/**
 * P31 Arcade Visual System
 * Four-Domain Centaur visual architecture
 */

// Design tokens
export { P31Colors, P31Gradients, P31Shadows, P31Animations, generateCSSVariables } from './design-tokens';

// Shaders
export {
  ShaderManager,
  shaderManager,
  CoOpGlowShader,
  BallTrailShader,
  TurfShader,
  SimplexNoiseShader,
  GlassShader,
  createHDRTripleTarget,
} from './shaders';

// Particles
export { LoveEconomyParticles, default as ParticleSystem } from './particles';

// Components
export { GlassEarningsOverlay } from './components/GlassEarningsOverlay';

// Types
export type { ParticleConfig, CareFlowOptions, FireworkOptions } from './particles';
