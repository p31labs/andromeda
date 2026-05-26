import React, { useEffect, useState } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import { KarmaEngine } from '../lib/KarmaEngine';

const LoveLedger: React.FC = () => {
  const { preset, grayRock } = useAtmosphere();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    setBalance(KarmaEngine.getBalance());
    const interval = setInterval(() => {
      setBalance(KarmaEngine.getBalance());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const textColor = grayRock ? '#888888' : preset.palette.text;
  const accentColor = grayRock ? '#888888' : preset.palette.secondary;

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono"
      style={{
        color: textColor,
        backgroundColor: grayRock ? '#111111' : 'transparent',
      }}
    >
      <span style={{ color: accentColor }}>♥</span>
      <span>LOVE</span>
      <span className="tabular-nums" style={{ color: accentColor }}>
        {balance.toFixed(2)}
      </span>
    </div>
  );
};

export default LoveLedger;
