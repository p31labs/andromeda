/**
 * RetroVaultSurface.tsx — Read-only retro vault dashboard for PHOS.
 *
 * Connects to the Retro-Vault PGLite IDB path and renders entity counts
 * + context breakdown from the existing database.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { PGlite } from '@electric-sql/pglite';

interface EntityStats {
  context: string;
  count: number;
}

interface EntityRow {
  id: string;
  data: string;
  created_at: number;
}

interface Props {
  className?: string;
}

export const RetroVaultSurface: React.FC<Props> = ({ className }) => {
  const [stats, setStats] = useState<EntityStats[]>([]);
  const [recent, setRecent] = useState<EntityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Retro-Vault uses in-memory or its own IDB path. Try IDB first.
      let db: PGlite;
      try {
        db = new PGlite('idb://retro-vault');
        await db.waitReady;
      } catch {
        // Fall back to memory if IDB namespace doesn't exist yet
        db = new PGlite();
        await db.waitReady;
      }

      const { rows: statsRows } = await db.query<{ context: string; count: number }>(`
        SELECT context, COUNT(*) as count FROM entities GROUP BY context
      `);
      setStats(statsRows.map((r) => ({ context: r.context, count: Number(r.count) })));
      setTotal(statsRows.reduce((s, r) => s + Number(r.count), 0));

      const { rows: recentRows } = await db.query<{ id: string; data: string; created_at: number }>(`
        SELECT id, data, created_at FROM entities ORDER BY created_at DESC LIMIT 10
      `);
      setRecent(recentRows);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vault not initialized');
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className={className}>Loading vault data...</div>;
  if (error) return (
    <div className={className}>
      <h2 className="text-2xl font-semibold mb-4">Retro Vault</h2>
      <p className="text-gray-500 text-sm">Vault database not yet initialized. Open the Retro-Vault app first to create the database.</p>
    </div>
  );

  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold mb-6">Retro Vault</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-black/30 border border-white/10 text-center">
          <div className="text-3xl font-bold text-purple-400">{total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Items</div>
        </div>
        {stats.map((s) => (
          <div key={s.context} className="p-4 rounded-xl bg-black/30 border border-white/10 text-center">
            <div className="text-3xl font-bold text-cyan-400">{s.count}</div>
            <div className="text-xs text-gray-500 mt-1 capitalize">{s.context}</div>
          </div>
        ))}
      </div>

      {/* Recent Entities */}
      <div>
        <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Recently Added</h3>
        {recent.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-8">No entities yet.</div>
        ) : (
          <div className="space-y-1">
            {recent.map((e) => {
              let label = e.id;
              try {
                const parsed = JSON.parse(e.data);
                label = parsed.name || parsed.title || e.id;
              } catch { /* use id */ }
              return (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm">
                  <span className="font-mono text-xs text-gray-400 flex-1 truncate">{label}</span>
                  <span className="text-xs text-gray-600">{new Date(e.created_at).toLocaleDateString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RetroVaultSurface;
