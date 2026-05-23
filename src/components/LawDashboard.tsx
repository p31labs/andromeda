
import React, { useState } from 'react';
import { Fingerprint, Terminal, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useSovereignData } from '../hooks/useSovereignData';

export default function LawDashboard() {
  const { data, isLoading, error, addVaultItem, deleteVaultItem } = useSovereignData();
  const [input, setInput] = useState('');

  const handleAppend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      addVaultItem(input.trim());
      setInput('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] bg-slate-950 text-emerald-500 font-mono p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 animate-pulse">
          <Terminal size={24} />
          <span>[ INITIALIZING ML-KEM-768 DECRYPTION PROTOCOL... ]</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[500px] bg-slate-950 text-red-500 font-mono p-8 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <AlertTriangle size={24} />
          <span>[ FATAL: SOVEREIGN BOUNDARY BREACH - {error} ]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-950 text-emerald-400 font-mono min-h-[500px] flex flex-col gap-6 shadow-2xl border border-slate-800">

      {/* HEADER: Institutional Audit Context */}
      <div className="border-b border-emerald-900 pb-4">
        <h2 className="text-2xl uppercase tracking-widest flex items-center gap-3 font-bold">
          <Fingerprint size={28} className="text-emerald-500" />
          Cryptographic Audit Log
        </h2>
        <p className="text-xs text-emerald-700 mt-2 flex items-center gap-2">
          <ShieldCheck size={14} />
          Zero-knowledge local state preservation active. FIPS 203 compliant.
        </p>
      </div>

      {/* MUTATION: High-Friction Input */}
      <form onSubmit={handleAppend} className="flex gap-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter plaintext payload for local encryption..."
          aria-label="Enter payload to encrypt and sign"
          className="flex-1 bg-slate-900 border border-emerald-800 p-3 text-sm focus:outline-none focus:border-emerald-400 transition-colors placeholder:text-emerald-900"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="Sign and append payload to audit log"
          className="bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-100 px-6 py-3 text-sm uppercase tracking-wider transition-colors font-bold"
        >
          Sign & Append
        </button>
      </form>

      {/* DATA GRAPH: High-Density Table */}
      <div className="border border-emerald-900 bg-slate-900 rounded-sm overflow-hidden flex-1">
        <table className="w-full text-left text-xs sm:text-sm" aria-label="Audit Log Entries">
          <thead className="bg-slate-950 text-emerald-700 border-b border-emerald-900">
            <tr>
              <th scope="col" className="p-3 font-semibold uppercase tracking-wider w-48">Timestamp (ISO)</th>
              <th scope="col" className="p-3 font-semibold uppercase tracking-wider">Payload Segment</th>
              <th scope="col" className="p-3 font-semibold uppercase tracking-wider font-mono">Ed25519 Signature (Mock)</th>
              <th scope="col" className="p-3 font-semibold uppercase tracking-wider text-right w-24">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b border-emerald-900/30 hover:bg-slate-800/50 transition-colors group">
                <td className="p-3 text-emerald-600 whitespace-nowrap">
                  {new Date(item.timestamp).toISOString().replace('T', ' ').slice(0, -5)}
                </td>
                <td className="p-3 text-emerald-200">
                  {item.text}
                </td>
                <td className="p-3 text-emerald-800 font-mono text-xs truncate max-w-[200px]" title={item.signature}>
                  {item.signature || '0x...'}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => deleteVaultItem(item.id)}
                    aria-label={`Delete record ${item.id}`}
                    className="text-emerald-800 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-emerald-800 italic">
                  [ No localized records found in the vault. ]
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
