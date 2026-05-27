/**
 * ShakeStream.tsx — RAG streaming response component.
 *
 * Consumes a streaming LiteLLM response and renders it token-by-token.
 * Respects spoon-state typography from AtmosphereProvider.
 *
 * Triggered when IntentEngine detects a `?` or `/ask` prefix.
 * Performs: embed query → vector search ChaosVault → stream LiteLLM response.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { embedText } from '../lib/Embedder';
import { getChaosVault } from '../lib/ChaosVault';

interface StreamMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Props {
  query: string;
  onComplete: () => void;
  onError: (msg: string) => void;
}

const LITELLM_CHAT_URL = 'http://localhost:4000/v1/chat/completions';

/**
 * Perform cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export const ShakeStream: React.FC<Props> = ({ query, onComplete, onError }) => {
  const { spoons, grayRock } = useAtmosphere();
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [contextUsed, setContextUsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const runRAG = useCallback(async () => {
    setLoading(true);
    setResponse('');

    try {
      // 1. Embed the query
      const queryEmbedding = await embedText(query);
      if (queryEmbedding.length === 0) {
        throw new Error('Embedding failed — is LiteLLM running on localhost:4000?');
      }

      // 2. Search ChaosVault for top-3 similar entries
      const db = await getChaosVault();
      const { rows } = await db.query<{
        id: string; raw_text: string; embedding: Buffer | null; source_door: string;
      }>(
        `SELECT id, raw_text, embedding, source_door FROM unified_knowledge_graph WHERE embedding IS NOT NULL`
      );

      const scored = rows
        .filter((r) => r.embedding && r.embedding.byteLength > 0)
        .map((r) => {
          const emb = Array.from(new Float32Array(r.embedding!.buffer));
          return { ...r, score: cosineSimilarity(queryEmbedding, emb) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      setContextUsed(scored.length);

      // 3. Build context string from top matches
      const contextStr = scored.length > 0
        ? scored.map((s, i) => `[${i + 1}] (from ${s.source_door}, score:${s.score.toFixed(2)}): ${s.rawText}`).join('\n')
        : '';

      // 4. Stream from local LiteLLM
      const messages: StreamMessage[] = [
        {
          role: 'system',
          content: `You are PHOS-01, the Phosphorus Human Operating Surface. You are the sovereign AI operating locally on the operator's machine. You have direct read access to the operator's personal knowledge graph, warehouse inventory, retro vault, family care mesh, and event history.

CRITICAL RULES:
- Answer ONLY from the provided context. Do not hallucinate.
- If context is empty or insufficient, say "I don't have enough data on that yet. Try ingesting more info into the Buffer or Warehouse."
- Be direct, technical, and concise. No fluff, no "As an AI."
- The operator has AuDHD. Be precise. Don't overwhelm.
- Current spoon state: ${spoons}/5 (${grayRock ? 'CRISIS/GRAY_ROCK' : spoons <= 2 ? 'SANCTUARY' : spoons === 3 ? 'BRIDGE' : 'QUANTUM'}).

Available context from knowledge graph:
${contextStr || '(no matching entries found)'}`,
        },
        { role: 'user', content: query },
      ];

      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(LITELLM_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'ollama/qwen2.5-coder:7b',
          messages,
          stream: true,
          temperature: 0.3,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`LiteLLM returned ${res.status}: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              setResponse((prev) => prev + delta);
            }
          } catch {
            // skip malformed SSE chunks
          }
        }
      }

      setLoading(false);
      onComplete();
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'RAG pipeline failed';
      onError(msg);
    }
  }, [query, spoons, grayRock, onComplete, onError]);

  useEffect(() => {
    runRAG();
    return () => {
      abortRef.current?.abort();
    };
  }, [runRAG]);

  const textSize = spoons <= 1 ? 'text-lg leading-relaxed' : spoons <= 2 ? 'text-base leading-relaxed' : 'text-sm font-mono';

  return (
    <div className="w-full mt-4">
      {/* Query echo */}
      <div className="flex items-start gap-3 mb-4">
        <span className="text-xs text-gray-500 mt-1 shrink-0">?</span>
        <p className={`flex-1 ${spoons <= 2 ? 'text-base' : 'text-sm'}`}>{query}</p>
      </div>

      {/* Response stream */}
      <div className="flex items-start gap-3">
        <span className="text-xs mt-1 shrink-0">{loading ? '◉' : '▶'}</span>
        <div className="flex-1 min-h-[2rem]">
          {response ? (
            <p className={`${textSize} whitespace-pre-wrap`}>
              {response}
              {loading && <span className="animate-pulse ml-0.5">▊</span>}
            </p>
          ) : loading ? (
            <p className="text-sm text-gray-500 animate-pulse">Searching knowledge graph{contextUsed > 0 ? ` (${contextUsed} context matches)` : ''}→ synthesizing…</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ShakeStream;
