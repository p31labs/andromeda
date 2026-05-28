/**
 * VectorMath.ts — Shared vector math utilities for RAG pipeline.
 *
 * Single source of truth for cosine similarity, vector operations,
 * and result scoring across Archive, ShakeStream, and TheArchive.
 *
 * Optimized for browser: avoids alloc in hot loop, uses typed arrays
 * for BLOB↔vector round-trips, caches magnitude when bulk-scoring.
 */

export interface ScoredEntry {
  id: string;
  rawText: string;
  sourceDoor: string;
  score: number;
}

export interface SearchResult extends ScoredEntry {
  rank: number;
}

const EMBED_DIM_NOMIC = 768;

/**
 * Cosine similarity between two vectors.
 * Zero-alloc hot loop. Returns 0 on dimension mismatch or zero magnitude.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = a.length;
  if (len === 0 || len !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) {
    const ai = a[i], bi = b[i];
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Precompute magnitude for a vector. Use with cosineSimilarityNorm
 * when scoring one query against many entries to avoid recomputing
 * the query magnitude each iteration.
 */
export function vectorMagnitude(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

/**
 * Cosine similarity where query magnitude is precomputed.
 * Faster than cosineSimilarity when reusing the same query vector.
 */
export function cosineSimilarityNorm(query: number[], queryMag: number, doc: number[]): number {
  if (query.length === 0 || query.length !== doc.length || queryMag === 0) return 0;
  let dot = 0, magB = 0;
  for (let i = 0; i < query.length; i++) {
    dot += query[i] * doc[i];
    magB += doc[i] * doc[i];
  }
  const denom = queryMag * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Convert PGLite BLOB (Buffer/Uint8Array) to number array.
 * Handles both Node Buffer and browser ArrayBuffer from IndexedDB.
 */
export function blobToVector(blob: BufferSource | null): number[] {
  if (!blob || blob.byteLength === 0) return [];
  const arr = blob instanceof ArrayBuffer ? new Float32Array(blob) : new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
  return Array.from(arr);
}

/**
 * Convert number array to Float32Array for PGLite BLOB storage.
 */
export function vectorToBlob(vec: number[]): Uint8Array {
  return new Uint8Array(new Float32Array(vec).buffer);
}

/**
 * Expected embedding dimension for the configured model.
 * nomic-embed-text → 768
 */
export function expectedDimensions(): number {
  return EMBED_DIM_NOMIC;
}

/**
 * Validate an embedding vector. Returns true if non-empty and correct dimension.
 */
export function isValidEmbedding(vec: number[]): boolean {
  return vec.length === EMBED_DIM_NOMIC;
}

/**
 * Score and rank all knowledge graph rows against a query vector.
 * Filters by minimum threshold, sorts descending, returns top-k.
 *
 * Performance: O(n*d + n*log(n)) where n=rows, d=dimensions.
 * For <1K rows this runs in <50ms on modern mobile.
 */
export function rankSearchResults(
  queryVec: number[],
  rows: Array<{ id: string; raw_text: string; embedding: BufferSource | null; source_door: string }>,
  options: { topK?: number; threshold?: number } = {},
): SearchResult[] {
  const { topK = 3, threshold = 0.0 } = options;
  const queryMag = vectorMagnitude(queryVec);

  const scored: SearchResult[] = [];
  for (const row of rows) {
    if (!row.embedding || row.embedding.byteLength === 0) continue;
    const docVec = blobToVector(row.embedding);
    const score = cosineSimilarityNorm(queryVec, queryMag, docVec);
    if (score >= threshold) {
      scored.push({
        id: row.id,
        rawText: row.raw_text,
        sourceDoor: row.source_door,
        score,
        rank: 0,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topK);
  for (let i = 0; i < top.length; i++) top[i].rank = i + 1;
  return top;
}

/**
 * Format a SearchResult into a context string slice for LLM prompt.
 * Enforces per-chunk char limit and total context budget.
 */
export function formatContext(
  results: SearchResult[],
  options: { maxPerChunk?: number; maxTotalChars?: number } = {},
): string {
  const { maxPerChunk = 300, maxTotalChars = 2000 } = options;
  let totalChars = 0;
  const parts: string[] = [];

  for (const r of results) {
    const slice = r.rawText.slice(0, maxPerChunk);
    const formatted = `[${r.rank}] (from ${r.sourceDoor}, score:${r.score.toFixed(2)}): ${slice}`;
    if (totalChars + formatted.length > maxTotalChars) break;
    parts.push(formatted);
    totalChars += formatted.length + 1;
  }

  return parts.join('\n');
}

/**
 * Build the system prompt for RAG-aware LLM queries.
 * Includes context block, spoon state, and behavioral constraints.
 */
export function buildSystemPrompt(
  contextStr: string,
  options: {
    spoons: number;
    grayRock: boolean;
    maxResponseTokens?: number;
  },
): string {
  const stateLabel = options.grayRock
    ? 'CRISIS/GRAY_ROCK'
    : options.spoons <= 2 ? 'SANCTUARY'
    : options.spoons === 3 ? 'BRIDGE'
    : 'QUANTUM';

  return `You are PHOS-01, the Phosphorus Human Operating Surface. Sovereign AI operating locally on the operator's machine.\n\nCRITICAL RULES:\n- Answer ONLY from the provided context. Do not hallucinate.\n- If context is insufficient, say "I don't have enough data on that yet. Try ingesting more into the Buffer."\n- Be direct, technical, and concise. No fluff. No "As an AI."\n- The operator has AuDHD. Be precise. Don't overwhelm.\n- Current spoon state: ${options.spoons}/5 (${stateLabel}).\n\nAvailable context:\n${contextStr || '(no matching entries)'}`;
}
