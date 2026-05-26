// P31 Unified Package - Main Entry Point
// Cross-game identity, spoon economy, and skill bridges for P31 Arcade

export { UnifiedIdentityManager } from './identity/index.js';
export { GlobalSpoonManager } from './spoons/index.js';
export { SkillBridgeManager, SKILL_BRIDGES } from './bridge/index.js';
export * from './types.js';

// Convenience re-exports for specific domains
export * as Identity from './identity/index.js';
export * as Spoons from './spoons/index.js';
export * as Bridge from './bridge/index.js';
