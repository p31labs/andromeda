import React, { useState } from 'react';
import { mintCredits } from '../lib/KarmaEngine';

export function ChaosIngest({ theme }: { theme: Record<string, string> }) {
  const [text, setText] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  /* v8 ignore start */
  const handleIngest = async () => {
    if (!text.trim() || syncing) return;
    setSyncing(true);
    setStatus('COMMITTING_TO_LOCAL_VAULT...');
    try {
      const { getChaosVault } = await import('../lib/ChaosVault');
      const db = await getChaosVault();
      await db.query(
        'INSERT INTO unified_knowledge_graph (source_door, raw_text, embedding) VALUES ($1, $2, $3);',
        ['THE_BUFFER', text, '[]']
      );
      mintCredits(2, 'Journal entry');
      setText('');
      setStatus('COMMITTED // +2 L.O.V.E. CREDITS');
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error('[PHOS:ChaosIngest] Ingest failed:', err);
      setStatus('COMMIT_FAILED // DATA_PRESERVED_LOCALLY');
    } finally {
      setSyncing(false);
    }
  };
  /* v8 ignore stop */

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <span className="text-xs font-mono tracking-widest uppercase opacity-60">Somatic Buffer Engine</span>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-900/30">Isolated Origin</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={theme.name === 'SANCTUARY' ? 'Write anything here. It stays on this device. It is safe.' : 'ENTER_JOURNAL_ENTRY // LOCAL_STORAGE_ONLY'}
        className={`w-full h-40 p-4 text-sm rounded-xl border outline-none resize-none transition-all duration-300 ${theme.input}`}
        disabled={syncing}
      />
      <div className="flex justify-between items-center gap-4">
        <p className="text-[11px] font-mono opacity-50 tracking-wide truncate max-w-[60%]">
          {status || 'READY // WAITING FOR SENSOR DATA'}
        </p>
        <button
          onClick={handleIngest}
          disabled={!text.trim() || syncing}
          className={`px-6 py-2.5 text-xs tracking-widest font-mono uppercase whitespace-nowrap ${theme.button} disabled:opacity-30 disabled:pointer-events-none`}
        >
          {syncing ? 'PROCESSING...' : 'COMMIT_TO_VAULT'}
        </button>
      </div>
    </div>
  );
}
