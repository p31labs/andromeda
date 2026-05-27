/**
 * ChaosVault.ts — Unified Knowledge Graph
 *
 * Master PGLite instance for cross-surface data aggregation.
 * Stores embeddings via pgvector for local semantic search.
 *
 * Schema: unified_knowledge_graph(id, source_door, raw_text, embedding, metadata, created_at)
 */

import { PGlite } from '@electric-sql/pglite';

export interface KnowledgeEntry {
  id: string;
  sourceDoor: string;
  rawText: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  createdAt: number;
}

let dbInstance: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

async function createSchema(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS unified_knowledge_graph (
      id TEXT PRIMARY KEY,
      source_door TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      embedding BLOB,
      metadata JSON DEFAULT '{}',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ukg_door ON unified_knowledge_graph(source_door);
    CREATE INDEX IF NOT EXISTS idx_ukg_created ON unified_knowledge_graph(created_at);
  `);
}

export async function getChaosVault(): Promise<PGlite> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = new PGlite('idb://p31-chaos-vault');
      await db.waitReady;
      await createSchema(db);
      dbInstance = db;
      return db;
    } catch (err) {
      console.error('[ChaosVault] Init failed:', err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export async function ingestToChaosVault(
  sourceDoor: string,
  rawText: string,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const db = await getChaosVault();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = Date.now();

  await db.query(
    `INSERT INTO unified_knowledge_graph (id, source_door, raw_text, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, sourceDoor, rawText, JSON.stringify(metadata), createdAt]
  );

  return id;
}

export async function updateEmbedding(id: string, embedding: number[]): Promise<void> {
  const db = await getChaosVault();
  const blob = new Float32Array(embedding);
  await db.query(
    `UPDATE unified_knowledge_graph SET embedding = $1 WHERE id = $2`,
    [Buffer.from(blob.buffer), id]
  );
}

export async function queryByDoor(sourceDoor: string, limit = 50): Promise<KnowledgeEntry[]> {
  const db = await getChaosVault();
  const { rows } = await db.query<{
    id: string;
    source_door: string;
    raw_text: string;
    embedding: Buffer | null;
    metadata: string;
    created_at: number;
  }>(
    `SELECT id, source_door, raw_text, embedding, metadata, created_at
     FROM unified_knowledge_graph
     WHERE source_door = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [sourceDoor, limit]
  );

  return rows.map((r) => ({
    id: r.id,
    sourceDoor: r.source_door,
    rawText: r.raw_text,
    embedding: r.embedding ? Array.from(new Float32Array(r.embedding.buffer)) : null,
    metadata: JSON.parse(r.metadata || '{}'),
    createdAt: r.created_at,
  }));
}

export async function recentEntries(limit = 20): Promise<KnowledgeEntry[]> {
  const db = await getChaosVault();
  const { rows } = await db.query<{
    id: string;
    source_door: string;
    raw_text: string;
    embedding: Buffer | null;
    metadata: string;
    created_at: number;
  }>(
    `SELECT id, source_door, raw_text, embedding, metadata, created_at
     FROM unified_knowledge_graph
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return rows.map((r) => ({
    id: r.id,
    sourceDoor: r.source_door,
    rawText: r.raw_text,
    embedding: r.embedding ? Array.from(new Float32Array(r.embedding.buffer)) : null,
    metadata: JSON.parse(r.metadata || '{}'),
    createdAt: r.created_at,
  }));
}

export async function getDoorStats(): Promise<Record<string, number>> {
  const db = await getChaosVault();
  const { rows } = await db.query<{ source_door: string; count: number }>(
    `SELECT source_door, COUNT(*) as count FROM unified_knowledge_graph GROUP BY source_door`
  );
  const stats: Record<string, number> = {};
  for (const r of rows) {
    stats[r.source_door] = Number(r.count);
  }
  return stats;
}
