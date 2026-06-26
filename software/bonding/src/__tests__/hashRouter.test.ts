// ═══════════════════════════════════════════════════════════════════
// BONDING — HashRouter Tests (WCD-T03)
// Route switching between #bonding, #collider, #observatory, #bridge
// ═══════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHashRouter } from '../hooks/useHashRouter';

describe('useHashRouter', () => {
  let originalHash: string;

  beforeEach(() => {
    // Save original hash
    originalHash = window.location.hash;
  });

  afterEach(() => {
    // Restore original hash
    window.location.hash = originalHash;
    vi.restoreAllMocks();
  });

  describe('initial render', () => {
    it('empty hash → currentRoom is "bonding" (default)', () => {
      window.location.hash = '';
<<<<<<< HEAD
      
      const { result } = renderHook(() => useHashRouter());
      
=======

      const { result } = renderHook(() => useHashRouter());

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(result.current.currentRoom).toBe('bonding');
    });

    it('hash "#collider" → currentRoom is "collider"', () => {
      window.location.hash = '#collider';
<<<<<<< HEAD
      
      const { result } = renderHook(() => useHashRouter());
      
=======

      const { result } = renderHook(() => useHashRouter());

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(result.current.currentRoom).toBe('collider');
    });

    it('hash "#observatory" → currentRoom is "observatory"', () => {
      window.location.hash = '#observatory';
<<<<<<< HEAD
      
      const { result } = renderHook(() => useHashRouter());
      
=======

      const { result } = renderHook(() => useHashRouter());

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(result.current.currentRoom).toBe('observatory');
    });

    it('hash "#bridge" → currentRoom is "bridge"', () => {
      window.location.hash = '#bridge';
<<<<<<< HEAD
      
      const { result } = renderHook(() => useHashRouter());
      
=======

      const { result } = renderHook(() => useHashRouter());

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(result.current.currentRoom).toBe('bridge');
    });
  });

  describe('navigate function', () => {
    it('navigate("collider") sets window.location.hash to "#collider"', () => {
      // The hook returns an object with currentRoom and navigate
      window.location.hash = '#bonding';
<<<<<<< HEAD
      
      const { result } = renderHook(() => useHashRouter());
      
      act(() => {
        result.current.navigate('collider');
      });
      
=======

      const { result } = renderHook(() => useHashRouter());

      act(() => {
        result.current.navigate('collider');
      });

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(window.location.hash).toBe('#collider');
    });

    it('navigate("bonding") triggers re-render with currentRoom === "bonding"', () => {
      window.location.hash = '#collider';

      const { result } = renderHook(() => useHashRouter());

      act(() => {
        result.current.navigate('bonding');
        // jsdom does not auto-fire hashchange when window.location.hash is set
        // programmatically — dispatch it manually so the hook state updates.
        window.dispatchEvent(new Event('hashchange'));
      });

      expect(result.current.currentRoom).toBe('bonding');
    });
  });

  describe('hashchange events', () => {
    it('simulated hashchange event updates currentRoom reactively', () => {
      window.location.hash = '#bonding';
<<<<<<< HEAD
      
      const { result } = renderHook(() => useHashRouter());
      
=======

      const { result } = renderHook(() => useHashRouter());

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      act(() => {
        window.location.hash = '#collider';
        window.dispatchEvent(new Event('hashchange'));
      });
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(result.current.currentRoom).toBe('collider');
    });

    it('unknown hash (#unknown) → currentRoom is the raw value (no crash)', () => {
      window.location.hash = '#unknown';
<<<<<<< HEAD
      
      const { result } = renderHook(() => useHashRouter());
      
=======

      const { result } = renderHook(() => useHashRouter());

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Should not crash, should return the unknown room
      expect(result.current.currentRoom).toBe('unknown');
    });

    it('navigate() called multiple times reflects latest value', () => {
      window.location.hash = '#bonding';
<<<<<<< HEAD
      
      const { result } = renderHook(() => useHashRouter());
      
=======

      const { result } = renderHook(() => useHashRouter());

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      act(() => {
        window.location.hash = '#collider';
        window.dispatchEvent(new Event('hashchange'));
      });
<<<<<<< HEAD
      
      expect(result.current.currentRoom).toBe('collider');
      
=======

      expect(result.current.currentRoom).toBe('collider');

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      act(() => {
        window.location.hash = '#observatory';
        window.dispatchEvent(new Event('hashchange'));
      });
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      expect(result.current.currentRoom).toBe('observatory');
    });
  });

  describe('cleanup', () => {
    it('hashchange listener removed on unmount (no memory leak)', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
<<<<<<< HEAD
      
      const { unmount } = renderHook(() => useHashRouter());
      
=======

      const { unmount } = renderHook(() => useHashRouter());

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Should have added a hashchange listener
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'hashchange',
        expect.any(Function)
      );
<<<<<<< HEAD
      
      unmount();
      
=======

      unmount();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Should have removed the hashchange listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'hashchange',
        expect.any(Function)
      );
    });
  });

  describe('default route', () => {
    it('returns bonding for any unrecognized hash', () => {
      window.location.hash = '#random-nonsense';
<<<<<<< HEAD
      
      const { result } = renderHook(() => useHashRouter());
      
=======

      const { result } = renderHook(() => useHashRouter());

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // The hook uses: hash.replace('#', '') || 'bonding'
      // So '#random-nonsense' becomes 'random-nonsense'
      expect(result.current.currentRoom).toBe('random-nonsense');
    });

    it('hash with only # returns bonding', () => {
      window.location.hash = '#';
<<<<<<< HEAD
      
      const { result } = renderHook(() => useHashRouter());
      
=======

      const { result } = renderHook(() => useHashRouter());

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // '#'.replace('#', '') = '' which is falsy, so defaults to 'bonding'
      expect(result.current.currentRoom).toBe('bonding');
    });
  });
<<<<<<< HEAD
});
=======
});
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
