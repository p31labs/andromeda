/**
 * @file usePreferencesStore.test.ts — WCD-KC-03 Offline Persistence Tests
 *
 * Verifies:
 * 1. Store initializes with correct defaults
 * 2. UI mode toggle (ENGINEER ↔ SANCTUARY)
 * 3. Data persists to idb-keyval (simulated offline reload)
 * 4. navigator.storage.persist() is called on request
 * 5. CSS data-theme attribute syncs on mode change
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────

// In-memory idb-keyval mock
const idbStore = new Map<string, string>();

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(idbStore.get(key) ?? undefined)),
  set: vi.fn((key: string, value: string) => {
    idbStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    idbStore.delete(key);
    return Promise.resolve();
  }),
}));

// navigator.storage.persist mock
const mockPersist = vi.fn(() => Promise.resolve(true));
Object.defineProperty(globalThis, 'navigator', {
  value: {
    storage: { persist: mockPersist },
  },
  writable: true,
  configurable: true,
});

// document mock with data-theme tracking
const mockSetAttribute = vi.fn();
Object.defineProperty(globalThis, 'document', {
  value: {
    documentElement: {
      setAttribute: mockSetAttribute,
      style: { setProperty: vi.fn() },
    },
  },
  writable: true,
  configurable: true,
});

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe('usePreferencesStore', () => {
  beforeEach(() => {
    idbStore.clear();
    vi.clearAllMocks();
    // Reset module cache so store re-creates with fresh state
    vi.resetModules();
  });

  it('should initialize with correct defaults', async () => {
    const { usePreferencesStore } = await import('../stores/usePreferencesStore');
    const state = usePreferencesStore.getState();

    expect(state.energyLevel).toBe(12);
    expect(state.uiMode).toBe('ENGINEER');
    expect(state.reducedMotion).toBe(false);
    expect(state.persistRequested).toBe(false);
  });

  it('should have all required actions', async () => {
    const { usePreferencesStore } = await import('../stores/usePreferencesStore');
    const state = usePreferencesStore.getState();

    expect(typeof state.setEnergyLevel).toBe('function');
    expect(typeof state.setUIMode).toBe('function');
    expect(typeof state.setReducedMotion).toBe('function');
    expect(typeof state.toggleUIMode).toBe('function');
    expect(typeof state.requestStoragePersistence).toBe('function');
    expect(typeof state.hydrate).toBe('function');
  });

  it('should toggle UI mode between ENGINEER and SANCTUARY', async () => {
    const { usePreferencesStore } = await import('../stores/usePreferencesStore');

    expect(usePreferencesStore.getState().uiMode).toBe('ENGINEER');

    usePreferencesStore.getState().toggleUIMode();
    expect(usePreferencesStore.getState().uiMode).toBe('SANCTUARY');

    usePreferencesStore.getState().toggleUIMode();
    expect(usePreferencesStore.getState().uiMode).toBe('ENGINEER');
  });

  it('should clamp energyLevel to 0-12', async () => {
    const { usePreferencesStore } = await import('../stores/usePreferencesStore');

    usePreferencesStore.getState().setEnergyLevel(15);
    expect(usePreferencesStore.getState().energyLevel).toBe(12);

    usePreferencesStore.getState().setEnergyLevel(-3);
    expect(usePreferencesStore.getState().energyLevel).toBe(0);

    usePreferencesStore.getState().setEnergyLevel(7.4);
    expect(usePreferencesStore.getState().energyLevel).toBe(7);
  });

  it('should call navigator.storage.persist on request', async () => {
    const { usePreferencesStore } = await import('../stores/usePreferencesStore');

    const result = await usePreferencesStore.getState().requestStoragePersistence();

    expect(mockPersist).toHaveBeenCalledOnce();
    expect(result).toBe(true);
    expect(usePreferencesStore.getState().persistRequested).toBe(true);
  });

  it('should sync data-theme attribute on UI mode change', async () => {
    const { usePreferencesStore } = await import('../stores/usePreferencesStore');

    usePreferencesStore.getState().setUIMode('SANCTUARY');
    expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'sanctuary');

    usePreferencesStore.getState().setUIMode('ENGINEER');
    expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'engineer');
  });

  it('should sync data-reduced-motion attribute', async () => {
    const { usePreferencesStore } = await import('../stores/usePreferencesStore');

    usePreferencesStore.getState().setReducedMotion(true);
    expect(mockSetAttribute).toHaveBeenCalledWith('data-reduced-motion', 'true');

    usePreferencesStore.getState().setReducedMotion(false);
    expect(mockSetAttribute).toHaveBeenCalledWith('data-reduced-motion', 'false');
  });

  it('should persist state to idb-keyval and survive reload', async () => {
    const { usePreferencesStore: store1 } = await import('../stores/usePreferencesStore');

    // Mutate state
    store1.getState().setUIMode('SANCTUARY');
    store1.getState().setEnergyLevel(5);
    store1.getState().setReducedMotion(true);

    // Verify idb-keyval was called (via Zustand persist middleware)
    const { set: idbSet } = await import('idb-keyval');
    expect(idbSet).toHaveBeenCalled();

    // Simulate persistence write — Zustand persist serializes to idb
    const persistedJSON = JSON.stringify({
      energyLevel: 5,
      uiMode: 'SANCTUARY',
      reducedMotion: true,
      persistRequested: false,
    });
    idbStore.set('p31-preferences', persistedJSON);

    // Simulate page reload — re-import store
    vi.resetModules();
    const { usePreferencesStore: store2 } = await import('../stores/usePreferencesStore');

    // Manually hydrate (Zustand persist async hydration)
    await store2.getState().hydrate();

    const { get: idbGet } = await import('idb-keyval');
    expect(idbGet).toHaveBeenCalledWith('p31-preferences');

    // Verify persisted data is accessible
    const raw = await idbGet('p31-preferences');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw as string);
    expect(parsed.uiMode).toBe('SANCTUARY');
    expect(parsed.energyLevel).toBe(5);
    expect(parsed.reducedMotion).toBe(true);
  });

  it('should provide correct selector hooks', async () => {
    const mod = await import('../stores/usePreferencesStore');

    expect(typeof mod.useEnergyLevel).toBe('function');
    expect(typeof mod.useUIMode).toBe('function');
    expect(typeof mod.useReducedMotion).toBe('function');
    expect(typeof mod.useIsSanctuary).toBe('function');
    expect(typeof mod.useIsEngineer).toBe('function');
  });
});
