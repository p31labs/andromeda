import { useEffect, useState, useCallback } from 'react';
import { useDatabase } from './PGLiteProvider';
import { executeOfflineTraining } from '../engine/training';
import type { TrainingStation } from '../types';
// Type definitions for database entities
export interface Franchise {
  id: string;
  owner_pubkey: string;
  team_name: string;
  resin_balance: number;
  created_at: string;
  _crdt_clock: number;
}

export interface Player {
  id: string;
  franchise_id: string;
  first_name: string;
  last_name: string;
  skin_tone_hex: string;
  jersey_number: number;
  base_stats: {
    contact: number;
    power: number;
    eye: number;
    bunt: number;
    glove: number;
    range: number;
    armStrength: number;
    armAccuracy: number;
    speed: number;
    stamina: number;
    clutch: number;
    baseballIq: number;
  };
  _crdt_clock: number;
}

export interface PlayerEffectiveStats extends Player {
  contact_mutation: number;
  power_mutation: number;
  eye_mutation: number;
  bunt_mutation: number;
  glove_mutation: number;
  range_mutation: number;
  armStrength_mutation: number;
  armAccuracy_mutation: number;
  speed_mutation: number;
  stamina_mutation: number;
  clutch_mutation: number;
  baseballIq_mutation: number;
}

export interface PlayerStatMutation {
  id: string;
  player_id: string;
  mutation_type: string;
  stat_key: string;
  delta: number;
  applied_at: string;
}

export interface ScoutReport {
  id: string;
  franchise_id: string;
  discovered_player_id: string;
  report_type: string;
  reward_resin: number;
  is_claimed: boolean;
  created_at: string;
  expires_at: string;
}

export interface ScheduledTrainingRow {
  id: string;
  player_id: string;
  franchise_id: string;
  first_name: string;
  last_name: string;
  jersey_number: number;
  station: string;
  focus_attribute: string;
  auto_enabled: boolean;
  scheduled_at: string;
  last_executed_at: string | null;
}

// Hook to get current franchise
export const useFranchise = (franchiseId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!db) return;

    try {
      const id = franchiseId || 'test-owner-001';
      const result = await db.query<Franchise>(
        'SELECT * FROM franchises WHERE id = $1 OR owner_pubkey = $2 LIMIT 1',
        [franchiseId, id]
      );
      setFranchise(result.rows[0] || null);
    } catch (err) {
      console.error('Error fetching franchise:', err);
    } finally {
      setLoading(false);
    }
  }, [db, franchiseId]);

  useEffect(() => {
    if (isInitialized) {
      refresh();
    }
  }, [isInitialized, refresh]);

  return { franchise, loading, refresh };
};

// Hook to get players for a franchise with live query
export const usePlayers = (franchiseId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized) return;

    const loadPlayers = async () => {
      try {
        // Get default franchise if none specified
        const result = await db.query<Player>(
          `SELECT p.* FROM players p
           JOIN franchises f ON p.franchise_id = f.id
           WHERE f.owner_pubkey = $1 OR p.franchise_id = $2
           ORDER BY p.jersey_number`,
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

    // Set up polling for "live query" effect (PGLite doesn't have built-in live yet)
    const interval = setInterval(loadPlayers, 2000);
    return () => clearInterval(interval);
  }, [db, isInitialized, franchiseId]);

  return { players, loading };
};

