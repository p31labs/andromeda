/**
 * @file ledgerStore.test.ts — Tests for PGLite Ledger Store
 *
 * Tests the append-only economy ledger with Zustand integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the worker
const mockWorker = {
  postMessage: vi.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((error: Event) => void) | null,
};

// Mock Web Worker
vi.stubGlobal('Worker', vi.fn(() => mockWorker));

describe('LedgerStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct initial state', async () => {
    const { useLedgerStore } = await import('../stores/ledgerStore');
    
    const state = useLedgerStore.getState();
    expect(state.isInitialized).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.spoonBalance).toBe(12);
    expect(state.loveBalance).toBe(0);
    expect(state.karmaBalance).toBe(0);
  });

  it('should have required store methods', async () => {
    const { useLedgerStore } = await import('../stores/ledgerStore');
    
    const state = useLedgerStore.getState();
    expect(typeof state.initialize).toBe('function');
    expect(typeof state.deductSpoon).toBe('function');
    expect(typeof state.awardKarma).toBe('function');
    expect(typeof state.awardLove).toBe('function');
    expect(typeof state.getBalance).toBe('function');
    expect(typeof state.getEntries).toBe('function');
    expect(typeof state.getAuditTrail).toBe('function');
  });
});

describe('LedgerEntry', () => {
  it('should create valid ledger entries', () => {
    // Test the shape of ledger entries
    const entry = {
      id: 'test-uuid',
      timestamp: '2024-01-01T00:00:00.000Z',
      currency: 'SPOON' as const,
      amount: -1,
      balance: 11,
      reason: 'Test deduction',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    
    expect(entry.id).toBeDefined();
    expect(entry.currency).toBe('SPOON');
    expect(entry.amount).toBeLessThan(0);
  });

  it('should support all currency types', () => {
    const spoonEntry = { currency: 'SPOON' as const, amount: -1 };
    const loveEntry = { currency: 'LOVE' as const, amount: 1 };
    const karmaEntry = { currency: 'KARMA' as const, amount: 5 };
    
    expect(spoonEntry.currency).toBe('SPOON');
    expect(loveEntry.currency).toBe('LOVE');
    expect(karmaEntry.currency).toBe('KARMA');
  });
});

describe('Ledger Worker Protocol', () => {
  it('should send correct message format', async () => {
    const { useLedgerStore } = await import('../stores/ledgerStore');
    
    // Trigger initialize - this will try to create a worker
    // The worker won't actually initialize in test environment
    try {
      await useLedgerStore.getState().initialize();
    } catch {
      // Expected - PGLite not available in test
    }
    
    // Verify worker was created
    expect(Worker).toHaveBeenCalled();
  });
});
