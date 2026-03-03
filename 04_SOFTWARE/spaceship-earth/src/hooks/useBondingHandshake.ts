// spaceship-earth/src/hooks/useBondingHandshake.ts
// Listens for P31_BONDING_STATE postMessage from the BONDING iframe
// and extracts the sessionId for LOVE sync.
import { useState, useEffect } from 'react';

const BONDING_ORIGIN = 'https://bonding.p31ca.org';

export function useBondingHandshake(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== BONDING_ORIGIN) return;
      if (event.data?.type !== 'P31_BONDING_STATE') return;
      const id = event.data?.payload?.sessionId;
      if (typeof id === 'string' && id) setSessionId(id);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return sessionId;
}
