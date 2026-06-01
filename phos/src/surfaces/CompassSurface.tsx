import React from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';

export const CompassSurface: React.FC<{ className?: string }> = ({ className }) => {
  const { grayRock, spoons, setSurface } = useAtmosphere();
  const destinations = [
    { key: 'HEARTH', label: 'Family', icon: '♥' },
    { key: 'THE_BUFFER', label: 'Build', icon: '⚒' },
    { key: 'ARCHIVE', label: 'Knowledge', icon: '◈' },
    { key: 'VAULT', label: 'Safe Room', icon: '◉' },
  ];
  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center ${className ?? ''}`}>
      {grayRock ? (
        <p className="font-mono text-xs text-zinc-500">Compass offline.</p>
      ) : (
        <>
          <span className="font-mono text-xs text-purple-400/60 tracking-widest uppercase mb-4">Compass</span>
          <p className="font-mono text-xs text-zinc-500 mb-4">
            {spoons <= 1 ? 'Low energy. Simple choices.' : 'Where do you need to go?'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(spoons <= 1 ? destinations.slice(0, 2) : destinations).map((d) => (
              <button key={d.key} onClick={() => setSurface(d.key as any)}
                className="px-3 py-2 text-xs font-mono border border-purple-800/40 text-purple-400 rounded hover:bg-purple-900/20 flex items-center gap-2">
                <span>{d.icon}</span><span>{d.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CompassSurface;