/**
 * ChaosVault.ts — Unified Knowledge Graph + Chaos Buffer
 *
 * Master PGLite instance for cross-surface data aggregation.
 * Stores embeddings for local semantic search.
 * Also manages an append-only chaos log for TheBuffer surface.
 *
 * Tables:
 *   unified_knowledge_graph(id, source_door, raw_text, embedding, metadata, created_at)
 *   chaos_log(id, chaos, spoons, created_at)
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

export interface ChaosEntry {
  id: string;
  chaos: string;
  spoons: number;
  timestamp: number;
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
    CREATE TABLE IF NOT EXISTS chaos_log (
      id TEXT PRIMARY KEY,
      chaos TEXT NOT NULL,
      spoons INTEGER NOT NULL DEFAULT 3,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chaos_created ON chaos_log(created_at DESC);
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
    [new Uint8Array(blob.buffer), id]
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

// --- Chaos Log (for TheBuffer) ---

const CHAOS_LOG_STORAGE_KEY = 'p31_chaos_log';

/**
 * Ingest a chaos entry. Dual-writes to PGLite (persistent)
 * and localStorage (fast read path for TheBuffer).
 */
export async function ingestChaos(chaos: string, spoons: number): Promise<string> {
  const id = `chaos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ts = Date.now();

  try {
    const db = await getChaosVault();
    await db.query(
      `INSERT INTO chaos_log (id, chaos, spoons, created_at) VALUES ($1, $2, $3, $4)`,
      [id, chaos, spoons, ts]
    );
  } catch {
    // PGLite unavailable — fall through to localStorage
  }

  try {
    const raw = localStorage.getItem(CHAOS_LOG_STORAGE_KEY);
    const log: Array<{ id: string; chaos: string; spoons: number; timestamp: number }> = raw ? JSON.parse(raw) : [];
    log.push({ id, chaos, spoons, timestamp: ts });
    localStorage.setItem(CHAOS_LOG_STORAGE_KEY, JSON.stringify(log));
  } catch {
    // localStorage full or unavailable
  }

  return id;
}

/**
 * Retrieve chaos log entries, newest first.
 * Reads from localStorage (fast path) without blocking on PGLite.
 */
export async function getChaosLog(): Promise<ChaosEntry[]> {
  try {
    const raw = localStorage.getItem(CHAOS_LOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Array<{ id: string; chaos: string; spoons: number; timestamp: number }>;
      return parsed
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((e) => ({ id: e.id, chaos: e.chaos, spoons: e.spoons, timestamp: e.timestamp }));
    }
  } catch {
    // corrupt data — fall through
  }

  // Fallback: read from PGLite
  try {
    const db = await getChaosVault();
    const { rows } = await db.query<{ id: string; chaos: string; spoons: number; created_at: number }>(
      `SELECT id, chaos, spoons, created_at FROM chaos_log ORDER BY created_at DESC`
    );
    return rows.map((r) => ({ id: r.id, chaos: r.chaos, spoons: r.spoons, timestamp: r.created_at }));
  } catch {
    return [];
  }
}

/**
 * Fetch all knowledge graph entries with embeddings.
 * Used by the RAG search pipeline. Returns raw rows for VectorMath.rankSearchResults().
 */
export async function getAllEmbeddedRows(): Promise<
  Array<{ id: string; raw_text: string; embedding: BufferSource | null; source_door: string }>
> {
  const db = await getChaosVault();
  const { rows } = await db.query<{
    id: string;
    raw_text: string;
    embedding: ArrayBuffer | null;
    source_door: string;
  }>(
    `SELECT id, raw_text, embedding, source_door FROM unified_knowledge_graph WHERE embedding IS NOT NULL`
  );
  return rows.map((r) => ({
    id: r.id,
    raw_text: r.raw_text,
    embedding: r.embedding,
    source_door: r.source_door,
  }));
}

/**
 * Ingest and embed multiple chunks in one operation.
 * Returns the number of successfully embedded chunks.
 */
export async function ingestChunks(
  chunks: Array<{ text: string; sourceDoor: string; metadata?: Record<string, unknown> }>,
  embedFn: (text: string) => Promise<number[]>,
): Promise<number> {
  const db = await getChaosVault();
  let embedded = 0;

  for (const chunk of chunks) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const embedding = await embedFn(chunk.text);

    await db.query(
      `INSERT INTO unified_knowledge_graph (id, source_door, raw_text, embedding, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        chunk.sourceDoor,
        chunk.text,
        embedding.length > 0 ? new Uint8Array(new Float32Array(embedding).buffer) : null,
        JSON.stringify(chunk.metadata ?? {}),
        Date.now(),
      ]
    );

    if (embedding.length > 0) embedded++;
  }

  return embedded;
}
