/**
 * Mint K4 — WCD-M19 Client Orchestrator
 *
 * When the local K4 graph is complete (4 nodes, 6 edges), this module
 * collects Ed25519 signatures from all 4 participants and submits
 * the mint request to the Spaceship Earth Worker.
 */

import type { K4Edge } from '../sovereign/types';
import { useSovereignStore } from '../sovereign/useSovereignStore';
import * as genesis from './genesisIdentity';
import { extractDIDs } from './k4Graph';
import { broadcastMintRequest, pollMintSignatures } from './mintRelay';

const WORKER_URL = import.meta.env.VITE_SPACESHIP_RELAY_URL
  || 'https://spaceship-relay.trimtab-signal.workers.dev';

const SIGNATURE_COLLECT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 2000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Orchestrate a K4 mint: collect 4 signatures and POST to /api/mint-k4.
 * Call this when isK4Complete() returns true.
 */
export async function mintK4(
  k4Edges: K4Edge[],
  roomCode: string,
  gcodeFile = 'k4_node_v1.gcode',
): Promise<{ ok: boolean; serverHash?: string; printResult?: string; error?: string }> {
  const store = useSovereignStore.getState();
  const myDID = genesis.getDID();

  store.setMintStatus('collecting-signatures');

  try {
    const dids = extractDIDs(k4Edges);
    if (dids.length !== 4) {
      throw new Error(`Expected 4 DIDs, got ${dids.length}`);
    }

    // Generate nonce and canonical payload
    const nonce = crypto.randomUUID();
    const canonicalTimestamp = Date.now();
    const canonical = JSON.stringify({
      nonce,
      canonicalTimestamp,
      dids: [...dids].sort(),
    });

    // Sign with local key
    const sigBytes = await genesis.sign(new TextEncoder().encode(canonical));
    const mySig = bytesToHex(sigBytes);

    // Broadcast request to collect remaining 3 signatures
    await broadcastMintRequest(roomCode, 0, nonce, canonicalTimestamp, canonical);

    // Collect signatures (poll relay)
    const collectedSigs: Array<{ did: string; signature: string }> = [
      { did: myDID, signature: mySig },
    ];

    const started = Date.now();
    await new Promise<void>((resolve, reject) => {
      const timer = setInterval(async () => {
        if (Date.now() - started > SIGNATURE_COLLECT_TIMEOUT_MS) {
          clearInterval(timer);
          reject(new Error('Signature collection timeout'));
          return;
        }

        const remoteSigs = await pollMintSignatures(roomCode, myDID);
        for (const sig of remoteSigs) {
          if (!collectedSigs.find((s) => s.did === sig.did)) {
            collectedSigs.push(sig);
          }
        }

        if (collectedSigs.length >= 4) {
          clearInterval(timer);
          resolve();
        }
      }, POLL_INTERVAL_MS);
    });

    // Submit to worker
    store.setMintStatus('minting');
    store.setLastMintNonce(nonce);

    const res = await fetch(`${WORKER_URL}/api/mint-k4`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nonce,
        canonicalTimestamp,
        signatures: collectedSigs.slice(0, 4),
        gcodeFile,
      }),
    });

    const result = await res.json() as { ok?: boolean; serverHash?: string; printResult?: string; error?: string };

    if (result.ok) {
      store.setMintStatus('success');
      return { ok: true, serverHash: result.serverHash, printResult: result.printResult };
    } else {
      store.setMintStatus('error');
      return { ok: false, error: result.error ?? `HTTP ${res.status}` };
    }
  } catch (err) {
    store.setMintStatus('error');
    return { ok: false, error: (err as Error).message };
  }
}
