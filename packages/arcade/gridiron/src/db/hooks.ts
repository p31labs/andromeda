import { useEffect, useState, useCallback } from 'react';
import { useDatabase } from './PGLiteProvider';

// Types
export interface Franchise {
  id: string;
  owner_pubkey: string;
  team_name: string;
  resin_balance: number;
  wins: number;
  losses: number;
  created_at: string;
  _crdt_clock: number;
}

export interface Player {
  id: string;
  franchise_id: string;
  name: string;
  position: 'QB' | 'WR' | 'RB' | 'LB' | 'CB' | 'DL';
  base_stats: {
    speed: number;
    catch: number;
    throw_power: number;
    tackle: number;
    coverage: number;
  };
  xp: number;
  fatigue: number;
  status: 'active' | 'resting' | 'film_study' | 'injured';
  _crdt_clock: number;
}

export interface Playbook {
  id: string;
  franchise_id: string;
  play_name: string;
  play_type: 'RUN' | 'PASS_SHORT' | 'PASS_DEEP' | 'SCREEN' | 'BLITZ' | 'COVER_2' | 'COVER_3' | 'MAN';
  formation: string;
  routes: Record<string, { x: number; y: number; timing: number }>;
  blitzers: string[];
  _crdt_clock: number;
}

export interface PlayHistoryEvent {
  match_id: string;
  drive_id: number;
  play_sequence: number;
  offense_franchise_id: string;
  defense_franchise_id: string;
  offense_play_id: string;
  defense_play_id: string;
  outcome_type: string;
  yards_gained: number;
  action_data: Record<string, unknown>;
  recorded_at: string;
}

export interface InjuryReport {
  id: string;
  player_id: string;
  franchise_id: string;
  player_name?: string;
  injury_type: string;
  severity: number;
  recovery_games: number;
  is_resolved: boolean;
  created_at: string;
}

// Hook to get franchise
export const useFranchise = (franchiseId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!db) return;

    try {
      const result = await db.query<Franchise>(
        'SELECT * FROM franchises WHERE id = $1 OR owner_pubkey = $2 LIMIT 1',
        [franchiseId, 'test-owner-001']
      );
      setFranchise(result.rows[0] || null);
    } catch (err) {
      console.error('Error fetching franchise:', err);
    } finally {
      setLoading(false);
    }
  }, [db, franchiseId]);

  useEffect(() => {
    if (isInitialized) refresh();
  }, [isInitialized, refresh]);

  return { franchise, loading, refresh };
};

// Hook to get players (5v5 roster)
export const usePlayers = (franchiseId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized) return;

    const loadPlayers = async () => {
      try {
        const result = await db.query<Player>(
          `SELECT p.* FROM players p
           JOIN franchises f ON p.franchise_id = f.id
           WHERE f.owner_pubkey = $1 OR p.franchise_id = $2
           ORDER BY 
             CASE p.position 
               WHEN 'QB' THEN 1 
               WHEN 'RB' THEN 2 
               WHEN 'WR' THEN 3 
               WHEN 'LB' THEN 4 
               WHEN 'CB' THEN 5 
               WHEN 'DL' THEN 6 
             END`,
          ['test-owner-001', franchiseId]
        );
        setPlayers(result.rows);
      } catch (err) {
        console.error('Error fetching players:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
    const interval = setInterval(loadPlayers, 2000);
    return () => clearInterval(interval);
  }, [db, isInitialized, franchiseId]);

  return { players, loading };
};

// Hook to get playbooks
export const usePlaybooks = (franchiseId?: string, playType?: string) => {
  const { db, isInitialized } = useDatabase();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized) return;

    const loadPlaybooks = async () => {
      try {
        let query = `SELECT * FROM playbooks WHERE franchise_id = $1`;
        const params: (string | undefined)[] = [franchiseId];

        if (playType) {
          query += ` AND play_type = $2`;
          params.push(playType);
        }

        query += ` ORDER BY play_name`;

        const result = await db.query<Playbook>(query, params);
        setPlaybooks(result.rows);
      } catch (err) {
        console.error('Error fetching playbooks:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlaybooks();
  }, [db, isInitialized, franchiseId, playType]);

  return { playbooks, loading };
};

