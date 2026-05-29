import { create } from 'zustand';

interface CompanionState {
  // State
  isSpeaking: boolean;
  lastCheckIn: number;
  pendingAction: { type: string; message: string; priority: string } | null;
  
  // Voice history
  lastResponse: string;
  contextQueue: string[];
  
  // Actions
  setSpeaking: (speaking: boolean) => void;
  acknowledge: () => void;
  queueAction: (action: { type: string; message: string; priority: string }) => void;
  clearAction: () => void;
  addContext: (context: string) => void;
}

export const useCompanionStore = create<CompanionState>((set, get) => ({
  isSpeaking: false,
  lastCheckIn: Date.now(),
  pendingAction: null,
  lastResponse: '',
  contextQueue: [],
  
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),
  
  acknowledge: () => {
    set({ 
      lastCheckIn: Date.now(),
      isSpeaking: false 
    });
  },
  
  queueAction: (action) => {
    // Don't overwrite critical actions with lower priority
    const current = get().pendingAction;
    if (current?.priority === 'critical' && action.priority !== 'critical') {
      return; // Keep critical
    }
    set({ pendingAction: action });
  },
  
  clearAction: () => set({ pendingAction: null }),
  
  addContext: (context) => {
    set(state => ({
      contextQueue: [...state.contextQueue.slice(-9), context]
    }));
  }
}));
