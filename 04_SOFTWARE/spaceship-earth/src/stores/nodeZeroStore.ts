/**
 * @file nodeZeroStore.ts
 * @brief Zustand store for Node Zero state synchronization
 * 
 * P31 Labs - Spaceship Earth - Node Zero Bridge
 * WCD-FW16: Spaceship Earth Client Bridge
 */

import { create } from 'zustand';

export interface NodeZeroState {
  // State values
  coherence: number;
  spoons: number;
  room: string;
  theme: string;
  battery: number;
  connected: boolean;
  
  // IMU data
  imuData: {
    ax: number;
    ay: number;
    az: number;
    gx: number;
    gy: number;
    gz: number;
  } | null;
  
  // Actions
  setCoherence: (coherence: number) => void;
  setSpoons: (spoons: number) => void;
  setRoom: (room: string) => void;
  setTheme: (theme: string) => void;
  setBattery: (battery: number) => void;
  setConnected: (connected: boolean) => void;
  setIMUData: (data: { ax: number; ay: number; az: number; gx: number; gy: number; gz: number }) => void;
  reset: () => void;
}

const initialState = {
  coherence: 0,
  spoons: 100,
  room: 'observatory',
  theme: 'default',
  battery: 100,
  connected: false,
  imuData: null,
};

export const useNodeZeroStore = create<NodeZeroState>((set) => ({
  ...initialState,
  
  setCoherence: (coherence) => set({ coherence }),
  setSpoons: (spoons) => set({ spoons }),
  setRoom: (room) => set({ room }),
  setTheme: (theme) => set({ theme }),
  setBattery: (battery) => set({ battery }),
  setConnected: (connected) => set({ connected }),
  setIMUData: (imuData) => set({ imuData }),
  reset: () => set(initialState),
}));

// Selector hooks for convenience
export const useNodeZeroConnected = () => useNodeZeroStore((state) => state.connected);
export const useCoherence = () => useNodeZeroStore((state) => state.coherence);
export const useSpoons = () => useNodeZeroStore((state) => state.spoons);
export const useRoom = () => useNodeZeroStore((state) => state.room);
export const useTheme = () => useNodeZeroStore((state) => state.theme);
export const useBattery = () => useNodeZeroStore((state) => state.battery);
export const useIMUData = () => useNodeZeroStore((state) => state.imuData);
