// P31 Gridiron: Complete Type System (10000% Convergence)
// All 12 attributes + training + fatigue + stadium + cross-game identity

// ============================================
// BACKWARD COMPATIBILITY (Legacy Support)
// ============================================

/** @deprecated Use Attributes with 12-attribute system */
export interface PlayerBaseStats {
  speed: number;
  strength: number;
  agility: number;
  vision: number;
  awareness: number;
  hands: number;
  routeRunning: number;
  blocking: number;
  armStrength: number;
  accuracy: number;
  elusiveness: number;
  tackling: number;
  coverage: number;
  passRush: number;
  kickingPower: number;
  kickingAccuracy: number;
}

/** @deprecated Use Player with 12-attribute system */
export interface LegacyPlayer {
  id: string;
  franchiseId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: Position;
  baseStats: PlayerBaseStats;
  skinToneHex: string;
  heightInches: number;
  weightLbs: number;
  fatigue: number;
  injuryStatus: 'HEALTHY' | 'MINOR' | 'MAJOR' | 'SEVERE';
  contractYears: number;
  contractSalary: number;
  crdtClock: bigint;
}

/** @deprecated Use DefensiveGameplan */
export interface LegacyDefensiveGameplan {
  baseScheme: 'COVER_2' | 'COVER_3' | 'MAN' | 'HYBRID';
  runDefense: 'BOX' | 'SPILL' | 'STACKED' | 'LIGHT';
  passRush: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
  blitzFrequency: number;
  redZoneScheme: 'TIGHT' | 'SOFT' | 'PREVENT' | null;
  twoMinuteScheme: 'PREVENT' | 'AGGRESSIVE' | null;
  thirdDownBlitz: boolean;
  goalLinePersonnel: 'HEAVY' | 'LIGHT';
}

/** @deprecated Use PlayOutcome */
export interface Drive {
  plays: Array<{
    stateBefore: FieldState;
    playCall: PlayCall;
    outcome: PlayOutcome;
    prngIndex: number;
  }>;
  result: 'TOUCHDOWN' | 'FIELD_GOAL' | 'PUNT' | 'TURNOVER' | 'TURNOVER_ON_DOWNS' | 'END_OF_GAME' | null;
  yardsGained: number;
  finalState: FieldState;
}

/** @deprecated Use MatchStats */
export interface FootballStats {
  completions: number;
  attempts: number;
  passingYards: number;
  passingTDs: number;
  interceptions: number;
  rushes: number;
  rushingYards: number;
  rushingTDs: number;
  fumbles: number;
  receptions: number;
  receivingYards: number;
  receivingTDs: number;
  tackles: number;
  sacks: number;
  tacklesForLoss: number;
  passDeflections: number;
  interceptionsDef: number;
}

// ============================================
// CORE 12-ATTRIBUTE SYSTEM
// ============================================

export interface Attributes {
  // Physical & Mental
  speed: number;              // 0-99: Breakaway yardage, deep separation
  strength: number;           // 0-99: Breaking tackles, shedding blocks
  agility: number;            // 0-99: Juke success, route precision
  footballIQ: number;         // 0-99: Play recognition, zone reads
  stamina: number;            // 0-99: Energy recovery, fatigue resistance

  // Offensive Skill
  passingAccuracy: number;  // 0-99: Completion %, interception reduction
  catching: number;          // 0-99: Contested catches, drop prevention
  ballSecurity: number;     // 0-99: Fumble prevention
  blocking: number;          // 0-99: Run/pass blocking effectiveness

  // Defensive Skill
  tackling: number;          // 0-99: Tackle immediate success, YAC prevention
  passRush: number;          // 0-99: Beat OL, pressure QB
  coverage: number;          // 0-99: Man/zone effectiveness
}

export type AttributeKey = keyof Attributes;

export const ATTRIBUTE_LABELS: Record<AttributeKey, { name: string; short: string; category: string }> = {
  speed: { name: 'Speed', short: 'SPD', category: 'Physical' },
  strength: { name: 'Strength', short: 'STR', category: 'Physical' },
  agility: { name: 'Agility', short: 'AGI', category: 'Physical' },
  footballIQ: { name: 'Football IQ', short: 'IQ', category: 'Mental' },
  stamina: { name: 'Stamina', short: 'STM', category: 'Physical' },
  passingAccuracy: { name: 'Passing', short: 'PAS', category: 'Offense' },
  catching: { name: 'Catching', short: 'CTH', category: 'Offense' },
  ballSecurity: { name: 'Ball Sec', short: 'SEC', category: 'Offense' },
  blocking: { name: 'Blocking', short: 'BLK', category: 'Offense' },
  tackling: { name: 'Tackling', short: 'TAK', category: 'Defense' },
  passRush: { name: 'Pass Rush', short: 'PRS', category: 'Defense' },
  coverage: { name: 'Coverage', short: 'COV', category: 'Defense' },
};

