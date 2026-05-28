/**
 * @p31/core — Game configuration catalog
 * Single source of truth for all game metadata
 */
import type { GameConfig, GameId } from './types';

export const GAME_CATALOG: Record<GameId, GameConfig> = {
  smallball: {
    id: 'smallball', name: 'Smallball', category: 'sports',
    maxSessionMinutes: 60, baseRate: 0.1, learningBonus: 1.0,
    coopEnabled: true, spectateEnabled: true,
    description: 'Casual basketball with physics-based gameplay',
    icon: '⚾', color: '#22d3ee', url: 'https://p31-smallball.pages.dev',
  },
  gridiron: {
    id: 'gridiron', name: 'Gridiron', category: 'sports',
    maxSessionMinutes: 60, baseRate: 0.1, learningBonus: 1.0,
    coopEnabled: true, spectateEnabled: true,
    description: 'Tactical football with real-time strategy',
    icon: '🏈', color: '#22c55e', url: 'https://p31-gridiron.pages.dev',
  },
  cards: {
    id: 'cards', name: 'Card Master', category: 'strategy',
    maxSessionMinutes: 45, baseRate: 0.12, learningBonus: 1.0,
    coopEnabled: true, spectateEnabled: true,
    description: 'Strategic card battles with pattern recognition',
    icon: '🃏', color: '#8b5cf6', url: 'https://p31-cards.pages.dev',
  },
  strategy: {
    id: 'strategy', name: 'Strategy Board', category: 'strategy',
    maxSessionMinutes: 45, baseRate: 0.12, learningBonus: 1.0,
    coopEnabled: false, spectateEnabled: true,
    description: 'Classic board game with AI opponents',
    icon: '♟️', color: '#8b5cf6', url: 'https://p31-strategy.pages.dev',
  },
  'liquid-sculptor': {
    id: 'liquid-sculptor', name: 'Liquid Sculptor', category: 'physics',
    maxSessionMinutes: 90, baseRate: 0.15, learningBonus: 1.5,
    coopEnabled: false, spectateEnabled: true,
    description: 'Fluid dynamics playground with creative tools',
    icon: '💧', color: '#22d3ee', url: 'https://p31-liquid-sculptor.pages.dev',
  },
  'resonance-rings': {
    id: 'resonance-rings', name: 'Resonance Rings', category: 'physics',
    maxSessionMinutes: 90, baseRate: 0.15, learningBonus: 1.5,
    coopEnabled: false, spectateEnabled: false,
    description: 'Wave interference and harmonic puzzles',
    icon: '🔮', color: '#f472b6', url: 'https://p31-resonance-rings.pages.dev',
  },
  'magnetic-poetry': {
    id: 'magnetic-poetry', name: 'Magnetic Poetry', category: 'creative',
    maxSessionMinutes: 90, baseRate: 0.15, learningBonus: 1.5,
    coopEnabled: true, spectateEnabled: true,
    description: 'Neon word magnets with magnetic snap physics',
    icon: '📝', color: '#f59e0b', url: 'https://p31-magnetic-poetry.pages.dev',
  },
  'orbital-drift': {
    id: 'orbital-drift', name: 'Orbital Drift', category: 'physics',
    maxSessionMinutes: 90, baseRate: 0.15, learningBonus: 1.5,
    coopEnabled: false, spectateEnabled: false,
    description: 'Gravity simulation and orbital mechanics',
    icon: '🌌', color: '#22d3ee', url: 'https://p31-orbital-drift.pages.dev',
  },
  'geodesic-builder': {
    id: 'geodesic-builder', name: 'Geodesic Builder', category: 'creative',
    maxSessionMinutes: 120, baseRate: 0.15, learningBonus: 2.0,
    coopEnabled: true, spectateEnabled: true,
    description: 'Cooperative 3D construction with Love Economy avatars',
    icon: '🔷', color: '#22c55e', url: 'https://p31ca.org/geodesic',
  },
};

export const WJ_WHITELIST: GameId[] = [
  'smallball', 'gridiron', 'liquid-sculptor', 'magnetic-poetry', 'geodesic-builder',
];

export function getGameConfig(gameId: GameId): GameConfig {
  return GAME_CATALOG[gameId];
}

export function isGameAllowed(gameId: GameId, playerId: string): boolean {
  if (playerId === 'wj' && !WJ_WHITELIST.includes(gameId)) return false;
  return true;
}
