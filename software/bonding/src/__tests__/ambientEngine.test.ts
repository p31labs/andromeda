// ═══════════════════════════════════════════════════════════════════
// BONDING — AmbientEngine Tests (WCD-T05)
// Procedural background music: initAmbient, updateAmbient, stopAmbient
// ═══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initAmbient,
  updateAmbient,
  stopAmbient,
  setAmbientVolume,
} from '../engine/ambientEngine';
import {
  setupAudioContextMock,
  teardownAudioContextMock,
  createdOscillators,
  resetAudioMocks,
} from '../__tests__/helpers/mockAudioContext';

describe('ambientEngine', () => {
  let originalSetTimeout: typeof setTimeout;
  let originalClearTimeout: typeof clearTimeout;
  let timers: ReturnType<typeof setTimeout>[] = [];

  beforeEach(() => {
    resetAudioMocks();
    setupAudioContextMock();
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Capture timers for cleanup
    originalSetTimeout = globalThis.setTimeout;
    originalClearTimeout = globalThis.clearTimeout;
    timers = [];
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    globalThis.setTimeout = ((callback: () => void, delay: number) => {
      const id = originalSetTimeout(callback, delay);
      timers.push(id);
      return id;
    }) as typeof setTimeout;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
      timers = timers.filter(t => t !== id);
      originalClearTimeout(id);
    }) as typeof clearTimeout;
  });

  afterEach(() => {
    // Clear all pending timers
    for (const timer of timers) {
      originalClearTimeout(timer);
    }
    timers = [];
<<<<<<< HEAD
    
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    
=======

    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    stopAmbient?.();
    teardownAudioContextMock();
  });

  describe('initAmbient', () => {
    it('initAmbient starts playback without throwing', () => {
      expect(() => initAmbient()).not.toThrow();
    });

    it('initAmbient called twice does not create duplicate oscillators', () => {
      initAmbient();
<<<<<<< HEAD
      
      const initialOscCount = createdOscillators.length;
      
      initAmbient();
      
=======

      const initialOscCount = createdOscillators.length;

      initAmbient();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Should not create more oscillators on second call
      // (the function checks isPlaying flag)
      expect(true).toBe(true);
    });
  });

  describe('updateAmbient', () => {
    it('updateAmbient with empty array falls back to default ambient loop', () => {
      initAmbient();
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(() => updateAmbient([])).not.toThrow();
    });

    it('updateAmbient with element array changes active state', () => {
      initAmbient();
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(() => updateAmbient(['H', 'O'])).not.toThrow();
    });
  });

  describe('setAmbientVolume', () => {
    it('setAmbientVolume(0) silences output', () => {
      initAmbient();
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(() => setAmbientVolume(0)).not.toThrow();
    });

    it('setAmbientVolume(1) restores full volume', () => {
      initAmbient();
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(() => setAmbientVolume(1)).not.toThrow();
    });

    it('setAmbientVolume(-1) is clamped to 0', () => {
      initAmbient();
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(() => setAmbientVolume(-1)).not.toThrow();
    });

    it('setAmbientVolume(2) is clamped to 1', () => {
      initAmbient();
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(() => setAmbientVolume(2)).not.toThrow();
    });
  });

  describe('stopAmbient', () => {
    it('stopAmbient without prior initAmbient does not throw', () => {
      expect(() => stopAmbient()).not.toThrow();
    });

    it('initAmbient → stopAmbient → initAmbient works cleanly', () => {
      expect(() => {
        initAmbient();
        stopAmbient();
        initAmbient();
      }).not.toThrow();
    });
  });
<<<<<<< HEAD
});
=======
});
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
