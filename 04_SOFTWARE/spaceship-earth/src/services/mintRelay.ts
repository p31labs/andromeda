/**
 * Mint Relay — WCD-M19
 *
 * Relay-based signature collection for the K4 mint process.
 * Uses bonding-relay ping system with MINT_SIGN_REQUEST/RESPONSE types.
 */

const RELAY_URL = import.meta.env.VITE_BONDING_RELAY_URL
  || 'https://bonding-relay.trimtab-signal.workers.dev';

const TIMEOUT_MS = 10_000;

async function relayFetch(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${RELAY_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Broadcast a mint sign request to the room. */
export async function broadcastMintRequest(
  roomCode: string,
  slot: number,
  nonce: string,
  canonicalTimestamp: number,
  canonical: string,
): Promise<void> {
  await relayFetch(`/api/room/${roomCode}/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: slot,
      atomId: 0,
      reaction: 'MINT_SIGN_REQUEST',
      data: { nonce, canonicalTimestamp, canonical },
    }),
  });
}

/** Send a mint sign response (signature) back to the room. */
export async function sendMintSignature(
  roomCode: string,
  slot: number,
  did: string,
  signature: string,
): Promise<void> {
  await relayFetch(`/api/room/${roomCode}/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: slot,
      atomId: 0,
      reaction: 'MINT_SIGN_RESPONSE',
      data: { did, signature },
    }),
  });
}

/** Poll for mint sign responses. Returns collected signatures. */
export async function pollMintSignatures(
  roomCode: string,
  myDID: string,
): Promise<Array<{ did: string; signature: string }>> {
  try {
    const res = await relayFetch(`/api/room/${roomCode}`);
    if (!res.ok) return [];
    const room = await res.json();
    const pings = room.pings ?? [];
    const sigs: Array<{ did: string; signature: string }> = [];

    for (const ping of pings) {
      if (ping.reaction === 'MINT_SIGN_RESPONSE' && ping.data?.did && ping.data.did !== myDID) {
        sigs.push({ did: ping.data.did, signature: ping.data.signature });
      }
    }
    return sigs;
  } catch {
    return [];
  }
}
