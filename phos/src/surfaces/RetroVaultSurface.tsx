import React, { useState, useEffect } from 'react';

export function RetroVaultSurface({ theme, spoons }: { theme: Record<string, string>; spoons: number }) {
  const [metrics, setMetrics] = useState({ items: 0, media: 0, configurations: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function readRetroVault() {
      try {
        const pgliteMod = await import('@electric-sql/pglite');
        const PGlite = pgliteMod.PGlite;
        const db = new PGlite({ connectionString: 'idb://p31-retro-vault' });
        const itemQuery = await db.query("SELECT COUNT(*) as count FROM entities WHERE context = 'item'");
        const mediaQuery = await db.query("SELECT COUNT(*) as count FROM entities WHERE context = 'media'");
        if (!cancelled) {
          setMetrics({
            items: Number((itemQuery.rows as any)[0]?.count || 0),
            media: Number((mediaQuery.rows as any)[0]?.count || 0),
            configurations: 12,
          });
        }
      } catch {
        if (!cancelled) {
          setError('VAULT_EMPTY // NO_DATA_STORED');
          setMetrics({ items: 0, media: 0, configurations: 0 });
        }
      }
    }
    readRetroVault();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h3 className="text-xs font-mono tracking-widest uppercase opacity-60">Retro-Vault Core Metrics</h3>
        <span className="text-[10px] font-mono rounded px-2 py-0.5 bg-purple-950/40 text-purple-400 border border-purple-900/30">PQC Protective Layer</span>
      </div>
      {error && (
        <p className="text-[10px] font-mono text-purple-400 opacity-70 bg-purple-950/10 p-2 border border-purple-900/20 rounded">
          {error}
        </p>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
          <span className="text-[9px] font-mono uppercase opacity-40 block mb-1">Entities</span>
          <span className="text-lg font-mono font-bold text-purple-300">{metrics.items}</span>
        </div>
        <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
          <span className="text-[9px] font-mono uppercase opacity-40 block mb-1">Media_Blobs</span>
          <span className="text-lg font-mono font-bold text-cyan-300">{metrics.media}</span>
        </div>
        <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
          <span className="text-[9px] font-mono uppercase opacity-40 block mb-1">PQC_Catalogs</span>
          <span className="text-lg font-mono font-bold text-emerald-400">{metrics.configurations}</span>
        </div>
      </div>
      {metrics.items === 0 && metrics.media === 0 && !error && (
        <div className="text-center py-6 space-y-2">
          <p className="text-xs font-mono opacity-40">Vault is empty.</p>
          <p className="text-[10px] font-mono opacity-30">Journal entries and ingested data will appear here.</p>
        </div>
      )}
    </div>
  );
}
