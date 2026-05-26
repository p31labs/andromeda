// P31 Smallball: Training Engine
// XP calculations, energy economy, training execution

import type {
  Attribute,
  TrainingStation,
  FacilityPack,
  MinigameResult,
  TrainingResult,
  TrainingEvent,
  PlayerEnergy,
} from '../types';
import {
  STATION_CONFIGS,
  FACILITY_PACKS,
  calculateEnergyCost,
  calculateXpYield,
  calculateEnergyRegen,
  STATION_ATTRIBUTES,
} from '../data/facilities';

// ============================================
// CONSTANTS
// ============================================

export const MAX_ATTRIBUTE_VALUE = 99;
export const MIN_ATTRIBUTE_VALUE = 1;
export const DEFAULT_MAX_ENERGY = 100;
export const ENERGY_REGEN_CAP = 100;
export const MANUAL_TRAINING_BONUS = 0.2; // +20%
export const AUTO_TRAINING_PENALTY = 0.0; // No penalty, just no bonus
export const XP_PER_LEVEL = 100; // XP needed to gain +1 attribute point

// ============================================
// ENERGY MANAGEMENT
// ============================================

export function calculateCurrentEnergy(
  energyState: PlayerEnergy,
  packTier: FacilityPack['tier']
): number {
  const now = Date.now();
  const elapsedMs = now - energyState.lastRegenTimestamp;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  
  const regenAmount = calculateEnergyRegen(elapsedHours, packTier);
  const newEnergy = Math.min(energyState.maxEnergy, energyState.currentEnergy + regenAmount);
  
  return Math.floor(newEnergy);
}

export function canAffordTraining(
  currentEnergy: number,
  station: TrainingStation,
  facilityLevel: number,
  packTier: FacilityPack['tier']
): boolean {
  const cost = calculateEnergyCost(station, facilityLevel, packTier);
  return currentEnergy >= cost;
}

export function spendEnergy(
  currentEnergy: number,
  station: TrainingStation,
  facilityLevel: number,
  packTier: FacilityPack['tier']
): number {
  const cost = calculateEnergyCost(station, facilityLevel, packTier);
  return Math.max(0, currentEnergy - cost);
}

// ============================================
// XP & ATTRIBUTE CALCULATIONS
// ============================================

export function calculateTrainingXp(
  station: TrainingStation,
  facilityLevel: number,
  packTier: FacilityPack['tier'],
  isManual: boolean,
  minigameResult: MinigameResult | null
): Record<Attribute, number> {
  const score = minigameResult?.score ?? 50; // Default to 50 if no minigame
  return calculateXpYield(station, facilityLevel, packTier, isManual, score);
}

export function calculateAttributeDelta(xpGained: number): number {
  // Every XP_PER_LEVEL XP = +1 attribute point
  return Math.floor(xpGained / XP_PER_LEVEL);
}

export function applyAttributeCap(value: number): number {
  return Math.max(MIN_ATTRIBUTE_VALUE, Math.min(MAX_ATTRIBUTE_VALUE, value));
}

// ============================================
// TRAINING EXECUTION
// ============================================

export interface ExecuteTrainingParams {
  playerId: string;
  franchiseId: string;
  station: TrainingStation;
  facilityLevel: number;
  packTier: FacilityPack['tier'];
  currentEnergy: number;
  isManual: boolean;
  minigameResult: MinigameResult | null;
  crdtClock: bigint;
  crdtNodeId: string;
}

export function executeTraining(params: ExecuteTrainingParams): TrainingResult {
  const {
    playerId,
    franchiseId,
    station,
    facilityLevel,
    packTier,
    currentEnergy,
    isManual,
    minigameResult,
    crdtClock,
    crdtNodeId,
  } = params;

  // Calculate energy cost
  const energyCost = calculateEnergyCost(station, facilityLevel, packTier);
  const newEnergy = spendEnergy(currentEnergy, station, facilityLevel, packTier);

  // Calculate XP gains
  const xpGained = calculateTrainingXp(station, facilityLevel, packTier, isManual, minigameResult);

  // Convert XP to attribute deltas
  const attributeDeltas: Partial<Record<Attribute, number>> = {};
  for (const [attr, xp] of Object.entries(xpGained)) {
    attributeDeltas[attr as Attribute] = calculateAttributeDelta(xp);
  }

  // Create training event
  const event: TrainingEvent = {
    id: crypto.randomUUID(),
    type: isManual ? 'EXECUTE_MANUAL' : 'EXECUTE_AUTO',
    playerId,
    franchiseId,
    station,
    timestamp: Date.now(),
    energySpent: energyCost,
    xpGained,
    facilityLevel,
    wasManual: isManual,
    crdtClock,
    crdtNodeId,
  };

  return {
    event,
    newEnergy,
    attributeDeltas,
  };
}

