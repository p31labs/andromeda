/**
 * ArchiveSurface.tsx — The Archive (Local RAG Knowledge System).
 *
 * Three sub-modes:
 * 1. Search — RAG query interface: type a question → embed → vector search → stream LLM response
 * 2. Browser — View/search stored knowledge graph entries by door, text, date
 * 3. Ingest — Batch import text/files into the knowledge graph with auto-embedding
 *
 * Uses shared VectorMath utilities for cosine similarity (no duplication).
 * Auto-embeds chunks on ingest for immediate searchability.
 * Configurable similarity threshold and top-k for search tuning.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { embedText, ingestAndEmbedChunks } from '../lib/Embedder';
import {
  getChaosVault, getDoorStats, recentEntries, queryByDoor,
  getAllEmbeddedRows, ingestChunks,
  type KnowledgeEntry,
} from '../lib/ChaosVault';
import { semanticChunker } from '../lib/ChunkingEngine';
import {
  rankSearchResults, formatContext, buildSystemPrompt, isValidEmbedding,
} from '../lib/VectorMath';
import { logEvent } from '../lib/EventLogger';
import biologicalTdp from '../data/biological-tdp.json';

type ArchiveTab = 'search' | 'browse' | 'ingest';

interface Props {
  className?: string;
}

const LITELLM_CHAT_URL = 'http://localhost:4000/v1/chat/completions';

export const ArchiveSurface: React.FC<Props> = ({ className }) => {
  const { spoons, grayRock } = useAtmosphere();
  const [tab, setTab] = useState<ArchiveTab>('search');

  // Search state
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextMatches, setContextMatches] = useState(0);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const [topK, setTopK] = useState(3);
  const [threshold, setThreshold] = useState(0.0);

  // Browse state
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [doorStats, setDoorStats] = useState<Record<string, number>>({});
  const [browseFilter, setBrowseFilter] = useState('');
  const [browseDoor, setBrowseDoor] = useState<string>('all');
  const [browseLoading, setBrowseLoading] = useState(false);

  // Ingest state
  const [ingestText, setIngestText] = useState('');
  const [ingestDoor, setIngestDoor] = useState('archive');
  const [ingestStatus, setIngestStatus] = useState<'idle' | 'chunking' | 'embedding' | 'done' | 'error'>('idle');
  const [ingestCount, setIngestCount] = useState(0);
  const [ingestEmbedded, setIngestEmbedded] = useState(0);

  // Load browse data when tab changes
  const loadBrowseData = useCallback(async () => {
    setBrowseLoading(true);
    try {
      const [stats, recent] = await Promise.all([
        getDoorStats(),
        recentEntries(50),
      ]);
      setDoorStats(stats);
      setEntries(recent);
    } catch {
      setEntries([]);
    }
    setBrowseLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'browse') loadBrowseData();
    // Ingest Biological TDP on first Archive mount (one-time)
    if (!sessionStorage.getItem('btp_ingested')) {
      (async () => {
        try {
          const db = await getChaosVault();
          for (const entry of biologicalTdp.entries) {
            const id = `btp_${entry.id}_${Date.now()}`;
            const embedding = await embedText(entry.summary);
            await db.query(
              'INSERT INTO unified_knowledge_graph (id, source_door, raw_text, embedding, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
              [id, 'biological-tdp', entry.summary, embedding ? Buffer.from(new Float32Array(embedding).buffer) : null, JSON.stringify({ category: entry.category, tags: entry.tags, source: 'biological-tdp' }), Date.now()]
            );
          }
          sessionStorage.setItem('btp_ingested', 'true');
          logEvent('DEVICE_SEALED' as never, { action: 'btp_ingest', entriesIngested: biologicalTdp.entries.length });
        } catch { /* silent — Archive works without BTP */ }
      })();
    }
  }, [tab, loadBrowseData]);

  // --- SEARCH (RAG) ---

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setResponse('');
    setError('');
    setContextMatches(0);
    abortRef.current = new AbortController();

    try {
      // 1. Embed the query
      const queryEmbedding = await embedText(trimmed);
      if (!isValidEmbedding(queryEmbedding)) {
        throw new Error('Embedding failed — is LiteLLM running on localhost:4000?');
      }

      // 2. Fetch all embedded rows and rank via shared VectorMath
      const rows = await getAllEmbeddedRows();
      const results = rankSearchResults(queryEmbedding, rows, { topK, threshold });

      setContextMatches(results.length);

      const contextStr = formatContext(results, { maxPerChunk: 300, maxTotalChars: 2000 });

      // 3. Stream from local LiteLLM
      const messages = [
        {
          role: 'system' as const,
          content: buildSystemPrompt(contextStr, { spoons, grayRock }),
        },
        { role: 'user' as const, content: trimmed },
      ];

      const res = await fetch(LITELLM_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'ollama/qwen2.5-coder:7b', messages, stream: true, temperature: 0.3, max_tokens: 1024 }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`LiteLLM error: ${res.status}`);

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
            if (delta) setResponse((prev) => prev + delta);
          } catch { /* skip malformed SSE */ }
        }
      }

      setLoading(false);
      logEvent('INTENT_ROUTED' as never, { action: 'archive_search', query: trimmed, contextMatches: results.length });
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'RAG pipeline failed';
      setError(msg);
    }
  }, [query, spoons, grayRock, topK, threshold]);

  const filteredBrowseEntries = entries.filter((e) => {
    const matchesDoor = browseDoor === 'all' || e.sourceDoor === browseDoor;
    const matchesText = !browseFilter.trim() || e.rawText.toLowerCase().includes(browseFilter.toLowerCase());
    return matchesDoor && matchesText;
  });

  // --- INGEST (auto-embed) ---

  const handleIngest = useCallback(async () => {
    const trimmed = ingestText.trim();
    if (!trimmed) return;

    setIngestStatus('chunking');
    setIngestCount(0);
    setIngestEmbedded(0);

    try {
      // 1. Chunk semantically
      const chunks = semanticChunker(trimmed, { targetSize: 700, minChunkSize: 40 });
      if (chunks.length === 0) {
        setIngestStatus('done');
        return;
      }

      setIngestStatus('embedding');

      // 2. Prepare ingest format
      const ingestChunks = chunks.map((c) => ({
        text: c.text,
        sourceDoor: ingestDoor,
        metadata: {
          ingested: true,
          heading: c.heading,
          chunkIndex: c.chunkIndex,
          totalChunks: c.totalChunks,
          charCount: c.charCount,
          isCodeBlock: c.isCodeBlock,
        },
      }));

      // 3. Batch embed + store
      const result = await ingestAndEmbedChunks(ingestChunks);

      setIngestCount(result.total);
      setIngestEmbedded(result.embedded);
      setIngestStatus('done');
      setIngestText('');

      logEvent('DEVICE_SEALED' as never, {
        action: 'archive_ingest_chunks',
        door: ingestDoor,
        totalChunks: result.total,
        embeddedChunks: result.embedded,
      });
      loadBrowseData();
    } catch {
      setIngestStatus('error');
    }
  }, [ingestText, ingestDoor, loadBrowseData]);

  const formatTs = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: '#00e5ff' }}>The Archive</h1>
          <p className="text-[10px]" style={{ color: '#224466' }}>Local RAG · Zero API tokens · PGLite backed</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,229,255,0.1)', color: '#00e5ff' }}>
            {Object.values(doorStats).reduce((a, b) => a + b, 0)} entries
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,229,255,0.1)', color: '#39ff14' }}>
            LLM: localhost:4000
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-4">
        {([
          { key: 'search', label: '🔍 Search', desc: 'Ask PHOS' },
          { key: 'browse', label: '📚 Browse', desc: 'Knowledge graph' },
          { key: 'ingest', label: '⬇ Ingest', desc: 'Import data' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 text-center rounded-lg"
            style={{
              backgroundColor: tab === t.key ? 'rgba(0,229,255,0.12)' : 'transparent',
              border: `1px solid ${tab === t.key ? 'rgba(0,229,255,0.3)' : 'rgba(34,68,102,0.3)'}`,
            }}
          >
            <div className="text-xs" style={{ color: tab === t.key ? '#00e5ff' : '#224466' }}>{t.label}</div>
            <div className="text-[9px]" style={{ color: tab === t.key ? '#00e5ff' : '#1a3355' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* SEARCH TAB */}
      {tab === 'search' && (
        <div className="space-y-4">
          {/* Search params */}
          <div className="flex items-center gap-3 text-[10px]" style={{ color: '#224466' }}>
            <label className="flex items-center gap-1">
              top-k:
              <select value={topK} onChange={(e) => setTopK(Number(e.target.value))}
                className="bg-transparent border rounded px-1" style={{ borderColor: '#224466', color: '#445566' }}>
                {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1">
              threshold:
              <select value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
                className="bg-transparent border rounded px-1" style={{ borderColor: '#224466', color: '#445566' }}>
                {[0, 0.1, 0.2, 0.3, 0.4, 0.5].map((n) => <option key={n} value={n}>{n.toFixed(1)}</option>)}
              </select>
            </label>
          </div>

          <form onSubmit={handleSearch}>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask PHOS about your data..."
                className="flex-1 py-3 px-4 text-sm rounded-xl"
                style={{ backgroundColor: 'rgba(0,17,34,0.8)', border: '1px solid #224466', color: '#cce0ff' }}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-5 py-3 text-xs rounded-xl font-semibold disabled:opacity-30"
                style={{ backgroundColor: loading ? '#1a3355' : '#00e5ff', color: loading ? '#224466' : '#001122' }}
              >
                {loading ? '◉ Searching…' : '🔍 Ask'}
              </button>
            </div>
          </form>

          {contextMatches > 0 && (
            <p className="text-[10px]" style={{ color: '#39ff14' }}>
              Found {contextMatches} matching entries in knowledge graph (threshold ≥ {threshold.toFixed(1)}).
            </p>
          )}

          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

          {response && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(0,17,34,0.5)', border: '1px solid #224466' }}>
              <div className="flex items-start gap-3">
                <span className="text-xs mt-0.5" style={{ color: '#00e5ff' }}>▶</span>
                <p className="text-sm whitespace-pre-wrap" style={{ color: '#cce0ff' }}>
                  {response}
                  {loading && <span className="animate-pulse ml-0.5">▊</span>}
                </p>
              </div>
            </div>
          )}

          {!response && !loading && !error && (
            <div className="p-6 rounded-xl text-center" style={{ border: '1px dashed #224466' }}>
              <p className="text-xs" style={{ color: '#224466' }}>
                Search your knowledge graph using your local LLM.
              </p>
              <p className="text-[10px] mt-2" style={{ color: '#1a3355' }}>
                Ingest documents first via the Ingest tab. The more you feed it, the smarter PHOS gets.
              </p>
            </div>
          )}
        </div>
      )}

      {/* BROWSE TAB */}
      {tab === 'browse' && (
        <div className="space-y-3">
          {/* Door stats */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setBrowseDoor('all')}
              className="text-[10px] px-2 py-1 rounded-md"
              style={{
                backgroundColor: browseDoor === 'all' ? 'rgba(0,229,255,0.15)' : 'transparent',
                border: `1px solid ${browseDoor === 'all' ? '#00e5ff' : '#224466'}`,
                color: browseDoor === 'all' ? '#00e5ff' : '#445566',
              }}
            >
              all ({Object.values(doorStats).reduce((a, b) => a + b, 0)})
            </button>
            {Object.entries(doorStats).sort((a, b) => b[1] - a[1]).map(([door, count]) => (
              <button
                key={door}
                onClick={() => setBrowseDoor(door)}
                className="text-[10px] px-2 py-1 rounded-md"
                style={{
                  backgroundColor: browseDoor === door ? 'rgba(0,229,255,0.15)' : 'transparent',
                  border: `1px solid ${browseDoor === door ? '#00e5ff' : '#224466'}`,
                  color: browseDoor === door ? '#00e5ff' : '#445566',
                }}
              >
                {door} ({count})
              </button>
            ))}
          </div>

          {/* Filter */}
          <input
            type="text"
            value={browseFilter}
            onChange={(e) => setBrowseFilter(e.target.value)}
            placeholder="Filter entries..."
            className="w-full py-2 px-3 text-xs rounded-lg"
            style={{ backgroundColor: 'rgba(0,17,34,0.6)', border: '1px solid #224466', color: '#cce0ff' }}
          />

          {/* Entries */}
          {browseLoading ? (
            <p className="text-xs text-center py-4" style={{ color: '#224466' }}>Loading…</p>
          ) : filteredBrowseEntries.length === 0 ? (
            <div className="p-4 rounded-xl text-center" style={{ border: '1px dashed #224466' }}>
              <p className="text-xs" style={{ color: '#224466' }}>
                {entries.length === 0 ? 'Knowledge graph is empty. Ingest data to begin.' : 'No matching entries.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredBrowseEntries.map((e) => (
                <div key={e.id} className="p-3 rounded-xl text-xs"
                  style={{ backgroundColor: 'rgba(0,17,34,0.4)', border: '1px solid #1a3355' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(0,229,255,0.1)', color: '#00e5ff' }}>
                      {e.sourceDoor}
                    </span>
                    <div className="flex items-center gap-2">
                      {e.embedding && (
                        <span className="text-[8px] px-1 py-0.5 rounded"
                          style={{ backgroundColor: 'rgba(57,255,20,0.1)', color: '#39ff14' }}>
                          embedded
                        </span>
                      )}
                      <span className="text-[9px]" style={{ color: '#224466' }}>{formatTs(e.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: '#8899aa' }}>
                    {e.rawText.slice(0, 200)}{e.rawText.length > 200 ? '…' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INGEST TAB */}
      {tab === 'ingest' && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: '#224466' }}>
            Paste text below. Text is chunked at semantic boundaries (headers, paragraphs, code blocks),
            then each chunk is embedded and stored — nothing leaves your device.
          </p>

          <select
            value={ingestDoor}
            onChange={(e) => setIngestDoor(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-lg"
            style={{ backgroundColor: 'rgba(0,17,34,0.8)', border: '1px solid #224466', color: '#cce0ff' }}
          >
            <option value="archive">Archive</option>
            <option value="hearth">Hearth</option>
            <option value="sanctuary">Sanctuary</option>
            <option value="forge">Forge</option>
            <option value="buffer">Buffer</option>
            <option value="legal">Legal</option>
            <option value="firmware">Firmware</option>
            <option value="medical">Medical</option>
          </select>

          <textarea
            value={ingestText}
            onChange={(e) => setIngestText(e.target.value)}
            placeholder={"Paste documents, notes, logs here...\n\nHeaders (# ## ###), paragraphs, code blocks, and lists are detected automatically.\n\nEach semantic chunk gets its own embedding for precise retrieval."}
            rows={10}
            className="w-full p-3 text-xs rounded-xl resize-none font-mono"
            style={{ backgroundColor: 'rgba(0,17,34,0.8)', border: '1px solid #224466', color: '#cce0ff' }}
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: '#224466' }}>
              {ingestText.trim()
                ? `${semanticChunker(ingestText).length} chunks detected`
                : ''}
            </span>
            <button
              onClick={handleIngest}
              disabled={!ingestText.trim() || ingestStatus === 'chunking' || ingestStatus === 'embedding'}
              className="px-4 py-2 text-xs rounded-lg font-semibold disabled:opacity-30"
              style={{
                backgroundColor: ingestStatus === 'done' ? '#059669' : '#00e5ff',
                color: ingestStatus === 'done' ? '#f0fdf4' : '#001122',
              }}
            >
              {ingestStatus === 'chunking'
                ? 'Chunking…'
                : ingestStatus === 'embedding'
                  ? `Embedding (${ingestEmbedded}/${ingestCount})…`
                  : ingestStatus === 'done'
                    ? `✓ ${ingestEmbedded}/${ingestCount} embedded`
                    : 'Ingest →'}
            </button>
          </div>

          {ingestStatus === 'error' && (
            <p className="text-xs" style={{ color: '#ef4444' }}>Ingest failed. Check PGLite connection.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ArchiveSurface;
