// P31 Smallball: Facilities Engine
// Facility level management, pack upgrades, progression

import type { TrainingStation, FacilityPack, UUID } from '../types';
import { FACILITY_PACKS, STATION_CONFIGS, isStationUnlocked } from '../data/facilities';

// ============================================
// FACILITY STATE MANAGEMENT
// ============================================

export interface FacilityState {
  id: UUID;
  franchiseId: UUID;
  facilityType: TrainingStation;
  level: number;
  packTier: FacilityPack['tier'];
}

export function createInitialFacilities(franchiseId: UUID): FacilityState[] {
  const stations: TrainingStation[] = ['IRON_MIKE', 'TRACK_SLEDS', 'BULLPEN'];
  
  return stations.map(station => ({
    id: crypto.randomUUID(),
    franchiseId,
    facilityType: station,
    level: 1,
    packTier: 'SANDLOT',
  }));
}

export function upgradeFacilityLevel(facility: FacilityState): FacilityState | null {
  if (facility.level >= 3) {
    return null; // Max level reached
  }

  return {
    ...facility,
    level: facility.level + 1,
  };
}

export function upgradePackTier(
  facilities: FacilityState[],
  newTier: FacilityPack['tier']
): FacilityState[] {
  const pack = FACILITY_PACKS[newTier];
  
  // Upgrade existing facilities
  const upgraded = facilities.map(facility => ({
    ...facility,
    packTier: newTier,
  }));

  // Add any newly unlocked stations
  const existingStations = new Set(facilities.map(f => f.facilityType));
  const newStations = pack.unlockedStations.filter(
    station => !existingStations.has(station)
  );

  const franchiseId = facilities[0]?.franchiseId;
  const additional = newStations.map(station => ({
    id: crypto.randomUUID(),
    franchiseId,
    facilityType: station,
    level: 1,
    packTier: newTier,
  }));

  return [...upgraded, ...additional];
}

// ============================================
// PACK PROGRESSION
// ============================================

export function getNextPackTier(current: FacilityPack['tier']): FacilityPack['tier'] | null {
  const tiers: FacilityPack['tier'][] = ['SANDLOT', 'HS_GYM', 'PRO_COMPLEX'];
  const currentIndex = tiers.indexOf(current);
  
  if (currentIndex === -1 || currentIndex >= tiers.length - 1) {
    return null;
  }
  
  return tiers[currentIndex + 1];
}

export function canAffordPackUpgrade(
  currentTier: FacilityPack['tier'],
  resinBalance: number
): { canAfford: boolean; cost: number; nextTier: FacilityPack['tier'] | null } {
  const nextTier = getNextPackTier(currentTier);
  
  if (!nextTier) {
    return { canAfford: false, cost: 0, nextTier: null };
  }
  
  const cost = FACILITY_PACKS[nextTier].cost;
  return {
    canAfford: resinBalance >= cost,
    cost,
    nextTier,
  };
}

// ============================================
// FACILITY STATS
// ============================================

export interface FacilityStats {
  station: TrainingStation;
  level: number;
  tier: FacilityPack['tier'];
  energyCost: number;
  xpMultiplier: number;
  unlocked: boolean;
}

export function getFacilityStats(
  facility: FacilityState,
  franchisePackTier: FacilityPack['tier']
): FacilityStats {
  const pack = FACILITY_PACKS[franchisePackTier];
  const stationConfig = STATION_CONFIGS[facility.facilityType];
  
  // Energy cost calculation
  const baseCost = stationConfig.energyCost;
  const packMultiplier = pack.energyCostMultiplier;
  const levelBonus = 1 - ((facility.level - 1) * 0.1);
  const energyCost = Math.max(25, Math.round(baseCost * packMultiplier * levelBonus));
  
  // XP multiplier combines pack and level
  const levelMultiplier = 1 + ((facility.level - 1) * 0.05);
  const xpMultiplier = pack.xpMultiplier * levelMultiplier;

  return {
    station: facility.facilityType,
    level: facility.level,
    tier: facility.packTier,
    energyCost,
    xpMultiplier,
    unlocked: isStationUnlocked(facility.facilityType, franchisePackTier),
  };
}

// ============================================
// FACILITY COMPARISON
// ============================================

export interface PackComparison {
  tier: FacilityPack['tier'];
  name: string;
  energyCostReduction: string;
  xpBonus: string;
  regenRate: string;
  newStations: string[];
  cost: number;
  affordable: boolean;
}

