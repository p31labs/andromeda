/**
 * ForgeLedger.ts — Integer-math revenue engine for the Forge commerce layer.
 *
 * All financial state is stored in cents (integers). Zero floating-point.
 * Transactions are SHA-256 chained for tamper detection.
 * Offline-first: all writes go to PGLite idb://forge-ledger, synced via
 * ForgeSync when edge is reachable.
 *
 * Database schema (PGLite):
 *   forge_transactions(id PK, type, amount_cents, tax_cents, total_cents,
 *     items_json, payment_method, note, previous_hash, hash, created_at,
 *     synced BOOLEAN DEFAULT FALSE, voided BOOLEAN DEFAULT FALSE)
 *   forge_balance(site_id PK, balance_cents, updated_at)
 *   forge_daily_totals(date TEXT PK, revenue_cents, tax_cents, tx_count, synced BOOLEAN)
 */

export type TxType = "SALE" | "REFUND" | "VOID" | "CASH_ADD" | "CASH_REMOVE";
export type PaymentMethod = "cash" | "stripe_terminal" | "manual" | "venmo" | "love_credits";

export interface ForgeTransaction {
  id: string;
  type: TxType;
  amountCents: number;
  taxCents: number;
  totalCents: number;
  items: LineItem[];
  paymentMethod: PaymentMethod;
  note: string;
  previousHash: string;
  hash: string;
  createdAt: number;
  synced: boolean;
  voided: boolean;
}

export interface LineItem {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  taxCents: number;
}

export interface DailyTotal {
  date: string;
  revenueCents: number;
  taxCents: number;
  txCount: number;
  synced: boolean;
}

// ─── Integer math helpers ───

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function toDollars(cents: number): number {
  return cents / 100;
}

export function formatCurrency(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const d = Math.floor(abs / 100);
  const c = abs % 100;
  return `${negative ? "-" : ""}$${d}.${c.toString().padStart(2, "0")}`;
}

