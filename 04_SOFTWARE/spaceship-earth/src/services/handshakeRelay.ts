/**
 * Handshake Relay — WCD-M21
 *
 * Wraps the existing bonding-relay room/ping API for K4 handshake operations.
 * Uses HS_ prefix for handshake rooms. 30s TTL ephemeral rooms.
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

/** Create an ephemeral handshake room. Returns room code (HS_XXXXXX). */
export async function createHandshakeRoom(myDID: string): Promise<string> {
  const code = `HS_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const res = await relayFetch('/api/room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      playerName: myDID.slice(-8),
      playerColor: '#00FF88',
    }),
  });
  if (!res.ok) throw new Error(`Failed to create handshake room: ${res.status}`);
  return code;
}

/** Join an existing handshake room. */
export async function joinHandshakeRoom(code: string, myDID: string): Promise<void> {
  const res = await relayFetch(`/api/room/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerName: myDID.slice(-8),
      playerColor: '#FFB800',
    }),
  });
  if (!res.ok) throw new Error(`Failed to join handshake room: ${res.status}`);
}

/** Send a HANDSHAKE_LOCK signal to the room. */
export async function sendLockSignal(
  code: string,
  slot: number,
  myDID: string,
  lockTime: number,
  signature: string,
): Promise<void> {
  await relayFetch(`/api/room/${code}/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: slot,
      atomId: 0,
      reaction: 'HANDSHAKE_LOCK',
      data: { did: myDID, lockTime, signature },
    }),
  });
}

/** Poll for partner's HANDSHAKE_LOCK ping. Returns lock data or null. */
export async function pollForPartnerLock(
  code: string,
  myDID: string,
): Promise<{ did: string; lockTime: number; signature: string } | null> {
  try {
    const res = await relayFetch(`/api/room/${code}`);
    if (!res.ok) return null;
    const room = await res.json();

    const pings = room.pings ?? [];
    for (const ping of pings) {
      if (ping.reaction === 'HANDSHAKE_LOCK' && ping.data?.did && ping.data.did !== myDID) {
        return {
          did: ping.data.did,
          lockTime: ping.data.lockTime,
          signature: ping.data.signature,
        };
      }
    }
  } catch { /* network error, keep polling */ }
  return null;
}

/** Send HANDSHAKE_CONFIRM with final bond signature. */
export async function sendConfirmation(
  code: string,
  slot: number,
  myDID: string,
  signature: string,
): Promise<void> {
  await relayFetch(`/api/room/${code}/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: slot,
      atomId: 0,
      reaction: 'HANDSHAKE_CONFIRM',
      data: { did: myDID, signature },
    }),
  });
}
