/**
 * @p31/core — Spoon Theory State Management
 * Nanostores-based reactive energy level
 */

import type { SpoonLevel } from '../types';

let currentLevel: SpoonLevel = 3;
const listeners = new Set<(level: SpoonLevel) => void>();

export function getSpoonLevel(): SpoonLevel {
  return currentLevel;
}

export function setSpoonLevel(level: SpoonLevel): void {
  currentLevel = level;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('p31-spoon-level', String(level));
  }
  listeners.forEach((fn) => fn(level));
}

export function subscribeToSpoon(fn: (level: SpoonLevel) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initializeSpoonStore(): SpoonLevel {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('p31-spoon-level');
    if (saved) {
      const level = parseInt(saved, 10) as SpoonLevel;
      if ([1, 3, 6].includes(level)) {
        currentLevel = level;
      }
    }
  }
  return currentLevel;
}

export const spoonDescriptions: Record<SpoonLevel, { label: string; color: string; icon: string }> = {
  1: { label: 'Low Energy', color: '#22d3ee', icon: '🟢' },
  3: { label: 'Standard', color: '#fbbf24', icon: '🟡' },
  6: { label: 'High Energy', color: '#f472b6', icon: '🩷' },
};

export const spoonHelpers = {
  getButtonSize(level: SpoonLevel): string {
    switch (level) { case 1: return 'text-xl py-4 px-8 min-h-[64px]'; case 3: return 'text-base py-3 px-6'; case 6: return 'text-sm py-2 px-4'; }
  },
  getFontSize(level: SpoonLevel): string {
    switch (level) { case 1: return 'text-xl'; case 3: return 'text-base'; case 6: return 'text-sm'; }
  },
  getCardPadding(level: SpoonLevel): string {
    switch (level) { case 1: return 'p-8'; case 3: return 'p-6'; case 6: return 'p-4'; }
  },
  getAnimationsEnabled(level: SpoonLevel): boolean { return level >= 3; },
  getShowStats(level: SpoonLevel): boolean { return level >= 3; },
  getShowHealth(level: SpoonLevel): boolean { return level === 6; },
};
