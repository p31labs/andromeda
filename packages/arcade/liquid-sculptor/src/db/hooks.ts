import { useEffect, useState, useCallback } from 'react';
import { useDatabase } from './PGLiteProvider';

export interface SculptureSession {
  id: string;
  creator_pubkey: string;
  title: string;
  prng_seed: number;
  status: string;
  particle_count: number;
  created_at: string;
  _crdt_clock: number;
}

export interface SculptEvent {
  session_id: string;
  sequence_id: number;
  event_type: 'POUR' | 'DRAG_FORCE' | 'TRIGGER_VORTEX' | 'STOP_VORTEX';
  event_time_ms: number;
  payload: {
    x?: number;
    y?: number;
    z?: number;
    radius?: number;
    strength?: number;
    count?: number;
    type?: number; // 0 = Cyan, 1 = Phos
  };
  recorded_at: string;
}

export interface GalleryItem {
  id: string;
  session_id: string;
  title: string;
  creator_pubkey: string;
  description: string;
  likes: number;
  is_public: boolean;
  added_at: string;
}

// Hook to get gallery items (for Low Energy viewing)
export const useGallery = () => {
  const { db, isInitialized } = useDatabase();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized) return;

    const loadGallery = async () => {
      try {
        const result = await db.query<GalleryItem>(
          `SELECT g.*, s.prng_seed, s.particle_count
           FROM sculpture_gallery g
           JOIN sculpture_sessions s ON g.session_id = s.id
           WHERE g.is_public = TRUE
           ORDER BY g.likes DESC, g.added_at DESC
           LIMIT 20`
        );
        setItems(result.rows);
      } catch (err) {
        console.error('Error loading gallery:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGallery();
    const interval = setInterval(loadGallery, 10000);
    return () => clearInterval(interval);
  }, [db, isInitialized]);

  return { items, loading };
};

// Hook to get sculpt events for a session
export const useSculptEvents = (sessionId?: string, fromTimeMs?: number) => {
  const { db, isInitialized } = useDatabase();
  const [events, setEvents] = useState<SculptEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized || !sessionId) return;

    const loadEvents = async () => {
      try {
        const query = fromTimeMs
          ? `SELECT * FROM sculpt_events 
             WHERE session_id = $1 AND event_time_ms >= $2 
             ORDER BY event_time_ms`
          : `SELECT * FROM sculpt_events 
             WHERE session_id = $1 
             ORDER BY event_time_ms`;

        const params = fromTimeMs ? [sessionId, fromTimeMs] : [sessionId];
        const result = await db.query<SculptEvent>(query, params);
        setEvents(result.rows);
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [db, isInitialized, sessionId, fromTimeMs]);

  return { events, loading };
};

// Hook to log sculpt events
export const useLogSculptEvent = () => {
  const { db } = useDatabase();

  const logEvent = useCallback(async (
    sessionId: string,
    sequenceId: number,
    eventType: SculptEvent['event_type'],
    eventTimeMs: number,
    payload: SculptEvent['payload']
  ): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    await db.query(
      `INSERT INTO sculpt_events (session_id, sequence_id, event_type, event_time_ms, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, sequenceId, eventType, eventTimeMs, JSON.stringify(payload)]
    );
  }, [db]);

  return { logEvent };
};

// Hook to create new sculpture session
export const useCreateSession = () => {
  const { db } = useDatabase();

  const create = useCallback(async (
    title: string,
    seed: number,
    creatorPubkey: string = 'local-creator'
  ): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    const result = await db.query<{ id: string }>(
      `INSERT INTO sculpture_sessions (creator_pubkey, title, prng_seed, particle_count)
       VALUES ($1, $2, $3, 10000)
       RETURNING id`,
      [creatorPubkey, title, seed]
    );

    return result.rows[0].id;
  }, [db]);

  return { create };
};

// Hook to get session details
export const useSession = (sessionId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [session, setSession] = useState<SculptureSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized || !sessionId) return;

    const loadSession = async () => {
      try {
        const result = await db.query<SculptureSession>(
          `SELECT * FROM sculpture_sessions WHERE id = $1`,
          [sessionId]
        );
        setSession(result.rows[0] || null);
      } catch (err) {
        console.error('Error loading session:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [db, isInitialized, sessionId]);

  return { session, loading };
};

// Hook to like a gallery item
export const useLikeSculpture = () => {
  const { db } = useDatabase();

  const like = useCallback(async (galleryId: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    await db.query(
      `UPDATE sculpture_gallery SET likes = likes + 1 WHERE id = $1`,
      [galleryId]
    );
  }, [db]);

  return { like };
};
