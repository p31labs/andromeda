/**
 * EventLogger — Telemetry logger for critical PHOS interactions.
 *
 * Logs key events to:
 * 1. localStorage (persistent ring buffer — last 50 events)
 * 2. console.log (formatted for dev debugging)
 *
 * Events captured:
 * - INTENT_ROUTED   — when a user types a command and routes to a surface
 * - GUARDIAN_ACTIVATED — when the panic button is pressed
 * - SPOON_STATE_CHANGED — when cognitive load drops or rises
 */

export type PHOSEventType =
  | 'INTENT_ROUTED'
  | 'GUARDIAN_ACTIVATED'
  | 'SPOON_STATE_CHANGED'
  | 'SURFACE_NAVIGATED'
  | 'VOICE_TOGGLED'
  | 'DEVICE_SEALED'
  | 'DEVICE_UNLOCKED'
  | 'GROUNDING_COMPLETED'
  | 'LOVE_CHANGED'
  | 'ERROR';

export interface PHOSEvent {
  id: string;
  type: PHOSEventType;
  timestamp: string;
  data: Record<string, string | number | boolean>;
}

const STORAGE_KEY = 'phos_event_log';
const MAX_EVENTS = 50;

/**
 * Retrieve the current event log from localStorage.
 */
export function getEventLog(): PHOSEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PHOSEvent[];
  } catch {
    return [];
  }
}

/**
 * Append an event to the log, trimming to MAX_EVENTS.
 */
function persistEvent(event: PHOSEvent): void {
  try {
    const log = getEventLog();
    log.push(event);
    // Trim to ring buffer limit
    if (log.length > MAX_EVENTS) {
      log.splice(0, log.length - MAX_EVENTS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // localStorage full or unavailable — silently degrade
  }
}

/**
 * Log a formatted event to console and persist to localStorage.
 */
export function logEvent(
  type: PHOSEventType,
  data: Record<string, string | number | boolean>
): void {
  const event: PHOSEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: new Date().toISOString(),
    data,
  };

  // Console output (dev-friendly)
  const styles: Record<string, string> = {
    INTENT_ROUTED: 'color: #39ff14; font-weight: bold',
    GUARDIAN_ACTIVATED: 'color: #ff3355; font-weight: bold; font-size: 1.1em',
    SPOON_STATE_CHANGED: 'color: #ffb000; font-weight: bold',
    SURFACE_NAVIGATED: 'color: #00e5ff; font-weight: bold',
    VOICE_TOGGLED: 'color: #b026ff; font-weight: bold',
    DEVICE_SEALED: 'color: #ffb000; font-weight: bold; font-size: 1.1em',
    DEVICE_UNLOCKED: 'color: #00e5ff; font-weight: bold; font-size: 1.1em',
    GROUNDING_COMPLETED: 'color: #ffb000; font-weight: bold',
    LOVE_CHANGED: 'color: #ffb000; font-weight: bold',
    ERROR: 'color: #ff3355; font-weight: bold',
  };

  const style = styles[type] || 'color: #888888';
  // eslint-disable-next-line no-console
  console.log(
    `%c[PHOS:${type}]%c ${event.timestamp.split('T')[1]?.slice(0, 12) || event.timestamp}`,
    style,
    'color: #666666',
    data
  );

  // Persist to localStorage
  persistEvent(event);
}

/**
 * Convenience wrappers for common event types.
 */
export function logIntentRouted(
  input: string,
  targetSurface: string,
  spoons: number
): void {
  logEvent('INTENT_ROUTED', {
    input: input.slice(0, 100),
    targetSurface,
    spoons,
  });
}

export function logGuardianActivated(spoons: number): void {
  logEvent('GUARDIAN_ACTIVATED', {
    spoons,
    urgent: true,
  });
}

export function logSpoonStateChanged(
  from: number,
  to: number
): void {
  logEvent('SPOON_STATE_CHANGED', {
    from,
    to,
    delta: to - from,
  });
}

export function logSurfaceNavigated(
  from: string,
  to: string,
  grayRock: boolean
): void {
  logEvent('SURFACE_NAVIGATED', {
    fromSurface: from,
    toSurface: to,
    grayRock,
  });
}

export function logVoiceToggled(muted: boolean): void {
  logEvent('VOICE_TOGGLED', { muted });
}

export function logDeviceSealed(): void {
  logEvent('DEVICE_SEALED', {
    timestamp: Date.now(),
    method: 'WebAuthn platform',
  });
}

export function logDeviceUnlocked(): void {
  logEvent('DEVICE_UNLOCKED', {
    timestamp: Date.now(),
    method: 'WebAuthn platform',
  });
}

export function logGroundingCompleted(spoons: number): void {
  logEvent('GROUNDING_COMPLETED', {
    spoons,
    method: '4-7-8 breathing',
    loveAwarded: 10,
  });
}

export function logLoveChanged(balance: number, delta: number): void {
  logEvent('LOVE_CHANGED', {
    balance,
    delta,
  });
}

export function getLogs(): PHOSEvent[] {
  return getEventLog();
}

export function clearLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently fail
  }
}
