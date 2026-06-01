import React, { useState } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';

const ARCADE_GAMES = [
  { id: 'smallball', name: 'P31 Smallball', category: 'sports', stress: 'low' },
  { id: 'gridiron', name: 'Gridiron Strategy', category: 'strategy', stress: 'high' },
  { id: 'cards', name: 'Sovereign Card Table', category: 'cards', stress: 'low' },
  { id: 'liquid-sculptor', name: 'Liquid Sculptor', category: 'creative', stress: 'low' },
  { id: 'resonance-rings', name: 'Resonance Rings', category: 'creative', stress: 'low' },
  { id: 'magnetic-poetry', name: 'Magnetic Poetry', category: 'creative', stress: 'low' },
  { id: 'orbital-drift', name: 'Orbital Drift', category: 'physics', stress: 'high' },
  { id: 'geodesic-builder', name: 'Geodesic Builder', category: 'physics', stress: 'high' },
  { id: 'water-parksimulator', name: 'Water Park Simulator', category: 'strategy', stress: 'low' },
];

export function ArcadeSurface({ theme, spoons }: { theme: Record<string, string>; spoons: number }) {
  const [filter, setFilter] = useState('all');
  const [activeGameUrl, setActiveGameUrl] = useState<string | null>(null);

  const activeGames = ARCADE_GAMES.filter((game) => {
    if (spoons <= 2 && game.stress === 'high') return false;
    if (filter !== 'all' && game.category !== filter) return false;
    return true;
  });

  if (activeGameUrl) {
    return (
      <div className="space-y-4 w-full h-[500px] flex flex-col">
        <div className="flex justify-between items-center bg-slate-900 p-2 border border-white/5 rounded-xl">
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">SENTINEL_SANDBOX_ACTIVE</span>
          <button
            onClick={() => setActiveGameUrl(null)}
            className="px-3 py-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded-full font-mono text-[10px]"
          >
            TERMINATE_EXECUTION (ESC)
          </button>
        </div>
        <iframe
          src={activeGameUrl}
          className="w-full flex-grow border border-white/5 rounded-2xl bg-black shadow-inner"
          title="Sandbox Node"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-3">
        <div>
          <h3 className="text-xs font-mono tracking-widest uppercase opacity-60">The Arcade Environment Hub</h3>
          {spoons <= 2 && <p className="text-[10px] text-orange-400 font-mono mt-0.5">⚠️ Zen Mode Forced: High-friction nodes isolated.</p>}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 font-mono text-[10px]">
          {['all', 'sports', 'strategy', 'creative', 'physics'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2 py-1 rounded border capitalize ${cat === filter ? 'bg-white/10 border-white/20 font-bold' : 'bg-transparent border-transparent opacity-60'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {activeGames.map((game) => (
          <div
            key={game.id}
            onClick={() => setActiveGameUrl(`https://arcade.p31ca.org/sandbox/${game.id}`)}
            className="p-3.5 rounded-xl border border-white/5 bg-white/5 hover:border-white/20 transition-all cursor-pointer flex justify-between items-center group"
          >
            <div className="space-y-0.5">
              <span className="text-xs font-medium group-hover:text-cyan-400 transition-colors">{game.name}</span>
              <span className="text-[9px] font-mono uppercase opacity-40 block">{game.category} // strain: {game.stress}</span>
            </div>
            <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity">LAUNCH →</span>
          </div>
        ))}
      </div>
    </div>
  );
}
