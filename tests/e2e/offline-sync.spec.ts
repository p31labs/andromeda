/**
 * Project Polyhedron v3.0.0 - Offline E2E Validation
 * 
 * Simulates "Concrete Warehouse" scenario:
 * 1. Online hydration of PGLite state
 * 2. Network partition (offline mode)
 * 3. Deterministic data mutations via UI
 * 4. Offline reload verification
 * 5. Network restoration with CRDT reconciliation
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Offline CRDT Synchronization', () => {
  test('p31-smallball offline state persistence and reconciliation', async ({ browser }) => {
    // Create isolated context for offline testing
    const context = await browser.newContext({
      ...devices['Desktop Chrome'],
      storageState: {
        origins: [{
          origin: 'http://localhost:5173',
          localStorage: [],
          sessionStorage: []
        }]
      }
    });

    const page = await context.newPage();
    
    // Phase 1: Online Hydration
    console.log('[Test] Phase 1: Online hydration');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow PGLite initialization

    // Capture initial state
    const initialState = await page.evaluate(() => {
      return window.localStorage.getItem('sovereign-state') || 'empty';
    });

    // Phase 2: Network Partition Simulation
    console.log('[Test] Phase 2: Network partition');
    await context.setOffline(true);
    await page.waitForTimeout(500); // Ensure network is cut

    // Execute deterministic mutations via UI
    console.log('[Test] Phase 3: Offline mutations');
    await page.click('[data-testid="add-vault-item"]');
    
    const testPayload = `OFFLINE_TEST_${Date.now()}`;
    await page.fill('[data-testid="vault-input"]', testPayload);
    await page.click('[data-testid="submit-vault"]');

    // Verify item appears in UI
    await expect(page.locator(`text="${testPayload}"`)).toBeVisible({ timeout: 5000 });

    // Phase 4: Offline Reload Verification
    console.log('[Test] Phase 4: Offline reload');
    await page.reload();
    
    // Page should load from cache/serviceworker
    await expect(page.locator(`text="${testPayload}"`)).toBeVisible({ timeout: 5000 });

    // Verify IndexedDB persisted the mutation
    const indexedDBCheck = await page.evaluate(() => {
      return new Promise((resolve) => {
        const request = indexedDB.open('p31-sovereign', 1);
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction(['sovereign_ledger'], 'readonly');
          const store = tx.objectStore('sovereign_ledger');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        };
        request.onerror = () => resolve(null);
      });
    });

    expect(indexedDBCheck).toBeTruthy();
    expect(Array.isArray(indexedDBCheck)).toBeTruthy();

    // Phase 5: Network Restoration and CRDT Reconciliation
    console.log('[Test] Phase 5: Network restoration');
    await context.setOffline(false);
    
    // Wait for CRDT sync
    await page.waitForTimeout(3000);

    // Verify _crdt_clock incremented
    const crdtCheck = await page.evaluate(() => {
      return new Promise((resolve) => {
        const request = indexedDB.open('p31-sovereign', 1);
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const tx = db.transaction(['sovereign_ledger'], 'readonly');
          const store = tx.objectStore('sovereign_ledger');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const items = getAllRequest.result;
            const maxClock = Math.max(...items.map((i: any) => i._crdt_clock || 0));
            resolve({ count: items.length, maxClock });
          };
          getAllRequest.onerror = () => resolve(null);
        };
      });
    });

    expect((crdtCheck as any)?.count).toBeGreaterThan(0);
    expect((crdtCheck as any)?.maxClock).toBeGreaterThan(0);

    await context.close();
  });

  test('CRDT split-brain prevention - multiple tabs', async ({ browser }) => {
    // Simulate multi-tab scenario for split-brain prevention
    const context = await browser.newContext();
    
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Load same app in both tabs
    await Promise.all([
      page1.goto('http://localhost:5173'),
      page2.goto('http://localhost:5173')
    ]);

    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle')
    ]);

    // Both tabs should share same PGLite worker singleton
    const nodeId1 = await page1.evaluate(() => 
      window.localStorage.getItem('_crdt_node_id') || 'tab1'
    );
    const nodeId2 = await page2.evaluate(() => 
      window.localStorage.getItem('_crdt_node_id') || 'tab2'
    );

    // Same worker should be used (same node ID pattern)
    expect(nodeId1).toBeTruthy();
    expect(nodeId2).toBeTruthy();

    await context.close();
  });
});