import { motion } from 'framer-motion';
import { CheckCircle2, Trash2, AlertTriangle, Radio } from 'lucide-react';
import { useSovereignData } from '../../hooks/useSovereignData';
import { useState } from 'react';

export default function TechFacet() {
  const { data, isLoading, error, addVaultItem, deleteVaultItem } = useSovereignData();
  const [input, setInput] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  const handleAppend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setSyncStatus('syncing');
      addVaultItem(input.trim());
      setInput('');
      setTimeout(() => setSyncStatus('synced'), 800);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        className="min-h-[500px] bg-slate-950 text-emerald-400 font-mono p-8 flex items-center justify-center border-2 border-emerald-500/30"
        initial={{ opacity: 0, filter: "brightness(2) contrast(1.5)" }}
        animate={{ opacity: 1, filter: "brightness(1) contrast(1)" }}
        exit={{ opacity: 0 }}
        transition={{ type: "tween", duration: 0.1 }}
      >
        <div className="flex items-center gap-3 animate-pulse">
          <Radio size={32} className="text-emerald-400" />
          <span className="text-2xl font-bold tracking-widest">INITIALIZING LOCAL VAULT...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-[500px] bg-slate-950 text-red-400 font-mono p-8 flex items-center justify-center border-2 border-red-500/30"
        initial={{ opacity: 0, filter: "brightness(2) contrast(1.5)" }}
        animate={{ opacity: 1, filter: "brightness(1) contrast(1)" }}
        exit={{ opacity: 0 }}
        transition={{ type: "tween", duration: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={32} className="text-red-400" />
          <span className="text-2xl font-bold tracking-widest">ERROR: {error}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.main
      className="p-8 bg-slate-950 text-emerald-400 font-mono min-h-[500px] flex flex-col gap-6 border-2 border-emerald-500/30"
      initial={{ opacity: 0, filter: "brightness(2) contrast(1.5)" }}
      animate={{ opacity: 1, filter: "brightness(1) contrast(1)" }}
      exit={{ opacity: 0 }}
      transition={{ type: "tween", duration: 0.1 }}
    >
      <header className="border-b-2 border-emerald-500/30 pb-4">
        <h1 className="text-4xl font-bold tracking-widest text-emerald-400">
          [QUANTUM_DATA_VAULT]
        </h1>
        <div className="flex items-center gap-4 mt-2 text-xs tracking-wider opacity-60">
          <span>CRDT_REF: ACTIVE</span>
          <span>|</span>
          <span>SYNC: {syncStatus === 'syncing' ? 'MERGING...' : syncStatus === 'synced' ? 'MERGED ✓' : 'IDLE'}</span>
          <span>|</span>
          <span>LEDGER: LOVE OK</span>
        </div>
      </header>

      <section>
        <form onSubmit={handleAppend} className="flex gap-4 items-stretch">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="> enter data..."
            aria-label="Enter data to store securely in the vault"
            className="flex-1 bg-slate-900 border-2 border-emerald-500/30 p-4 text-xl rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-400 placeholder:text-emerald-800"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Save to Vault"
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 px-8 py-4 text-xl font-bold flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 tracking-wider"
          >
            <CheckCircle2 size={32} />
            COMMIT
          </button>
        </form>
      </section>

      <section>
        <ul className="space-y-2">
          {data.map((item) => (
            <li key={item.id} className="p-4 border-2 border-emerald-500/20 flex justify-between items-center bg-slate-900/50">
              <p className="text-lg tracking-wider text-emerald-300">{item.text}</p>
              <button
                onClick={() => deleteVaultItem(item.id)}
                aria-label={`Delete item: ${item.text}`}
                className="text-emerald-600 hover:text-red-500 transition-colors p-2 focus:outline-none"
              >
                <Trash2 size={32} aria-hidden="true" />
              </button>
            </li>
          ))}
          {data.length === 0 && (
            <li className="p-8 text-center text-emerald-800 text-xl italic tracking-wider border-2 border-dashed border-emerald-500/20">
              VAULT EMPTY — AWAITING INPUT
            </li>
          )}
        </ul>
      </section>
    </motion.main>
  );
}