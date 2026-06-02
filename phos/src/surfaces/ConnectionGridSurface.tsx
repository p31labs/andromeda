import React from 'react';

export function ConnectionGridSurface({ theme, spoons }: { theme: Record<string, string>; spoons: number }) {
  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <span className="text-xs font-mono tracking-widest uppercase opacity-60">CONNECTION_GRID // MESH_TOPOLOGY</span>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 animate-pulse">
          LOADING
        </span>
      </div>
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-12 h-12 border-2 border-emerald-500/30 rounded-lg animate-pulse" />
        <p className="text-sm font-mono text-white/50 tracking-wider uppercase">Mesh Topology Loading...</p>
        <p className="text-[10px] font-mono opacity-30">Discovering nodes on the delta network</p>
      </div>
    </div>
  );
}
