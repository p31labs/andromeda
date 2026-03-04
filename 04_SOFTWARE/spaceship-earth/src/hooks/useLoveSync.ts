// spaceship-earth/src/hooks/useLoveSync.ts
import { useState, useEffect } from 'react';

const RELAY_URL = 'https://bonding-relay.trimtab-signal.workers.dev';
const POLL_INTERVAL = 10_000; // 10 seconds

export function useLoveSync(sessionId: string | null) {
  const [love, setLove] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      try {
        const res = await fetch(`${RELAY_URL}/love/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setLove(data.love ?? 0);
        }
      } catch {
        // Silent fail — LOVE display just doesn't update
      }
    };

    poll(); // immediate
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [sessionId]);

  return love;
}
