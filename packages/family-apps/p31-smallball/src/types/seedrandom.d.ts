declare module 'seedrandom' {
  interface SeedRandom {
    (seed?: string, options?: { algorithm?: string }): () => number;
    alea: (seed: string) => () => number;
    xor128: (seed: string) => () => number;
    tychei: (seed: string) => () => number;
    xorwow: (seed: string) => () => number;
    xor4096: (seed: string) => () => number;
    xorshift7: (seed: string) => () => number;
    quick: (seed: string) => () => number;
  }
  const seedrandom: SeedRandom;
  export default seedrandom;
}