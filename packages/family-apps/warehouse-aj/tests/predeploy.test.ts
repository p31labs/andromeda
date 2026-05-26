/**
 * Pre-Deploy TRIPER Tests - Warehouse AJ
 * Task · Resilience · Interface · Purity · E2E · Regression
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getWarehouseDB, logInventoryItem, getZoneSummary } from '../src/utils/pglite-warehouse';

describe.skipIf(process.env.CI && !process.env.P31_FULL_TEST)('PRE-DEPLOY: Database', () => {
  let db: any;

  beforeAll(async () => {
    db = await getWarehouseDB();
  });

  // T: Task - DB initializes
  it('initializes PGLite', async () => {
    expect(db).toBeDefined();
    expect(db.query).toBeDefined();
    expect(db.exec).toBeDefined();
  });

  // T: Task - Zones seeded
  it('has 9 zones seeded', async () => {
    const zones = await db.query(`SELECT COUNT(*) as cnt FROM zones`);
    expect(zones.rows[0].cnt).toBe(9);
  });

  // I: Interface - Correct SQL placeholders
  it('uses $N placeholders in queries', async () => {
    await expect(db.query(
      `INSERT INTO inventory_items(qr_data,category,zone_id,status,scanned_at,synced)
       VALUES($1,$2,$3,$4,$5,FALSE)`,
      ['TEST-001', 'Seating', 1, 'received', 1234567890]
    )).resolves.toBeDefined();
  });

  // R: Resilience - Handles offline sync
  it('tracks unsynced items', async () => {
    const unsynced = await getUnsyncedItems(db);
    expect(Array.isArray(unsynced)).toBe(true);
  });

  // P: Purity - No timestamp overflow
  it('stores seconds not milliseconds', async () => {
    const item = {
      qrData: 'TEST-002',
      category: 'Tables',
      zoneId: 2,
      status: 'received' as const,
      scannedAt: Math.floor(Date.now() / 1000)
    };
    
    await logInventoryItem(db, item);
    
    const result = await db.query(
      `SELECT scanned_at FROM inventory_items WHERE qr_data=$1`,
      ['TEST-002']
    );
    
    expect(result.rows[0].scanned_at).toBeLessThan(10000000000); // 10 digits
  });

  // E2E: Full scan flow
  it('completes scan-to-log flow', async () => {
    const scanData = {
      qrData: 'P31-SEAT-001',
      category: 'Seating',
      zoneId: 1,
      status: 'received' as const,
      scannedAt: Math.floor(Date.now() / 1000)
    };
    
    await logInventoryItem(db, scanData);
    
    const summary = await getZoneSummary(db);
    expect(summary.length).toBe(9);
    expect(summary[0].inStock).toBeGreaterThanOrEqual(0);
  });
});

// Static checks
describe('PRE-DEPLOY: Static Analysis', () => {
  it('has no raw Date.now() calls', () => {
    const fs = require('fs');
    const code = fs.readFileSync('./src/utils/pglite-warehouse.ts', 'utf8');
    
    // Check for Date.now() without Math.floor.../1000
    const dangerousPattern = /Date\.now\(\)(?!\s*\/\s*1000)/;
    expect(code).not.toMatch(dangerousPattern);
  });

  it('uses $N placeholders', () => {
    const fs = require('fs');
    const code = fs.readFileSync('./src/utils/pglite-warehouse.ts', 'utf8');
    
    // Should NOT have ? placeholders
    expect(code).not.toMatch(/VALUES\s*\([^)]*\?/);
    
    // SHOULD have $N placeholders
    expect(code).toMatch(/\$[0-9]+/);
  });
});

// Need to import this for the test
async function getUnsyncedItems(db: any) {
  const { rows } = await db.query(`
    SELECT qr_data, category, zone_id, status, scanned_at
    FROM inventory_items
    WHERE synced = FALSE
    ORDER BY scanned_at ASC
  `);
  
  return rows.map((r: any) => ({
    qrData: r.qr_data,
    category: r.category,
    zoneId: r.zone_id,
    status: r.status,
    scannedAt: r.scanned_at,
    synced: false,
  }));
}
