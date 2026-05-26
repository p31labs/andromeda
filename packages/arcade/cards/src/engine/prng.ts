// Deterministic Pseudo-Random Number Generator
// Cross-platform seed consistency for cheat prevention

import seedrandom from 'seedrandom';

// Seeded PRNG instance
export class DeterministicPRNG {
  private rng: any;
  private sequence: number[] = [];
  private index = 0;

  constructor(seed: number | string) {
    // Use Alea algorithm for cross-platform consistency
    this.rng = (seedrandom as any)(seed.toString(), { algorithm: 'alea' });
  }

  // Generate next random number [0, 1)
  next(): number {
    const value = this.rng();
    this.sequence.push(value);
    this.index++;
    return value;
  }

  // Generate integer in range [min, max)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  // Generate float in range [min, max)
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // Generate boolean with given probability
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  // Pick random element from array
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length)];
  }

  // Shuffle array using Fisher-Yates
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Get sequence for replay/validation
  getSequence(): readonly number[] {
    return [...this.sequence];
  }

  // Get current index in sequence
  getIndex(): number {
    return this.index;
  }

  // Reset to beginning (for validation replay)
  reset(): void {
    // Note: seedrandom doesn't support true reset, so we recreate
    const seed = (this.rng as any).seed || 'default';
    this.rng = (seedrandom as any)(seed, { algorithm: 'alea' });
    this.sequence = [];
    this.index = 0;
  }

  // Export state for serialization
  exportState(): { seed: string; index: number; sequence: number[] } {
    return {
      seed: (this.rng as any).seed || 'default',
      index: this.index,
      sequence: [...this.sequence]
    };
  }
}

// Factory function for convenience
export function createPRNG(seed: number | string): DeterministicPRNG {
  return new DeterministicPRNG(seed);
}

// Predefined test seeds for validation
export const TEST_SEEDS = [
  1526690334,  // Original TDD example
  123456789,
  987654321,
  0,
  1,
  999999999,
  314159265,   // Pi-ish
  271828182,   // e-ish
];

// Generate sequence for cross-platform comparison
export function generateTestSequence(seed: number | string, count: number = 100): number[] {
  const prng = createPRNG(seed);
  return Array.from({ length: count }, () => prng.next());
}

// Hash a sequence for validation (matches Cloudflare Worker implementation)
export async function hashSequence(sequence: number[]): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(sequence.join(','));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate that two sequences match (within floating point tolerance)
export function validateSequencesMatch(
  seq1: number[],
  seq2: number[],
  tolerance: number = 1e-15
): { valid: boolean; mismatches: number[] } {
  const mismatches: number[] = [];
  
  if (seq1.length !== seq2.length) {
    return { valid: false, mismatches: [-1] };
  }

  for (let i = 0; i < seq1.length; i++) {
    if (Math.abs(seq1[i] - seq2[i]) > tolerance) {
      mismatches.push(i);
    }
  }

  return { valid: mismatches.length === 0, mismatches };
}

// Markov state transition using PRNG
export function markovTransition<T>(
  currentState: T,
  transitionMatrix: Map<T, Array<{ state: T; probability: number }>>,
  prng: DeterministicPRNG
): T {
  const transitions = transitionMatrix.get(currentState);
  if (!transitions || transitions.length === 0) {
    return currentState;
  }

  const roll = prng.next();
  let cumulative = 0;

  for (const transition of transitions) {
    cumulative += transition.probability;
    if (roll < cumulative) {
      return transition.state;
    }
  }

  // Fallback to last state if rounding errors
  return transitions[transitions.length - 1].state;
}
