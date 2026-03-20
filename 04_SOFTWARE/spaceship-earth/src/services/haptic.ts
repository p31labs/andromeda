/**
 * @file haptic — Thin wrapper around navigator.vibrate.
 *
 * Silently no-ops on unsupported devices (iOS, desktop).
 * Android Chrome + Android Firefox: navigator.vibrate is available.
 *
 * Patterns (ms):
 *   tap       — [20]           short confirmation tap
 *   snap      — [30]           element snaps into place
 *   double    — [30, 60, 30]   two-pulse celebration
 */

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* permission denied on some devices */ }
  }
}

export const haptic = {
  tap:    () => vibrate(20),
  snap:   () => vibrate(30),
  double: () => vibrate([30, 60, 30]),
};
