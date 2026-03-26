/**
 * @file ledgerStore.ts — Immutable Ledger Store
 *
 * P31 Labs — Append-Only Economy Ledger
 *
 * Zustand store for the immutable ledger that tracks Spoons, Love, and Karma.
 * Integrates with PGLite persistence layer for offline-first operation.
 * All entries are append-only: UPDATE and DELETE operations are blocked.
 *
 * Schema:
 *   ledger (
 *     id          UUID PRIMARY KEY,
 *     timestamp   TEXT NOT NULL,
 *     currency    TEXT NOT NULL CHECK(currency IN ('SPOON', 'LOVE', 'KARMA')),
 *     amount      INTEGER NOT NULL,
 *     balance     INTEGER NOT NULL,
 *     reason      TEXT NOT NULL,
 *     signature   TEXT,
 *     created_at  TEXT DEFAULT (datetime('now'))
 *   )
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { usePersistenceStore } from '../services/persistence';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string;
  timestamp: string;
  currency: 'SPOON' | 'LOVE' | 'KARMA';
  amount: number;
  balance: number;
  reason: string;
  signature?: string;
  createdAt: string;
}

/**
 * Message types for ledger worker communication
 */
export type LedgerMessage =
  | { id: string; type: 'INIT'; payload?: { dataDir?: string }; }
  | { id: string; type: 'ADD_ENTRY'; payload: { id: string; timestamp: string; currency: 'SPOON' | 'LOVE' | 'KARMA'; amount: number; balance: number; reason: string; signature?: string }; }
  | { id: string; type: 'GET_BALANCE'; payload: { currency: string }; }
  | { id: string; type: 'GET_ENTRIES'; payload?: { currency?: string }; }
  | { id: string; type: 'GET_AUDIT_TRAIL'; payload?: undefined; }
  | { id: string; type: 'DEDUCT_SPOON'; payload: { amount: number; reason: string; signature?: string }; }
  | { id: string; type: 'AWARD_KARMA'; payload: { amount: number; reason: string; signature?: string }; }
  | { id: string; type: 'CLOSE'; payload?: undefined; };

/**
 * Response types from ledger worker
 */
export type LedgerResponse = {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
  type?: string;
  payload?: any;
};

// ─────────────────────────────────────────────────────────────────
// Ledger Store State
// ─────────────────────────────────────────────────────────────────

interface LedgerState {
  // State flags
  isInitialized: boolean;
  isLoading: boolean;
  
  // Balances (calculated from entries)
  spoonBalance: number;
  loveBalance: number;
  karmaBalance: number;
  
  // Entries
  entries: LedgerEntry[];
  
  // Actions
  initialize: () => Promise<void>;
  addEntry: (entry: Omit<LedgerEntry, 'createdAt'>) => Promise<void>;
  deductSpoon: (amount: number, reason: string, signature?: string) => Promise<void>;
  awardKarma: (amount: number, reason: string, signature?: string) => Promise<void>;
  awardLove: (amount: number, reason: string, signature?: string) => Promise<void>;
  getBalance: (currency: 'SPOON' | 'LOVE' | 'KARMA') => number;
  getEntries: (currency?: 'SPOON' | 'LOVE' | 'KARMA') => LedgerEntry[];
  getAuditTrail: () => LedgerEntry[];
  loadFromPersistence: () => Promise<void>;
  exportData: () => Promise<any>;
  importData: (data: any) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────
// Ledger Store
// ─────────────────────────────────────────────────────────────────

export const useLedgerStore = create<LedgerState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        isInitialized: false,
        isLoading: false,
        spoonBalance: 12,
        loveBalance: 0,
        karmaBalance: 0,
        entries: [],
        
        initialize: async () => {
          set({ isLoading: true });
          try {
            // Initialize persistence layer
            const persistence = usePersistenceStore.getState();
            if (!persistence.isInitialized) {
              await persistence.initDB();
            }
            set({ isInitialized: true, isLoading: false });
          } catch (error) {
            console.error('[LedgerStore] Failed to initialize:', error);
            set({ isLoading: false });
          }
        },
        
        addEntry: async (entry: Omit<LedgerEntry, 'createdAt'>) => {
          const now = new Date().toISOString();
          const fullEntry: LedgerEntry = {
            ...entry,
            createdAt: now,
          };
          
          const state = get();
          const currentBalance = state.getBalance(entry.currency);
          const newBalance = currentBalance + entry.amount;
          
          const updatedEntry: LedgerEntry = {
            ...fullEntry,
            balance: newBalance,
          };
          
          // Update local state
          set((state) => {
            const newEntries = [...state.entries, updatedEntry];
            const newSpoonBalance = newEntries
              .filter(e => e.currency === 'SPOON')
              .reduce((sum, e) => sum + e.amount, 0);
            const newLoveBalance = newEntries
              .filter(e => e.currency === 'LOVE')
              .reduce((sum, e) => sum + e.amount, 0);
            const newKarmaBalance = newEntries
              .filter(e => e.currency === 'KARMA')
              .reduce((sum, e) => sum + e.amount, 0);
            
            return {
              entries: newEntries,
              spoonBalance: newSpoonBalance,
              loveBalance: newLoveBalance,
              karmaBalance: newKarmaBalance,
            };
          });
          
          // Persist to database
          const persistence = usePersistenceStore.getState();
          if (persistence.isInitialized) {
            if (entry.currency === 'SPOON') {
              await persistence.logSpoonTransaction(updatedEntry);
            } else if (entry.currency === 'KARMA') {
              await persistence.logKarmaTransaction(updatedEntry);
            }
          }
        },
        
