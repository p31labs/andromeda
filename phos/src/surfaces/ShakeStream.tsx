import React, { useState, useEffect, useRef } from 'react';
import { getChaosVault } from '../lib/ChaosVault';

export function ShakeStream({ theme, initialQuery }: { theme: Record<string, string>; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [stream, setStream] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const executeSearch = async (searchText: string) => {
    if (!searchText.trim()) return;
    setLoading(true);
    setStream([]);
    setSearched(true);
    try {
      const db = await getChaosVault();
      const res = await db.query(
        'SELECT source_door, raw_text, created_at FROM unified_knowledge_graph WHERE raw_text ILIKE $1 ORDER BY created_at DESC LIMIT 5',
        [`%${searchText}%`]
      );
      const entries = res.rows as Array<{ source_door: string; raw_text: string; created_at: string }>;
      if (entries.length === 0) {
        setStream(['No matching entries found in local vault.']);
      } else {
        const lines = [`Found ${entries.length} matching entries:\n`];
        entries.forEach((e, i) => {
          lines.push(`[${i + 1}] ${e.source_door} — ${e.created_at}`);
          lines.push(`    ${e.raw_text.substring(0, 120)}${e.raw_text.length > 120 ? '...' : ''}\n`);
        });
        setStream(lines);
      }
    } catch {
      setStream(['Search requires journal entries. Start writing in the Buffer.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3 font-mono text-xs">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && executeSearch(query)}
          placeholder="Search your journal..."
          className={`flex-1 px-3 py-2 text-xs rounded-lg border outline-none bg-black/40 border-white/10 text-white/80 placeholder:text-white/30`}
        />
        <button
          onClick={() => executeSearch(query)}
          disabled={loading || !query.trim()}
          className="px-4 py-2 text-xs border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-900/20 disabled:opacity-30"
        >
          {loading ? '...' : 'SEARCH'}
        </button>
      </div>
      {searched && (
        <div className={`p-4 rounded-xl border max-h-60 overflow-y-auto bg-black/40 border-white/5`}>
          <div className="whitespace-pre-wrap leading-relaxed tracking-wide text-white/90">
            {stream.length === 0 && !loading && <span className="opacity-40 italic">Enter a search term to query your local vault.</span>}
            {stream.join('\n')}
            {loading && <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1" />}
          </div>
          <div ref={containerRef} />
        </div>
      )}
    </div>
  );
}
