/**
 * MeshSync - Decentralized Matchmaking & Cryptographic Verification
 * Implements the cheat-prevention protocol from the TDD
 */

import { hashMatchEvents } from '../engine/MarkovEngine';
import type { PGlite } from '@electric-sql/pglite';

export interface MatchSeed {
  matchId: string;
  seed: number;
  timestamp: number;
  defenderFranchiseId: string;
  challengerFranchiseId: string;
}

export interface MatchAction {
  sequenceId: number;
  actorId: string;
  actionType: string;
  actionData: Record<string, unknown>;
  timestamp: number;
}

export interface SyncResult {
  success: boolean;
  matchId?: string;
  hash?: string;
  error?: string;
}

export class MeshSync {
  private db: PGlite;
  private apiEndpoint: string;

  constructor(db: PGlite, apiEndpoint: string = 'https://chump-edge.trimtab-signal.workers.dev') {
    this.db = db;
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Fetch match seed from network (mocked for local development)
   */
  async fetchMatchSeed(challengerId: string, defenderId: string): Promise<MatchSeed | null> {
    try {
      // In production, this calls the Cloudflare Worker
      // For development, generate deterministic seed locally
      const response = await fetch(`${this.apiEndpoint}/api/matches/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengerId, defenderId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[MeshSync] Network unavailable, using local seed:', err);

      // Fallback: generate deterministic seed from IDs
      const seedStr = `${challengerId}-${defenderId}-${Date.now()}`;
      let seed = 0;
      for (let i = 0; i < seedStr.length; i++) {
        seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
        seed |= 0;
      }

      return {
        matchId: `local-${Date.now()}`,
        seed: Math.abs(seed),
        timestamp: Date.now(),
        defenderFranchiseId: defenderId,
        challengerFranchiseId: challengerId,
      };
    }
  }

  /**
   * Log action to local database
   */
  async logAction(
    matchId: string,
    sequenceId: number,
    actorId: string,
    actionType: string,
    actionData: Record<string, unknown>
  ): Promise<void> {
    // Generate deterministic hash for this action
    const actionHash = await hashMatchEvents([{ matchId, sequenceId, actionData }]);

    await this.db.query(
      `INSERT INTO match_history_events (match_id, sequence_id, actor_id, action_type, action_data, deterministic_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [matchId, sequenceId, actorId, actionType, JSON.stringify(actionData), actionHash]
    );
  }

  /**
   * Get all actions for a match
   */
  async getMatchActions(matchId: string): Promise<MatchAction[]> {
    const result = await this.db.query<{
      sequence_id: number;
      actor_id: string;
      action_type: string;
      action_data: string;
      recorded_at: string;
    }>(
      `SELECT sequence_id, actor_id, action_type, action_data, recorded_at
       FROM match_history_events
       WHERE match_id = $1
       ORDER BY sequence_id`,
      [matchId]
    );

    return result.rows.map(row => ({
      sequenceId: row.sequence_id,
      actorId: row.actor_id,
      actionType: row.action_type,
      actionData: JSON.parse(row.action_data),
      timestamp: new Date(row.recorded_at).getTime(),
    }));
  }

  /**
   * Hash full match and sync to network
   */
  async hashAndSync(matchId: string): Promise<SyncResult> {
    try {
      // Get all actions
      const actions = await this.getMatchActions(matchId);

      if (actions.length === 0) {
        return { success: false, error: 'No actions to sync' };
      }

      // Generate hash
      const hash = await hashMatchEvents(actions);

      // In production, submit to network
      const response = await fetch(`${this.apiEndpoint}/api/matches/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          hash,
          actionCount: actions.length,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        // Store for later retry
        await this.db.query(
          `INSERT INTO async_match_queue (match_seed, challenger_franchise_id, defender_franchise_id, status, challenger_actions)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [matchId, 'local', 'network', 'pending', JSON.stringify(actions)]
        );

        return {
          success: false,
          matchId,
          hash,
          error: 'Network unavailable, queued for retry',
        };
      }

      return { success: true, matchId, hash };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  }

  /**
   * Queue async defensive match
   */
  async queueDefensiveMatch(
    defenderFranchiseId: string,
    matchSeed: string,
    defenderActions: MatchAction[]
  ): Promise<string> {
    const id = `defense-${Date.now()}`;

    await this.db.query(
      `INSERT INTO async_match_queue (id, challenger_franchise_id, defender_franchise_id, match_seed, status, defender_actions)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, 'pending-challenger', defenderFranchiseId, matchSeed, 'awaiting_challenge', JSON.stringify(defenderActions)]
    );

    return id;
  }

  /**
   * Resolve async match with challenger actions
   */
  async resolveAsyncMatch(
    queueId: string,
    challengerActions: MatchAction[]
  ): Promise<{ success: boolean; winner?: string; error?: string }> {
    try {
      // Get queue entry
      const queueResult = await this.db.query<{
        defender_actions: string;
        defender_franchise_id: string;
        match_seed: string;
      }>(
        `SELECT defender_actions, defender_franchise_id, match_seed
         FROM async_match_queue WHERE id = $1`,
        [queueId]
      );

      if (queueResult.rows.length === 0) {
        return { success: false, error: 'Queue entry not found' };
      }

      const { defender_actions, defender_franchise_id, match_seed } = queueResult.rows[0];
      const defenderActions: MatchAction[] = JSON.parse(defender_actions);

      // Simulate match (in production, this runs on the server)
      const defenderScore = this.calculateScore(defenderActions);
      const challengerScore = this.calculateScore(challengerActions);

      const winner = defenderScore > challengerScore ? 'defender' : 'challenger';

      // Update queue
      await this.db.query(
        `UPDATE async_match_queue
         SET status = $1, challenger_actions = $2, resolved_at = NOW()
         WHERE id = $3`,
        ['resolved', JSON.stringify(challengerActions), queueId]
      );

      // Award resin if defender won
      if (winner === 'defender') {
        await this.db.query(
          `UPDATE franchises SET resin_balance = resin_balance + 10 WHERE id = $1`,
          [defender_franchise_id]
        );
      }

      return { success: true, winner };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  }

  /**
   * Calculate match score from actions
   */
  private calculateScore(actions: MatchAction[]): number {
    return actions.reduce((score, action) => {
      const eventScore: Record<string, number> = {
        walk: 1,
        single: 2,
        double: 3,
        triple: 4,
        home_run: 5,
        strikeout: -1,
        out: 0,
      };
      return score + (eventScore[action.actionType] || 0);
    }, 0);
  }
}

// Hook factory
export function createMeshSync(db: PGlite): MeshSync {
  return new MeshSync(db);
}