// ============================================
// PLAYER STATE (WITH FATIGUE)
// ============================================

export interface Player {
  id: string;
  franchiseId: string;
  identityId: string;  // Cross-game link
  name: string;
  position: Position;
  depthChartRank: number;  // 1 = starter

  // Base attributes (true potential)
  attributes: Attributes;

  // Dynamic state
  energy: number;        // 0-100: Daily training budget
  fatigue: number;       // 0-100: Accumulated wear
  condition: 'fresh' | 'warm' | 'tired' | 'exhausted' | 'gassed';

  // Training state
  trainingAssignment: TrainingAssignment | null;
  lastTrainedAt: string;  // ISO timestamp
  dailyEnergyBurned: number;

  // Match-specific (resets each game)
  matchStats: MatchStats | null;
}

export type Position =
  | 'QB' | 'RB' | 'FB' | 'WR' | 'TE' | 'OL'  // Offense
  | 'DL' | 'LB' | 'CB' | 'S' | 'K' | 'P';  // Defense/Special

export interface TrainingAssignment {
  stationId: TrainingStationId;
  assignedAt: string;
  scheduledDuration: number;  // minutes
  manualMode: boolean;
  attributes: AttributeKey[];  // Which attributes this training improves
}

export interface MatchStats {
  attempts: number;
  successes: number;
  yards: number;
  touchdowns: number;
  turnovers: number;
}

// ============================================
// TRAINING SYSTEM
// ============================================

export type TrainingStationId =
  | 'sledPush'      // Strength/Blocking
  | 'coneDrills'    // Speed/Agility
  | 'sevenOnSeven'  // Passing/Catching/Coverage
  | 'gauntlet'      // Tackling/Ball Security
  | 'filmRoom';     // Football IQ/Stamina

export interface TrainingStation {
  id: TrainingStationId;
  name: string;
  attributes: AttributeKey[];
  description: string;
  energyCost: number;  // Base energy per session
  xpYield: number;     // Base XP per energy point
}

export const TRAINING_STATIONS: TrainingStation[] = [
  {
    id: 'sledPush',
    name: 'Sled Push Power',
    attributes: ['strength', 'blocking'],
    description: 'Power timing drill for linemen',
    energyCost: 25,
    xpYield: 0.8,
  },
  {
    id: 'coneDrills',
    name: 'Cone Drills',
    attributes: ['speed', 'agility'],
    description: 'Rhythm-based footwork training',
    energyCost: 20,
    xpYield: 0.9,
  },
  {
    id: 'sevenOnSeven',
    name: '7-on-7 Skeleton',
    attributes: ['passingAccuracy', 'catching', 'coverage'],
    description: 'Quick-read passing drill',
    energyCost: 22,
    xpYield: 0.75,
  },
  {
    id: 'gauntlet',
    name: 'The Gauntlet',
    attributes: ['tackling', 'ballSecurity'],
    description: 'Ball protection through contact',
    energyCost: 28,
    xpYield: 0.85,
  },
  {
    id: 'filmRoom',
    name: 'Film Room',
    attributes: ['footballIQ', 'stamina'],
    description: 'Play recognition and mental endurance',
    energyCost: 15,
    xpYield: 0.6,
  },
];

export interface MinigameResult {
  station: TrainingStationId;
  score: number;      // 0-100
  attributesImproved: AttributeKey[];
  xpGained: number;
  energyBurned: number;
  fatigueDelta: number;
  duration: number;   // seconds
  timestamp: string;
}

// ============================================
// FACILITY PROGRESSION
// ============================================

export interface Facility {
  level: 1 | 2 | 3;
  name: string;
  energyCostModifier: number;  // 1.0 = base
  xpYieldModifier: number;
  recoveryRateModifier: number;
  weatherRisk: boolean;
  unlockedStations: TrainingStationId[];
  upgradeCost: number;
}

export const FACILITIES: Facility[] = [
  {
    level: 1,
    name: 'Community Park',
    energyCostModifier: 1.0,
    xpYieldModifier: 1.0,
    recoveryRateModifier: 1.0,
    weatherRisk: true,
    unlockedStations: ['sledPush', 'coneDrills'],
    upgradeCost: 0,
  },
  {
    level: 2,
    name: 'College Practice Bubble',
    energyCostModifier: 0.8,
    xpYieldModifier: 1.3,
    recoveryRateModifier: 1.0,
    weatherRisk: false,
    unlockedStations: ['sledPush', 'coneDrills', 'sevenOnSeven', 'gauntlet'],
    upgradeCost: 50000,
  },
  {
    level: 3,
    name: 'Pro Complex',
    energyCostModifier: 0.5,
    xpYieldModifier: 1.6,
    recoveryRateModifier: 2.0,  // Cryotherapy
    weatherRisk: false,
    unlockedStations: ['sledPush', 'coneDrills', 'sevenOnSeven', 'gauntlet', 'filmRoom'],
    upgradeCost: 250000,
  },
];

