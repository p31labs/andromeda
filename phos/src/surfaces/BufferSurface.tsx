import React, { useState } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';

export const BufferSurface: React.FC<{ className?: string }> = ({ className }) => {
  const { grayRock, spoons } = useAtmosphere();
  const [resting, setResting] = useState(false);
  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center ${className ?? ''}`}>
      {grayRock ? (
        <p className="font-mono text-xs text-zinc-500">Buffer suspended.</p>
      ) : (
        <>
          <span className="font-mono text-xs text-cyan-500/60 tracking-widest uppercase mb-4">The Buffer</span>
          <p className="font-mono text-xs text-zinc-500 mb-4">
            {spoons <= 1 ? 'Minimal mode. Rest.' : 'Brain dump. Process chaos.'}
          </p>
          {!resting && spoons >= 2 && (
            <button onClick={() => setResting(true)} className="px-4 py-2 text-xs font-mono border border-cyan-800/50 text-cyan-400 rounded hover:bg-cyan-900/20">
              Breathe
            </button>
          )}
          {resting && (
            <div className="font-mono text-xs text-cyan-400 animate-[breathe-slow_4s_ease-in-out_infinite]">
              Inhale... Exhale...
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BufferSurface;