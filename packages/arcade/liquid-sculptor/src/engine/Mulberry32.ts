/**
 * Mulberry32 deterministic PRNG
 * Fast, lightweight, seedable - perfect for fluid simulation determinism
 */

export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Get next random value 0-1
   */
  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Range between min and max
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Integer range
   */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Random boolean
   */
  bool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

export function createSeededPrng(seed?: number): Mulberry32 {
  const effectiveSeed = seed ?? Math.floor(Math.random() * 0xFFFFFFFF);
  return new Mulberry32(effectiveSeed);
}
