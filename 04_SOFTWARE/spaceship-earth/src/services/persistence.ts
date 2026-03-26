/**
 * @file persistence.ts — PGLite Persistence Layer
 *
 * P31 Labs — Offline-First Ledger Persistence
 *
 * Direct integration of @electric-sql/pglite with ZoneStore and CognitiveShield
 * to ensure all economic transactions (Spoons, Karma) persist across hard reloads
 * without requiring network connectivity.
 *
 * Features:
 *   - IndexedDB-backed SQLite via PGLite (WASM)
 *   - Automatic transaction logging for all zone and shield events
 *   - Offline-first design with conflict-free append-only ledger
 *   - Seamless integration with existing Zustand stores
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import type { ZoneTransition } from './bleScanner';
import type { ShieldResult } from './cognitiveShield';
import type { LedgerEntry } from '../stores/ledgerStore';
import { useZoneStore } from '../stores/zoneStore';

// ─────────────────────────────────────────────────────────────────
// PGLite Database Schema
// ─────────────────────────────────────────────────────────────────

const PERSISTENCE_SCHEMA = `
-- Economic Ledger (Spoons, Karma, Love)
CREATE TABLE IF NOT EXISTS ledger (
  id          TEXT PRIMARY KEY,
  timestamp   TEXT NOT NULL,
  currency    TEXT NOT NULL CHECK(currency IN ('SPOON', 'LOVE', 'KARMA')),
  amount      INTEGER NOT NULL,
  balance     INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  signature   TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Zone Transitions (Spatial State Changes)
CREATE TABLE IF NOT EXISTS zone_transitions (
  id              TEXT PRIMARY KEY,
  timestamp       TEXT NOT NULL,
  zone_id         TEXT NOT NULL,
  zone_name       TEXT NOT NULL,
  transition_type TEXT NOT NULL CHECK(transition_type IN ('entering', 'exiting')),
  rssi            INTEGER,
  beacon_id       TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Cognitive Shield Events (Emotional Regulation)
CREATE TABLE IF NOT EXISTS cognitive_events (
  id              TEXT PRIMARY KEY,
  timestamp       TEXT NOT NULL,
  original_text   TEXT NOT NULL,
  shield_text     TEXT NOT NULL,
  was_bypassed    BOOLEAN NOT NULL,
  spoon_penalty   INTEGER NOT NULL,
  latency         INTEGER NOT NULL,
  method          TEXT NOT NULL,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Zone State Snapshots (Spatial Persistence)
CREATE TABLE IF NOT EXISTS zone_snapshots (
  id              TEXT PRIMARY KEY,
  timestamp       TEXT NOT NULL,
  active_zone_id  TEXT,
  current_level   TEXT NOT NULL,
  camera_position TEXT NOT NULL, -- JSON: [x,y,z]
  camera_target   TEXT NOT NULL, -- JSON: [x,y,z]
  zoom_level      REAL NOT NULL,
  is_transitioning BOOLEAN NOT NULL,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Append-only triggers (prevent UPDATE/DELETE)
CREATE TRIGGER IF NOT EXISTS ledger_append_only
BEFORE UPDATE ON ledger
BEGIN
  SELECT RAISE(ABORT, 'UPDATE not allowed: ledger is append-only. Create a compensating entry instead.');
END;

CREATE TRIGGER IF NOT EXISTS ledger_no_delete
BEFORE DELETE ON ledger
BEGIN
  SELECT RAISE(ABORT, 'DELETE not allowed: ledger is append-only. Create a compensating entry instead.');
END;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON ledger(timestamp);
CREATE INDEX IF NOT EXISTS idx_ledger_currency ON ledger(currency);
CREATE INDEX IF NOT EXISTS idx_zone_transitions_timestamp ON zone_transitions(timestamp);
CREATE INDEX IF NOT EXISTS idx_cognitive_events_timestamp ON cognitive_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_zone_snapshots_timestamp ON zone_snapshots(timestamp);
`;

// ─────────────────────────────────────────────────────────────────
// Persistence Store State
// ─────────────────────────────────────────────────────────────────

interface PersistenceState {
  // Database connection
  isInitialized: boolean;
  isOnline: boolean;
  lastSync: number | null;
  
  // Database operations
  db: any; // PGLite instance
  initDB: () => Promise<void>;
  closeDB: () => Promise<void>;
  
  // Transaction methods
  logSpoonTransaction: (entry: Omit<LedgerEntry, 'createdAt'>) => Promise<void>;
  logLoveTransaction: (entry: Omit<LedgerEntry, 'createdAt'>) => Promise<void>;
  logKarmaTransaction: (entry: Omit<LedgerEntry, 'createdAt'>) => Promise<void>;
  logZoneTransition: (transition: ZoneTransition) => Promise<void>;
  logCognitiveEvent: (event: ShieldResult) => Promise<void>;
  saveZoneSnapshot: (snapshot: any) => Promise<void>;
  
  // Query methods
  getBalance: (currency: string) => Promise<number>;
  getZoneHistory: (limit?: number) => Promise<any[]>;
  getCognitiveHistory: (limit?: number) => Promise<any[]>;
  getLastZoneSnapshot: () => Promise<any>;
  
  // Bulk operations
  exportData: () => Promise<any>;
  importData: (data: any) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────
// Database Operations
// ─────────────────────────────────────────────────────────────────

let pgliteInstance: any = null;

/**
 * Initialize PGLite database with IndexedDB persistence
 */
