/**
 * @file ledgerWorker.ts — PGLite Web Worker for append-only economy ledger
 *
 * P31 Labs — Immutable Ledger Architecture
 *
 * Runs PGLite (SQLite compiled to WASM) in a dedicated web worker to prevent
 * main-thread blocking. All ledger entries are append-only: UPDATE and DELETE
 * operations are blocked via SQL trigger. Mistakes require compensating entries.
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
 *
 * Protocol: Main thread sends messages via postMessage. Worker responds with
 * query results or error codes.
 */

import type { LedgerEntry, LedgerMessage, LedgerResponse } from '../stores/ledgerStore';

// PGLite will be loaded dynamically
let pglite: any = null;
let db: any = null;

// SQL Schema with append-only trigger protection
const SCHEMA = `
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

CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON ledger(timestamp);
CREATE INDEX IF NOT EXISTS idx_ledger_currency ON ledger(currency);

-- Append-only trigger: block UPDATE and DELETE
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
`;

/**
 * Initialize PGLite in this worker
 */
async function initPGLite(): Promise<boolean> {
  try {
    // Dynamic import of PGLite WASM
    // In production, this loads from CDN or bundled asset
    const PGLite = await import('@electric-sql/pglite') as any;
    
    // Initialize with persistent storage in IndexedDB
    pglite = await PGLite.default.create({
      // Use IndexedDB for persistence
      dataDir: 'indexedb://p31-ledger',
    });
    
    // Run schema
    await pglite.exec(SCHEMA);
    
    console.log('[LedgerWorker] PGLite initialized successfully');
    return true;
  } catch (error) {
    console.error('[LedgerWorker] PGLite initialization failed:', error);
    return false;
  }
}

/**
 * Get current balance for a currency
 */
async function getBalance(currency: string): Promise<number> {
  const result = await pglite.query(
    `SELECT COALESCE(SUM(amount), 0) as balance FROM ledger WHERE currency = $1`,
    [currency]
  );
  return result.rows[0]?.balance ?? 0;
}

/**
 * Add a new entry to the ledger
 */
async function addEntry(entry: Omit<LedgerEntry, 'createdAt'>): Promise<LedgerEntry> {
  const now = new Date().toISOString();
  
  // Get current balance
  const currentBalance = await getBalance(entry.currency);
  const newBalance = currentBalance + entry.amount;
  
  const fullEntry: LedgerEntry = {
    ...entry,
    balance: newBalance,
    createdAt: now,
  };
  
  // Insert the entry
  await pglite.query(
    `INSERT INTO ledger (id, timestamp, currency, amount, balance, reason, signature)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      fullEntry.id,
      fullEntry.timestamp,
      fullEntry.currency,
      fullEntry.amount,
      fullEntry.balance,
      fullEntry.reason,
      fullEntry.signature ?? null,
    ]
  );
  
  return fullEntry;
}

/**
 * Get all entries, optionally filtered by currency
 */
async function getEntries(currency?: string): Promise<LedgerEntry[]> {
  let query = 'SELECT * FROM ledger';
  const params: string[] = [];
  
  if (currency) {
    query += ' WHERE currency = $1';
    params.push(currency);
  }
  
  query += ' ORDER BY timestamp DESC';
  
  const result = await pglite.query(query, params);
  return result.rows.map((row: any) => ({
    id: row.id,
    timestamp: row.timestamp,
    currency: row.currency,
    amount: row.amount,
    balance: row.balance,
    reason: row.reason,
    signature: row.signature,
    createdAt: row.created_at,
  }));
}

/**
 * Get the full audit trail
 */
async function getAuditTrail(): Promise<LedgerEntry[]> {
  return getEntries();
}

// Worker message handler
self.onmessage = async (event: MessageEvent<LedgerMessage>) => {
  const { id, type, payload } = event.data;
  
  try {
    let result: any = null;
    
    switch (type) {
      case 'INIT': {
        const success = await initPGLite();
        result = { success };
        break;
      }
      
      case 'ADD_ENTRY': {
        const entry = await addEntry(payload as Omit<LedgerEntry, 'createdAt'>);
        result = { entry };
        break;
      }
      
      case 'GET_BALANCE': {
        const balance = await getBalance(payload.currency as string);
        result = { currency: payload.currency as string, balance };
        break;
      }
      
      case 'GET_ENTRIES': {
        const entries = await getEntries(payload.currency as string);
        result = { entries };
        break;
      }
      
      case 'GET_AUDIT_TRAIL': {
        const trail = await getAuditTrail();
        result = { trail };
        break;
      }
      
      case 'DEDUCT_SPOON': {
        // Convenience method: deduct a spoon (negative amount)
        const balance = await getBalance('SPOON');
        const amount = payload.amount as number;
        const reason = payload.reason as string;
        const signature = payload.signature as string;
        
        if (balance + amount < 0) {
          throw new Error('Insufficient Spoons');
        }
        const newBalance = balance + amount;
        const entry = await addEntry({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          currency: 'SPOON',
          amount, // should be negative
          balance: newBalance,
          reason,
          signature,
        });
        result = { entry, newBalance };
        break;
      }
      
      case 'AWARD_KARMA': {
        // Convenience method: award karma (positive amount)
        const amount = payload.amount as number;
        const reason = payload.reason as string;
        const signature = payload.signature as string;
        
        const balance = await getBalance('KARMA');
        const newBalance = balance + amount;
        const entry = await addEntry({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          currency: 'KARMA',
          amount,
          balance: newBalance,
          reason,
          signature,
        });
        result = { entry };
        break;
      }
      
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    // Send success response
    const response: LedgerResponse = {
      id,
      success: true,
      result,
    };
    self.postMessage(response);
    
  } catch (error) {
    // Send error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response: LedgerResponse = {
      id,
      success: false,
      error: errorMessage,
    };
    self.postMessage(response);
  }
};

// Signal that worker is ready
self.postMessage({ type: 'READY' });
