/**
 * WarehouseSurface.tsx — Read-only warehouse dashboard for PHOS.
 *
 * Connects to the same PGLite IDB path (idb://p31-warehouse-aj) used by
 * the standalone Warehouse AJ app. Renders zone summary + recent activity.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { PGlite } from '@electric-sql/pglite';
import { useAtmosphere } from '../components/AtmosphereProvider';

interface ZoneSummary {
  id: number;
  name: string;
  inStock: number;
  pending: number;
}

interface ActivityItem {
  scannedAt: number;
  qrData: string;
  action: string;
  zoneName: string;
  category: string;
}

interface Props {
  className?: string;
}

export const WarehouseSurface: React.FC<Props> = ({ className }) => {
  const { spoons, grayRock } = useAtmosphere();
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const db = new PGlite('idb://p31-warehouse-aj');
      await db.waitReady;

      const { rows: zoneRows } = await db.query<{
        id: number; name: string; in_stock: number; pending: number;
      }>(`
        SELECT z.id, z.name,
          COUNT(i.qr_data) FILTER (WHERE i.status = 'received') as in_stock,
          COUNT(i.qr_data) FILTER (WHERE i.synced = FALSE) as pending
        FROM zones z
        LEFT JOIN inventory_items i ON z.id = i.zone_id
        GROUP BY z.id, z.name ORDER BY z.id
      `);

      setZones(zoneRows.map((r) => ({
        id: r.id, name: r.name,
        inStock: Number(r.in_stock), pending: Number(r.pending),
      })));
      setTotalPending(zoneRows.reduce((s, z) => s + Number(z.pending), 0));

      const { rows: actRows } = await db.query<{
        scanned_at: number; qr_data: string; action: string;
        zone_name: string; category: string;
      }>(`
        SELECT s.scanned_at, s.qr_data, s.action, z.name as zone_name,
               COALESCE(i.category, 'Unknown') as category
        FROM scan_log s
        JOIN zones z ON s.zone_id = z.id
        LEFT JOIN inventory_items i ON s.qr_data = i.qr_data
        ORDER BY s.scanned_at DESC LIMIT 20
      `);

      setActivities(actRows.map((r) => ({
        scannedAt: r.scanned_at,
        qrData: r.qr_data,
        action: r.action,
        zoneName: r.zone_name,
        category: r.category,
      })));

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouse data');
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className={className}>Loading warehouse data...</div>;
  if (error) return <div className={className}>Warehouse unavailable: {error}</div>;

  if (grayRock) {
    return (
      <div className={className}>
        <div className="text-center py-12 text-zinc-500 font-mono text-sm">Warehouse suspended.</div>
      </div>
    );
  }

  if (spoons <= 2) {
    return (
      <div className={className}>
        <h2 className="text-2xl font-semibold mb-6">The Forge — Warehouse</h2>
        <div className="space-y-2">
          {zones.map((z) => (
            <div key={z.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm font-medium truncate">{z.name.replace(`Zone ${z.id}: `, '')}</div>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-emerald-400">{z.inStock} in</span>
                {z.pending > 0 && <span className="text-xs text-amber-400">{z.pending} pending</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalStock = zones.reduce((s, z) => s + z.inStock, 0);

  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold mb-6">The Forge — Warehouse</h2>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-black/30 border border-white/10 text-center">
          <div className="text-3xl font-bold text-emerald-400">{totalStock}</div>
          <div className="text-xs text-gray-500 mt-1">In Stock</div>
        </div>
        <div className={`p-4 rounded-xl border text-center ${totalPending > 0 ? 'bg-amber-950/30 border-amber-800/30' : 'bg-black/30 border-white/10'}`}>
          <div className={`text-3xl font-bold ${totalPending > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{totalPending}</div>
          <div className="text-xs text-gray-500 mt-1">Pending Sync</div>
        </div>
        <div className="p-4 rounded-xl bg-black/30 border border-white/10 text-center">
          <div className="text-3xl font-bold text-blue-400">{zones.length}</div>
          <div className="text-xs text-gray-500 mt-1">Zones Active</div>
        </div>
      </div>

      {/* Zone Grid */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Zones</h3>
        <div className="grid grid-cols-3 gap-2">
          {zones.map((z) => (
            <div key={z.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-xs text-gray-500">Z{z.id}</div>
              <div className="text-sm font-medium truncate">{z.name.replace(`Zone ${z.id}: `, '')}</div>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-emerald-400">{z.inStock} in</span>
                {z.pending > 0 && <span className="text-xs text-amber-400">{z.pending} pending</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Recent Activity</h3>
        {activities.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-8">No scans yet. Start scanning in the Warehouse app.</div>
        ) : (
          <div className="space-y-1">
            {activities.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm">
                <span className="text-xs w-16 text-gray-600">{new Date(a.scannedAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="font-mono text-xs text-gray-400 flex-1 truncate">{a.qrData}</span>
                <span className="text-xs text-gray-500">{a.action}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseSurface;
