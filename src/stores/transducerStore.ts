import { create } from "zustand";

interface InputState {
  input: string;
  setInput: (input: string) => void;
}

interface OutputState {
  output: string;
  setOutput: (output: string) => void;
}

interface ControlState {
  controls: {
    isActive: boolean;
    intervalMs: number;
  };
  toggleActive: () => void;
  setInterval: (interval: number) => void;
}

export const useInputStore = create<InputState>((set) => ({
  input: "",
  setInput: (input) => set({ input }),
}));

export const useOutputStore = create<OutputState>((set) => ({
  output: "",
  setOutput: (output) => set({ output }),
}));

export const useControlStore = create<ControlState>((set) => ({
  controls: {
    isActive: false,
    intervalMs: 1000,
  },
  toggleActive: () =>
    set((state) => ({
      controls: { ...state.controls, isActive: !state.controls.isActive },
    })),
  setInterval: (intervalMs) =>
    set((state) => ({ controls: { ...state.controls, intervalMs } })),
}));
