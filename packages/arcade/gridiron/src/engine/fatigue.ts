// P31 Gridiron: Fatigue & Energy System (10000%)
// Spoon-aware performance decay with facility modifiers

import type { Player, Attributes, AttributeKey } from '../types';

// ============================================
// FATIGUE THRESHOLDS
// ============================================

const FATIGUE_THRESHOLDS = {
  FRESH: 0,        // 100% performance
  WARM: 20,        // 95% performance
  TIRED: 50,       // 85% performance
  EXHAUSTED: 80,   // 70% performance
  GASSED: 95,      // 50% performance (auto-bench)
};

const PERFORMANCE_MODIFIERS: Record<string, number> = {
  fresh: 1.0,
  warm: 0.95,
  tired: 0.85,
  exhausted: 0.70,
  gassed: 0.50,
};

// ============================================
// CONDITION CALCULATION
// ============================================

export function calculateCondition(fatigue: number): Player['condition'] {
  if (fatigue >= FATIGUE_THRESHOLDS.GASSED) return 'gassed';
  if (fatigue >= FATIGUE_THRESHOLDS.EXHAUSTED) return 'exhausted';
  if (fatigue >= FATIGUE_THRESHOLDS.TIRED) return 'tired';
  if (fatigue >= FATIGUE_THRESHOLDS.WARM) return 'warm';
  return 'fresh';
}

export function getPerformanceModifier(condition: Player['condition']): number {
  return PERFORMANCE_MODIFIERS[condition] ?? 1.0;
}

// ============================================
// EFFECTIVE ATTRIBUTES (MATCH USE)
// ============================================

export function calculateEffectiveAttributes(player: Player): Attributes {
  const condition = calculateCondition(player.fatigue);
  const modifier = getPerformanceModifier(condition);

  return {
    speed: Math.floor(player.attributes.speed * modifier),
    strength: Math.floor(player.attributes.strength * modifier),
    agility: Math.floor(player.attributes.agility * modifier),
    footballIQ: Math.floor(player.attributes.footballIQ * modifier),
    stamina: player.attributes.stamina,  // Stamina doesn't decay
    passingAccuracy: Math.floor(player.attributes.passingAccuracy * modifier),
    catching: Math.floor(player.attributes.catching * modifier),
    ballSecurity: Math.floor(player.attributes.ballSecurity * modifier),
    blocking: Math.floor(player.attributes.blocking * modifier),
    tackling: Math.floor(player.attributes.tackling * modifier),
    passRush: Math.floor(player.attributes.passRush * modifier),
    coverage: Math.floor(player.attributes.coverage * modifier),
  };
}

export function getAttributeForMatchup(
  player: Player,
  attribute: AttributeKey
): number {
  const effective = calculateEffectiveAttributes(player);
  return effective[attribute];
}

// ============================================
// ENERGY BURN (TRAINING)
// ============================================

interface EnergyBurnResult {
  energyConsumed: number;
  fatigueGained: number;
  actualBurned: number;  // May be capped by available energy
}

export function burnEnergy(
  player: Player,
  intensity: number,  // 0-100 scale
  facilityLevel: number
): EnergyBurnResult {
  // Base burn rate
  const baseBurn = intensity * 0.5;

  // Stamina affects efficiency (higher stamina = less energy per intensity)
  const staminaFactor = 1 - (player.attributes.stamina / 200);  // 0.5 to 1.0

  // Facility modifier (better facilities = more efficient training)
  const facilityModifiers: Record<number, number> = { 1: 1.0, 2: 0.8, 3: 0.5 };
  const facilityMod = facilityModifiers[facilityLevel] ?? 1.0;

  // Calculate actual burn
  const energyConsumed = baseBurn * staminaFactor * facilityMod;

  // Fatigue gained is a percentage of energy burned (stamina reduces this)
  const fatigueResistance = player.attributes.stamina / 100;  // 0-1
  const fatigueGained = energyConsumed * 0.3 * (1 - fatigueResistance * 0.5);

  // Cap at available energy
  const actualBurned = Math.min(energyConsumed, player.energy);

  return {
    energyConsumed: actualBurned,
    fatigueGained,
    actualBurned,
  };
}

// ============================================
// RECOVERY (REST)
// ============================================

interface RecoveryResult {
  energyRecovered: number;
  fatigueReduced: number;
}