// ============================================
// STADIUM ENVIRONMENT
// ============================================

export type StadiumId = 'mudBowl' | 'concreteJungle' | 'modernDome';

export interface Stadium {
  id: StadiumId;
  name: string;
  surface: 'grass' | 'astroturf' | 'turf';
  climate: 'open' | 'outdoor' | 'controlled';
  fieldDeterioration: boolean;

  // Markov modifiers (applied to attributes)
  modifiers: {
    speed?: number;
    strength?: number;
    agility?: number;
    stamina?: number;
    passingAccuracy?: number;
    catching?: number;
    footballIQ?: { home: number; away: number };  // Special: crowd noise affects away team
  };

  aiRecommendation: string;
}

export const STADIUMS: Record<StadiumId, Stadium> = {
  mudBowl: {
    id: 'mudBowl',
    name: 'The Mud Bowl',
    surface: 'grass',
    climate: 'open',
    fieldDeterioration: true,
    modifiers: {
      speed: 0.85,      // Heavy weather slows everyone
      agility: 0.80,
      strength: 1.15,   // Power teams thrive
      stamina: 0.90,
    },
    aiRecommendation: 'Build power-run offense. Speed receivers will struggle.',
  },
  concreteJungle: {
    id: 'concreteJungle',
    name: 'The Concrete Jungle',
    surface: 'astroturf',
    climate: 'outdoor',
    fieldDeterioration: false,
    modifiers: {
      speed: 1.20,      // Hard surface = fast
      agility: 1.10,
      stamina: 0.75,    // Drains faster (hard impacts)
      passingAccuracy: 1.10,
    },
    aiRecommendation: 'Speed kills here. Vertical passing attack optimal.',
  },
  modernDome: {
    id: 'modernDome',
    name: 'The Modern Dome',
    surface: 'turf',
    climate: 'controlled',
    fieldDeterioration: false,
    modifiers: {
      speed: 1.05,
      passingAccuracy: 1.15,
      catching: 1.10,
      footballIQ: { home: 1.0, away: 0.85 },  // Crowd noise affects away team
    },
    aiRecommendation: 'Spread offense. Precision over power.',
  },
};

// ============================================
// MARKOV SIMULATION
// ============================================

export interface FieldState {
  down: 1 | 2 | 3 | 4;
  distance: number;      // Yards to first down
  yardLine: number;      // 0-100 (0 = own goal, 100 = opponent goal)
  possession: 'HOME' | 'AWAY';
  gameClock: number;     // Seconds remaining in quarter
  quarter: 1 | 2 | 3 | 4;
  scoreHome: number;
  scoreAway: number;
}

export interface PlayCall {
  id: string;
  name: string;
  formation: Formation;
  personnel: string;     // e.g., '11' = 1 RB, 1 TE, 3 WR
  type: 'RUN' | 'PASS' | 'SPECIAL';
  description: string;
  difficulty: 1 | 2 | 3;
}

export type Formation =
  | 'SINGLEBACK' | 'I_FORM' | 'SHOTGUN' | 'EMPTY'
  | 'GOAL_LINE' | 'PUNT' | 'FIELD_GOAL';

export interface DefensiveGameplan {
  baseScheme: 'COVER_2' | 'COVER_3' | 'MAN' | 'HYBRID';
  twoMinuteScheme: 'PREVENT' | 'AGGRESSIVE' | null;
  redZoneScheme: 'TIGHT' | 'SOFT' | null;
  thirdDownBlitz: boolean;
}

export type PlayOutcome =
  | { type: 'GAIN'; yards: number; firstDown: boolean; touchdown: boolean }
  | { type: 'LOSS'; yards: number }
  | { type: 'NO_GAIN' }
  | { type: 'INCOMPLETE' }
  | { type: 'TURNOVER'; turnoverType: 'FUMBLE' | 'INTERCEPTION' }
  | { type: 'SCORE'; scoreType: 'TOUCHDOWN' | 'FIELD_GOAL' }
  | { type: 'SPECIAL'; specialType: 'PUNT' };

export interface TransitionWeights {
  minYards: number;
  maxYards: number;
  firstDownChance: number;
  touchdownChance: number;
  fumbleChance: number;
  sackChance: number;
  interceptionChance: number;
}

