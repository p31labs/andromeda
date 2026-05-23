/**
 * P31 MOCK WASM Bridge (Development Mode)
 * Safely mimics the STT pipeline without requiring C++ binaries.
 */

self.onmessage = async (e) => {
  const { type } = e.data;

  if (type === 'INIT') {
    console.info("[PHOS Worker Mock] Bypassing WASM instantiation for dev mode.");
    self.postMessage({ type: 'READY' });
  }

  if (type === 'PROCESS_AUDIO') {
    // We ignore the actual PCM buffer in mock mode.
    // Instead, we simulate a successful speech transcription after a 3-second delay 
    // to test the Synaptic Bridge and Edge LLM routing.
    
    // To prevent infinite loops of mock processing, we only trigger this once.
    if (!self.hasMockTriggered) {
      self.hasMockTriggered = true;
      
      console.info("[PHOS Worker Mock] Simulating speech processing...");
      
      setTimeout(() => {
        const mockIntent = "Start a prep session for 15 servings of breakfast burritos for the business";
        self.postMessage({ type: 'INTENT_TRANSCRIBED', payload: mockIntent });
        
        // Reset the mock trigger after 10 seconds to allow further testing
        setTimeout(() => { self.hasMockTriggered = false; }, 10000);
      }, 3000);
    }
  }
};
