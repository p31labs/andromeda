import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SovereignState {
  sovereignMode: boolean;
  airGesturesEnabled: boolean;
  gazeTrackingEnabled: boolean;
  predictiveReachEnabled: boolean;
  porosityVisionActive: boolean;
  
  // Metrics from Bio-State
  inflammationLevel: number; // 0-100
  spoonCount: number; // 0-100
  
  // Actions
  setSovereignMode: (enabled: boolean) => void;
  setAirGestures: (enabled: boolean) => void;
  setGazeTracking: (enabled: boolean) => void;
  setPredictiveReach: (enabled: boolean) => void;
  setPorosityVision: (active: boolean) => void;
  updateBioMetrics: (inflammation: number, spoons: number) => void;
}

export const useSovereignStore = create<SovereignState>()(
  persist(
    (set) => ({
      sovereignMode: false,
      airGesturesEnabled: false,
      gazeTrackingEnabled: false,
      predictiveReachEnabled: true,
      porosityVisionActive: false,
      inflammationLevel: 0,
      spoonCount: 100,

      setSovereignMode: (enabled) => set({ sovereignMode: enabled }),
      setAirGestures: (enabled) => set({ airGesturesEnabled: enabled }),
      setGazeTracking: (enabled) => set({ gazeTrackingEnabled: enabled }),
      setPredictiveReach: (enabled) => set({ predictiveReachEnabled: enabled }),
      setPorosityVision: (active) => set({ porosityVisionActive: active }),
      updateBioMetrics: (inflammation, spoons) => set({ inflammationLevel: inflammation, spoonCount: spoons }),
    }),
    {
      name: 'chromatica-sovereign-storage',
    }
  )
);