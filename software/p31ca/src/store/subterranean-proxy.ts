import { create } from 'zustand';

interface BioState {
  spoons: number;
  entropy: number;
  mark1Attractor: number;
  safeMode: boolean;
  setSpoons: (val: number) => void;
  setEntropy: (val: number) => void;
  triggerSafeMode: () => void;
  exitSafeMode: () => void;
}

// Subterranean State Proxy: instantiated once in global client memory.
// Any React island importing this hook connects to the same memory proxy,
// achieving global state synchronization without a React Context Provider.
export const useBioStore = create<BioState>((set) => ({
  spoons: 5,
  entropy: 0, // Samson V2 PID output, converges to Mark 1 Attractor
  mark1Attractor: 0.349, // H ~ 0.349 derived from SIC-POVM quantum mechanics
  safeMode: false,
  setSpoons: (val) => set({ spoons: val }),
  setEntropy: (val) => set({ entropy: val }),
  triggerSafeMode: () => set({ safeMode: true }),
  exitSafeMode: () => set({ safeMode: false }),
}));
