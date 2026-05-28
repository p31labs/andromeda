/**
 * Embedder.ts — Local Vectorization Bridge
 *
 * Sends raw text to local LiteLLM proxy targeting nomic-embed-text.
 * Returns float array for PGLite BLOB storage.
 *
 * Features:
 * - Configurable endpoint (defaults to localhost:4000)
 * - Retry with exponential backoff (3 attempts)
 * - Batch embedding with concurrency control
 * - Combined ingest+embed operation
 */

const DEFAULT_EMBED_URL = 'http://localhost:4000/v1/embeddings';
const EMBED_MODEL = 'nomic-embed-text';
const EMBED_DIM = 768;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;
const BATCH_CONCURRENCY = 2;
const BATCH_DELAY_MS = 100;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_INPUT_CHARS = 8192;

export interface EmbedResponse {
  data: Array<{ embedding: number[] }>;
}

export interface EmbedderOptions {
  embedUrl?: string;
  model?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

let globalOptions: EmbedderOptions = {};

/**
 * Configure the embedder globally. Call once at app init.
 */
export function configureEmbedder(opts: EmbedderOptions): void {
  globalOptions = { ...globalOptions, ...opts };
}

function getEmbedUrl(): string {
  return globalOptions.embedUrl ?? DEFAULT_EMBED_URL;
}

function getModel(): string {
  return globalOptions.model ?? EMBED_MODEL;
}

function getTimeout(): number {
  return globalOptions.timeoutMs ?? FETCH_TIMEOUT_MS;
}

/**
 * Sleep utility for retry backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Embed a single text string via local LiteLLM.
 * Returns the embedding vector (768 dims for nomic-embed-text).
 * Returns empty array on failure — never throws.
 *
 * Retries up to MAX_RETRIES times with exponential backoff.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text || !text.trim()) return [];

  const input = text.slice(0, MAX_INPUT_CHARS);
  const maxRetries = globalOptions.maxRetries ?? MAX_RETRIES;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(getEmbedUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: getModel(), input }),
        signal: AbortSignal.timeout(getTimeout()),
      });

      if (!response.ok) {
        if (attempt < maxRetries) {
          await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
          continue;
        }
        console.warn(`[Embedder] HTTP ${response.status} after ${maxRetries} retries`);
        return [];
      }

      const data: EmbedResponse = await response.json();
      const vec = data.data?.[0]?.embedding ?? [];
      if (vec.length !== EMBED_DIM) {
        console.warn(`[Embedder] Unexpected dimension: ${vec.length} (expected ${EMBED_DIM})`);
      }
      return vec;
    } catch (err) {
      if (attempt < maxRetries) {
        await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
        continue;
      }
      console.warn('[Embedder] Failed after retries:', err instanceof Error ? err.message : String(err));
      return [];
    }
  }

  return [];
}

/**
 * Embed multiple texts with controlled concurrency.
 * Processes BATCH_CONCURRENCY texts in parallel, with delay between batches.
 * Returns array of embedding arrays (same order as input).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += BATCH_CONCURRENCY) {
    const batch = texts.slice(i, i + BATCH_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((text) => embedText(text))
    );
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
    if (i + BATCH_CONCURRENCY < texts.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}

/**
 * Ingest text into ChaosVault and embed it in one operation.
 * Primary entry point for the Buffer and Archive surfaces.
 */
export async function ingestAndEmbed(
  sourceDoor: string,
  rawText: string,
  metadata: Record<string, unknown> = {}
): Promise<{ id: string; embedded: boolean }> {
  const { ingestToChaosVault, updateEmbedding } = await import('./ChaosVault');

  const id = await ingestToChaosVault(sourceDoor, rawText, metadata);
  const embedding = await embedText(rawText);

  if (embedding.length > 0) {
    await updateEmbedding(id, embedding);
    return { id, embedded: true };
  }

  return { id, embedded: false };
}

/**
 * Ingest and embed multiple chunks. Each chunk is stored as a
 * separate knowledge graph entry with its own embedding.
 * Returns the count of successfully embedded chunks.
 */
export async function ingestAndEmbedChunks(
  chunks: Array<{ text: string; sourceDoor: string; metadata?: Record<string, unknown> }>,
): Promise<{ total: number; embedded: number }> {
  const { ingestToChaosVault, updateEmbedding } = await import('./ChaosVault');

  let embedded = 0;
  const texts = chunks.map((c) => c.text);
  const embeddings = await embedBatch(texts);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const id = await ingestToChaosVault(chunk.sourceDoor, chunk.text, chunk.metadata ?? {});

    if (embeddings[i].length > 0) {
      await updateEmbedding(id, embeddings[i]);
      embedded++;
    }
  }

  return { total: chunks.length, embedded };
}