export function sumLineItems(items: Omit<LineItem, "totalPriceCents" | "taxCents">[]): {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
} {
  let subtotalCents = 0;
  for (const item of items) {
    subtotalCents += item.unitPriceCents * item.quantity;
  }
  // Georgia sales tax: 4% state — rounded to nearest cent
  const taxCents = Math.round(subtotalCents * 0.04);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export function applyLineItemTax(
  item: Omit<LineItem, "taxCents" | "totalPriceCents">
): LineItem {
  const totalPriceCents = item.unitPriceCents * item.quantity;
  const taxCents = Math.round(totalPriceCents * 0.04);
  return { ...item, totalPriceCents, taxCents };
}

// ─── Database operations ───

const DB_PATH = "idb://forge-ledger";
let _db: PGlite | null = null;
let _dbPromise: ReturnType<typeof openLedgerDb> | null = null;

async function openLedgerDb(): Promise<PGlite> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(DB_PATH);
  await db.waitReady;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS forge_transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      tax_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL,
      items_json JSON DEFAULT '[]',
      payment_method TEXT NOT NULL DEFAULT 'cash',
      note TEXT DEFAULT '',
      previous_hash TEXT NOT NULL DEFAULT '',
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      synced BOOLEAN DEFAULT FALSE,
      voided BOOLEAN DEFAULT FALSE
    );
    CREATE INDEX IF NOT EXISTS idx_forge_tx_created ON forge_transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_forge_tx_synced ON forge_transactions(synced);
    CREATE TABLE IF NOT EXISTS forge_balance (
      site_id TEXT PRIMARY KEY,
      balance_cents INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS forge_daily_totals (
      date TEXT PRIMARY KEY,
      revenue_cents INTEGER NOT NULL DEFAULT 0,
      tax_cents INTEGER NOT NULL DEFAULT 0,
      tx_count INTEGER NOT NULL DEFAULT 0,
      synced BOOLEAN DEFAULT FALSE
    );
  `);
  return db;
}

export async function getDb(): Promise<PGlite> {
  if (_db) return _db;
  if (_dbPromise) return _dbPromise;
  _dbPromise = openLedgerDb().then((d) => { _db = d; return d; });
  return _dbPromise;
}

// ─── Hash chain ───

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getLastHash(db: PGlite): Promise<string> {
  const { rows } = await db.query<{ hash: string }>(
    "SELECT hash FROM forge_transactions ORDER BY created_at DESC LIMIT 1"
  );
  return rows[0]?.hash || "GENESIS";
}

// ─── Public API ───

export async function recordTransaction(params: {
  type: TxType;
  items: Omit<LineItem, "totalPriceCents" | "taxCents">[];
  paymentMethod: PaymentMethod;
  note?: string;
}): Promise<ForgeTransaction> {
  const db = await getDb();

  const itemsWithTax = params.items.map(applyLineItemTax);
  const { subtotalCents, taxCents, totalCents } = sumLineItems(params.items);

  if (params.type === "REFUND" || params.type === "VOID") {
    throw new Error("Use refundTransaction() or voidTransaction() for reversals");
  }

  const id = `fgt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = Date.now();
  const previousHash = await getLastHash(db);
  const hashPayload = JSON.stringify({ id, type: params.type, totalCents, previousHash, createdAt });
  const hash = await sha256Hex(hashPayload);

  const tx: ForgeTransaction = {
    id,
    type: params.type,
    amountCents: subtotalCents,
    taxCents,
    totalCents,
    items: itemsWithTax,
    paymentMethod: params.paymentMethod,
    note: params.note || "",
    previousHash,
    hash,
    createdAt,
    synced: false,
    voided: false,
  };

  await db.query(
    `INSERT INTO forge_transactions
     (id, type, amount_cents, tax_cents, total_cents, items_json, payment_method, note, previous_hash, hash, created_at, synced, voided)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, params.type, tx.amountCents, tx.taxCents, tx.totalCents,
     JSON.stringify(itemsWithTax), params.paymentMethod, tx.note,
     previousHash, hash, createdAt, false, false]
  );

  await updateBalance(db, totalCents);
  await incrementDailyTotal(db, totalCents, taxCents);

  return tx;
}

export async function voidTransaction(txId: string, reason: string): Promise<ForgeTransaction | null> {
  const db = await getDb();
  const { rows } = await db.query<{ id: string }>(
    "SELECT id FROM forge_transactions WHERE id = $1 AND voided = FALSE",
    [txId]
  );
  if (rows.length === 0) return null;

  await db.query("UPDATE forge_transactions SET voided = TRUE WHERE id = $1", [txId]);

  const original = await getTransaction(txId);
  if (!original) return null;

  const reversalTotal = -original.totalCents;
  const id = `fgt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = Date.now();
  const previousHash = await getLastHash(db);
  const hashPayload = JSON.stringify({ id, type: "VOID", totalCents: reversalTotal, previousHash, createdAt });
  const hash = await sha256Hex(hashPayload);

  await db.query(
    `INSERT INTO forge_transactions
     (id, type, amount_cents, tax_cents, total_cents, items_json, payment_method, note, previous_hash, hash, created_at, synced, voided)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, "VOID", -original.amountCents, -original.taxCents, reversalTotal,
     "[]", original.paymentMethod, `Void: ${reason}`,
     previousHash, hash, createdAt, false, false]
  );

  await updateBalance(db, reversalTotal);
  await incrementDailyTotal(db, reversalTotal, -original.taxCents);

  return getTransaction(id);
}

export async function getTransaction(id: string): Promise<ForgeTransaction | null> {
  const db = await getDb();
  const { rows } = await db.query<{
    id: string; type: string; amount_cents: number; tax_cents: number;
    total_cents: number; items_json: string; payment_method: string;
    note: string; previous_hash: string; hash: string; created_at: number;
    synced: boolean; voided: boolean;
  }>(
    "SELECT * FROM forge_transactions WHERE id = $1",
    [id]
  );
  if (rows.length === 0) return null;
  return rowToTx(rows[0]);
}

export async function getTransactions(limit = 50, offset = 0): Promise<ForgeTransaction[]> {
  const db = await getDb();
  const { rows } = await db.query<{
    id: string; type: string; amount_cents: number; tax_cents: number;
    total_cents: number; items_json: string; payment_method: string;
    note: string; previous_hash: string; hash: string; created_at: number;
    synced: boolean; voided: boolean;
  }>(
    `SELECT * FROM forge_transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows.map(rowToTx);
}

export async function getUnsyncedTransactions(): Promise<ForgeTransaction[]> {
  const db = await getDb();
  const { rows } = await db.query<{
    id: string; type: string; amount_cents: number; tax_cents: number;
    total_cents: number; items_json: string; payment_method: string;
    note: string; previous_hash: string; hash: string; created_at: number;
    synced: boolean; voided: boolean;
  }>(
    `SELECT * FROM forge_transactions WHERE synced = FALSE ORDER BY created_at ASC`
  );
  return rows.map(rowToTx);
}

export async function markSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  await db.query(
    `UPDATE forge_transactions SET synced = TRUE WHERE id IN (${placeholders})`,
    ids
  );
}

export async function getBalanceCents(siteId: string): Promise<number> {
  const db = await getDb();
  const { rows } = await db.query<{ balance_cents: number }>(
    "SELECT balance_cents FROM forge_balance WHERE site_id = $1",
    [siteId]
  );
  return rows[0]?.balance_cents ?? 0;
}

export async function getDailyTotal(date: string): Promise<DailyTotal | null> {
  const db = await getDb();
  const { rows } = await db.query<{
    date: string; revenue_cents: number; tax_cents: number; tx_count: number; synced: boolean;
  }>(
    "SELECT * FROM forge_daily_totals WHERE date = $1",
    [date]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return { date: r.date, revenueCents: r.revenue_cents, taxCents: r.tax_cents, txCount: r.tx_count, synced: r.synced };
}

export async function getDailyTotals(days = 7): Promise<DailyTotal[]> {
  const db = await getDb();
  const { rows } = await db.query<{
    date: string; revenue_cents: number; tax_cents: number; tx_count: number; synced: boolean;
  }>(
    `SELECT * FROM forge_daily_totals ORDER BY date DESC LIMIT $1`,
    [days]
  );
  return rows.map((r) => ({
    date: r.date, revenueCents: r.revenue_cents, taxCents: r.tax_cents,
    txCount: r.tx_count, synced: r.synced,
  }));
}

export async function verifyTransactionChain(): Promise<{ valid: boolean; brokenAt: string | null }> {
  const db = await getDb();
  const { rows } = await db.query<{
    id: string; type: string; total_cents: number; previous_hash: string;
    hash: string; created_at: number;
  }>(
    "SELECT id, type, total_cents, previous_hash, hash, created_at FROM forge_transactions ORDER BY created_at ASC"
  );

  let expectedPrevious = "GENESIS";
  for (const row of rows) {
    if (row.previous_hash !== expectedPrevious) {
      return { valid: false, brokenAt: row.id };
    }
    const payload = JSON.stringify({
      id: row.id, type: row.type, totalCents: row.total_cents,
      previousHash: row.previous_hash, createdAt: row.created_at,
    });
    const computed = await sha256Hex(payload);
    if (computed !== row.hash) {
      return { valid: false, brokenAt: row.id };
    }
    expectedPrevious = row.hash;
  }
  return { valid: true, brokenAt: null };
}

// ─── Internal helpers ───

function rowToTx(row: {
  id: string; type: string; amount_cents: number; tax_cents: number;
  total_cents: number; items_json: string; payment_method: string;
  note: string; previous_hash: string; hash: string; created_at: number;
  synced: boolean; voided: boolean;
}): ForgeTransaction {
  return {
    id: row.id,
    type: row.type as TxType,
    amountCents: row.amount_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    items: JSON.parse(row.items_json || "[]"),
    paymentMethod: row.payment_method as PaymentMethod,
    note: row.note,
    previousHash: row.previous_hash,
    hash: row.hash,
    createdAt: row.created_at,
    synced: row.synced,
    voided: row.voided,
  };
}

async function updateBalance(db: PGlite, deltaCents: number): Promise<void> {
  const siteId = localStorage.getItem("phos_site_id") || "default";
  const now = Date.now();
  await db.query(
    `INSERT INTO forge_balance (site_id, balance_cents, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (site_id) DO UPDATE SET
       balance_cents = forge_balance.balance_cents + $2,
       updated_at = $3`,
    [siteId, deltaCents, now]
  );
}

async function incrementDailyTotal(db: PGlite, revenueCents: number, taxCents: number): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  await db.query(
    `INSERT INTO forge_daily_totals (date, revenue_cents, tax_cents, tx_count, synced)
     VALUES ($1, $2, $3, 1, FALSE)
     ON CONFLICT (date) DO UPDATE SET
       revenue_cents = forge_daily_totals.revenue_cents + $2,
       tax_cents = forge_daily_totals.tax_cents + $3,
       tx_count = forge_daily_totals.tx_count + 1,
       synced = FALSE`,
    [date, revenueCents, taxCents]
  );
}
