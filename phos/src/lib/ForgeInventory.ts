/**
 * ForgeInventory.ts — PGLite-backed inventory management.
 *
 * Manages product catalog and stock levels in the warehouse PGLite database.
 * Bridges the Vault tab (product CRUD) and Warehouse tab (stock movements) to
 * the p31-warehouse-aj IDB namespace. All writes are local-first; sync via
 * ForgeSync when edge is reachable.
 *
 * Tables:
 *   products(sku PK, name, price_cents, category, active, created_at, updated_at)
 *   stock_movements(id PK, sku, delta_cents, quantity, reason, created_at, synced)
 *
 * Note: inventory_items table in warehouse is the canonical stock ledger.
 * This module adds a products catalog and stock_movements audit trail.
 */

import { getDb } from "./ForgeLedger";
import type { PGlite } from "@electric-sql/pglite";

export interface Product {
  sku: string;
  name: string;
  priceCents: number;
  category: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StockMovement {
  id: string;
  sku: string;
  quantity: number;
  reason: string;
  createdAt: number;
  synced: boolean;
}

export interface StockLevel {
  sku: string;
  name: string;
  priceCents: number;
  quantity: number;
  zoneName: string | null;
}

const PRODUCTS_TABLE = "forge_products";
const MOVEMENTS_TABLE = "forge_stock_movements";

async function getWarehouseDb(): Promise<PGlite> {
  return getDb();
}

async function ensureSchema(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ${PRODUCTS_TABLE} (
      sku TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL DEFAULT 0,
      category TEXT DEFAULT '',
      active BOOLEAN DEFAULT TRUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_forge_products_active ON ${PRODUCTS_TABLE}(active);
    CREATE INDEX IF NOT EXISTS idx_forge_products_category ON ${PRODUCTS_TABLE}(category);
    CREATE TABLE IF NOT EXISTS ${MOVEMENTS_TABLE} (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      synced BOOLEAN DEFAULT FALSE
    );
    CREATE INDEX IF NOT EXISTS idx_forge_stock_sku ON ${MOVEMENTS_TABLE}(sku);
    CREATE INDEX IF NOT EXISTS idx_forge_stock_synced ON ${MOVEMENTS_TABLE}(synced);
  `);
}

// ─── Product CRUD ───

export async function upsertProduct(product: {
  sku: string;
  name: string;
  priceCents: number;
  category?: string;
}): Promise<Product> {
  const db = await getWarehouseDb();
  await ensureSchema(db);
  const now = Date.now();
  const sku = product.sku.trim().toUpperCase();
  const name = product.name.trim();

  await db.query(
    `INSERT INTO ${PRODUCTS_TABLE} (sku, name, price_cents, category, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, $5, $5)
     ON CONFLICT (sku) DO UPDATE SET
       name = $2,
       price_cents = $3,
       category = $4,
       active = TRUE,
       updated_at = $5`,
    [sku, name, product.priceCents, product.category || "", now]
  );

  return { sku, name, priceCents: product.priceCents, category: product.category || "", active: true, createdAt: now, updatedAt: now };
}

export async function getProduct(sku: string): Promise<Product | null> {
  const db = await getWarehouseDb();
  await ensureSchema(db);
  const { rows } = await db.query<{
    sku: string; name: string; price_cents: number; category: string;
    active: boolean; created_at: number; updated_at: number;
  }>(
    `SELECT * FROM ${PRODUCTS_TABLE} WHERE sku = $1`,
    [sku.trim().toUpperCase()]
  );
  if (rows.length === 0) return null;
  return rowToProduct(rows[0]);
}

export async function getProducts(activeOnly = true): Promise<Product[]> {
  const db = await getWarehouseDb();
  await ensureSchema(db);
  const { rows } = await db.query<{
    sku: string; name: string; price_cents: number; category: string;
    active: boolean; created_at: number; updated_at: number;
  }>(
    activeOnly
      ? `SELECT * FROM ${PRODUCTS_TABLE} WHERE active = TRUE ORDER BY name ASC`
      : `SELECT * FROM ${PRODUCTS_TABLE} ORDER BY name ASC`
  );
  return rows.map(rowToProduct);
}

export async function deactivateProduct(sku: string): Promise<boolean> {
  const db = await getWarehouseDb();
  await ensureSchema(db);
  const { rows } = await db.query(
    `UPDATE ${PRODUCTS_TABLE} SET active = FALSE, updated_at = $1 WHERE sku = $2 RETURNING sku`,
    [Date.now(), sku.trim().toUpperCase()]
  );
  return rows.length > 0;
}

export async function deleteProduct(sku: string): Promise<boolean> {
  const db = await getWarehouseDb();
  await ensureSchema(db);
  await db.query(`DELETE FROM ${PRODUCTS_TABLE} WHERE sku = $1`, [sku.trim().toUpperCase()]);
  return true;
}

// ─── Stock Movement ───

export async function recordStockMovement(params: {
  sku: string;
  quantity: number;
  reason: string;
}): Promise<StockMovement> {
  const db = await getWarehouseDb();
  await ensureSchema(db);
  const id = `sm_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const sku = params.sku.trim().toUpperCase();
  const createdAt = Date.now();

  await db.query(
    `INSERT INTO ${MOVEMENTS_TABLE} (id, sku, quantity, reason, created_at, synced)
     VALUES ($1, $2, $3, $4, $5, FALSE)`,
    [id, sku, params.quantity, params.reason, createdAt]
  );

  // Also update inventory_items if the SKU exists there
  try {
    await db.query(
      `UPDATE inventory_items SET status = CASE
         WHEN $1 > 0 THEN 'received'
         WHEN $1 < 0 THEN 'shipped'
         ELSE status
       END, synced = FALSE WHERE qr_data = $2`,
      [params.quantity, sku]
    );
  } catch {
    // inventory_items table may not have this SKU — that's fine
  }

  return { id, sku, quantity: params.quantity, reason: params.reason, createdAt, synced: false };
}

export async function getStockMovements(sku?: string, limit = 50): Promise<StockMovement[]> {
  const db = await getWarehouseDb();
  await ensureSchema(db);
  if (sku) {
    const { rows } = await db.query<{
      id: string; sku: string; quantity: number; reason: string; created_at: number; synced: boolean;
    }>(
      `SELECT * FROM ${MOVEMENTS_TABLE} WHERE sku = $1 ORDER BY created_at DESC LIMIT $2`,
      [sku.trim().toUpperCase(), limit]
    );
    return rows.map(rowToMovement);
  }
  const { rows } = await db.query<{
    id: string; sku: string; quantity: number; reason: string; created_at: number; synced: boolean;
  }>(
    `SELECT * FROM ${MOVEMENTS_TABLE} ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map(rowToMovement);
}

// ─── Stock Levels ───

export async function getStockLevels(): Promise<StockLevel[]> {
  const db = await getWarehouseDb();
  await ensureSchema(db);
  try {
    const { rows } = await db.query<{
      sku: string; name: string; price_cents: number;
      quantity: number; zone_name: string;
    }>(`
      SELECT p.sku, p.name, p.price_cents,
        COALESCE(SUM(s.quantity), 0) as quantity,
        MAX(z.name) as zone_name
      FROM ${PRODUCTS_TABLE} p
      LEFT JOIN ${MOVEMENTS_TABLE} s ON p.sku = s.sku
      LEFT JOIN inventory_items i ON p.sku = i.qr_data
      LEFT JOIN zones z ON i.zone_id = z.id
      WHERE p.active = TRUE
      GROUP BY p.sku, p.name, p.price_cents
      ORDER BY p.name ASC
    `);
    return rows.map((r) => ({
      sku: r.sku,
      name: r.name,
      priceCents: r.price_cents,
      quantity: Number(r.quantity),
      zoneName: r.zone_name || null,
    }));
  } catch {
    // Fallback: return products without stock aggregation
    const products = await getProducts(true);
    return products.map((p) => ({
      sku: p.sku,
      name: p.name,
      priceCents: p.priceCents,
      quantity: 0,
      zoneName: null,
    }));
  }
}

export async function getStockForSku(sku: string): Promise<number> {
  const db = await getWarehouseDb();
  await ensureSchema(db);
  try {
    const { rows } = await db.query<{ total: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as total FROM ${MOVEMENTS_TABLE} WHERE sku = $1`,
      [sku.trim().toUpperCase()]
    );
    return Number(rows[0]?.total || 0);
  } catch {
    return 0;
  }
}

// ─── Unsynced for ForgeSync ───

export async function getUnsyncedMovements(): Promise<StockMovement[]> {
  const db = await getWarehouseDb();
  await ensureSchema(db);
  const { rows } = await db.query<{
    id: string; sku: string; quantity: number; reason: string; created_at: number; synced: boolean;
  }>(
    `SELECT * FROM ${MOVEMENTS_TABLE} WHERE synced = FALSE ORDER BY created_at ASC`
  );
  return rows.map(rowToMovement);
}

export async function markMovementsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getWarehouseDb();
  await ensureSchema(db);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  await db.query(
    `UPDATE ${MOVEMENTS_TABLE} SET synced = TRUE WHERE id IN (${placeholders})`,
    ids
  );
}

// ─── Helpers ───

function rowToProduct(row: {
  sku: string; name: string; price_cents: number; category: string;
  active: boolean; created_at: number; updated_at: number;
}): Product {
  return {
    sku: row.sku,
    name: row.name,
    priceCents: row.price_cents,
    category: row.category,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMovement(row: {
  id: string; sku: string; quantity: number; reason: string; created_at: number; synced: boolean;
}): StockMovement {
  return {
    id: row.id,
    sku: row.sku,
    quantity: row.quantity,
    reason: row.reason,
    createdAt: row.created_at,
    synced: row.synced,
  };
}