// Hook to get effective player stats (base + mutations)
export const usePlayerEffectiveStats = (playerId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [stats, setStats] = useState<PlayerEffectiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized) return;

    const loadStats = async () => {
      try {
        const query = playerId
          ? 'SELECT * FROM player_effective_stats WHERE id = $1'
          : 'SELECT * FROM player_effective_stats LIMIT 1';
        const result = await db.query<PlayerEffectiveStats>(
          query,
          playerId ? [playerId] : []
        );
        setStats(result.rows[0] || null);
      } catch (err) {
        console.error('Error fetching effective stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [db, isInitialized, playerId]);

  return { stats, loading };
};

// Hook to apply stat mutations (training)
export const useApplyMutation = () => {
  const { db } = useDatabase();

  const applyMutation = useCallback(async (
    playerId: string,
    statKey: string,
    delta: number,
    mutationType: string = 'training'
  ) => {
    if (!db) throw new Error('Database not initialized');

    await db.query(
      `INSERT INTO player_stat_mutations (player_id, stat_key, delta, mutation_type)
       VALUES ($1, $2, $3, $4)`,
      [playerId, statKey, delta, mutationType]
    );

    return true;
  }, [db]);

  return { applyMutation };
};

// Hook to get scout reports
export const useScoutReports = (franchiseId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [reports, setReports] = useState<ScoutReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !isInitialized) return;

    const loadReports = async () => {
      try {
        const result = await db.query<ScoutReport>(
          `SELECT * FROM scout_reports
           WHERE (franchise_id = $1 OR franchise_id IN (
             SELECT id FROM franchises WHERE owner_pubkey = $2
           ))
           AND is_claimed = FALSE
           AND expires_at > NOW()
           ORDER BY created_at DESC`,
          [franchiseId, 'test-owner-001']
        );
        setReports(result.rows);
      } catch (err) {
        console.error('Error fetching scout reports:', err);
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

// Hook to claim scout report
export const useClaimScoutReport = () => {
  const { db } = useDatabase();

  const claim = useCallback(async (reportId: string) => {
    if (!db) throw new Error('Database not initialized');

    await db.transaction(async (tx) => {
      // Get report details
      const report = await tx.query<ScoutReport>(
        'SELECT * FROM scout_reports WHERE id = $1 AND is_claimed = FALSE',
        [reportId]
      );

      if (report.rows.length === 0) {
        throw new Error('Report not found or already claimed');
      }

      const { franchise_id, reward_resin } = report.rows[0];

      // Mark as claimed
      await tx.query(
        'UPDATE scout_reports SET is_claimed = TRUE WHERE id = $1',
        [reportId]
      );

      // Add resin to franchise
      await tx.query(
        'UPDATE franchises SET resin_balance = resin_balance + $1 WHERE id = $2',
        [reward_resin, franchise_id]
      );
    });

    return true;
  }, [db]);

  return { claim };
};

// Initialize demo data
export const useInitDemoData = () => {
  const { db, isInitialized } = useDatabase();

  const init = useCallback(async () => {
    if (!db || !isInitialized) return;

    try {
      // Check if we already have players
      const existing = await db.query('SELECT COUNT(*) FROM players');
      if (parseInt(existing.rows[0].count) > 0) return;

      // Get franchise ID
      const franchise = await db.query(
        'SELECT id FROM franchises WHERE owner_pubkey = $1',
        ['test-owner-001']
      );
      const franchiseId = franchise.rows[0]?.id;

      if (!franchiseId) return;

      // Create demo players
      const demoPlayers = [
        { first: 'Rico', last: 'Rodriguez', number: 7, stats: { contact: 75, power: 65, eye: 60, bunt: 40, glove: 60, range: 70, armStrength: 55, armAccuracy: 70, speed: 80, stamina: 60, clutch: 55, baseballIq: 65 } },
        { first: 'Maya', last: 'Chen', number: 24, stats: { contact: 85, power: 55, eye: 75, bunt: 50, glove: 75, range: 65, armStrength: 50, armAccuracy: 75, speed: 70, stamina: 65, clutch: 70, baseballIq: 80 } },
        { first: 'Jamal', last: 'Thompson', number: 11, stats: { contact: 60, power: 90, eye: 45, bunt: 30, glove: 70, range: 60, armStrength: 70, armAccuracy: 45, speed: 65, stamina: 55, clutch: 80, baseballIq: 50 } },
        { first: 'Sofia', last: 'Patel', number: 3, stats: { contact: 70, power: 60, eye: 65, bunt: 55, glove: 80, range: 75, armStrength: 55, armAccuracy: 65, speed: 85, stamina: 70, clutch: 60, baseballIq: 75 } },
        { first: 'Tyler', last: 'Kim', number: 42, stats: { contact: 55, power: 70, eye: 50, bunt: 45, glove: 65, range: 55, armStrength: 85, armAccuracy: 80, speed: 60, stamina: 85, clutch: 65, baseballIq: 60 } },
      ];

      for (const player of demoPlayers) {
        await db.query(
          `INSERT INTO players (franchise_id, first_name, last_name, jersey_number, base_stats, skin_tone_hex)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            franchiseId,
            player.first,
            player.last,
            player.number,
            JSON.stringify(player.stats),
            '#ffdbac'
          ]
        );
      }

      // Create player energy rows
      const createdPlayers = await db.query(
        `SELECT id FROM players WHERE franchise_id = $1 ORDER BY jersey_number`,
        [franchiseId]
      );
      for (const row of createdPlayers.rows) {
        await db.query(
          `INSERT INTO player_energy (player_id, current_energy, max_energy)
           VALUES ($1, 100, 100)
           ON CONFLICT (player_id) DO NOTHING`,
          [row.id]
        );
      }

      // Create training facility rows for each station
      const stations = ['IRON_MIKE', 'TRACK_SLEDS', 'BULLPEN', 'POP_FLY', 'FILM_ROOM'];
      for (const station of stations) {
        await db.query(
          `INSERT INTO training_facilities (franchise_id, facility_type, level, pack_tier)
           VALUES ($1, $2, 1, 'SANDLOT')
           ON CONFLICT DO NOTHING`,
          [franchiseId, station]
        );
      }

      // Create a scout report
      await db.query(
        `INSERT INTO scout_reports (franchise_id, report_type, reward_resin, is_claimed)
         VALUES ($1, $2, $3, $4)`,
        [franchiseId, 'talent_spotting', 25, false]
      );

      console.log('[Demo] Initialized demo data');
    } catch (err) {
      console.error('[Demo] Error initializing:', err);
    }
  }, [db, isInitialized]);

  return { init };
};

// ============================================
// SCHEDULED TRAINING HOOKS (Low-Energy Idle)
// ============================================

export const useScheduledTraining = (franchiseId?: string) => {
  const { db, isInitialized } = useDatabase();
  const [schedules, setSchedules] = useState<ScheduledTrainingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!db) return;
    try {
      const query = franchiseId
        ? `SELECT s.*, p.first_name, p.last_name, p.jersey_number
           FROM scheduled_training s
           JOIN players p ON s.player_id = p.id
           WHERE s.franchise_id = $1
           ORDER BY s.scheduled_at DESC`
        : `SELECT s.*, p.first_name, p.last_name, p.jersey_number
           FROM scheduled_training s
           JOIN players p ON s.player_id = p.id
           JOIN franchises f ON s.franchise_id = f.id
           WHERE f.owner_pubkey = 'test-owner-001'
           ORDER BY s.scheduled_at DESC`;
      const result = await db.query<ScheduledTrainingRow>(
        query,
        franchiseId ? [franchiseId] : []
      );
      setSchedules(result.rows);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [db, franchiseId]);

  useEffect(() => {
    if (isInitialized) {
      refresh();
    }
  }, [isInitialized, refresh]);

  return { schedules, loading, refresh };
};

export const useSetScheduledTraining = () => {
  const { db } = useDatabase();

  const setSchedule = useCallback(async (
    playerId: string,
    franchiseId: string,
    station: string,
    focusAttribute?: string
  ) => {
    if (!db) throw new Error('Database not initialized');

    // Upsert: replace existing schedule for this player+station
    await db.query(
      `DELETE FROM scheduled_training
       WHERE player_id = $1 AND franchise_id = $2 AND station = $3`,
      [playerId, franchiseId, station]
    );

    await db.query(
      `INSERT INTO scheduled_training (player_id, franchise_id, station, focus_attribute, auto_enabled)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [playerId, franchiseId, station, focusAttribute || 'BALANCED']
    );

    return true;
  }, [db]);

  return { setSchedule };
};

export const useDeleteScheduledTraining = () => {
  const { db } = useDatabase();

  const deleteSchedule = useCallback(async (scheduleId: string) => {
    if (!db) throw new Error('Database not initialized');
    await db.query('DELETE FROM scheduled_training WHERE id = $1', [scheduleId]);
    return true;
  }, [db]);

  return { deleteSchedule };
};

export const useToggleScheduledTraining = () => {
  const { db } = useDatabase();

  const toggle = useCallback(async (scheduleId: string, current: boolean) => {
    if (!db) throw new Error('Database not initialized');
    await db.query(
      'UPDATE scheduled_training SET auto_enabled = $1 WHERE id = $2',
      [!current, scheduleId]
    );
    return true;
  }, [db]);

  return { toggle };
};

export const useExecuteScheduledTraining = () => {
  const { db } = useDatabase();

  const executeAll = useCallback(async (franchiseId: string) => {
    if (!db) return { executed: 0, results: [] };

    const executed: Array<{
      playerName: string;
      station: string;
      sessions: number;
      xpSummary: string;
    }> = [];

    try {
      const schedules = await db.query(
        `SELECT s.*, p.first_name, p.last_name
         FROM scheduled_training s
         JOIN players p ON s.player_id = p.id
         WHERE s.franchise_id = $1 AND s.auto_enabled = TRUE`,
        [franchiseId]
      );

      // Get pack tier from first facility
      const packRow = await db.query(
        'SELECT pack_tier FROM training_facilities WHERE franchise_id = $1 LIMIT 1',
        [franchiseId]
      );
      const packTier = (packRow.rows[0]?.pack_tier as 'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX') || 'SANDLOT';

      // Regen rates per tier
      const regenRates: Record<string, number> = { SANDLOT: 5, HS_GYM: 8, PRO_COMPLEX: 12 };
      const energyCosts: Record<string, number> = { SANDLOT: 50, HS_GYM: 40, PRO_COMPLEX: 25 };
      const regenRate = regenRates[packTier];
      const energyCost = energyCosts[packTier];

      for (const sched of schedules.rows) {
        const lastRun = sched.last_executed_at
          ? new Date(sched.last_executed_at).getTime()
          : new Date(sched.scheduled_at).getTime();
        const elapsedHours = (Date.now() - lastRun) / (1000 * 60 * 60);

        // Available energy = regen since last run
        const availableEnergy = Math.min(100, elapsedHours * regenRate);
        const sessions = Math.floor(availableEnergy / energyCost);

        if (sessions < 1) continue;

        const results = executeOfflineTraining({
          playerId: sched.player_id,
          franchiseId,
          station: sched.station as TrainingStation,
          facilityLevel: 1,
          packTier: packTier as 'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX',
          sessionsToExecute: Math.min(sessions, 10),
          startingEnergy: 100,
          crdtClock: BigInt(Date.now()),
          crdtNodeId: 'local',
        });

        // Persist training events + stat mutations
        for (const result of results) {
          await db.query(
            `INSERT INTO training_events (event_type, player_id, franchise_id, station, energy_spent, xp_gained, facility_level, was_manual, minigame_score, _crdt_clock, _crdt_node_id)
             VALUES ('EXECUTE_AUTO', $1, $2, $3, $4, $5, 1, FALSE, 0, $6, 'auto-replay')`,
            [
              sched.player_id,
              franchiseId,
              sched.station,
              result.event.energySpent,
              JSON.stringify(result.event.xpGained),
              result.event.crdtClock,
            ]
          );

          // Apply stat mutations
          for (const [attr, delta] of Object.entries(result.attributeDeltas)) {
            if (delta > 0) {
              await db.query(
                `INSERT INTO player_stat_mutations (player_id, mutation_type, stat_key, delta)
                 VALUES ($1, 'TRAIN_' || UPPER($2), $3, $4)`,
                [sched.player_id, attr, attr, delta]
              );
            }
          }
        }

        // Update last_executed_at
        await db.query(
          'UPDATE scheduled_training SET last_executed_at = NOW() WHERE id = $1',
          [sched.id]
        );

        // Update player energy
        const finalEnergy = results.length > 0 ? results[results.length - 1].newEnergy : 100;
        await db.query(
          'UPDATE player_energy SET current_energy = $1, last_regen_timestamp = $2 WHERE player_id = $3',
          [finalEnergy, Date.now(), sched.player_id]
        );

        const xpTotal = results.reduce((sum, r) => {
          return sum + Object.values(r.event.xpGained).reduce((a: number, b) => a + b, 0);
        }, 0);

        executed.push({
          playerName: `${sched.first_name} ${sched.last_name[0]}.`,
          station: sched.station,
          sessions: results.length,
          xpSummary: `+${xpTotal} XP`,
        });
      }
    } catch (err) {
      console.error('[Auto-Execute] Error:', err);
    }

    return { executed, results: executed };
  }, [db]);

  return { executeAll };
};
