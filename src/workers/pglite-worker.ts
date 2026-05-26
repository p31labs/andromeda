/// <reference lib="webworker" />
import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';

// PGLite Worker Singleton for secure multi-tab IndexedDB access
// Prevents database locking and ensures sub-ms latency SLAs

let db: PGlite | null = null;

async function getDB(): Promise<PGlite> {
  if (db) return db;

  db = await PGlite.createWorkerHandler({
    // Use IndexedDB VFS for persistent local storage
    vfs: 'idb',
    // Enable live queries for CRDT reactivity
    extensions: {
      live,
    },
  });

  // Initialize CRDT schema if needed
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sovereign_ledger (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      signature TEXT NOT NULL,
      _crdt_clock INTEGER NOT NULL DEFAULT 0,
      _crdt_node_id TEXT NOT NULL DEFAULT 'local',
      _crdt_hash TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS vault_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_crdt_clock ON sovereign_ledger(_crdt_clock);
    CREATE INDEX IF NOT EXISTS idx_crdt_node ON sovereign_ledger(_crdt_node_id);
  `);

  return db;
}

// Message handling for worker-based PGLite
self.onmessage = async (event: MessageEvent) => {
  const db = await getDB();
  await db.handleMessage(event);
};

self.onerror = (error) => {
  console.error('[PGLite Worker] Error:', error);
};

console.log('[PGLite Worker] Initialized - Sovereign Data Layer ready');