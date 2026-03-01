// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// LoveCounter: persistent LOVE token display
//
// Shows total accumulated L.O.V.E. tokens at top center.
// Pops on increment via CSS animation class.
// Only visible after first LOVE is earned.
// ═══════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function LoveCounter() {
  const loveTotal = useGameStore((s) => s.loveTotal);
  const [isPop, setIsPop] = useState(false);
  const prevTotal = useRef(0);

  useEffect(() => {
    if (loveTotal > prevTotal.current) {
      setIsPop(true);
      const timer = setTimeout(() => setIsPop(false), 400);
      prevTotal.current = loveTotal;
      return () => clearTimeout(timer);
    }
    prevTotal.current = loveTotal;
  }, [loveTotal]);

  if (loveTotal === 0) return null;

  return (
    <div
      className={`
        absolute top-6 left-1/2 -translate-x-1/2
        text-base font-semibold font-mono text-love
        pointer-events-none transition-opacity duration-400
        ${isPop ? 'love-pop' : ''}
      `}
    >
      ♥ {loveTotal} L.O.V.E.
    </div>
  );
}