// Hook to set player status (Low Energy action)
export const useSetPlayerStatus = () => {
  const { db } = useDatabase();

  const setStatus = useCallback(async (playerId: string, status: Player['status']) => {
    if (!db) throw new Error('Database not initialized');

    await db.query(
      `UPDATE players SET status = $1, _crdt_clock = _crdt_clock + 1 WHERE id = $2`,
      [status, playerId]
    );

    // If resting or film study, grant passive XP
    if (status === 'resting' || status === 'film_study') {
      await db.query(
        `UPDATE players SET xp = xp + 5 WHERE id = $1`,
        [playerId]
      );
    }

    return true;
  }, [db]);

  return { setStatus };
};

// Hook to get injury reports
export const useInjuryReports = (franchiseId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [reports, setReports] = useState<InjuryReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized) return;

    const loadReports = async () => {
      try {
        const result = await db.query<InjuryReport>(
          `SELECT ir.*, p.name as player_name 
           FROM injury_reports ir
           JOIN players p ON ir.player_id = p.id
           WHERE ir.franchise_id = $1 OR ir.franchise_id IN (
             SELECT id FROM franchises WHERE owner_pubkey = $2
           )
           AND ir.is_resolved = FALSE
           ORDER BY ir.severity DESC, ir.created_at DESC`,
          [franchiseId, 'test-owner-001']
        );
        setReports(result.rows);
      } catch (err) {
        console.error('Error fetching injury reports:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
    const interval = setInterval(loadReports, 5000);
    return () => clearInterval(interval);
  }, [db, isInitialized, franchiseId]);

  return { reports, loading };
};

// Hook to log play events
export const useLogPlayEvent = () => {
  const { db } = useDatabase();

  const logEvent = useCallback(async (event: Omit<PlayHistoryEvent, 'recorded_at'>) => {
    if (!db) throw new Error('Database not initialized');

    // Generate deterministic hash
    const data = JSON.stringify(event);
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    await db.query(
      `INSERT INTO play_history_events 
       (match_id, drive_id, play_sequence, offense_franchise_id, defense_franchise_id,
        offense_play_id, defense_play_id, outcome_type, yards_gained, 
        ball_carrier_id, tackler_id, action_data, deterministic_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        event.match_id,
        event.drive_id,
        event.play_sequence,
        event.offense_franchise_id,
        event.defense_franchise_id,
        event.offense_play_id,
        event.defense_play_id,
        event.outcome_type,
        event.yards_gained,
        null, // ball_carrier_id - would be set from action_data
        null, // tackler_id
        JSON.stringify(event.action_data),
        hash
      ]
    );

    return hash;
  }, [db]);

  return { logEvent };
};

// Initialize demo data
export const useInitDemoData = () => {
  const { db, isInitialized } = useDatabase();

  const init = useCallback(async () => {
    if (!db || !isInitialized) return;

    try {
      const existing = await db.query('SELECT COUNT(*) FROM players');
      if (parseInt(existing.rows[0].count) > 0) return;

      const franchise = await db.query(
        'SELECT id FROM franchises WHERE owner_pubkey = $1',
        ['test-owner-001']
      );
      const franchiseId = franchise.rows[0]?.id;
      if (!franchiseId) return;

      // Create 5v5 roster
      const demoPlayers = [
        { name: 'Marcus "Air" Chen', position: 'QB', stats: { speed: 60, catch: 40, throw_power: 85, tackle: 30, coverage: 35 } },
        { name: 'Tyrone Jackson', position: 'RB', stats: { speed: 80, catch: 55, throw_power: 30, tackle: 45, coverage: 40 } },
        { name: 'DeShawn Williams', position: 'WR', stats: { speed: 90, catch: 80, throw_power: 25, tackle: 25, coverage: 30 } },
        { name: 'Carlos Rivera', position: 'LB', stats: { speed: 65, catch: 45, throw_power: 35, tackle: 85, coverage: 70 } },
        { name: 'Jake Morrison', position: 'CB', stats: { speed: 88, catch: 60, throw_power: 20, tackle: 60, coverage: 90 } },
      ];

      for (const player of demoPlayers) {
        await db.query(
          `INSERT INTO players (franchise_id, name, position, base_stats)
           VALUES ($1, $2, $3, $4)`,
          [franchiseId, player.name, player.position, JSON.stringify(player.stats)]
        );
      }

      // Create an injury report
      await db.query(
        `INSERT INTO injury_reports (player_id, franchise_id, injury_type, severity, recovery_games)
         SELECT id, $1, 'Sprained Ankle', 2, 2 FROM players WHERE name = 'DeShawn Williams'`,
        [franchiseId]
      );

      console.log('[Demo] Gridiron roster initialized');
    } catch (err) {
      console.error('[Demo] Error:', err);
    }
  }, [db, isInitialized]);

  return { init };
};
