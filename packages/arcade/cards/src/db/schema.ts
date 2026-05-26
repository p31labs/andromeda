// P31 Card Table: PGLite Database Schema
// Local-first with Electric SQL sync

import { PGlite } from '@electric-sql/pglite';

// ============================================
// SCHEMA SQL
// ============================================

export const SCHEMA_SQL = `
  -- Enable UUID extension
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
  -- Matches table
  CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id TEXT NOT NULL CHECK (game_id IN ('crazy-eights', 'hearts', 'euchre', 'bridge-lite')),
    match_state JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    winner TEXT,
    final_scores JSONB
  );
  
  -- Player stats table
  CREATE TABLE IF NOT EXISTS player_stats (
    player_id TEXT PRIMARY KEY,
    identity_id TEXT NOT NULL,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_hands_played INTEGER DEFAULT 0,
    total_hands_won INTEGER DEFAULT 0,
    favorite_game TEXT,
    total_xp_earned INTEGER DEFAULT 0,
    last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Game history table
  CREATE TABLE IF NOT EXISTS game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('play', 'bid', 'pass', 'draw')),
    action_data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    crdt_clock BIGINT NOT NULL
  );
  
  -- Achievements table
  CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, achievement_id)
  );
  
  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_matches_game_id ON matches(game_id);
  CREATE INDEX IF NOT EXISTS idx_matches_completed_at ON matches(completed_at);
  CREATE INDEX IF NOT EXISTS idx_game_history_match_id ON game_history(match_id);
  CREATE INDEX IF NOT EXISTS idx_game_history_player_id ON game_history(player_id);
  CREATE INDEX IF NOT EXISTS idx_achievements_player_id ON achievements(player_id);
  
  -- Trigger to update updated_at
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';
  
  DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
  CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  
  DROP TRIGGER IF EXISTS update_player_stats_updated_at ON player_stats;
  CREATE TRIGGER update_player_stats_updated_at
    BEFORE UPDATE ON player_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

// ============================================
// DATABASE INITIALIZATION
// ============================================

let db: PGlite | null = null;

export async function initDatabase(): Promise<PGlite> {
  if (db) return db;
  
  db = new PGlite('idb://p31-cards-db');
  await db.exec(SCHEMA_SQL);
  
  return db;
}

export function getDB(): PGlite {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// ============================================
// MATCH OPERATIONS
// ============================================

export async function saveMatch(matchState: {
  id: string;
  gameId: string;
  matchState: object;
  winner?: string;
  finalScores?: object;
}): Promise<string> {
  const db = getDB();
  
  const result = await db.query(`
    INSERT INTO matches (id, game_id, match_state, winner, final_scores)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET
      match_state = EXCLUDED.match_state,
      winner = EXCLUDED.winner,
      final_scores = EXCLUDED.final_scores,
      updated_at = NOW()
    RETURNING id
  `, [
    matchState.id,
    matchState.gameId,
    JSON.stringify(matchState.matchState),
    matchState.winner || null,
    matchState.finalScores ? JSON.stringify(matchState.finalScores) : null
  ]);
  
  return (result.rows[0] as { id: string }).id;
}

export async function getMatch(matchId: string): Promise<any | null> {
  const db = getDB();
  
  const result = await db.query(`
    SELECT * FROM matches WHERE id = $1
  `, [matchId]);
  
  return result.rows[0] || null;
}

export async function getRecentMatches(limit: number = 10): Promise<any[]> {
  const db = getDB();
  
  const result = await db.query(`
    SELECT * FROM matches
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows;
}

// ============================================
// PLAYER STATS
// ============================================

