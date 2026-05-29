/**
 * Quantum-Inspired Chemistry Engine for P31 Labs Arcade Hub
 * 
 * Implements quantum superposition for molecular state generation,
 * entanglement-based multiplayer effects, and Larmor-frequency modulation.
 * 
 * Ca₉(PO₄)₆ — The calcium cage protects at all angles.
 * 863 Hz — The heartbeat of phosphorus in Earth's magnetic field.
 */

export const LARMOR_FREQUENCY = 863; // Hz

export interface QuantumState {
  amplitudes: Map<string, number>;
  phase: number;
  collapsed: boolean;
  timestamp: number;
}

export interface EntangledPair {
  playerA: string;
  playerB: string;
  sharedState: QuantumState;
  bellState: 'phi-plus' | 'phi-minus' | 'psi-plus' | 'psi-minus';
}

export class QuantumChemistry {
  private static readonly ELEMENTS = [
    'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
    'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar',
    'Ba', 'Wi' // Special elements (Bashium, Willium)
  ];

/**
    * Generate quantum probability distribution for elements
    * Modulated by Larmor frequency phase
    */
  getElementProbabilities(atomsCount: number, larmorTime?: number): Map<string, number> {
    const time = larmorTime ?? Date.now() / 1000;
    const phase = (time * LARMOR_FREQUENCY) % (2 * Math.PI);
    const amplitudes = new Map<string, number>();

    for (let i = 0; i < QuantumChemistry.ELEMENTS.length; i++) {
      const element = QuantumChemistry.ELEMENTS[i];
      // Wave function: probability amplitude modulated by Larmor phase and atom count
      // ψ(x) = e^(i(kx - ωt)) where ω = 863 Hz
      // k (wave number) is based on current molecule size, creating different patterns
      const k = atomsCount * 0.5; // Increased wave number impact
      const elementPhase = phase + (i * 0.3) + k; // Each element has unique phase offset
      const amplitude = Math.cos(elementPhase) * Math.sin(elementPhase);
      const probability = Math.abs(amplitude) ** 2;
      amplitudes.set(element, Math.max(0.001, probability)); // Minimum probability floor
    }

    return this.normalize(amplitudes);
  }

  /**
   * Create entangled pair between two players
   * Bell state determines correlation type
   */
  static createEntangledPair(
    playerA: string, 
    playerB: string, 
    initialState: QuantumState
  ): EntangledPair {
    // Randomly select Bell state
    const bellStates: EntangledPair['bellState'][] = [
      'phi-plus', 'phi-minus', 'psi-plus', 'psi-minus'
    ];
    const bellState = bellStates[Math.floor(Math.random() * bellStates.length)];

    return {
      playerA,
      playerB,
      sharedState: { ...initialState },
      bellState
    };
  }

  /**
   * Apply quantum measurement — collapse wave function
   * Triggers entangled partner effects
   */
  static measure(state: QuantumState, basis: 'position' | 'momentum' = 'position'): string {
    if (state.collapsed) {
      // Already collapsed - return previous result
      const entries = [...state.amplitudes.entries()];
      const max = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max);
      return max[0];
    }

    // Collapse to single element based on probability
    const total = [...state.amplitudes.values()].reduce((sum, v) => sum + v, 0);
    let rand = Math.random() * total;
    
    for (const [element, prob] of state.amplitudes) {
      rand -= prob;
      if (rand <= 0) {
        state.collapsed = true;
        return element;
      }
    }

    state.collapsed = true;
    return QuantumChemistry.ELEMENTS[0];
  }

  /**
   * Apply quantum tunneling effect
   * Allows low-probability "impossible" transitions
   */
  static applyTunneling(
    attemptedElement: string, 
    probabilities: Map<string, number>
  ): { allowed: boolean; tunneledElement?: string } {
    const prob = probabilities.get(attemptedElement) ?? 0;
    
    // If probability is very low (< 5%), allow tunneling
    if (prob < 0.05 && Math.random() < 0.1) {
      const tunneled = [...probabilities.entries()]
        .filter(([_, p]) => p >= 0.05)
        .map(([e]) => e)[0];
      
      return { allowed: true, tunneledElement: tunneled };
    }

    return { allowed: prob >= 0.02 };
  }

  private normalize(amplitudes: Map<string, number>): Map<string, number> {
    const total = [...amplitudes.values()].reduce((sum, v) => sum + v, 0);
    if (total === 0) return amplitudes;
    
    const normalized = new Map<string, number>();
    for (const [key, val] of amplitudes) {
      normalized.set(key, val / total);
    }
    return normalized;
  }
}

/**
 * Larmor Heartbeat Engine
 * Maintains cosmic rhythm at 863 Hz
 */
export class LarmorHeartbeat {
  private static instance: LarmorHeartbeat;
  private intervalId: number | null = null;
  private subscribers: Array<(phase: number) => void> = [];
  private lastTick: number = 0;

  static getInstance(): LarmorHeartbeat {
    if (!LarmorHeartbeat.instance) {
      LarmorHeartbeat.instance = new LarmorHeartbeat();
    }
    return LarmorHeartbeat.instance;
  }

  start(onTick: (phase: number) => void): void {
    this.subscribers.push(onTick);
    
    if (this.intervalId === null) {
      this.intervalId = window.setInterval(() => {
        const now = Date.now() / 1000;
        this.lastTick = now;
        const phase = (now * LARMOR_FREQUENCY) % (2 * Math.PI);
        
        for (const subscriber of this.subscribers) {
          subscriber(phase);
        }
      }, 1000 / 60); // 60 Hz update rate (interpolation for 863 Hz)
    }
  }

  stop(onTick: (phase: number) => void): void {
    const index = this.subscribers.indexOf(onTick);
    if (index > -1) {
      this.subscribers.splice(index, 1);
    }
    
    if (this.subscribers.length === 0 && this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getPhase(): number {
    const now = Date.now() / 1000;
    return (now * LARMOR_FREQUENCY) % (2 * Math.PI);
  }

  getFrequency(): number {
    return LARMOR_FREQUENCY;
  }
}

/**
 * Quantum Entanglement Manager
 * Tracks entangled player pairs and their correlated states
 */
export class QuantumEntanglementManager {
  private pairs: Map<string, EntangledPair> = new Map();

  /**
   * Create entanglement between two players
   */
  entangle(playerA: string, playerB: string): EntangledPair {
    const id = this.getPairId(playerA, playerB);
    const pair: EntangledPair = {
      playerA,
      playerB,
      sharedState: {
        amplitudes: new Map(),
        phase: 0,
        collapsed: false,
        timestamp: Date.now()
      },
      bellState: ['phi-plus', 'phi-minus', 'psi-plus', 'psi-minus'][
        Math.floor(Math.random() * 4)
      ] as EntangledPair['bellState']
    };
    
    this.pairs.set(id, pair);
    return pair;
  }

  /**
   * Collapse entangled state across both players
   */
  collapse(pairId: string, element: string): void {
    const pair = this.pairs.get(pairId);
    if (pair) {
      pair.sharedState.collapsed = true;
      pair.sharedState.amplitudes.set(element, 1.0);
    }
  }

  getPairId(playerA: string, playerB: string): string {
    return [playerA, playerB].sort().join('-');
  }

  getPair(pairId: string): EntangledPair | undefined {
    return this.pairs.get(pairId);
  }

  getAllPairs(): EntangledPair[] {
    return [...this.pairs.values()];
  }
}