import React from 'react';
import { Anchor, ShieldCheck, Heart } from 'lucide-react';
import type { LedgerArtifact } from '../types/phos';

export const LoveLedger: React.FC<{ artifacts: LedgerArtifact[] }> = ({ artifacts }) => {
  return (
    <div className="flex flex-col w-full h-full bg-zinc-950 text-zinc-200 p-4 gap-6">
      <header className="border-b border-amber-900/50 pb-4">
        <h2 className="text-amber-500 font-mono text-sm tracking-widest flex items-center gap-2"><Anchor size={16} />EMPIRICAL PHOS TIMELINE</h2>
        <p className="text-zinc-500 text-xs mt-1">OBJECTIVE DOCUMENTATION OF OBSERVED REALITY OVER TIME.</p>
      </header>
      <div className="flex flex-col gap-4 overflow-y-auto">
        {artifacts.map((artifact) => (
          <div key={artifact.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-md relative">
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono mb-2">
              <span>{new Date(artifact.timestamp).toISOString().split('T')[0]}</span>
              {artifact.type === 'survival_proof' ? <ShieldCheck size={14} /> : <Heart size={14} className="text-amber-600/70" />}
            </div>
            <p className="text-sm font-serif leading-relaxed text-zinc-300">{artifact.evidenceText}</p>
            <div className="mt-4 pt-2 border-t border-zinc-800/50 text-[9px] text-zinc-600 font-mono uppercase">
              STATUS AUTHENTICATED // EXECUTED TRACK VERIFIED
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
