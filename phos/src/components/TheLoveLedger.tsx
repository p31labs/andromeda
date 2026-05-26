import React, { useEffect, useState } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import { KarmaEngine, type LoveTransaction } from '../lib/KarmaEngine';

const TheLoveLedger: React.FC = () => {
  const { spoons } = useAtmosphere();
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<LoveTransaction[]>([]);

  useEffect(() => {
    setBalance(KarmaEngine.getBalance());
    setHistory(KarmaEngine.getHistory());
  }, []);

  if (spoons <= 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 animate-fade-in"
        style={{ backgroundColor: '#0a0800', color: '#ffb000' }}
      >
        <div className="max-w-md">
          <div className="mb-4 text-5xl opacity-60">♥</div>
          <div className="text-4xl font-light mb-2">{balance.toFixed(2)}</div>
          <p className="text-sm font-mono opacity-70">L.O.V.E.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 py-16 animate-fade-in"
      style={{ backgroundColor: '#0a0800', color: '#ffb000' }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-6 text-5xl opacity-60">♥</div>
        <div className="text-5xl font-light mb-2" style={{ color: '#e0d0b0' }}>
          {balance.toFixed(2)}
        </div>
        <p className="text-sm font-mono mb-10 opacity-50" style={{ color: '#00e5ff' }}>L.O.V.E.</p>

        {history.length === 0 ? (
          <p className="font-mono text-sm opacity-40">No transactions yet.</p>
        ) : (
          <div className="max-w-md mx-auto space-y-1 font-mono text-xs text-left">
            {[...history].reverse().map((tx, i) => (
              <div key={i}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-white/[0.02]"
                style={{ color: '#c0b090' }}
              >
                <span className={tx.amount > 0 ? '' : ''}
                  style={{ color: tx.amount > 0 ? '#ffb000' : '#ff4455' }}
                >
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
                <span className="truncate mx-4 text-sm">{tx.reason}</span>
                <span className="opacity-40 shrink-0">
                  {new Date(tx.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TheLoveLedger;
