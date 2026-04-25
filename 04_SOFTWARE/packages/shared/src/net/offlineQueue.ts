/**
 * offlineQueue — persistent IndexedDB action queue for offline replay.
 *
 * Used by K4MeshClient (HybridTransport) to buffer messages while disconnected.
 * Queue is stored in IndexedDB under key `k4-offline-queue` as an array of items:
 *   { type: string, payload: unknown, ts: number }
 *
 * Guarantees order preservation and crash resilience.
 *
 * WARNING: The queue is unbounded; production should implement TTL eviction.
 */

import { get, set, del } from 'idb-keyval';

const QUEUE_KEY = 'k4-offline-queue';

/**
 * Enqueue a message for later replay.
 */
export async function enqueue(item: { type: string; payload: unknown; ts: number }): Promise<void> {
  const queue = (await get(QUEUE_KEY)) as Array<{ type: string; payload: unknown; ts: number }> || [];
  queue.push(item);
  await set(QUEUE_KEY, queue);
}

/**
 * Drain all pending items in order and clear the queue.
 * @returns Array of queued items (oldest first)
 */
export async function drainQueue(): Promise<Array<{ type: string; payload: unknown; ts: number }>> {
  const queue = (await get(QUEUE_KEY)) as Array<{ type: string; payload: unknown; ts: number }> || [];
  await del(QUEUE_KEY);
  return queue;
}

/**
 * Current queue size (for UI diagnostics).
 */
export async function queueSize(): Promise<number> {
  const queue = (await get(QUEUE_KEY)) as any[] || [];
  return queue.length;
}

/**
 * Clear the queue manually (admin action).
 */
export async function clearQueue(): Promise<void> {
  await del(QUEUE_KEY);
}
