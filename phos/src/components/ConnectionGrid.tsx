import React, { useState, useEffect, useCallback } from 'react';
import { phosAPI, type MeshNode } from '../lib/phos-api';

const STATUS_COLORS: Record<string, string> = {
  online: '#39ff14',
  degraded: '#ffb000',
  offline: '#ff3355',
};

type GridState = 'loading' | 'loaded' | 'offline';

const ConnectionGrid: React.FC = () => {
  const [services, setServices] = useState<MeshNode[]>([]);
  const [gridState, setGridState] = useState<GridState>('loading');

  const fetchMesh = useCallback(async () => {
    setGridState('loading');
    try {
      const status = await phosAPI.getMeshStatus();
      setServices(status.meshStatus);
      setGridState('loaded');
    } catch {
      setGridState('offline');
    }
  }, []);

  useEffect(() => {
    fetchMesh();
    const interval = setInterval(fetchMesh, 30_000);
    return () => clearInterval(interval);
  }, [fetchMesh]);

  const isOffline = gridState === 'offline';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-mono text-gray-500 uppercase tracking-wider">
          Service Mesh
        </h2>
        <div className="flex items-center gap-2">
          {gridState === 'loading' && services.length === 0 && (
            <span className="text-[10px] font-mono text-amber-500 animate-pulse">
              polling...
            </span>
          )}
          {gridState === 'loaded' && (
            <span className="text-[10px] font-mono text-gray-600">
              live · 30s
            </span>
          )}
          {isOffline && (
            <span className="text-[10px] font-mono text-red-500">
              ⚠ worker unreachable
            </span>
          )}
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{
              backgroundColor: isOffline
                ? STATUS_COLORS.offline
                : STATUS_COLORS.online,
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {services.length === 0 && gridState === 'loading' && (
          Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="border border-gray-800 rounded p-3 bg-black/40 animate-pulse"
            >
              <div className="h-4 bg-gray-800 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-800/50 rounded w-32" />
            </div>
          ))
        )}
        {services.map((svc) => (
          <div
            key={svc.name}
            className="border border-gray-800 rounded p-3 bg-black/40 hover:border-gray-600 transition-colors"
            style={isOffline ? { opacity: 0.5 } : undefined}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: STATUS_COLORS[svc.status] }}
              />
              <span className="text-sm font-mono text-gray-300">{svc.name}</span>
              <span
                className="text-[10px] font-mono ml-auto uppercase"
                style={{ color: STATUS_COLORS[svc.status] }}
              >
                {svc.status}
              </span>
            </div>
            <p className="text-xs text-gray-600 font-mono">{svc.description}</p>
            {svc.latencyMs !== undefined && svc.latencyMs > 0 && (
              <p className="text-[10px] text-gray-700 font-mono mt-0.5">
                {svc.latencyMs}ms
              </p>
            )}
          </div>
        ))}
        {isOffline && services.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-600 font-mono text-sm">
            Unable to reach PHOS API worker.{' '}
            <button
              onClick={fetchMesh}
              className="text-gray-400 underline hover:text-gray-200"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionGrid;