// ============================================
// AUTO-SCHEDULED TRAINING (Offline Replay)
// ============================================

export interface OfflineTrainingParams {
  playerId: string;
  franchiseId: string;
  station: TrainingStation;
  facilityLevel: number;
  packTier: FacilityPack['tier'];
  sessionsToExecute: number;
  startingEnergy: number;
  crdtClock: bigint;
  crdtNodeId: string;
}

export function executeOfflineTraining(params: OfflineTrainingParams): TrainingResult[] {
  const results: TrainingResult[] = [];
  let currentEnergy = params.startingEnergy;

  for (let i = 0; i < params.sessionsToExecute; i++) {
    // Check if we have enough energy
    const cost = calculateEnergyCost(params.station, params.facilityLevel, params.packTier);
    if (currentEnergy < cost) {
      // Simulate energy regen for next attempt (assume 1 hour passed)
      const regen = calculateEnergyRegen(1, params.packTier);
      currentEnergy = Math.min(DEFAULT_MAX_ENERGY, currentEnergy + regen);
      
      // If still not enough, stop executing
      if (currentEnergy < cost) {
        break;
      }
    }

    // Execute auto-training (no minigame for offline)
    const result = executeTraining({
      playerId: params.playerId,
      franchiseId: params.franchiseId,
      station: params.station,
      facilityLevel: params.facilityLevel,
      packTier: params.packTier,
      currentEnergy,
      isManual: false,
      minigameResult: null,
      crdtClock: params.crdtClock + BigInt(i),
      crdtNodeId: params.crdtNodeId,
    });

    results.push(result);
    currentEnergy = result.newEnergy;
  }

  return results;
}

// ============================================
// STAT DECAY (Soft maintenance below 50)
// ============================================

export function calculateStatDecay(
  currentValue: number,
  daysIdle: number
): number {
  // No decay above 50
  if (currentValue >= 50) {
    return 0;
  }
  
  // Below 50: gradual decay after 7 days idle
  if (daysIdle < 7) {
    return 0;
  }
  
  // -1 point per week of idle time (capped at -5)
  const decayWeeks = Math.floor((daysIdle - 7) / 7);
  return Math.min(5, decayWeeks);
}

// ============================================
// SPOON THEORY INTEGRATION
// ============================================

export type SpoonAdaptation = {
  minigameComplexity: 'SIMPLE' | 'STANDARD' | 'DETAILED';
  timeLimit: number; // seconds
  earlyExitEnabled: boolean;
  tapTargetCount: number;
  pitchCount: number;
};

export function getSpoonAdaptation(spoonCount: number): SpoonAdaptation {
  switch (spoonCount) {
    case 1: // Very low spoons - minimal interaction
      return {
        minigameComplexity: 'SIMPLE',
        timeLimit: 5, // 5 seconds
        earlyExitEnabled: true,
        tapTargetCount: 3,
        pitchCount: 1,
      };
    case 3: // Low spoons - simple mode
      return {
        minigameComplexity: 'SIMPLE',
        timeLimit: 7,
        earlyExitEnabled: true,
        tapTargetCount: 3,
        pitchCount: 2,
      };
    case 6: // Medium spoons - standard
      return {
        minigameComplexity: 'STANDARD',
        timeLimit: 10,
        earlyExitEnabled: true,
        tapTargetCount: 5,
        pitchCount: 3,
      };
    case 9: // High spoons - detailed
    case 12:
      return {
        minigameComplexity: 'DETAILED',
        timeLimit: 15,
        earlyExitEnabled: true,
        tapTargetCount: 8,
        pitchCount: 5,
      };
    default:
      return {
        minigameComplexity: 'STANDARD',
        timeLimit: 10,
        earlyExitEnabled: true,
        tapTargetCount: 5,
        pitchCount: 3,
      };
  }
}

// ============================================
// TRAINING VALIDATION
// ============================================

export interface ValidationError {
  field: string;
  message: string;
}

export function validateTrainingRequest(
  station: TrainingStation,
  facilityLevel: number,
  packTier: FacilityPack['tier'],
  currentEnergy: number
): ValidationError | null {
  // Check facility level valid
  if (facilityLevel < 1 || facilityLevel > 3) {
    return { field: 'facilityLevel', message: 'Facility level must be 1-3' };
  }

  // Check station unlocked
  const pack = FACILITY_PACKS[packTier];
  if (!pack.unlockedStations.includes(station)) {
    return { field: 'station', message: `${station} not unlocked in ${packTier} tier` };
  }

  // Check energy sufficient
  const cost = calculateEnergyCost(station, facilityLevel, packTier);
  if (currentEnergy < cost) {
    return { field: 'energy', message: `Need ${cost} energy, have ${currentEnergy}` };
  }

  return null;
}
