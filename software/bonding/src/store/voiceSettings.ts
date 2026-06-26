// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// Voice Settings Store: Persist voice preferences
// Phase 5: Voice Companion
// ═══════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VoiceSettings {
  // Speech recognition
  voiceInputEnabled: boolean;
  continuousListening: boolean;
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Text-to-speech
  voiceOutputEnabled: boolean;
  speechRate: number;  // 0.5 - 2.0
  speechVolume: number; // 0.0 - 1.0
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Actions
  toggleVoiceInput: () => void;
  toggleVoiceOutput: () => void;
  setSpeechRate: (rate: number) => void;
  setSpeechVolume: (volume: number) => void;
}

export const useVoiceSettings = create<VoiceSettings>()(
  persist(
    (set) => ({
      // Default settings
      voiceInputEnabled: true,
      continuousListening: true,
      voiceOutputEnabled: true,
      speechRate: 0.9,
      speechVolume: 1.0,
<<<<<<< HEAD
      
      toggleVoiceInput: () => set((state) => ({
        voiceInputEnabled: !state.voiceInputEnabled
      })),
      
      toggleVoiceOutput: () => set((state) => ({
        voiceOutputEnabled: !state.voiceOutputEnabled
      })),
      
      setSpeechRate: (rate: number) => set({
        speechRate: Math.max(0.5, Math.min(2.0, rate))
      }),
      
=======

      toggleVoiceInput: () => set((state) => ({
        voiceInputEnabled: !state.voiceInputEnabled
      })),

      toggleVoiceOutput: () => set((state) => ({
        voiceOutputEnabled: !state.voiceOutputEnabled
      })),

      setSpeechRate: (rate: number) => set({
        speechRate: Math.max(0.5, Math.min(2.0, rate))
      }),

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      setSpeechVolume: (volume: number) => set({
        speechVolume: Math.max(0, Math.min(1.0, volume))
      }),
    }),
    {
      name: 'bonding-voice-settings',
    }
  )
<<<<<<< HEAD
);
=======
);
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
