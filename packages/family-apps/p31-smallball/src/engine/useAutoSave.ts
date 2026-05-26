import { useCallback, useEffect, useRef } from 'react';
import { useDatabase } from '../db/PGLiteProvider';
import { CloudSyncEngine, createSyncEngine } from './CloudSyncEngine';

const AUTO_SAVE_DEBOUNCE_MS = 2000;

export function useAutoSave(franchiseId?: string) {
  const { db, isInitialized } = useDatabase();
  const syncRef = useRef<CloudSyncEngine>(createSyncEngine());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const franchiseRef = useRef(franchiseId);

  franchiseRef.current = franchiseId;

  const triggerSync = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      const fid = franchiseRef.current;
      if (!db || !fid) return;

      try {
        const result = await syncRef.current.syncAll(db, fid);
        if (!result.success) {
          console.warn('[AutoSave] Sync failed:', result.error);
        }
      } catch (err) {
        console.warn('[AutoSave] Error:', err);
      }
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [db]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { triggerSync };
}