export function recover(
  player: Player,
  minutes: number,
  facilityLevel: number
): RecoveryResult {
  // Base recovery rates
  const baseEnergyRecovery = minutes * 0.8;  // 0.8 energy per minute
  const baseFatigueReduction = minutes * 0.4;  // 0.4 fatigue per minute

  // Facility bonus (cryotherapy at level 3)
  const facilityModifiers: Record<number, number> = { 1: 1.0, 2: 1.0, 3: 2.0 };
  const facilityMod = facilityModifiers[facilityLevel] ?? 1.0;

  // Apply modifiers
  const energyRecovered = Math.min(
    100 - player.energy,
    baseEnergyRecovery * facilityMod
  );
  const fatigueReduced = Math.min(
    player.fatigue,
    baseFatigueReduction * facilityMod
  );

  return {
    energyRecovered,
    fatigueReduced,
  };
}

// ============================================
// AUTO-SCHEDULER (BACKGROUND XP)
// ============================================

export interface AutoScheduleResult {
  playerId: string;
  xpGained: number;
  energyBurned: number;
  fatigueDelta: number;
  attributesImproved: AttributeKey[];
  timestamp: string;
}

export function calculateOfflineProgress(
  player: Player,
  elapsedMinutes: number,
  facilityLevel: number
): AutoScheduleResult | null {
  // No active assignment = no progress
  if (!player.trainingAssignment) return null;

  // Check if player has energy
  if (player.energy <= 0) return null;

  // Calculate available training time (capped by energy)
  const station = player.trainingAssignment;
  const maxBurnableEnergy = elapsedMinutes * 0.5;  // 0.5 energy per minute
  const actualEnergy = Math.min(player.energy, maxBurnableEnergy);

  if (actualEnergy <= 0) return null;

  // Burn energy and gain fatigue
  const burnResult = burnEnergy(player, actualEnergy * 2, facilityLevel);

  // Calculate XP with diminishing returns
  const baseXP = actualEnergy * 0.5;  // 0.5 XP per energy point

  // Learning curve: Higher attributes = slower gains
  const avgAttribute = station.attributes.reduce((sum, attr) =>
    sum + player.attributes[attr], 0
  ) / station.attributes.length;
  const learningCurve = Math.max(0.3, 1 - (avgAttribute / 150));

  // Facility XP bonus
  const facilityModifiers: Record<number, number> = { 1: 1.0, 2: 1.3, 3: 1.6 };
  const facilityMod = facilityModifiers[facilityLevel] ?? 1.0;

  const xpGained = baseXP * learningCurve * facilityMod;

  return {
    playerId: player.id,
    xpGained,
    energyBurned: burnResult.energyConsumed,
    fatigueDelta: burnResult.fatigueGained,
    attributesImproved: station.attributes,
    timestamp: new Date().toISOString(),
  };
}

// ============================================
// TRAINING RISK ASSESSMENT
// ============================================

export interface TrainingRisk {
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  canTrain: boolean;
  warning?: string;
  performanceImpact: number;
}

export function assessTrainingRisk(player: Player): TrainingRisk {
  const condition = calculateCondition(player.fatigue);

  switch (condition) {
    case 'fresh':
      return {
        level: 'none',
        canTrain: true,
        performanceImpact: 1.0,
      };
    case 'warm':
      return {
        level: 'low',
        canTrain: true,
        performanceImpact: 0.95,
      };
    case 'tired':
      return {
        level: 'medium',
        canTrain: true,
        warning: 'Player showing fatigue',
        performanceImpact: 0.85,
      };
    case 'exhausted':
      return {
        level: 'high',
        canTrain: true,
        warning: 'Risk of poor form',
        performanceImpact: 0.70,
      };
    case 'gassed':
      return {
        level: 'critical',
        canTrain: false,
        warning: 'Too exhausted to train safely',
        performanceImpact: 0.50,
      };
  }
}

// ============================================
// MATCH READINESS
// ============================================

export function canStartMatch(player: Player): boolean {
  const condition = calculateCondition(player.fatigue);
  return condition !== 'gassed';
}

export function getMatchReadiness(player: Player): {
  canStart: boolean;
  recommendedRole: 'starter' | 'rotational' | 'bench';
  warning?: string;
} {
  const condition = calculateCondition(player.fatigue);

  switch (condition) {
    case 'fresh':
    case 'warm':
      return { canStart: true, recommendedRole: 'starter' };
    case 'tired':
      return {
        canStart: true,
        recommendedRole: 'rotational',
        warning: 'Consider limiting snaps',
      };
    case 'exhausted':
      return {
        canStart: true,
        recommendedRole: 'bench',
        warning: 'Reserve for emergency only',
      };
    case 'gassed':
      return {
        canStart: false,
        recommendedRole: 'bench',
        warning: 'Must rest before playing',
      };
  }
}
