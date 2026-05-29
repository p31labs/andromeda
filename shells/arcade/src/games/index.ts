/**
 * P31 Arcade Games Index
 * Phase implementations for visual upgrade
 */

export { SmallballGame, default as Smallball } from './smallball';
export { GridironGame, default as Gridiron } from './gridiron';
export { MagneticPoetryGame } from './magnetic-poetry/MagneticPoetryGame';
export { GeodesicBuilderGame } from './geodesic-builder/GeodesicBuilderGame';

export type { SmallballConfig } from './smallball';
export type { GridironConfig, CameraMode } from './gridiron';
export type { MagneticPoetryConfig, MagnetData, FieldLine } from './magnetic-poetry/MagneticPoetryGame';
export type { GeodesicBuilderConfig, BuiltPiece, CareParticle } from './geodesic-builder/GeodesicBuilderGame';
