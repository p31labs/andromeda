// P31 Smallball: Training Events Module
// CRDT event sourcing for offline-first training replay
// Handles energy regeneration and auto-training execution

import type { PGlite } from '@electric-sql/pglite';
import type { TrainingEvent, TrainingStation, Attribute, PlayerEnergy } from '../types';
import { calculateEnergyRegen, getFacilityPack } from '../data/facilities';
import { calculateEnergyCost, STATION_CONFIGS } from '../data/facilities';

// ============================================
// EVENT STORE
// ============================================

export async function saveTrainingEvent(
  db: PGlite,
  event: Omit<TrainingEvent, 'id'>
): Promise<string> {
  const id = crypto.randomUUID();
  
  await db.query(`
    INSERT INTO training_events (
      id, event_type, player_id, franchise_id, station,
      executed_at, energy_spent, xp_gained, facility_level, was_manual,
      minigame_score, _crdt_clock, _crdt_node_id
    ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12)
  `, [
    id,
    event.type,
    event.playerId,
    event.franchiseId,
    event.station,
    event.energySpent,
    JSON.stringify(event.xpGained),
    event.facilityLevel,
    event.wasManual,
    null, // minigame_score not applicable for auto events
    event.crdtClock,
    event.crdtNodeId,
  ]);
  
  return id;
}

export async function getPendingScheduledTraining(
  db: PGlite,
  franchiseId: string
): Promise<Array<{
  playerId: string;
  station: TrainingStation;
  focusAttribute: Attribute | 'BALANCED';
  lastExecutedAt: number | null;
  autoEnabled: boolean;
}>> {
  const result = await db.query(`
    SELECT 
      st.player_id,
      st.station,
      st.focus_attribute,
      st.last_executed_at,
      st.auto_enabled
    FROM scheduled_training st
    JOIN players p ON st.player_id = p.id
    WHERE p.franchise_id = $1 AND st.auto_enabled = true
  `, [franchiseId]);
  
  return result.rows.map((row: any) => ({
    playerId: row.player_id,
    station: row.station as TrainingStation,
    focusAttribute: row.focus_attribute as Attribute | 'BALANCED',
    lastExecutedAt: row.last_executed_at ? new Date(row.last_executed_at).getTime() : null,
    autoEnabled: row.auto_enabled,
  }));
}

// ============================================
// ENERGY MANAGEMENT
// ============================================

