/**
 * Embedder.ts — Local Vectorization Bridge
 *
 * Sends raw text to local LiteLLM proxy (localhost:4000) targeting nomic-embed-text.
 * Returns float array for pgvector storage.
 */

const LITELLM_EMBED_URL = 'http://localhost:4000/v1/embeddings';
const EMBED_MODEL = 'nomic-embed-text';

export interface EmbedResponse {
  data: Array<{ embedding: number[] }>;
}

/**
 * Embed a single text string via local LiteLLM.
 * Returns the embedding vector (768 dims for nomic-embed-text).
 * Returns empty array on failure — never throws.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text || !text.trim()) return [];

  try {
    const response = await fetch(LITELLM_EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: text.slice(0, 8192), // nomic-embed-text token limit
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.warn(`[Embedder] HTTP ${response.status}: ${response.statusText}`);
      return [];
    }

    const data: EmbedResponse = await response.json();
    return data.data?.[0]?.embedding ?? [];
  } catch (err) {
    console.warn('[Embedder] Failed:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Embed multiple texts in batch. Returns array of embedding arrays.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const vec = await embedText(text);
    results.push(vec);
    // Small delay to avoid overwhelming the local LLM
    await new Promise((r) => setTimeout(r, 100));
  }
  return results;
}

/**
 * Ingest text into ChaosVault and embed it in one operation.
 * This is the primary entry point for the OmniscientObserver.
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
