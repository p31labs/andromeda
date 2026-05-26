/**
 * P31 Physics Package
 * Shared physics engines for P31 Arcade games
 * @p31/physics v1.0.0
 */

// Types
export * from './types/physics';

// Engines
export { SPHEngine } from './engines/SPHEngine';
export { WaveSolver } from './engines/WaveSolver';
export { NBodyGravity } from './engines/NBodyGravity';
export { WordPhysics } from './engines/WordPhysics';

// XP System
export * from './xp';

// Re-exports for convenience
export { default as SPHEngineDefault } from './engines/SPHEngine';
export { default as WaveSolverDefault } from './engines/WaveSolver';
export { default as NBodyGravityDefault } from './engines/NBodyGravity';
export { default as WordPhysicsDefault } from './engines/WordPhysics';
export { default as CrossGameIdentityDefault } from './xp/CrossGameIdentity';
