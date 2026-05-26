import { useEffect, useState, useCallback } from 'react';
import { useDatabase } from './PGLiteProvider';

export interface ResonanceSession {
  id: string;
  creator_pubkey: string;
  title: string;
  prng_seed: number;
  status: string;
  total_harmonic_score: number;
  coop_mode_enabled: boolean;
  created_at: string;
  _crdt_clock: number;
}

export interface PulseEvent {
  session_id: string;
  sequence_id: number;
  node_id: number;
  force_applied: number;
  actor_pubkey: string;
  event_time_ms: number;
  recorded_at: string;
}

export interface GalleryItem {
  id: string;
  session_id: string;
  title: string;
  creator_pubkey: string;
  peak_harmony: number;
  description: string;
  likes: number;
  is_public: boolean;
  added_at: string;
}

// Hook to get gallery items
export const useGallery = () => {
  const { db, isInitialized } = useDatabase();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized) return;

    const loadGallery = async () => {
      try {
        const result = await db.query<GalleryItem>(
          `SELECT * FROM resonance_gallery 
           WHERE is_public = TRUE 
           ORDER BY peak_harmony DESC, likes DESC 
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

// Hook to get pulse events for playback
export const usePulseEvents = (sessionId?: string, fromTimeMs?: number) => {
  const { db, isInitialized } = useDatabase();
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized || !sessionId) return;

    const loadEvents = async () => {
      try {
        const query = fromTimeMs
          ? `SELECT * FROM pulse_events 
             WHERE session_id = $1 AND event_time_ms >= $2 
             ORDER BY event_time_ms`
          : `SELECT * FROM pulse_events 
             WHERE session_id = $1 
             ORDER BY event_time_ms`;

        const params = fromTimeMs ? [sessionId, fromTimeMs] : [sessionId];
        const result = await db.query<PulseEvent>(query, params);
        setEvents(result.rows);
      } catch (err) {
        console.error('Error loading pulse events:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [db, isInitialized, sessionId, fromTimeMs]);

  return { events, loading };
};

// Hook to log pulse event
export const useLogPulse = () => {
  const { db } = useDatabase();

  const logPulse = useCallback(async (
    sessionId: string,
    sequenceId: number,
    nodeId: number,
    force: number,
    actorPubkey: string,
    timeMs: number
  ): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    await db.query(
      `INSERT INTO pulse_events (session_id, sequence_id, node_id, force_applied, actor_pubkey, event_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, sequenceId, nodeId, force, actorPubkey, timeMs]
    );
  }, [db]);

  return { logPulse };
};

// Hook to create session
export const useCreateSession = () => {
  const { db } = useDatabase();

  const create = useCallback(async (
    title: string,
    seed: number,
    creatorPubkey: string = 'local-creator'
  ): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    const result = await db.query<{ id: string }>(
      `INSERT INTO resonance_sessions (creator_pubkey, title, prng_seed)
       VALUES ($1, $2, $3) RETURNING id`,
      [creatorPubkey, title, seed]
    );

    return result.rows[0].id;
  }, [db]);

  return { create };
};

// Hook to get session
export const useSession = (sessionId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [session, setSession] = useState<ResonanceSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized || !sessionId) return;

    const loadSession = async () => {
      try {
        const result = await db.query<ResonanceSession>(
          `SELECT * FROM resonance_sessions WHERE id = $1`,
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

// Hook to save snapshot
export const useSaveSnapshot = () => {
  const { db } = useDatabase();

  const save = useCallback(async (
    sessionId: string,
    timeMs: number,
    harmonicResonance: number,
    constructiveNodes: number,
    totalPulses: number
  ): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    await db.query(
      `INSERT INTO resonance_snapshots (session_id, snapshot_time_ms, harmonic_resonance, constructive_nodes, total_pulses)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, timeMs, harmonicResonance, constructiveNodes, totalPulses]
    );
  }, [db]);

  return { save };
};

// Hook to like gallery item
export const useLikeGallery = () => {
  const { db } = useDatabase();

  const like = useCallback(async (galleryId: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    await db.query(
      `UPDATE resonance_gallery SET likes = likes + 1 WHERE id = $1`,
      [galleryId]
    );
  }, [db]);

  return { like };
};
