import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppContext = 'home' | 'business';
export type AppTab = 'scan' | 'dashboard' | 'settings' | 'help';

interface AppState {
  // Context mode (Home vs Business)
  context: AppContext;
  setContext: (context: AppContext) => void;
  toggleContext: () => void;

  // Active tab
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // Bio-state integration
  spoons: number;
  calcium: number | null;
  setBioState: (spoons: number, calcium: number | null) => void;

  // Voice state
  isVoiceListening: boolean;
  setVoiceListening: (listening: boolean) => void;
  lastVoiceCommand: string;
  setLastVoiceCommand: (command: string) => void;

  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Batch selection state
  selectedItems: string[];
  toggleItemSelection: (qrData: string) => void;
  clearSelection: () => void;
  isBatchMode: boolean;
  setBatchMode: (enabled: boolean) => void;

  // Settings
  hapticEnabled: boolean;
  setHapticEnabled: (enabled: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  autoSync: boolean;
  setAutoSync: (enabled: boolean) => void;

  // Status beacon
  statusHealth: 'green' | 'yellow' | 'red';
  setStatusHealth: (health: 'green' | 'yellow' | 'red') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      context: 'home',
      setContext: (context) => set({ context }),
      toggleContext: () => set((state) => ({
        context: state.context === 'home' ? 'business' : 'home'
      })),

      activeTab: 'scan',
      setActiveTab: (tab) => set({ activeTab: tab }),

      spoons: 0.68,
      calcium: 8.4,
      setBioState: (spoons, calcium) => set({ spoons, calcium }),

      isVoiceListening: false,
      setVoiceListening: (listening) => set({ isVoiceListening: listening }),
      lastVoiceCommand: '',
      setLastVoiceCommand: (command) => set({ lastVoiceCommand: command }),

      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      selectedItems: [],
      toggleItemSelection: (qrData) => set((state) => ({
        selectedItems: state.selectedItems.includes(qrData)
          ? state.selectedItems.filter(id => id !== qrData)
          : [...state.selectedItems, qrData]
      })),
      clearSelection: () => set({ selectedItems: [] }),
      isBatchMode: false,
      setBatchMode: (enabled) => set({ isBatchMode: enabled, selectedItems: enabled ? [] : [] }),

      hapticEnabled: true,
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
      voiceEnabled: true,
      setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
      autoSync: true,
      setAutoSync: (enabled) => set({ autoSync: enabled }),

      statusHealth: 'green',
      setStatusHealth: (health) => set({ statusHealth: health }),
    }),
    {
      name: 'warehouse-aj-storage',
      partialize: (state) => ({
        context: state.context,
        spoons: state.spoons,
        calcium: state.calcium,
        hapticEnabled: state.hapticEnabled,
        voiceEnabled: state.voiceEnabled,
        autoSync: state.autoSync,
      })
    }
  )
);

// Initialize bio-state from passport if available
export function initBioState() {
  try {
    const passport = localStorage.getItem('p31:passport:state');
    if (passport) {
      const state = JSON.parse(passport);
      useAppStore.getState().setBioState(
        state.spoons ?? 0.68,
        state.calcium ?? 8.4
      );
    }
  } catch (e) {
    console.error('Failed to load bio-state:', e);
  }
}