export function comparePacks(
  currentTier: FacilityPack['tier'],
  resinBalance: number
): PackComparison[] {
  const tiers: FacilityPack['tier'][] = ['SANDLOT', 'HS_GYM', 'PRO_COMPLEX'];
  const currentIndex = tiers.indexOf(currentTier);
  
  return tiers.map((tier, index) => {
    const pack = FACILITY_PACKS[tier];
    const currentPack = FACILITY_PACKS[currentTier];
    
    // Calculate improvements over current
    const costReduction = Math.round((1 - pack.energyCostMultiplier / currentPack.energyCostMultiplier) * 100);
    const xpIncrease = Math.round((pack.xpMultiplier / currentPack.xpMultiplier - 1) * 100);
    
    // Find new stations compared to current tier
    const currentStations = new Set(currentPack.unlockedStations);
    const newStations = pack.unlockedStations.filter(s => !currentStations.has(s));
    
    return {
      tier,
      name: pack.name,
      energyCostReduction: index <= currentIndex ? 'Current' : `${costReduction}% less`,
      xpBonus: index <= currentIndex ? 'Current' : `+${xpIncrease}%`,
      regenRate: `${pack.energyRegenRate}/hour`,
      newStations: newStations.map(s => STATION_CONFIGS[s].name),
      cost: pack.cost,
      affordable: resinBalance >= pack.cost,
    };
  });
}

// ============================================
// PROGRESSION HELPERS
// ============================================

export function calculateProgressToNextPack(
  currentTier: FacilityPack['tier'],
  resinBalance: number
): { percent: number; resinNeeded: number; nextTier: FacilityPack['tier'] | null } {
  const nextTier = getNextPackTier(currentTier);
  
  if (!nextTier) {
    return { percent: 100, resinNeeded: 0, nextTier: null };
  }
  
  const cost = FACILITY_PACKS[nextTier].cost;
  const percent = Math.min(100, Math.round((resinBalance / cost) * 100));
  const resinNeeded = Math.max(0, cost - resinBalance);
  
  return { percent, resinNeeded, nextTier };
}

export function getFacilityUpgradeCost(currentLevel: number): number {
  // Cost to upgrade to next level
  const costs: Record<number, number> = {
    1: 100,  // To level 2
    2: 300,  // To level 3
  };
  return costs[currentLevel] ?? 0;
}

export function canUpgradeFacility(
  facility: FacilityState,
  resinBalance: number
): { canUpgrade: boolean; cost: number; maxed: boolean } {
  if (facility.level >= 3) {
    return { canUpgrade: false, cost: 0, maxed: true };
  }
  
  const cost = getFacilityUpgradeCost(facility.level);
  return {
    canUpgrade: resinBalance >= cost,
    cost,
    maxed: false,
  };
}

// ============================================
// FACILITY RECOMMENDATIONS
// ============================================

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface FacilityRecommendation {
  action: 'UPGRADE_PACK' | 'UPGRADE_FACILITY' | 'SAVE_RESIN';
  priority: Priority;
  target?: TrainingStation;
  reason: string;
  cost: number;
  expectedBenefit: string;
}

export function getFacilityRecommendations(
  facilities: FacilityState[],
  resinBalance: number,
  currentPackTier: FacilityPack['tier']
): FacilityRecommendation[] {
  const recommendations: FacilityRecommendation[] = [];
  
  // Check pack upgrade
  const packUpgrade = canAffordPackUpgrade(currentPackTier, resinBalance);
  if (packUpgrade.nextTier && packUpgrade.canAfford) {
    recommendations.push({
      action: 'UPGRADE_PACK',
      priority: 'HIGH',
      reason: `Unlock ${FACILITY_PACKS[packUpgrade.nextTier].name} for better energy efficiency and new stations`,
      cost: packUpgrade.cost,
      expectedBenefit: `-${Math.round((1 - FACILITY_PACKS[packUpgrade.nextTier].energyCostMultiplier) * 100)}% energy cost, +${Math.round((FACILITY_PACKS[packUpgrade.nextTier].xpMultiplier - 1) * 100)}% XP`,
    });
  }
  
  // Check facility upgrades
  const upgradableFacilities = facilities.filter(f => f.level < 3);
  for (const facility of upgradableFacilities) {
    const upgrade = canUpgradeFacility(facility, resinBalance);
    if (upgrade.canUpgrade) {
      recommendations.push({
        action: 'UPGRADE_FACILITY',
        priority: 'MEDIUM',
        target: facility.facilityType,
        reason: `Upgrade ${STATION_CONFIGS[facility.facilityType].name} to level ${facility.level + 1}`,
        cost: upgrade.cost,
        expectedBenefit: '-10% energy cost, +5% XP for this station',
      });
    }
  }
  
  // If nothing affordable, suggest saving
  if (recommendations.length === 0) {
    const progress = calculateProgressToNextPack(currentPackTier, resinBalance);
    if (progress.nextTier) {
      recommendations.push({
        action: 'SAVE_RESIN',
        priority: 'LOW',
        reason: `Save ${progress.resinNeeded} more resin to unlock ${FACILITY_PACKS[progress.nextTier].name}`,
        cost: progress.resinNeeded,
        expectedBenefit: 'Access to better facilities and training stations',
      });
    }
  }
  
  return recommendations;
}
