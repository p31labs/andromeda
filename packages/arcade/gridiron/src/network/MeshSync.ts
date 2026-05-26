/**
 * MeshSync - Decentralized Gridiron Matchmaking
 * Asynchronous play with cryptographic verification
 */

import { PGlite } from '@electric-sql/pglite';
import { hashPlayEvents } from '../engine/GridironEngine';
import type { PlayResult } from '../engine/GridironEngine';

export interface MatchSeed {
  matchId: string;
  seed: number;
  timestamp: number;
  challengerFranchiseId: string;
  defenderFranchiseId: string;
  lineOfScrimmage: number;
}

export interface AsyncMatch {
  id: string;
  challengerFranchiseId: string;
  defenderFranchiseId: string;
  matchSeed: number;
  status: 'pending' | 'active' | 'completed' | 'disputed';
  challengerHash?: string;
  defenderHash?: string;
  challengerScore: number;
  defenderScore: number;
  createdAt: number;
  completedAt?: number;
}

export interface PlayLogEntry {
  matchId: string;
  driveId: number;
  playSequence: number;
  offensePlayId: string;
  defensePlayId: string;
  outcome: string;
  yardsGained: number;
  hash: string;
}

export class GridironMeshSync {
  private db: PGlite;
  private apiEndpoint: string;

  constructor(db: PGlite, apiEndpoint: string = 'https://chump-edge.trimtab-signal.workers.dev') {
    this.db = db;
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Fetch match seed from network or generate locally
   */
  async fetchMatchSeed(
    challengerFranchiseId: string,
    defenderFranchiseId: string
  ): Promise<MatchSeed | null> {
    try {
      const response = await fetch(`${this.apiEndpoint}/api/gridiron/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengerFranchiseId,
          defenderFranchiseId,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[MeshSync] Network unavailable, using local seed:', err);

      // Generate deterministic seed from IDs
      const seedStr = `${challengerFranchiseId}-${defenderFranchiseId}-${Date.now()}`;
      let seed = 0;
      for (let i = 0; i < seedStr.length; i++) {
        seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
        seed |= 0;
      }

      return {
        matchId: `gridiron-${Date.now()}`,
        seed: Math.abs(seed),
        timestamp: Date.now(),
        challengerFranchiseId,
        defenderFranchiseId,
        lineOfScrimmage: 20,
      };
    }
  }

  /**
   * Log play result to database
   */
  async logPlayResult(
    matchId: string,
    driveId: number,
    playSequence: number,
    offenseFranchiseId: string,
    defenseFranchiseId: string,
    offensePlayId: string,
    defensePlayId: string,
    result: PlayResult
  ): Promise<string> {
    // Generate hash for play
    const playData = {
      matchId,
      driveId,
      playSequence,
      offensePlayId,
      defensePlayId,
      outcome: result.outcome,
      yardsGained: result.yardsGained,
      events: result.events,
    };

    const hash = await hashPlayEvents([playData]);

    await this.db.query(
      `INSERT INTO play_history_events 
       (match_id, drive_id, play_sequence, offense_franchise_id, defense_franchise_id,
        offense_play_id, defense_play_id, outcome_type, yards_gained, 
        ball_carrier_id, tackler_id, action_data, deterministic_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        matchId,
        driveId,
        playSequence,
        offenseFranchiseId,
        defenseFranchiseId,
        offensePlayId,
        defensePlayId,
        result.outcome,
        result.yardsGained,
        result.ballCarrierId,
        result.tacklerId,
        JSON.stringify({
          events: result.events,
          timeOfPlay: result.timeOfPlay,
          passDistance: result.passDistance,
        }),
        hash,
      ]
    );

    return hash;
  }

  /**
   * Get all plays for a match
   */
  async getMatchPlays(matchId: string): Promise<PlayLogEntry[]> {
    const result = await this.db.query<{
      drive_id: number;
      play_sequence: number;
      offense_play_id: string;
      defense_play_id: string;
      outcome_type: string;
      yards_gained: number;
      deterministic_hash: string;
    }>(
      `SELECT drive_id, play_sequence, offense_play_id, defense_play_id,
              outcome_type, yards_gained, deterministic_hash
       FROM play_history_events
       WHERE match_id = $1
       ORDER BY drive_id, play_sequence`,
      [matchId]
    );

    return result.rows.map(row => ({
      matchId,
      driveId: row.drive_id,
      playSequence: row.play_sequence,
      offensePlayId: row.offense_play_id,
      defensePlayId: row.defense_play_id,
      outcome: row.outcome_type,
      yardsGained: row.yards_gained,
      hash: row.deterministic_hash,
    }));
  }

  /**
   * Generate match hash from all plays
   */
  async generateMatchHash(matchId: string): Promise<string> {
    const plays = await this.getMatchPlays(matchId);
    return hashPlayEvents(plays);
  }

  /**
   * Submit match to network
   */
  async submitMatch(matchId: string): Promise<{
    success: boolean;
    hash: string;
    error?: string;
  }> {
    try {
      const hash = await this.generateMatchHash(matchId);

      // Get match data
      const matchResult = await this.db.query<{
        challenger_franchise_id: string;
        defender_franchise_id: string;
      }>(
        `SELECT challenger_franchise_id, defender_franchise_id
         FROM matches WHERE id = $1`,
        [matchId]
      );

      const match = matchResult.rows[0];
      if (!match) {
        return { success: false, hash, error: 'Match not found' };
      }

      // Submit to network
      const response = await fetch(`${this.apiEndpoint}/api/gridiron/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          hash,
          challengerFranchiseId: match.challenger_franchise_id,
          defenderFranchiseId: match.defender_franchise_id,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        return { success: false, hash, error: 'Network submission failed' };
      }

      // Update match as submitted
      await this.db.query(
        `UPDATE matches SET final_hash = $1 WHERE id = $2`,
        [hash, matchId]
      );

      return { success: true, hash };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, hash: '', error };
    }
  }

  /**
   * Queue defensive match (async play)
   */
  async queueDefensiveMatch(
    defenderFranchiseId: string,
    defensivePlaybook: string[]
  ): Promise<string> {
    const matchId = `defense-${Date.now()}`;

    await this.db.query(
      `INSERT INTO matches (id, challenger_franchise_id, defender_franchise_id, match_seed, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [matchId, 'pending', defenderFranchiseId, 0, 'pending']
    );

    return matchId;
  }

  /**
   * Verify match integrity (anti-cheat)
   */
  async verifyMatchIntegrity(matchId: string): Promise<{
    valid: boolean;
    expectedHash: string;
    actualHash: string;
    discrepancy?: string;
  }> {
    // Get stored plays
    const plays = await this.getMatchPlays(matchId);

    // Reconstruct expected hash
    const expectedHash = await hashPlayEvents(plays);

    // Get stored match hash
    const matchResult = await this.db.query<{ final_hash: string }>(
      `SELECT final_hash FROM matches WHERE id = $1`,
      [matchId]
    );

    const actualHash = matchResult.rows[0]?.final_hash || '';

    return {
      valid: expectedHash === actualHash,
      expectedHash,
      actualHash,
      discrepancy: expectedHash !== actualHash
        ? `Hash mismatch: expected ${expectedHash.slice(0, 16)}... got ${actualHash.slice(0, 16)}...`
        : undefined,
    };
  }
}

export function createGridironMeshSync(db: PGlite): GridironMeshSync {
  return new GridironMeshSync(db);
}
