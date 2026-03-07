// spaceship-earth/src/hooks/useProtocolLoveSync.ts
// B5: Push protocol LOVE wallet state to spaceship-relay for cross-device sync.
import { useEffect, useRef } from 'react';
import { useNode } from '../contexts/NodeContext';
import { fetchWithTimeout } from '@p31/shared/net';

const RELAY_URL = 'https://spaceship-relay.trimtab-signal.workers.dev';
const SYNC_INTERVAL = 30_000;
const FETCH_TIMEOUT = 10_000;

export function useProtocolLoveSync() {
  const { nodeId, protocolWallet, vesting, protocolTxCount } = useNode();
  const lastPushedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!nodeId || !protocolWallet) return;

    const push = async () => {
      const fingerprint = `${protocolWallet.totalEarned}:${protocolTxCount}`;
      if (fingerprint === lastPushedRef.current) return;

      try {
        const res = await fetchWithTimeout(
          `${RELAY_URL}/protocol-love`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodeId,
              wallet: {
                totalEarned: protocolWallet.totalEarned,
                sovereigntyPool: protocolWallet.sovereigntyPool,
                performancePool: protocolWallet.performancePool,
                availableBalance: protocolWallet.availableBalance,
                careScore: protocolWallet.careScore,
              },
              vesting: vesting.map(v => ({
                name: v.node.name,
                initials: v.node.initials,
                vestedPercent: v.vestedPercent,
                vestedAmount: v.vestedAmount,
                ageYears: v.ageYears,
              })),
              txCount: protocolTxCount,
            }),
          },
          FETCH_TIMEOUT,
        );
        if (res.ok) {
          lastPushedRef.current = fingerprint;
        }
      } catch {
        // Silent fail — sync just delays
      }
    };

    push();
    const interval = setInterval(push, SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [nodeId, protocolWallet, vesting, protocolTxCount]);
}
