import { create } from 'zustand';

interface BioState {
  // Core metrics
  spoons: number; // 0-1
  calcium: number; // mg/dL
  hrv: number; // ms
  
  // Derived
  lastUpdate: number;
  trend: 'improving' | 'stable' | 'declining';
  
  // Actions
  updateFromSensor: (data: Partial<Omit<BioState, 'updateFromSensor' | 'trend'>>) => void;
  manualUpdate: (field: keyof BioState, value: number) => void;
  calculateTrend: () => void;
  
  // Computed
  isGrayRock: () => boolean;
  isLowSpoons: () => boolean;
  getQMUState: () => 'normal' | 'low' | 'critical';
}

export const useBioStore = create<BioState>((set, get) => ({
  // Initial state (simulated)
  spoons: 0.68,
  calcium: 8.4,
  hrv: 62,
  lastUpdate: Date.now(),
  trend: 'stable',

  updateFromSensor: (data) => {
    const previous = get();
    set({ 
      ...data, 
      lastUpdate: Date.now(),
      trend: data.spoons !== undefined 
        ? data.spoons > previous.spoons ? 'improving' : data.spoons < previous.spoons ? 'declining' : 'stable'
        : previous.trend
    });
    
    // Trigger QMU update
    if (typeof window !== 'undefined' && window.P31_QMU) {
      window.P31_QMU.updateTheme(
        data.spoons ?? previous.spoons,
        data.calcium ?? previous.calcium
      );
    }
  },

  manualUpdate: (field, value) => {
    set(state => ({ 
      ...state, 
      [field]: value,
      lastUpdate: Date.now()
    }));
  },

  calculateTrend: () => {
    // Would compare history in real implementation
    set({ trend: 'stable' });
  },

  isGrayRock: () => get().calcium <= 7.5,
  isLowSpoons: () => get().spoons <= 0.2,
  getQMUState: () => {
    const { calcium, spoons } = get();
    if (calcium <= 7.5) return 'critical';
    if (spoons <= 0.2) return 'low';
    return 'normal';
  }
}));

// Auto-update simulation (for demo)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const store = useBioStore.getState();
    const variation = (Math.random() - 0.5) * 0.02;
    store.updateFromSensor({
      spoons: Math.max(0, Math.min(1, store.spoons + variation)),
      calcium: Math.max(6, Math.min(12, store.calcium + (Math.random() - 0.5) * 0.1)),
      hrv: Math.max(30, Math.min(100, store.hrv + Math.floor((Math.random() - 0.5) * 5)))
    });
  }, 10000);
}
