// P31 Smallball: Training Facility Configuration
// 12-Attribute Training System - Station Definitions

import type { StationConfig, FacilityPack, TrainingStation, Attribute } from '../types';

// ============================================
// TRAINING STATIONS (5 stations, 12 attributes)
// ============================================

export const STATION_CONFIGS: Record<TrainingStation, StationConfig> = {
  IRON_MIKE: {
    id: 'IRON_MIKE',
    name: 'The Iron Mike',
    description: 'Batting cage with mechanical pitcher. Trains Contact, Power, and Bunt through timing-based drills.',
    attributes: ['contact', 'power', 'bunt'],
    energyCost: 50,
    baseXpYield: 25,
    minigameDuration: 10,
    unlockedAtFacilityLevel: 1,
  },
  TRACK_SLEDS: {
    id: 'TRACK_SLEDS',
    name: 'Track & Sleds',
    description: 'Speed training with weighted sleds. Trains Speed and Stamina through rapid-tap sprint simulations.',
    attributes: ['speed', 'stamina'],
    energyCost: 50,
    baseXpYield: 25,
    minigameDuration: 10,
    unlockedAtFacilityLevel: 1,
  },
  BULLPEN: {
    id: 'BULLPEN',
    name: 'The Bullpen',
    description: 'Target practice for pitchers. Trains Arm Strength and Arm Accuracy through precision throwing.',
    attributes: ['armStrength', 'armAccuracy'],
    energyCost: 50,
    baseXpYield: 25,
    minigameDuration: 10,
    unlockedAtFacilityLevel: 1,
  },
  POP_FLY: {
    id: 'POP_FLY',
    name: 'Pop-Fly Machine',
    description: 'Fielding drills with automated fly balls. Trains Glove and Range through spatial positioning.',
    attributes: ['glove', 'range'],
    energyCost: 50,
    baseXpYield: 25,
    minigameDuration: 10,
    unlockedAtFacilityLevel: 2,
  },
  FILM_ROOM: {
    id: 'FILM_ROOM',
    name: 'The Film Room',
    description: 'Pitch recognition and strategy. Trains Eye, Baseball IQ, and Clutch through flashcard analysis.',
    attributes: ['eye', 'baseballIq', 'clutch'],
    energyCost: 40,
    baseXpYield: 30, // Slightly higher for mental training
    minigameDuration: 10,
    unlockedAtFacilityLevel: 2,
  },
};

// ============================================
// FACILITY PACKS (3 tiers - progression system)
// ============================================

export const FACILITY_PACKS: Record<FacilityPack['tier'], FacilityPack> = {
  SANDLOT: {
    tier: 'SANDLOT',
    name: 'Empty Sandlot',
    energyCostMultiplier: 1.0, // 50 energy base
    xpMultiplier: 1.0,
    energyRegenRate: 5, // 5 per hour
    unlockedStations: ['IRON_MIKE', 'TRACK_SLEDS', 'BULLPEN'],
    cost: 0, // Starting pack
  },
  HS_GYM: {
    tier: 'HS_GYM',
    name: 'High School Gym',
    energyCostMultiplier: 0.8, // 40 energy
    xpMultiplier: 1.25,
    energyRegenRate: 8, // 8 per hour
    unlockedStations: ['IRON_MIKE', 'TRACK_SLEDS', 'BULLPEN', 'POP_FLY', 'FILM_ROOM'],
    cost: 500, // resin
  },
  PRO_COMPLEX: {
    tier: 'PRO_COMPLEX',
    name: 'Pro Complex',
    energyCostMultiplier: 0.5, // 25 energy
    xpMultiplier: 1.5,
    energyRegenRate: 12, // 12 per hour
    unlockedStations: ['IRON_MIKE', 'TRACK_SLEDS', 'BULLPEN', 'POP_FLY', 'FILM_ROOM'],
    cost: 2000, // resin
  },
};

// ============================================
// STATION-ATTRIBUTE MAPPING
// ============================================

