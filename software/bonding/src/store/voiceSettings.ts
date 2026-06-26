


      toggleVoiceInput: () => set((state) => ({
        voiceInputEnabled: !state.voiceInputEnabled
      })),

      toggleVoiceOutput: () => set((state) => ({
        voiceOutputEnabled: !state.voiceOutputEnabled
      })),

      setSpeechRate: (rate: number) => set({
        speechRate: Math.max(0.5, Math.min(2.0, rate))
      }),

);
