/**
 * Magnetic Poetry Types
 * P31 Arcade - Game 3: Semantic Vector Physics
 */

import type { SpoonState, Word, WordBall, Poem } from '@p31/physics';

export type { SpoonState, Word, WordBall, Poem };

export type GameMode = 'sandbox' | 'haiku' | 'epic';
export type WordCategory = 'nature' | 'emotion' | 'abstract' | 'action' | 'descriptor';

export interface GameState {
  spoonState: SpoonState;
  mode: GameMode;
  wordBalls: WordBall[];
  availableWords: Word[];
  selectedWordId: string | null;
  poem: Poem | null;
  targetStructure?: 'haiku' | 'epic';
  audioEnabled: boolean;
  hapticEnabled: boolean;
}

export interface WordPaletteConfig {
  maxWords: number;
  magneticRange: number;
  similarityThreshold: number;
  structureHelp: boolean;
}

export const SPOON_CONFIGS: Record<SpoonState, WordPaletteConfig> = {
  1: {
    maxWords: 6,
    magneticRange: 1.5,
    similarityThreshold: 0.7,
    structureHelp: false,
  },
  3: {
    maxWords: 12,
    magneticRange: 3.0,
    similarityThreshold: 0.6,
    structureHelp: true,
  },
  6: {
    maxWords: 24,
    magneticRange: 5.0,
    similarityThreshold: 0.5,
    structureHelp: true,
  },
};

// Sample word database (in production, load from JSON)
export const SAMPLE_WORDS: Omit<Word, 'embedding'>[] = [
  { id: 'w1', text: 'moon', category: 'nature', mass: 1, magneticStrength: 0.8, texture: 'smooth', color: '#c0c0c0' },
  { id: 'w2', text: 'river', category: 'nature', mass: 2, magneticStrength: 0.7, texture: 'smooth', color: '#4a90d9' },
  { id: 'w3', text: 'mountain', category: 'nature', mass: 3, magneticStrength: 0.9, texture: 'rough', color: '#8b7355' },
  { id: 'w4', text: 'wind', category: 'nature', mass: 1, magneticStrength: 0.6, texture: 'smooth', color: '#a8d8ea' },
  { id: 'w5', text: 'flower', category: 'nature', mass: 2, magneticStrength: 0.7, texture: 'bumpy', color: '#ff69b4' },
  { id: 'w6', text: 'love', category: 'emotion', mass: 1, magneticStrength: 1.0, texture: 'smooth', color: '#ff1493' },
  { id: 'w7', text: 'sorrow', category: 'emotion', mass: 2, magneticStrength: 0.8, texture: 'rough', color: '#4a4a4a' },
  { id: 'w8', text: 'joy', category: 'emotion', mass: 1, magneticStrength: 0.9, texture: 'smooth', color: '#ffd700' },
  { id: 'w9', text: 'dream', category: 'abstract', mass: 1, magneticStrength: 0.7, texture: 'smooth', color: '#9370db' },
  { id: 'w10', text: 'time', category: 'abstract', mass: 1, magneticStrength: 0.8, texture: 'smooth', color: '#708090' },
  { id: 'w11', text: 'silence', category: 'abstract', mass: 2, magneticStrength: 0.6, texture: 'smooth', color: '#f5f5f5' },
  { id: 'w12', text: 'run', category: 'action', mass: 1, magneticStrength: 0.5, texture: 'bumpy', color: '#ff6347' },
  { id: 'w13', text: 'fly', category: 'action', mass: 1, magneticStrength: 0.6, texture: 'smooth', color: '#87ceeb' },
  { id: 'w14', text: 'dance', category: 'action', mass: 2, magneticStrength: 0.7, texture: 'smooth', color: '#da70d6' },
  { id: 'w15', text: 'bright', category: 'descriptor', mass: 1, magneticStrength: 0.6, texture: 'smooth', color: '#ffff00' },
  { id: 'w16', text: 'dark', category: 'descriptor', mass: 1, magneticStrength: 0.5, texture: 'rough', color: '#2f4f4f' },
  { id: 'w17', text: 'soft', category: 'descriptor', mass: 1, magneticStrength: 0.5, texture: 'smooth', color: '#ffb6c1' },
  { id: 'w18', text: 'sharp', category: 'descriptor', mass: 1, magneticStrength: 0.6, texture: 'rough', color: '#dc143c' },
];

// Generate simple embeddings (in production, use real word embeddings)
export function generateEmbeddings(words: Omit<Word, 'embedding'>[]): Word[] {
  return words.map(word => {
    // Create deterministic pseudo-embedding based on word properties
    const embedding = new Array(50).fill(0).map((_, i) => {
      const base = word.text.charCodeAt(i % word.text.length) / 256;
      const categoryOffset = ['nature', 'emotion', 'abstract', 'action', 'descriptor'].indexOf(word.category) * 0.1;
      return Math.sin(base * Math.PI * 2 + categoryOffset + i * 0.5) * 0.5 + 0.5;
    });

    return { ...word, embedding };
  });
}

export const WORD_DATABASE = generateEmbeddings(SAMPLE_WORDS);
