import { PGlite } from '@electric-sql/pglite';
import { Store } from 'tinybase';

/**
 * P31 Local Sync Engine
 * Silently flushes volatile UI state down to the durable PGLite instance.
 */
export function startMatriarchSync(db: PGlite, store: Store) {
  // Listen for any mutations on rows within the 'batches' table
  store.addRowListener('batches', null, async (store, tableId, rowId) => {
    const currentStatus = store.getCell(tableId, rowId, 'status');
    
    // We only care about state transitions to 'completed' for this MVP
    if (currentStatus === 'completed') {
      try {
        await db.query(
          `UPDATE batches SET status = $1 WHERE id = $2`,
          [currentStatus, rowId]
        );
        console.info(`[P31 Sync] Batch ${rowId} successfully flushed to PGLite.`);
      } catch (err) {
        console.error(`[P31 Sync Failure] Could not persist batch ${rowId}:`, err);
        // Fallback: Revert the UI state if the disk write catastrophically fails
        // store.setCell(tableId, rowId, 'status', 'pending');
      }
    }
  });
}
