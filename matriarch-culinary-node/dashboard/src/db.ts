import { PGlite } from '@electric-sql/pglite';
import { createStore as createDatabase, Table } from 'tinybase';
import { startMatriarchSync } from './tinybase-sync';

export interface CulinaryStore {
  db: PGlite;
  store: ReturnType<typeof createDatabase>;
}

export async function initMatriarchDB(): Promise<CulinaryStore> {
  // idb:// prefix ensures survival across browser restarts
  const db = new PGlite('idb://matriarch-culinary-db');
  await db.waitReady;

  // Idempotent schema creation
  await db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      recipe_name TEXT NOT NULL,
      context TEXT NOT NULL,
      target_servings INTEGER NOT NULL,
      status TEXT NOT NULL
    );
  `);

  const store = createDatabase();
  // Hydrate TinyBase from PGLite
  const rows = await db.query('SELECT * FROM batches WHERE status = $1', ['pending']);
  rows.rows.forEach((row: any) => {
    store.setRow('batches', row.id, {
      recipe_name: row.recipe_name,
      context: row.context,
      target_servings: row.target_servings,
      status: row.status
    });
  });

  // NOTE: In Phase B, the TinyBase sync listener will be attached here 
  // to push local UI clicks back down to PGLite.

  // START THE SYNC ENGINE
  startMatriarchSync(db, store);

  return { db, store };
}
