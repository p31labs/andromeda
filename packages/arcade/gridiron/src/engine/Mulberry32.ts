/**
 * Mulberry32 deterministic PRNG
 * Fast, reliable, seedable random number generator
 */

export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Generate boolean with given probability
  bool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  // Pick random element from array
  pick<T>(array: T[]): T {
    return array[this.rangeInt(0, array.length - 1)];
  }

  // Shuffle array (Fisher-Yates)
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.rangeInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

export function createSeededPrng(seed?: number): Mulberry32 {
  const effectiveSeed = seed ?? Math.floor(Math.random() * 0xFFFFFFFF);
  return new Mulberry32(effectiveSeed);
}
