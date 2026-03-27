/**
 * Spoon Ledger — file-backed per-user spoon economy.
 *
 * Persists to spoon-ledger.json next to the running process.
 * In-memory Map is the source of truth; flushed to disk on every write.
 * All operations are synchronous-safe (no concurrent write races in Node.js
 * single-threaded event loop).
 */

import fs from 'fs';
import path from 'path';

const LEDGER_PATH = path.join(process.cwd(), 'spoon-ledger.json');

interface LedgerEntry {
  balance: number;
  totalEarned: number;
  lastUpdated: string;
}

type Ledger = Record<string, LedgerEntry>;

function load(): Ledger {
  try {
    if (fs.existsSync(LEDGER_PATH)) {
      return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf-8')) as Ledger;
    }
  } catch {
    console.warn('[SpoonLedger] Could not read ledger file — starting fresh');
  }
  return {};
}

function flush(ledger: Ledger): void {
  try {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SpoonLedger] Failed to write ledger:', err);
  }
}

// Load once at module init
const ledger: Ledger = load();

/**
 * Award spoons to a user. Returns new balance.
 */
export function award(userId: string, amount: number): number {
  const now = new Date().toISOString();
  const entry = ledger[userId] ?? { balance: 0, totalEarned: 0, lastUpdated: now };
  entry.balance += amount;
  entry.totalEarned += amount;
  entry.lastUpdated = now;
  ledger[userId] = entry;
  flush(ledger);
  return entry.balance;
}

/**
 * Deduct spoons from a user (won't go below 0). Returns new balance.
 */
export function spend(userId: string, amount: number): number {
  const entry = ledger[userId];
  if (!entry) return 0;
  entry.balance = Math.max(0, entry.balance - amount);
  entry.lastUpdated = new Date().toISOString();
  flush(ledger);
  return entry.balance;
}

/**
 * Get a user's current balance (0 if never earned any).
 */
export function getBalance(userId: string): number {
  return ledger[userId]?.balance ?? 0;
}

/**
 * Get full entry for a user, or null if not in ledger.
 */
export function getEntry(userId: string): LedgerEntry | null {
  return ledger[userId] ?? null;
}

/**
 * Get all entries sorted by totalEarned descending (leaderboard).
 */
export function getLeaderboard(limit = 10): Array<{ userId: string } & LedgerEntry> {
  return Object.entries(ledger)
    .map(([userId, entry]) => ({ userId, ...entry }))
    .sort((a, b) => b.totalEarned - a.totalEarned)
    .slice(0, limit);
}

/**
 * Total spoons awarded across all users.
 */
export function getGlobalTotal(): number {
  return Object.values(ledger).reduce((sum, e) => sum + e.totalEarned, 0);
}