export const STATION_ATTRIBUTES: Record<TrainingStation, Attribute[]> = {
  IRON_MIKE: ['contact', 'power', 'bunt'],
  TRACK_SLEDS: ['speed', 'stamina'],
  BULLPEN: ['armStrength', 'armAccuracy'],
  POP_FLY: ['glove', 'range'],
  FILM_ROOM: ['eye', 'baseballIq', 'clutch'],
};

// ============================================
// HELPERS
// ============================================

export function getStationConfig(station: TrainingStation): StationConfig {
  return STATION_CONFIGS[station];
}

export function getFacilityPack(tier: FacilityPack['tier']): FacilityPack {
  return FACILITY_PACKS[tier];
}

export function isStationUnlocked(station: TrainingStation, packTier: FacilityPack['tier']): boolean {
  const pack = FACILITY_PACKS[packTier];
  return pack.unlockedStations.includes(station);
}

export function calculateEnergyCost(station: TrainingStation, facilityLevel: number, packTier: FacilityPack['tier']): number {
  const baseCost = STATION_CONFIGS[station].energyCost;
  const packMultiplier = FACILITY_PACKS[packTier].energyCostMultiplier;
  const levelBonus = 1 - ((facilityLevel - 1) * 0.1); // 10% reduction per level
  return Math.max(25, Math.round(baseCost * packMultiplier * levelBonus));
}

export function calculateXpYield(
  station: TrainingStation,
  facilityLevel: number,
  packTier: FacilityPack['tier'],
  isManual: boolean,
  minigameScore: number
): Record<Attribute, number> {
  const stationConfig = STATION_CONFIGS[station];
  const pack = FACILITY_PACKS[packTier];
  
  // Base XP modified by pack multiplier
  let baseXp = stationConfig.baseXpYield * pack.xpMultiplier;
  
  // Level bonus: 5% per level
  baseXp *= 1 + ((facilityLevel - 1) * 0.05);
  
  // Manual training bonus: +20%
  if (isManual) {
    baseXp *= 1.2;
  }
  
  // Minigame performance bonus: up to +20% for perfect score
  const performanceBonus = (minigameScore / 100) * 0.2;
  baseXp *= 1 + performanceBonus;
  
  // Distribute XP across station attributes
  const attributes = stationConfig.attributes;
  const xpPerAttribute = Math.round(baseXp / attributes.length);
  
  return attributes.reduce((acc, attr) => {
    acc[attr] = xpPerAttribute;
    return acc;
  }, {} as Record<Attribute, number>);
}

export function calculateEnergyRegen(elapsedHours: number, packTier: FacilityPack['tier']): number {
  const pack = FACILITY_PACKS[packTier];
  return Math.floor(elapsedHours * pack.energyRegenRate);
}

// ============================================
// ATTRIBUTE DISPLAY NAMES
// ============================================

export const ATTRIBUTE_DISPLAY_NAMES: Record<Attribute, string> = {
  contact: 'Contact',
  power: 'Power',
  eye: 'Eye',
  bunt: 'Bunt',
  glove: 'Glove',
  range: 'Range',
  armStrength: 'Arm Strength',
  armAccuracy: 'Arm Accuracy',
  speed: 'Speed',
  stamina: 'Stamina',
  clutch: 'Clutch',
  baseballIq: 'Baseball IQ',
};

export const ATTRIBUTE_DESCRIPTIONS: Record<Attribute, string> = {
  contact: 'Chance of putting the ball in play; reduces strikeouts.',
  power: 'Shifts hit distribution toward doubles, triples, and home runs.',
  eye: 'Increases walk rate; improves swing decisions on balls outside the zone.',
  bunt: 'Success rate for sacrifice bunts, squeeze plays, and hit-and-runs.',
  glove: 'Reduces fielding errors and dropped catches.',
  range: 'Allows fielders to reach ground balls or fly balls hit in the gaps.',
  armStrength: 'Pitch velocity; outfielders throwing out runners at home plate.',
  armAccuracy: 'Pitch control (fewer walks/wild pitches); infielders turning double plays.',
  speed: 'Increases stolen bases and stretches singles into doubles.',
  stamina: 'How many pitches or drills before fatigue sets in.',
  clutch: 'Stat boost applied when runners are in scoring position or in the 9th inning.',
  baseballIq: 'Reduces base-running blunders; improves defensive positioning.',
};