async function initializePGLite(): Promise<any> {
  if (pgliteInstance) return pgliteInstance;
  
  try {
    // Dynamic import of PGLite WASM
    const PGLite = await import('@electric-sql/pglite') as any;
    
    // Initialize with persistent storage in IndexedDB
    pgliteInstance = await PGLite.default.create({
      dataDir: 'indexedb://p31-persistence',
    });
    
    // Run schema
    await pgliteInstance.exec(PERSISTENCE_SCHEMA);
    
    console.log('[Persistence] PGLite initialized successfully');
    return pgliteInstance;
  } catch (error) {
    console.error('[Persistence] PGLite initialization failed:', error);
    throw error;
  }
}

/**
 * Execute a database query with error handling
 */
async function executeQuery(query: string, params: any[] = []): Promise<any> {
  if (!pgliteInstance) {
    throw new Error('Database not initialized');
  }
  
  try {
    return await pgliteInstance.query(query, params);
  } catch (error) {
    console.error('[Persistence] Query failed:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────
// Persistence Store
// ─────────────────────────────────────────────────────────────────

export const usePersistenceStore = create<PersistenceState>()(
  subscribeWithSelector(
    (set, get) => ({
      isInitialized: false,
      isOnline: navigator.onLine,
      lastSync: null,
      db: null,
      
      initDB: async () => {
        try {
          const db = await initializePGLite();
          set({ isInitialized: true, db, lastSync: Date.now() });
          
          // Subscribe to online/offline events
          window.addEventListener('online', () => set({ isOnline: true }));
          window.addEventListener('offline', () => set({ isOnline: false }));
          
        } catch (error) {
          console.error('[Persistence] Failed to initialize database:', error);
        }
      },
      
      closeDB: async () => {
        if (pgliteInstance) {
          await pgliteInstance.close();
          pgliteInstance = null;
          set({ isInitialized: false, db: null });
        }
      },
      
      // Economic Transaction Logging
      logSpoonTransaction: async (entry: Omit<LedgerEntry, 'createdAt'>) => {
        const db = await initializePGLite();
        const now = new Date().toISOString();
        
        await db.query(
          `INSERT INTO ledger (id, timestamp, currency, amount, balance, reason, signature, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            entry.id,
            entry.timestamp,
            entry.currency,
            entry.amount,
            entry.balance,
            entry.reason,
            entry.signature ?? null,
            now,
          ]
        );
      },
      
      logLoveTransaction: async (entry: Omit<LedgerEntry, 'createdAt'>) => {
        const db = await initializePGLite();
        const now = new Date().toISOString();
        
        await db.query(
          `INSERT INTO ledger (id, timestamp, currency, amount, balance, reason, signature, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            entry.id,
            entry.timestamp,
            entry.currency,
            entry.amount,
            entry.balance,
            entry.reason,
            entry.signature ?? null,
            now,
          ]
        );
      },
      
      logKarmaTransaction: async (entry: Omit<LedgerEntry, 'createdAt'>) => {
        const db = await initializePGLite();
        const now = new Date().toISOString();
        
        await db.query(
          `INSERT INTO ledger (id, timestamp, currency, amount, balance, reason, signature, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            entry.id,
            entry.timestamp,
            entry.currency,
            entry.amount,
            entry.balance,
            entry.reason,
            entry.signature ?? null,
            now,
          ]
        );
      },
      
      // Zone Transition Logging
      logZoneTransition: async (transition: ZoneTransition) => {
        const db = await initializePGLite();
        const now = new Date().toISOString();
        
        await db.query(
          `INSERT INTO zone_transitions (id, timestamp, zone_id, zone_name, transition_type, rssi, beacon_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            crypto.randomUUID(),
            now,
            transition.beaconId,
            transition.zone,
            transition.type,
            transition.rssi,
            transition.uuid || null,
            now,
          ]
        );
      },
      
      // Cognitive Shield Event Logging
      logCognitiveEvent: async (event: ShieldResult) => {
        const db = await initializePGLite();
        const now = new Date().toISOString();
        
        await db.query(
          `INSERT INTO cognitive_events (id, timestamp, original_text, shield_text, was_bypassed, spoon_penalty, latency, method, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            crypto.randomUUID(),
            now,
            event.originalText,
            event.shieldText,
            event.wasBypassed,
            event.spoonPenalty,
            event.latency,
            event.method,
            now,
          ]
        );
      },
      
      // Zone State Snapshot
      saveZoneSnapshot: async (snapshot: any) => {
        const db = await initializePGLite();
        const now = new Date().toISOString();
        
        await db.query(
          `INSERT INTO zone_snapshots (id, timestamp, active_zone_id, current_level, camera_position, camera_target, zoom_level, is_transitioning, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            crypto.randomUUID(),
            now,
            snapshot.activeZoneId || null,
            snapshot.currentLevel,
            JSON.stringify(snapshot.cameraPosition),
            JSON.stringify(snapshot.cameraTarget),
            snapshot.zoomLevel,
            snapshot.isTransitioning,
            now,
          ]
        );
      },
      
      // Query Methods
      getBalance: async (currency: string): Promise<number> => {
        const result = await executeQuery(
          `SELECT COALESCE(SUM(amount), 0) as balance FROM ledger WHERE currency = $1`,
          [currency]
        );
        return result.rows[0]?.balance ?? 0;
      },
      
      getZoneHistory: async (limit: number = 100): Promise<any[]> => {
        const result = await executeQuery(
          `SELECT * FROM zone_transitions ORDER BY timestamp DESC LIMIT $1`,
          [limit]
        );
        return result.rows;
      },
      
      getCognitiveHistory: async (limit: number = 100): Promise<any[]> => {
        const result = await executeQuery(
          `SELECT * FROM cognitive_events ORDER BY timestamp DESC LIMIT $1`,
          [limit]
        );
        return result.rows;
      },
      
      getLastZoneSnapshot: async (): Promise<any> => {
        const result = await executeQuery(
          `SELECT * FROM zone_snapshots ORDER BY timestamp DESC LIMIT 1`
        );
        return result.rows[0] || null;
      },
      
      // Bulk Operations
      exportData: async (): Promise<any> => {
        const balances = {
          SPOON: await get().getBalance('SPOON'),
          LOVE: await get().getBalance('LOVE'),
          KARMA: await get().getBalance('KARMA'),
        };
        
        const zoneHistory = await get().getZoneHistory(1000);
        const cognitiveHistory = await get().getCognitiveHistory(1000);
        const lastSnapshot = await get().getLastZoneSnapshot();
        
        return {
          exportDate: new Date().toISOString(),
          balances,
          zoneHistory,
          cognitiveHistory,
          lastSnapshot,
        };
      },
      
      importData: async (data: any): Promise<void> => {
        const db = await initializePGLite();
        
        // Import zone history
        for (const transition of data.zoneHistory || []) {
          await db.query(
            `INSERT OR IGNORE INTO zone_transitions 
             (id, timestamp, zone_id, zone_name, transition_type, rssi, beacon_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              transition.id,
              transition.timestamp,
              transition.zone_id,
              transition.zone_name,
              transition.transition_type,
              transition.rssi,
              transition.beacon_id,
              transition.created_at,
            ]
          );
        }
        
        // Import cognitive history
        for (const event of data.cognitiveHistory || []) {
          await db.query(
            `INSERT OR IGNORE INTO cognitive_events 
             (id, timestamp, original_text, shield_text, was_bypassed, spoon_penalty, latency, method, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              event.id,
              event.timestamp,
              event.original_text,
              event.shield_text,
              event.was_bypassed,
              event.spoon_penalty,
              event.latency,
              event.method,
              event.created_at,
            ]
          );
        }
      },
    })
  )
);

// ─────────────────────────────────────────────────────────────────
// Integration Hooks
// ─────────────────────────────────────────────────────────────────

/**
 * Hook to integrate persistence with ZoneStore
 */
export function useZonePersistence() {
  const persistence = usePersistenceStore();
  const zoneStore = useZoneStore();
  
  // Subscribe to zone state changes and persist them
  useZoneStore.subscribe((state) => {
    if (persistence.isInitialized) {
      persistence.saveZoneSnapshot({
        activeZoneId: state.activeZoneId,
        currentLevel: state.spatialState.currentLevel,
        cameraPosition: state.spatialState.cameraPosition,
        cameraTarget: state.spatialState.cameraTarget,
        zoomLevel: state.spatialState.zoomLevel,
        isTransitioning: state.spatialState.isTransitioning,
      });
    }
  });
  
  return {
    loadLastSnapshot: async () => {
      if (!persistence.isInitialized) return null;
      return await persistence.getLastZoneSnapshot();
    },
  };
}

/**
 * Hook to integrate persistence with CognitiveShield
 */
export function useCognitivePersistence() {
  const persistence = usePersistenceStore();
  
  return {
    logCognitiveEvent: async (event: ShieldResult) => {
      if (persistence.isInitialized) {
        await persistence.logCognitiveEvent(event);
      }
    },
  };
}

/**
 * Hook to integrate persistence with LedgerStore
 */
export function useLedgerPersistence() {
  const persistence = usePersistenceStore();
  
  return {
    logTransaction: async (entry: Omit<LedgerEntry, 'createdAt'>) => {
      if (persistence.isInitialized) {
        if (entry.currency === 'SPOON') {
          await persistence.logSpoonTransaction(entry);
        } else if (entry.currency === 'LOVE') {
          await persistence.logLoveTransaction(entry);
        } else if (entry.currency === 'KARMA') {
          await persistence.logKarmaTransaction(entry);
        }
      }
    },
    
    getBalance: async (currency: string): Promise<number> => {
      if (persistence.isInitialized) {
        return await persistence.getBalance(currency);
      }
      return 0;
    },
    
    exportData: async () => {
      if (persistence.isInitialized) {
        return await persistence.exportData();
      }
      return null;
    },
    
    importData: async (data: any) => {
      if (persistence.isInitialized) {
        return await persistence.importData(data);
      }
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Auto-initialization
// ─────────────────────────────────────────────────────────────────

// Initialize database on module load
usePersistenceStore.getState().initDB();

// ─────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────

export type { PersistenceState };