// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// Difficulty modes: palette and target scoping
//
// Seed   🌱  Willow (age 6) — H, O only
// Sprout 🌿  Bash (age 10)  — H, C, N, O
// Sapling 🌳 Will / advanced — full palette
// ═══════════════════════════════════════════════════════

import type { ElementSymbol } from '../types';

export type DifficultyId = 'seed' | 'sprout' | 'sapling';

export interface GameMode {
  id: DifficultyId;
  label: string;
  emoji: string;
  description: string;
  palette: ElementSymbol[];
  targets: string[]; // Hill system formulas ('*' = all)
}

export const MODES: GameMode[] = [
  {
    id: 'seed',
    label: 'Seed',
    emoji: '\u{1F331}',
    description: 'Water, air, and light',
    palette: ['H', 'O'],
    targets: ['H\u2082', 'O\u2082', 'H\u2082O', 'H\u2082O\u2082'],
  },
  {
    id: 'sprout',
    label: 'Sprout',
    emoji: '\u{1F33F}',
    description: 'Carbon, nitrogen, and beyond',
    palette: ['H', 'C', 'N', 'O'],
    targets: ['H\u2082', 'H\u2082O', 'CO\u2082', 'CH\u2084', 'H\u2083N', 'C\u2082H\u2086', 'C\u2082H\u2084'],
  },
  {
    id: 'sapling',
    label: 'Sapling',
    emoji: '\u{1F333}',
    description: 'The full periodic table',
    palette: ['H', 'C', 'N', 'O', 'P', 'Na', 'Ca', 'Cl', 'S', 'Fe'],
    targets: ['*'],
  },
];

export function getModeById(id: DifficultyId): GameMode {
  return MODES.find((m) => m.id === id)!;
}
