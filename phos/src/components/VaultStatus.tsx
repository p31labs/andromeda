import React from 'react';
import { useAtmosphere } from './AtmosphereProvider';

/**
 * VaultStatus — Placeholder pill/card for P31 Vault connection status.
 * Consumes useAtmosphere() to respect GRAY_ROCK palette constraints.
 */
const VaultStatus: React.FC = () => {
  const { preset, grayRock } = useAtmosphere();

  // Simulated status — will be wired to real worker in future sprint
  const status: 'online' | 'degraded' | 'offline' = 'online';

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
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ backgroundColor: statusColors[status] }}
      />
      <span>Vault</span>
      <span
        className="uppercase"
        style={{ color: statusColors[status] }}
      >
        {status}
      </span>
    </div>
  );
};

export default VaultStatus;
