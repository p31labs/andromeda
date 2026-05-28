import React, { useState } from 'react';
import { ShieldAlert, Lock } from 'lucide-react';

export const FawnGuardQuarantine: React.FC<{
  source: string;
  wordCount: number;
  rawText: string;
  spoonLevel: number;
}> = ({ source, wordCount, rawText, spoonLevel }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const isTriageMode = spoonLevel <= 1;

  return (
    <div className="border border-purple-900/50 bg-zinc-950 p-4 rounded-md relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4 text-purple-400 font-mono text-xs border-b border-purple-900/30 pb-2">
        <ShieldAlert size={14} />
        <span>QUARANTINED ADVERSARIAL METRICS // {source.toUpperCase()} // {wordCount} WDS</span>
      </div>
      <div className={`relative transition-all duration-500 select-none ${isRevealed ? 'blur-none text-zinc-300' : 'blur-md text-zinc-600'}`}>
        {rawText}
      </div>
      {!isRevealed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 gap-4">
          <button
            onPointerDown={() => setIsRevealed(true)}
            onPointerUp={() => setIsRevealed(false)}
            onPointerLeave={() => setIsRevealed(false)}
            className="px-6 py-3 bg-zinc-900 border border-purple-800 text-purple-300 font-mono text-sm"
          >
            HOLD TO ASSESS STRUCTURE
          </button>
          {isTriageMode && (
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
              <Lock size={12} />
              <span>MUTED EXECUTIONS INTERCEPT ACTIVE</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
