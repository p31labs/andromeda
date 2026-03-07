// spaceship-earth/src/hooks/useLoveSync.ts
import { useState, useEffect } from 'react';
import { fetchWithTimeout } from '@p31/shared/net';

const RELAY_URL = 'https://bonding-relay.trimtab-signal.workers.dev';
const POLL_INTERVAL = 10_000;
const FETCH_TIMEOUT = 10_000;

export function useLoveSync(sessionId: string | null) {
  const [love, setLove] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      try {
        const res = await fetchWithTimeout(
          `${RELAY_URL}/love/${sessionId}`,
          undefined,
          FETCH_TIMEOUT,
        );
        if (res.ok) {
          const data = await res.json();
          setLove(data.love ?? 0);
        }
      } catch {
        // Silent fail — LOVE display just doesn't update
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [sessionId]);

  return love;
}