        deductSpoon: async (amount: number, reason: string, signature?: string) => {
          const state = get();
          const currentBalance = state.spoonBalance;
          
          if (currentBalance + amount < 0) {
            throw new Error('Insufficient Spoons');
          }
          
          await state.addEntry({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            currency: 'SPOON',
            amount, // Should be negative
            balance: currentBalance + amount,
            reason,
            signature,
          });
        },
        
        awardLove: async (amount: number, reason: string, signature?: string) => {
          const state = get();
          const currentBalance = state.loveBalance;
          
          await state.addEntry({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            currency: 'LOVE',
            amount,
            balance: currentBalance + amount,
            reason,
            signature,
          });
        },
        
        awardKarma: async (amount: number, reason: string, signature?: string) => {
          const state = get();
          const currentBalance = state.karmaBalance;
          
          await state.addEntry({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            currency: 'KARMA',
            amount,
            balance: currentBalance + amount,
            reason,
            signature,
          });
        },
        
        getBalance: (currency: 'SPOON' | 'LOVE' | 'KARMA'): number => {
          const state = get();
          switch (currency) {
            case 'SPOON': return state.spoonBalance;
            case 'LOVE': return state.loveBalance;
            case 'KARMA': return state.karmaBalance;
            default: return 0;
          }
        },
        
        getEntries: (currency?: 'SPOON' | 'LOVE' | 'KARMA'): LedgerEntry[] => {
          const state = get();
          if (currency) {
            return state.entries.filter(e => e.currency === currency);
          }
          return state.entries;
        },
        
        getAuditTrail: (): LedgerEntry[] => {
          return get().entries;
        },
        
        loadFromPersistence: async () => {
          // This would load initial state from persistence
          // For now, we rely on the persistence layer's auto-loading
        },
        
        exportData: async () => {
          const persistence = usePersistenceStore.getState();
          if (persistence.isInitialized) {
            return await persistence.exportData();
          }
          return null;
        },
        
        importData: async (data: any) => {
          const persistence = usePersistenceStore.getState();
          if (persistence.isInitialized) {
            await persistence.importData(data);
            // Reload state after import
            await get().loadFromPersistence();
          }
        },
      }),
      {
        name: 'spaceship-earth-ledger-store',
        partialize: (state) => ({
          entries: state.entries,
          spoonBalance: state.spoonBalance,
          loveBalance: state.loveBalance,
          karmaBalance: state.karmaBalance,
        }),
      }
    )
  )
);

// ─────────────────────────────────────────────────────────────────
// Ledger Store Selectors
// ─────────────────────────────────────────────────────────────────

export const useSpoonBalance = () => useLedgerStore((state) => state.spoonBalance);
export const useLoveBalance = () => useLedgerStore((state) => state.loveBalance);
export const useKarmaBalance = () => useLedgerStore((state) => state.karmaBalance);
export const useLedgerEntries = () => useLedgerStore((state) => state.entries);

// ─────────────────────────────────────────────────────────────────
// Ledger Store Actions
// ─────────────────────────────────────────────────────────────────

export const useLedgerActions = () => useLedgerStore((state) => ({
  addEntry: state.addEntry,
  deductSpoon: state.deductSpoon,
  awardKarma: state.awardKarma,
  getBalance: state.getBalance,
  getEntries: state.getEntries,
  getAuditTrail: state.getAuditTrail,
  exportData: state.exportData,
  importData: state.importData,
}));

// ─────────────────────────────────────────────────────────────────
// Ledger Store Integration with CognitiveShield
// ─────────────────────────────────────────────────────────────────

/**
 * Hook to integrate ledger with cognitive shield events
 */
export function useCognitiveLedgerIntegration() {
  const { deductSpoon } = useLedgerActions();
  const persistence = usePersistenceStore();
  
  return {
    handleCognitiveEvent: async (event: any) => {
      // Log the cognitive event to persistence
      if (persistence.isInitialized) {
        await persistence.logCognitiveEvent(event);
      }
      
      // If there's a spoon penalty, deduct it from the ledger
      if (event.spoonPenalty > 0) {
        await deductSpoon(-event.spoonPenalty, 'Cognitive Shield Bypass', event.method);
      }
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Ledger Store Integration with Zone Transitions
// ─────────────────────────────────────────────────────────────────

/**
 * Hook to integrate ledger with zone transitions
 */
export function useZoneLedgerIntegration() {
  const { awardKarma } = useLedgerActions();
  const persistence = usePersistenceStore();
  
  return {
    handleZoneTransition: async (transition: any) => {
      // Log the zone transition to persistence
      if (persistence.isInitialized) {
        await persistence.logZoneTransition(transition);
      }
      
      // Award karma for zone transitions (spatial engagement)
      if (transition.type === 'ZONE_TRANSITION') {
        await awardKarma(1, `Entered ${transition.zone} zone`, transition.beaconId);
      }
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Auto-initialization
// ─────────────────────────────────────────────────────────────────

// Initialize ledger store
useLedgerStore.getState().loadFromPersistence();

// ─────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────

export type { LedgerState };
