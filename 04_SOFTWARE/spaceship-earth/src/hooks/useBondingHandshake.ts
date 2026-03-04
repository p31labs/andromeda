// spaceship-earth/src/hooks/useBondingHandshake.ts
// Listens for P31_BONDING_STATE postMessage from the BONDING iframe
// and extracts the sessionId + totalLove for LOVE sync.
import { useState, useEffect } from 'react';

const BONDING_ORIGIN = 'https://bonding.p31ca.org';

interface BondingHandshake {
  sessionId: string | null;
  totalLove: number;
}

export function useBondingHandshake(): BondingHandshake {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalLove, setTotalLove] = useState(0);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== BONDING_ORIGIN) return;
      if (event.data?.type !== 'P31_BONDING_STATE') return;
      const payload = event.data?.payload;
      const id = payload?.sessionId;
      if (typeof id === 'string' && id) setSessionId(id);
      if (typeof payload?.totalLove === 'number') setTotalLove(payload.totalLove);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return { sessionId, totalLove };
}
