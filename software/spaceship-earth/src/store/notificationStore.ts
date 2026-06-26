 *
 * Temporal batching window (60s) for inbound mesh network data and UI notifications.
 * Flattens endocrinological curve, prevents sensory overwhelm.
 *


  // Counters
  totalReceived: number;
  totalFlushed: number;


  flushIntervalMs: 60000, // 60 seconds
  lastFlush: Date.now(),
  isManualOverride: false,

  totalReceived: 0,
  totalFlushed: 0,



  flushBuffer: () => {
    const { pendingQueue, activeDisplay } = get();
    const now = Date.now();





}
