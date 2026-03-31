// spaceship-earth/src/utils/bufferStorage.ts
// IndexedDB persistence for Buffer data via idb-keyval
// Replaces localStorage for held messages + calibration
//
// Types mirror BufferRoom.tsx interfaces — this module only handles
// async load/save to IndexedDB. No type duplication.

import { get, set } from 'idb-keyval';

const CAL_KEY = 'p31-buffer-cal';
const HELD_KEY = 'p31-buffer-held';

/**
 * Load calibration data from IndexedDB.
 * Returns null if not found, so the caller can use its own defaults.
 */
export async function loadCalibration<T>(defaultVal: T): Promise<T> {
  try {
    const stored = await get<T>(CAL_KEY);
    if (stored) return { ...defaultVal, ...stored };
  } catch {
    // IndexedDB unavailable
  }
  return defaultVal;
}

/**
 * Save calibration data to IndexedDB.
 */
export async function saveCalibration<T>(cal: T): Promise<void> {
  try {
    await set(CAL_KEY, cal);
  } catch {
    // silently fail
  }
}

/**
 * Load held messages from IndexedDB.
 */
export async function loadHeldMessages<T>(): Promise<T[]> {
  try {
    const stored = await get<T[]>(HELD_KEY);
    if (stored && Array.isArray(stored)) return stored;
  } catch {
    // IndexedDB unavailable
  }
  return [];
}

/**
 * Save held messages to IndexedDB.
 */
export async function saveHeldMessages<T>(held: T[]): Promise<void> {
  try {
    await set(HELD_KEY, held);
  } catch {
    // silently fail
  }
}
