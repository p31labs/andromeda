// PGLite Database Manager
// Local-first PostgreSQL in the browser

import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';
import { INITIAL_SCHEMA, MIGRATIONS, GET_VERSION_SQL, RECORD_MIGRATION_SQL } from './schema';

let db: PGlite | null = null;

// Database initialization with migrations
export async function initDatabase(): Promise<PGlite> {
  if (db) return db;

  // Initialize PGLite with live query extension
  db = await PGlite.create({
    extensions: { live },
    // PGLite persists to IndexedDB automatically
  });

  // Run migrations
  await runMigrations(db);

  console.log('[PGLite] Database initialized');
  return db;
}

// Migration runner
async function runMigrations(db: PGlite): Promise<void> {
  // Create migrations table if not exists
  await db.exec(GET_VERSION_SQL);
  
  // Get current version
  const versionResult = await db.query<{ current_version: number }>(
    'SELECT COALESCE(MAX(version), 0) as current_version FROM schema_migrations'
  );
  const currentVersion = versionResult.rows[0]?.current_version ?? 0;

  // Apply pending migrations
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`[PGLite] Applying migration ${migration.version}: ${migration.name}`);
      await db.exec(migration.sql);
      await db.query(RECORD_MIGRATION_SQL, [migration.version, migration.name]);
    }
  }
}

// Get database instance (throws if not initialized)
export function getDatabase(): PGlite {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Reset database (for testing)
export async function resetDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
  // Clear IndexedDB
  const databases = await indexedDB.databases();
  for (const database of databases) {
    if (database.name?.includes('pglite')) {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(database.name!);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  }
}

// Export for direct queries
export { db };
