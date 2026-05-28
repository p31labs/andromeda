import React, { useState, useEffect, useCallback } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import { phosAPI } from '../lib/phos-api';

const VaultStatus: React.FC = () => {
  const { preset, grayRock } = useAtmosphere();
  const [status, setStatus] = useState<'online' | 'degraded' | 'offline'>('offline');
  const [latencyMs, setLatencyMs] = useState(0);

  const checkHealth = useCallback(async () => {
    const result = await phosAPI.getMeshStatus();
    if (result.status === 'PHOS Online' && result.meshStatus.length > 0) {
      const hasOffline = result.meshStatus.some((n) => n.status === 'offline');
      setStatus(hasOffline ? 'degraded' : 'online');
      const latencies = result.meshStatus.map((n) => n.latencyMs || 0).filter((l) => l > 0);
      setLatencyMs(latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0);
    } else {
      setStatus('offline');
      setLatencyMs(0);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const statusColors: Record<string, string> = {
    online: grayRock ? '#888888' : '#39ff14',
    degraded: grayRock ? '#666666' : '#ffb000',
    offline: grayRock ? '#444444' : '#ff3355',
  };
  const textColor = grayRock ? '#888888' : preset.palette.text;

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono"
      style={{
        borderColor: statusColors[status],
        backgroundColor: grayRock ? '#111111' : 'transparent',
        color: textColor,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: statusColors[status] }} />
      <span>Vault</span>
      <span className="uppercase" style={{ color: statusColors[status] }}>
        {status}{latencyMs > 0 && ` ${latencyMs}ms`}
      </span>
    </div>
  );
};

export default VaultStatus;
