import React, { useState, useEffect } from 'react';

export function WarehouseSurface({ theme, spoons }: { theme: any; spoons: number }) {
  const [stats, setStats] = useState({ totalItems: 0, syncPending: 0 });
  const [recentLog, setRecentLog] = useState<Array<{ id: number; name: string; sku: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  /* v8 ignore start */
  useEffect(() => {
    let db: any = null;
    async function bindWarehouseDb() {
      try {
        const { PGlite } = await import('@electric-sql/pglite');
        db = new PGlite({ connectionString: 'idb://p31-warehouse-aj' });
        const summary = await db.query('SELECT COUNT(*) as count FROM items');
        const rows = (summary.rows as any)[0];
        setStats({ totalItems: Number(rows?.count || 0), syncPending: 0 });

        const logs = await db.query('SELECT id, name, sku FROM items ORDER BY id DESC LIMIT 3');
        setRecentLog(logs.rows as any);
      } catch (err) {
        setError('WAREHOUSE_DB_OFFLINE // READ_ONLY_FALLBACK');
      }
    }
    bindWarehouseDb();
    return () => { if (db) db.close().catch(() => {}); };
  }, []);
  /* v8 ignore stop */

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h3 className="text-xs font-mono tracking-widest uppercase opacity-60">Warehouse Service Interface</h3>
        <span className="text-[10px] font-mono rounded px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30">Local Connection</span>
      </div>

      {error ? (
        <div className="p-4 border border-dashed border-amber-900/30 text-amber-400 font-mono text-xs uppercase tracking-wider bg-amber-950/10 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border border-white/5 ${theme.name === 'CRISIS' ? 'bg-black' : 'bg-white/5'}`}>
            <span className="text-[9px] font-mono uppercase opacity-40 block mb-1">TOTAL_REGISTERED_ASSETS</span>
            <span className="text-xl font-mono tracking-tight font-bold">{stats.totalItems}</span>
          </div>
          <div className={`p-4 rounded-xl border border-white/5 ${theme.name === 'CRISIS' ? 'bg-black' : 'bg-white/5'}`}>
            <span className="text-[9px] font-mono uppercase opacity-40 block mb-1">DELTA_SYNC_QUEUE</span>
            <span className="text-xl font-mono tracking-tight font-bold text-emerald-500">{stats.syncPending}</span>
          </div>

          <div className="col-span-2 space-y-2 mt-2">
            <span className="text-[10px] font-mono uppercase opacity-40 block">Recent Telemetry Activity</span>
            {recentLog.length === 0 ? (
              <p className="text-xs opacity-40 font-mono italic">No recent scans caught in loop.</p>
            ) : (
              <div className="space-y-1.5">
                {recentLog.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs font-mono p-2 rounded bg-white/5 border border-white/5">
                    <span className="truncate max-w-[70%]">{item.name}</span>
                    <span className="opacity-50 text-[10px]">{item.sku}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
