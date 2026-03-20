/**
 * @file telemetry — Opt-in anonymous event telemetry via navigator.sendBeacon.
 *
 * Opt-in:  set localStorage `p31-telemetry` = '1' (DevOverlay checkbox toggles this).
 * Endpoint: POST /api/telemetry — graceful no-op when absent (sendBeacon is fire-and-forget).
 *
 * Events batched in a module-level queue; flushed when queue reaches 10 items or on pagehide.
 * No PII collected — only event names, timestamps, and anonymous numeric state.
 *
 * Instrumented actions (call sites):
 *   overlay_open     — SovereignShell overlay SFX effect
 *   cartridge_mount  — useSovereignStore.mountToSlot action
 *   coherence_change — useSovereignStore.appendTelemetry (emitted when coherence updates)
 */

const STORAGE_KEY = 'p31-telemetry';
const ENDPOINT    = '/api/telemetry';

export function isTelemetryEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

export function setTelemetryEnabled(on: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch {}
}

interface TelemetryEvent {
  name: string;
  data: Record<string, unknown>;
  ts: number;
}

const _queue: TelemetryEvent[] = [];

function flush(): void {
  if (!_queue.length) return;
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;
  const payload = JSON.stringify({ events: _queue.splice(0) });
  try {
    navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
  } catch { /* fire-and-forget — endpoint may not exist in dev */ }
}

export function trackEvent(name: string, data: Record<string, unknown> = {}): void {
  if (!isTelemetryEnabled()) return;
  _queue.push({ name, data, ts: Date.now() });
  if (_queue.length >= 10) flush();
}

// Flush remaining events before page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
}