export async function getPlayerEnergy(
  db: PGlite,
  playerId: string
): Promise<PlayerEnergy | null> {
  const result = await db.query(`
    SELECT player_id, current_energy, max_energy, last_regen_timestamp, _crdt_clock
    FROM player_energy
    WHERE player_id = $1
  `, [playerId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0] as Record<string, unknown>;
  return {
    playerId: row.player_id as string,
    currentEnergy: row.current_energy as number,
    maxEnergy: row.max_energy as number,
    lastRegenTimestamp: Number(row.last_regen_timestamp),
    crdtClock: BigInt(row._crdt_clock as string | number),
  };
}

export async function updatePlayerEnergy(
  db: PGlite,
  playerId: string,
  energy: number,
  timestamp: number
): Promise<void> {
  await db.query(`
    INSERT INTO player_energy (player_id, current_energy, max_energy, last_regen_timestamp, _crdt_clock)
    VALUES ($1, $2, 100, $3, $4)
    ON CONFLICT (player_id) DO UPDATE SET
      current_energy = EXCLUDED.current_energy,
      last_regen_timestamp = EXCLUDED.last_regen_timestamp,
      _crdt_clock = EXCLUDED._crdt_clock
  `, [playerId, energy, timestamp, BigInt(timestamp)]);
}

export function calculateRegeneratedEnergy(
  energyState: PlayerEnergy,
  packTier: 'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX',
  now: number = Date.now()
): { newEnergy: number; regenApplied: boolean } {
  const elapsedMs = now - energyState.lastRegenTimestamp;
  
  // Only apply regen if more than 5 minutes have passed
  if (elapsedMs < 5 * 60 * 1000) {
    return { newEnergy: energyState.currentEnergy, regenApplied: false };
  }
  
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const regenAmount = calculateEnergyRegen(elapsedHours, packTier);
  const newEnergy = Math.min(energyState.maxEnergy, energyState.currentEnergy + regenAmount);
  
  return { newEnergy, regenApplied: regenAmount > 0 };
}

// ============================================
// OFFLINE REPLAY
// ============================================

export interface OfflineReplayResult {
  playerId: string;
  sessionsExecuted: number;
  totalXpGained: Partial<Record<Attribute, number>>;
  energyConsumed: number;
  events: TrainingEvent[];
}

export async function executeOfflineReplay(
  db: PGlite,
  franchiseId: string,
  packTier: 'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX',
  facilityLevels: Record<TrainingStation, number>,
  now: number = Date.now()
): Promise<OfflineReplayResult[]> {
  const schedules = await getPendingScheduledTraining(db, franchiseId);
  const results: OfflineReplayResult[] = [];
  
  for (const schedule of schedules) {
    if (!schedule.autoEnabled) continue;
    
    const energyState = await getPlayerEnergy(db, schedule.playerId);
    if (!energyState) continue;
    
    // Calculate regenerated energy since last check
    const { newEnergy, regenApplied } = calculateRegeneratedEnergy(energyState, packTier, now);
    
    if (regenApplied) {
      await updatePlayerEnergy(db, schedule.playerId, newEnergy, now);
    }
    
    // Calculate how many sessions can be executed
    const facilityLevel = facilityLevels[schedule.station] ?? 1;
    const energyCost = calculateEnergyCost(schedule.station, facilityLevel, packTier);
    const availableSessions = Math.floor(newEnergy / energyCost);
    
    if (availableSessions <= 0) continue;
    
    // Execute sessions
    const result: OfflineReplayResult = {
      playerId: schedule.playerId,
      sessionsExecuted: 0,
      totalXpGained: {},
      energyConsumed: 0,
      events: [],
    };
    
    let currentEnergy = newEnergy;
    
    for (let i = 0; i < availableSessions; i++) {
      if (currentEnergy < energyCost) break;
      
      // XP calculation for auto-training (no minigame bonus)
      const baseXp = STATION_CONFIGS[schedule.station].baseXpYield;
      const pack = getFacilityPack(packTier);
      const xpMultiplier = pack.xpMultiplier * (1 + (facilityLevel - 1) * 0.05);
      const finalXp = Math.round(baseXp * xpMultiplier);
      
      // Distribute XP to attributes
      const attributes = STATION_CONFIGS[schedule.station].attributes;
      const xpPerAttribute = Math.round(finalXp / attributes.length);
      
      const xpGained: Partial<Record<Attribute, number>> = {};
      attributes.forEach(attr => {
        xpGained[attr] = (xpGained[attr] ?? 0) + xpPerAttribute;
        result.totalXpGained[attr] = (result.totalXpGained[attr] ?? 0) + xpPerAttribute;
      });
      
      // Create training event
      const event: Omit<TrainingEvent, 'id'> = {
        type: 'EXECUTE_AUTO',
        playerId: schedule.playerId,
        franchiseId,
        station: schedule.station,
        timestamp: now,
        energySpent: energyCost,
        xpGained,
        facilityLevel,
        wasManual: false,
        crdtClock: BigInt(now + i),
        crdtNodeId: 'auto-replay',
      };
      
      const eventId = await saveTrainingEvent(db, event);
      result.events.push({ ...event, id: eventId });
      
      currentEnergy -= energyCost;
      result.sessionsExecuted++;
      result.energyConsumed += energyCost;
    }
    
    // Update final energy
    await updatePlayerEnergy(db, schedule.playerId, currentEnergy, now);
    
    // Update last executed timestamp
    await db.query(`
      UPDATE scheduled_training 
      SET last_executed_at = NOW(), _crdt_clock = $1
      WHERE player_id = $2
    `, [BigInt(now), schedule.playerId]);
    
    if (result.sessionsExecuted > 0) {
      results.push(result);
    }
  }
  
  return results;
}

// ============================================
// SYNC UTILITIES
// ============================================

export async function getUnsyncedTrainingEvents(
  db: PGlite,
  franchiseId: string,
  lastSyncClock: bigint
): Promise<TrainingEvent[]> {
  const result = await db.query(`
    SELECT 
      id, event_type, player_id, franchise_id, station,
      executed_at, energy_spent, xp_gained, facility_level, was_manual,
      _crdt_clock, _crdt_node_id
    FROM training_events
    WHERE franchise_id = $1 AND _crdt_clock > $2
    ORDER BY _crdt_clock ASC
  `, [franchiseId, lastSyncClock]);
  
  return result.rows.map((row: any) => ({
    id: row.id,
    type: row.event_type,
    playerId: row.player_id,
    franchiseId: row.franchise_id,
    station: row.station as TrainingStation,
    timestamp: new Date(row.executed_at).getTime(),
    energySpent: row.energy_spent,
    xpGained: JSON.parse(row.xp_gained),
    facilityLevel: row.facility_level,
    wasManual: row.was_manual,
    crdtClock: BigInt(row._crdt_clock),
    crdtNodeId: row._crdt_node_id,
  }));
}

export async function applyRemoteTrainingEvents(
  db: PGlite,
  events: TrainingEvent[]
): Promise<void> {
  for (const event of events) {
    // Check if event already exists (idempotent)
    const existing = await db.query(`
      SELECT id FROM training_events WHERE id = $1
    `, [event.id]);
    
    if (existing.rows.length > 0) continue;
    
    // Insert event
    await db.query(`
      INSERT INTO training_events (
        id, event_type, player_id, franchise_id, station,
        executed_at, energy_spent, xp_gained, facility_level, was_manual,
        _crdt_clock, _crdt_node_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      event.id,
      event.type,
      event.playerId,
      event.franchiseId,
      event.station,
      new Date(event.timestamp).toISOString(),
      event.energySpent,
      JSON.stringify(event.xpGained),
      event.facilityLevel,
      event.wasManual,
      event.crdtClock,
      event.crdtNodeId,
    ]);
  }
}

// ============================================
// REPLAY NOTIFICATION
// ============================================

export interface ReplayNotification {
  playerId: string;
  playerName: string;
  sessionsCompleted: number;
  xpSummary: string;
  energyRemaining: number;
}

export async function generateReplayNotifications(
  db: PGlite,
  replayResults: OfflineReplayResult[]
): Promise<ReplayNotification[]> {
  const notifications: ReplayNotification[] = [];
  
  for (const result of replayResults) {
    // Get player info
    const playerResult = await db.query(`
      SELECT first_name, last_name FROM players WHERE id = $1
    `, [result.playerId]);
    
    if (playerResult.rows.length === 0) continue;
    
    const player = playerResult.rows[0] as Record<string, unknown>;
    const energy = await getPlayerEnergy(db, result.playerId);
    
    // Build XP summary
    const xpEntries = Object.entries(result.totalXpGained);
    const xpSummary = xpEntries.length > 0
      ? xpEntries.slice(0, 2).map(([attr, xp]) => `${xp} ${attr}`).join(', ') + 
        (xpEntries.length > 2 ? '...' : '')
      : 'No XP gained';
    
    notifications.push({
      playerId: result.playerId,
      playerName: `${player.first_name as string} ${(player.last_name as string)[0]}.`,
      sessionsCompleted: result.sessionsExecuted,
      xpSummary,
      energyRemaining: energy?.currentEnergy ?? 0,
    });
  }
  
  return notifications;
}
