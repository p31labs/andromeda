import { useEffect, useState, useCallback } from 'react';
import { useDatabase } from './PGLiteProvider';

export interface GameSession {
  id: string;
  game_type: string;
  prng_seed: number;
  status: string;
  pot_size: number;
  current_turn_pubkey: string | null;
  created_at: string;
  _crdt_clock: number;
}

export interface SessionPlayer {
  session_id: string;
  player_pubkey: string;
  seat_index: number;
  chip_count: number;
  hand_cards: Array<{ value: string; suit: string }>;
  is_active: boolean;
}

export interface GameEvent {
  session_id: string;
  sequence_id: number;
  actor_pubkey: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  deterministic_hash: string;
  recorded_at: string;
}

export interface DailyReward {
  id: string;
  player_pubkey: string;
  reward_type: string;
  chip_amount: number;
  is_claimed: boolean;
  available_at: string;
  expires_at: string;
}

// Hook to get active game sessions
export const useGameSessions = () => {
  const { db, isInitialized } = useDatabase();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized) return;

    const loadSessions = async () => {
      try {
        const result = await db.query<GameSession>(
          `SELECT * FROM card_sessions WHERE status = 'ACTIVE' ORDER BY created_at DESC`
        );
        setSessions(result.rows);
      } catch (err) {
        console.error('Error loading sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
    const interval = setInterval(loadSessions, 2000);
    return () => clearInterval(interval);
  }, [db, isInitialized]);

  return { sessions, loading };
};

// Hook to get session players
export const useSessionPlayers = (sessionId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized || !sessionId) return;

    const loadPlayers = async () => {
      try {
        const result = await db.query<SessionPlayer>(
          `SELECT * FROM session_players WHERE session_id = $1 ORDER BY seat_index`,
          [sessionId]
        );
        setPlayers(result.rows);
      } catch (err) {
        console.error('Error loading players:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [db, isInitialized, sessionId]);

  return { players, loading };
};

// Hook to get game events (for state reconstruction)
export const useGameEvents = (sessionId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized || !sessionId) return;

    const loadEvents = async () => {
      try {
        const result = await db.query<GameEvent>(
          `SELECT * FROM game_events WHERE session_id = $1 ORDER BY sequence_id`,
          [sessionId]
        );
        setEvents(result.rows);
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [db, isInitialized, sessionId]);

  return { events, loading };
};

// Hook to log a game event
export const useLogGameEvent = () => {
  const { db } = useDatabase();

  const logEvent = useCallback(async (
    sessionId: string,
    sequenceId: number,
    actorPubkey: string,
    actionType: string,
    payload: Record<string, unknown>
  ): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    // Generate deterministic hash
    const data = JSON.stringify({ sessionId, sequenceId, actorPubkey, actionType, payload });
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    await db.query(
      `INSERT INTO game_events (session_id, sequence_id, actor_pubkey, action_type, action_payload, deterministic_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, sequenceId, actorPubkey, actionType, JSON.stringify(payload), hash]
    );

    return hash;
  }, [db]);

  return { logEvent };
};

// Hook to get daily rewards (Low Energy)
export const useDailyRewards = (playerPubkey?: string) => {
  const { db, isInitialized } = useDatabase();
  const [rewards, setRewards] = useState<DailyReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized) return;

    const loadRewards = async () => {
      try {
        const result = await db.query<DailyReward>(
          `SELECT * FROM daily_rewards 
           WHERE player_pubkey = $1 AND is_claimed = FALSE AND expires_at > NOW()
           ORDER BY available_at DESC`,
          [playerPubkey || 'test-player-001']
        );
        setRewards(result.rows);
      } catch (err) {
        console.error('Error loading rewards:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRewards();
    const interval = setInterval(loadRewards, 5000);
    return () => clearInterval(interval);
  }, [db, isInitialized, playerPubkey]);

  return { rewards, loading };
};

// Hook to claim daily reward
export const useClaimReward = () => {
  const { db } = useDatabase();

  const claim = useCallback(async (rewardId: string) => {
    if (!db) throw new Error('Database not initialized');

    await db.query(
      `UPDATE daily_rewards 
       SET is_claimed = TRUE, claimed_at = NOW()
       WHERE id = $1 AND is_claimed = FALSE`,
      [rewardId]
    );

    return true;
  }, [db]);

  return { claim };
};

// Hook to create new session
export const useCreateSession = () => {
  const { db } = useDatabase();

  const create = useCallback(async (
    gameType: string,
    seed: number,
    playerPubkey: string
  ): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    const sessionResult = await db.query<{ id: string }>(
      `INSERT INTO card_sessions (game_type, prng_seed, current_turn_pubkey)
       VALUES ($1, $2, $3) RETURNING id`,
      [gameType, seed, playerPubkey]
    );

    const sessionId = sessionResult.rows[0].id;

    // Add creator as first player
    await db.query(
      `INSERT INTO session_players (session_id, player_pubkey, seat_index)
       VALUES ($1, $2, $3)`,
      [sessionId, playerPubkey, 0]
    );

    return sessionId;
  }, [db]);

  return { create };
};

// State reconstruction from events
export const useReconstructGameState = (sessionId?: string) => {
  const { events, loading: eventsLoading } = useGameEvents(sessionId);

  const gameState = useCallback(() => {
    if (!events.length) return null;

    const state = {
      deck: [] as Array<{ value: string; suit: string }>,
      hands: {} as Record<string, Array<{ value: string; suit: string }>>,
      pot: 0,
      currentTurn: '',
      lastAction: '',
    };

    for (const event of events) {
      switch (event.action_type) {
        case 'SHUFFLE':
          state.deck = (event.action_payload.deck as Array<{ value: string; suit: string }>) || [];
          break;
        case 'DEAL':
          const { player, cards } = event.action_payload as { player: string; cards: Array<{ value: string; suit: string }> };
          state.hands[player] = cards;
          break;
        case 'BET':
          state.pot += (event.action_payload.amount as number) || 0;
          break;
        case 'PLAY_CARD':
          state.lastAction = `${event.actor_pubkey} played ${event.action_payload.card}`;
          break;
        case 'COOP_LINK':
          state.lastAction = 'Co-op mode activated!';
          break;
      }
    }

    return state;
  }, [events]);

  return { state: gameState(), events, loading: eventsLoading };
};
