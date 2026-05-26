import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppContext = 'home' | 'business';

interface AppState {
  // Context mode (Home vs Business)
  context: AppContext;
  setContext: (context: AppContext) => void;
  toggleContext: () => void;
  
  // Bio-state integration
  spoons: number;
  calcium: number | null;
  setBioState: (spoons: number, calcium: number | null) => void;
  
  // Active session
  activeSessionId: string | null;
  setActiveSession: (sessionId: string | null) => void;
  
  // UI state
  isVoiceListening: boolean;
  setVoiceListening: (listening: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      context: 'home',
      setContext: (context) => set({ context }),
      toggleContext: () => set((state) => ({ 
        context: state.context === 'home' ? 'business' : 'home' 
      })),
      
      spoons: 0.68,
      calcium: 8.4,
      setBioState: (spoons, calcium) => set({ spoons, calcium }),
      
      activeSessionId: null,
      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
      
      isVoiceListening: false,
      setVoiceListening: (listening) => set({ isVoiceListening: listening })
    }),
    {
      name: 'culinary-matria-storage',
      partialize: (state) => ({ 
        context: state.context,
        spoons: state.spoons,
        calcium: state.calcium
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
        state.calcium ?? null
      );
    }
  } catch (e) {
    console.error('Failed to load bio-state:', e);
  }
}
