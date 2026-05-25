import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const SCHEMA_FILES = [
  'p31-state/schema.sql',
  'workers/love-ledger/db/schema.sql',
  'p31-inventory-service/src/database/schema.sql',
  '04_SOFTWARE/unified-k4-cage/schema.sql',
];

const ROOT = path.resolve(__dirname, '../../../../');

function readSchema(relativePath: string): string {
  const fullPath = path.join(ROOT, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Schema file not found: ${fullPath}`);
  }
  return readFileSync(fullPath, 'utf-8');
}

function extractCreateTables(sql: string): Array<{ name: string; columns: string[] }> {
  const tables: Array<{ name: string; columns: string[] }> = [];
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = createRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('--') && !line.startsWith('CREATE') && !line.startsWith('INDEX'))
      .map((line) => line.replace(/,.*$/, '').trim())
      .filter((line) => line.length > 0);

    tables.push({ name: tableName, columns });
  }

  return tables;
}

function hasColumn(table: { columns: string[] }, colName: string): boolean {
  return table.columns.some((col) => {
    const normalized = col.toUpperCase().replace(/\s+/g, ' ').trim();
    return normalized.startsWith(colName.toUpperCase() + ' ') || normalized === colName.toUpperCase();
  });
}

function getColumnType(table: { columns: string[] }, colName: string): string | null {
  for (const col of table.columns) {
    const normalized = col.toUpperCase().replace(/\s+/g, ' ').trim();
    if (normalized.startsWith(colName.toUpperCase() + ' ')) {
      const after = col.trim().slice(colName.length).trim();
      const typeMatch = after.match(/^(\w+)/);
      return typeMatch ? typeMatch[1].toUpperCase() : null;
    }
  }
  return null;
}

describe('CRDT schema integrity', () => {
  describe('schema file existence and basic structure', () => {
    it.each(SCHEMA_FILES)('%s exists and is readable', (filePath) => {
      const sql = readSchema(filePath);
      expect(sql.length).toBeGreaterThan(0);
    });

    it.each(SCHEMA_FILES)('%s has at least one CREATE TABLE statement', (filePath) => {
      const sql = readSchema(filePath);
      const tables = extractCreateTables(sql);
      expect(tables.length).toBeGreaterThan(0);
    });
  });

  describe('CRDT column presence', () => {
    it('p31-state/schema.sql: inventory_events has _crdt_clock', () => {
      const sql = readSchema('p31-state/schema.sql');
      const tables = extractCreateTables(sql);
      const inventoryEvents = tables.find((t) => t.name === 'inventory_events');
      expect(inventoryEvents).toBeDefined();
      expect(hasColumn(inventoryEvents!, '_crdt_clock')).toBe(true);
    });

    it('workers/love-ledger/db/schema.sql: love_ledger has _crdt_clock', () => {
      const sql = readSchema('workers/love-ledger/db/schema.sql');
      const tables = extractCreateTables(sql);
      const loveLedger = tables.find((t) => t.name === 'love_ledger');
      expect(loveLedger).toBeDefined();
      expect(hasColumn(loveLedger!, '_crdt_clock')).toBe(true);
    });

    it('workers/love-ledger/db/schema.sql: love_balance has _crdt_clock', () => {
      const sql = readSchema('workers/love-ledger/db/schema.sql');
      const tables = extractCreateTables(sql);
      const loveBalance = tables.find((t) => t.name === 'love_balance');
      expect(loveBalance).toBeDefined();
      expect(hasColumn(loveBalance!, '_crdt_clock')).toBe(true);
    });

    it('p31-inventory-service/src/database/schema.sql: inventory_events has _crdt_clock', () => {
      const sql = readSchema('p31-inventory-service/src/database/schema.sql');
      const tables = extractCreateTables(sql);
      const inventoryEvents = tables.find((t) => t.name === 'inventory_events');
      expect(inventoryEvents).toBeDefined();
      expect(hasColumn(inventoryEvents!, '_crdt_clock')).toBe(true);
    });

    it('p31-inventory-service/src/database/schema.sql: products has _crdt_clock', () => {
      const sql = readSchema('p31-inventory-service/src/database/schema.sql');
      const tables = extractCreateTables(sql);
      const products = tables.find((t) => t.name === 'products');
      expect(products).toBeDefined();
      expect(hasColumn(products!, '_crdt_clock')).toBe(true);
    });

    it('p31-inventory-service/src/database/schema.sql: locations has _crdt_clock', () => {
      const sql = readSchema('p31-inventory-service/src/database/schema.sql');
      const tables = extractCreateTables(sql);
      const locations = tables.find((t) => t.name === 'locations');
      expect(locations).toBeDefined();
      expect(hasColumn(locations!, '_crdt_clock')).toBe(true);
    });

    it('p31-inventory-service/src/database/schema.sql: stock_items has _crdt_clock', () => {
      const sql = readSchema('p31-inventory-service/src/database/schema.sql');
      const tables = extractCreateTables(sql);
      const stockItems = tables.find((t) => t.name === 'stock_items');
      expect(stockItems).toBeDefined();
      expect(hasColumn(stockItems!, '_crdt_clock')).toBe(true);
    });

    it('04_SOFTWARE/unified-k4-cage/schema.sql: sync_queue has _crdt_clock', () => {
      const sql = readSchema('04_SOFTWARE/unified-k4-cage/schema.sql');
      const tables = extractCreateTables(sql);
      const syncQueue = tables.find((t) => t.name === 'sync_queue');
      expect(syncQueue).toBeDefined();
      expect(hasColumn(syncQueue!, '_crdt_clock')).toBe(true);
    });
  });

  describe('_crdt_clock column type', () => {
    it('p31-state/schema.sql: _crdt_clock is INTEGER', () => {
      const sql = readSchema('p31-state/schema.sql');
      const tables = extractCreateTables(sql);
      const inventoryEvents = tables.find((t) => t.name === 'inventory_events');
      expect(inventoryEvents).toBeDefined();
      const colType = getColumnType(inventoryEvents!, '_crdt_clock');
      expect(colType).toBe('INTEGER');
    });

    it('workers/love-ledger/db/schema.sql: love_ledger._crdt_clock is INTEGER', () => {
      const sql = readSchema('workers/love-ledger/db/schema.sql');
      const tables = extractCreateTables(sql);
      const loveLedger = tables.find((t) => t.name === 'love_ledger');
      expect(loveLedger).toBeDefined();
      const colType = getColumnType(loveLedger!, '_crdt_clock');
      expect(colType).toBe('INTEGER');
    });

    it('workers/love-ledger/db/schema.sql: love_balance._crdt_clock is INTEGER', () => {
      const sql = readSchema('workers/love-ledger/db/schema.sql');
      const tables = extractCreateTables(sql);
      const loveBalance = tables.find((t) => t.name === 'love_balance');
      expect(loveBalance).toBeDefined();
      const colType = getColumnType(loveBalance!, '_crdt_clock');
      expect(colType).toBe('INTEGER');
    });

    it('p31-inventory-service/src/database/schema.sql: _crdt_clock is BIGINT', () => {
      const sql = readSchema('p31-inventory-service/src/database/schema.sql');
      const tables = extractCreateTables(sql);
      const inventoryEvents = tables.find((t) => t.name === 'inventory_events');
      expect(inventoryEvents).toBeDefined();
      const colType = getColumnType(inventoryEvents!, '_crdt_clock');
      expect(colType).toBe('BIGINT');
    });

    it('04_SOFTWARE/unified-k4-cage/schema.sql: _crdt_clock is INTEGER', () => {
      const sql = readSchema('04_SOFTWARE/unified-k4-cage/schema.sql');
      const tables = extractCreateTables(sql);
      const syncQueue = tables.find((t) => t.name === 'sync_queue');
      expect(syncQueue).toBeDefined();
      const colType = getColumnType(syncQueue!, '_crdt_clock');
      expect(colType).toBe('INTEGER');
    });
  });

  describe('CRDT column consistency within files', () => {
    it('p31-inventory-service: all tables with CRDT columns have both _crdt_clock and _crdt_node_id', () => {
      const sql = readSchema('p31-inventory-service/src/database/schema.sql');
      const tables = extractCreateTables(sql);

      const crdtTables = tables.filter((t) => hasColumn(t, '_crdt_clock'));
      expect(crdtTables.length).toBeGreaterThan(0);

      for (const table of crdtTables) {
        expect(hasColumn(table, '_crdt_node_id')).toBe(true);
      }
    });

    it('p31-state: tables with _crdt_clock also have _crdt_node_id', () => {
      const sql = readSchema('p31-state/schema.sql');
      const tables = extractCreateTables(sql);

      const crdtTables = tables.filter((t) => hasColumn(t, '_crdt_clock'));
      expect(crdtTables.length).toBeGreaterThan(0);

      for (const table of crdtTables) {
        expect(hasColumn(table, '_crdt_node_id')).toBe(true);
      }
    });

    it('love-ledger: tables with _crdt_clock also have _crdt_node_id', () => {
      const sql = readSchema('workers/love-ledger/db/schema.sql');
      const tables = extractCreateTables(sql);

      const crdtTables = tables.filter((t) => hasColumn(t, '_crdt_clock'));
      expect(crdtTables.length).toBeGreaterThan(0);

      for (const table of crdtTables) {
        expect(hasColumn(table, '_crdt_node_id')).toBe(true);
      }
    });

    it('unified-k4-cage: tables with _crdt_clock also have _crdt_node_id', () => {
      const sql = readSchema('04_SOFTWARE/unified-k4-cage/schema.sql');
      const tables = extractCreateTables(sql);

      const crdtTables = tables.filter((t) => hasColumn(t, '_crdt_clock'));
      expect(crdtTables.length).toBeGreaterThan(0);

      for (const table of crdtTables) {
        expect(hasColumn(table, '_crdt_node_id')).toBe(true);
      }
    });

    it('p31-inventory-service: all tables have _crdt_clock (full CRDT coverage)', () => {
      const sql = readSchema('p31-inventory-service/src/database/schema.sql');
      const tables = extractCreateTables(sql);

      for (const table of tables) {
        expect(hasColumn(table, '_crdt_clock')).toBe(true);
      }
    });
  });
});
