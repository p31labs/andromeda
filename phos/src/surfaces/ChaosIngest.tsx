/**
 * ChaosIngest.tsx — The Buffer surface component.
 *
 * Allows free-text chaos ingestion. On submit:
 * 1. Stores raw text in ChaosVault (PGLite)
 * 2. Triggers local embedding via nomic-embed-text
 * 3. Awards LOVE credits for consistency
 */

import React, { useState, useCallback } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { KarmaEngine } from '../lib/KarmaEngine';
import { logEvent } from '../lib/EventLogger';
import { ingestAndEmbed } from '../lib/Embedder';

interface Props {
  className?: string;
}

export const ChaosIngest: React.FC<Props> = ({ className }) => {
  const { spoons } = useAtmosphere();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'ingesting' | 'done' | 'error'>('idle');
  const [lastId, setLastId] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setStatus('ingesting');
    try {
      const result = await ingestAndEmbed('hearth', trimmed, {
        spoons,
        source: 'buffer',
      });
      setLastId(result.id);
      KarmaEngine.addLove(2, 'Chaos ingested to Buffer');
      logEvent('DEVICE_SEALED', { action: 'chaos_ingest', id: result.id });
      setStatus('done');
      setText('');
    } catch {
      setStatus('error');
    }
  }, [text, spoons]);

  const placeholder = spoons <= 1
    ? 'What\'s weighing on you? Just put it here...'
    : spoons <= 2
      ? 'Offload what\'s in your head. This is your space.'
      : 'What\'s on your mind? Dump it here — thoughts, frustrations, ideas.';

  return (
    <div className={className}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-white/30 text-base leading-relaxed"
      />

      <div className="flex items-center justify-between mt-4">
        <div className="text-xs text-gray-600">
          {text.length > 0 && `${text.length} chars`}
          {lastId && <span className="ml-2 text-emerald-600">✓ saved</span>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!text.trim() || status === 'ingesting'}
          className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm tracking-widest disabled:opacity-30 transition-all"
        >
          {status === 'ingesting' ? 'INGESTING...' : status === 'done' ? 'INGESTED ✓' : 'INGEST CHAOS'}
        </button>
      </div>

      {status === 'error' && (
        <p className="mt-2 text-xs text-red-400">Ingestion failed. Data saved locally.</p>
      )}

      <p className="mt-4 text-xs text-gray-600 text-center">
        Every entry is embedded locally and becomes part of your knowledge graph. +2 LOVE per entry.
      </p>
    </div>
  );
};

export default ChaosIngest;