export async function updatePlayerStats(
  playerId: string,
  identityId: string,
  updates: {
    gamesPlayed?: number;
    gamesWon?: number;
    handsPlayed?: number;
    handsWon?: number;
    favoriteGame?: string;
    xpEarned?: number;
  }
): Promise<void> {
  const db = getDB();
  
  await db.query(`
    INSERT INTO player_stats (
      player_id, identity_id, games_played, games_won,
      total_hands_played, total_hands_won, favorite_game, total_xp_earned
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (player_id) DO UPDATE SET
      games_played = player_stats.games_played + EXCLUDED.games_played,
      games_won = player_stats.games_won + EXCLUDED.games_won,
      total_hands_played = player_stats.total_hands_played + EXCLUDED.total_hands_played,
      total_hands_won = player_stats.total_hands_won + EXCLUDED.total_hands_won,
      favorite_game = COALESCE(EXCLUDED.favorite_game, player_stats.favorite_game),
      total_xp_earned = player_stats.total_xp_earned + EXCLUDED.total_xp_earned,
      last_played_at = NOW(),
      updated_at = NOW()
  `, [
    playerId,
    identityId,
    updates.gamesPlayed || 0,
    updates.gamesWon || 0,
    updates.handsPlayed || 0,
    updates.handsWon || 0,
    updates.favoriteGame || null,
    updates.xpEarned || 0
  ]);
}

export async function getPlayerStats(playerId: string): Promise<any | null> {
  const db = getDB();
  
  const result = await db.query(`
    SELECT * FROM player_stats WHERE player_id = $1
  `, [playerId]);
  
  return result.rows[0] || null;
}

// ============================================
// GAME HISTORY
// ============================================

export async function logGameAction(
  matchId: string,
  gameId: string,
  playerId: string,
  actionType: 'play' | 'bid' | 'pass' | 'draw',
  actionData: object,
  crdtClock: bigint
): Promise<void> {
  const db = getDB();
  
  await db.query(`
    INSERT INTO game_history (match_id, game_id, player_id, action_type, action_data, crdt_clock)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    matchId,
    gameId,
    playerId,
    actionType,
    JSON.stringify(actionData),
    crdtClock
  ]);
}

export async function getGameHistory(matchId: string): Promise<any[]> {
  const db = getDB();
  
  const result = await db.query(`
    SELECT * FROM game_history
    WHERE match_id = $1
    ORDER BY timestamp ASC
  `, [matchId]);
  
  return result.rows;
}

// ============================================
// ACHIEVEMENTS
// ============================================

export async function unlockAchievement(
  playerId: string,
  achievementId: string
): Promise<boolean> {
  const db = getDB();
  
  try {
    await db.query(`
      INSERT INTO achievements (player_id, achievement_id)
      VALUES ($1, $2)
      ON CONFLICT (player_id, achievement_id) DO NOTHING
    `, [playerId, achievementId]);
    return true;
  } catch (e) {
    return false;
  }
}

export async function getPlayerAchievements(playerId: string): Promise<any[]> {
  const db = getDB();
  
  const result = await db.query(`
    SELECT * FROM achievements WHERE player_id = $1
    ORDER BY unlocked_at DESC
  `, [playerId]);
  
  return result.rows;
}

// ============================================
// DATABASE UTILITIES
// ============================================

export async function clearDatabase(): Promise<void> {
  const db = getDB();
  
  await db.query(`DELETE FROM game_history`);
  await db.query(`DELETE FROM achievements`);
  await db.query(`DELETE FROM player_stats`);
  await db.query(`DELETE FROM matches`);
}

export async function getDatabaseStats(): Promise<{
  matches: number;
  players: number;
  actions: number;
  achievements: number;
}> {
  const db = getDB();
  
  const [matches, players, actions, achievements] = await Promise.all([
    db.query('SELECT COUNT(*) as count FROM matches'),
    db.query('SELECT COUNT(*) as count FROM player_stats'),
    db.query('SELECT COUNT(*) as count FROM game_history'),
    db.query('SELECT COUNT(*) as count FROM achievements'),
  ]);
  
  return {
    matches: parseInt((matches.rows[0] as { count: string }).count, 10),
    players: parseInt((players.rows[0] as { count: string }).count, 10),
    actions: parseInt((actions.rows[0] as { count: string }).count, 10),
    achievements: parseInt((achievements.rows[0] as { count: string }).count, 10),
  };
}