export interface MatchupResult {
  matchup: string;       // e.g., "OL vs DL"
  attackerRating: number;
  defenderRating: number;
  winProbability: number;
  outcome: 'win' | 'loss' | 'draw';
}

// ============================================
// SPOON THEORY UX
// ============================================

export type SpoonState = 1 | 3 | 6;

// Daily spoon allocation tracking
export interface SpoonAllocation {
  franchiseId: string;
  date: string;  // ISO date string
  totalSpoons: number;
  usedSpoons: number;
  recoveryRate: number;  // spoons per hour recovery
  manuallySet: boolean;
  crdtClock: bigint;
}

export interface SpoonAdaptation {
  timeLimit: number;     // Seconds for minigame
  tapTargetCount: number; // For rhythm games
  animationSpeed: number; // 0.5 = slow, 1.0 = normal
  uiComplexity: 'minimal' | 'standard' | 'full';
  autoScheduleEnabled: boolean;
  manualModeAvailable: boolean;
}

export const SPOON_CONFIG: Record<SpoonState, SpoonAdaptation> = {
  1: {
    timeLimit: 15,
    tapTargetCount: 5,
    animationSpeed: 0.5,
    uiComplexity: 'minimal',
    autoScheduleEnabled: true,
    manualModeAvailable: false,
  },
  3: {
    timeLimit: 30,
    tapTargetCount: 10,
    animationSpeed: 0.75,
    uiComplexity: 'standard',
    autoScheduleEnabled: true,
    manualModeAvailable: true,
  },
  6: {
    timeLimit: 45,
    tapTargetCount: 20,
    animationSpeed: 1.0,
    uiComplexity: 'full',
    autoScheduleEnabled: true,
    manualModeAvailable: true,
  },
};

// ============================================
// CROSS-GAME IDENTITY (110% → 10000%)
// ============================================

export interface CrossGameIdentity {
  playerId: string;
  globalLevel: number;
  totalXP: number;
  gamesPlayed: {
    smallball: number;
    gridiron: number;
  };
  achievements: CrossGameAchievement[];
  avatar: {
    primaryColor: string;
    secondaryColor: string;
    pattern: string;
  };
  lastSyncedAt: string;
}

export interface CrossGameAchievement {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: string | null;
  progress: number;      // 0-100
  required: number;
}

export const CROSS_GAME_ACHIEVEMENTS = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Play your first game in either sport',
    rarity: 'common',
    required: 1,
  },
  {
    id: 'dual_threat',
    name: 'Dual Threat',
    description: 'Win 10 games in both Smallball and Gridiron',
    rarity: 'rare',
    required: 10,
  },
  {
    id: 'ironman',
    name: 'Ironman',
    description: 'Reach max level in both games',
    rarity: 'epic',
    required: 50,  // Max level
  },
  {
    id: 'master_athlete',
    name: 'Master Athlete',
    description: 'Achieve 100% completion in both sports',
    rarity: 'legendary',
    required: 100,
  },
] as const;

// XP Formula: level = 1000 * n * (n + 1) / 2
export const XP_FORMULA = {
  levelToXP: (level: number): number => 1000 * level * (level + 1) / 2,
  xpToLevel: (xp: number): number => Math.floor((-1 + Math.sqrt(1 + 8 * xp / 1000)) / 2),
  xpForNextLevel: (currentLevel: number): number => {
    const nextLevel = currentLevel + 1;
    return 1000 * nextLevel * (nextLevel + 1) / 2;
  },
};

// ============================================
// DATABASE SCHEMA TYPES (PGLite)
// ============================================

export interface DBPlayer {
  id: string;
  franchise_id: string;
  identity_id: string;
  name: string;
  position: string;
  depth_chart_rank: number;
  attr_speed: number;
  attr_strength: number;
  attr_agility: number;
  attr_football_iq: number;
  attr_stamina: number;
  attr_passing_accuracy: number;
  attr_catching: number;
  attr_ball_security: number;
  attr_blocking: number;
  attr_tackling: number;
  attr_pass_rush: number;
  attr_coverage: number;
  energy: number;
  fatigue: number;
  training_station_id: string | null;
  last_trained_at: string;
  created_at: string;
  updated_at: string;
}

export interface DBFranchise {
  id: string;
  name: string;
  owner_identity_id: string;
  facility_level: 1 | 2 | 3;
  stadium_id: StadiumId;
  created_at: string;
  updated_at: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface SyncResponse {
  playersUpdated: number;
  xpGained: number;
  energyRecovered: number;
  achievementsUnlocked: string[];
  timestamp: string;
}
