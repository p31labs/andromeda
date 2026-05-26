// P31 Smallball Type System
// Schema version: p31.smallball/0.1.0

export type UUID = string;

// === Spoon Theory Cognitive Load States ===
export type SpoonState = 1 | 3 | 6;

export interface SpoonAllocation {
  franchiseId: UUID;
  date: string; // ISO date
  totalSpoons: 1 | 3 | 6 | 9 | 12;
  usedSpoons: number;
  recoveryRate: number; // spoons per hour
  manuallySet: boolean;
  crdtClock: bigint;
}

// === Core Entity Types ===
export interface Franchise {
  id: UUID;
  ownerPubkey: string;
  teamName: string;
  resinBalance: number;
  lastResinClaim: number; // unix timestamp ms
  createdAt: string;
  crdtClock: bigint;
  crdtNodeId: string;
}

export interface Player {
  id: UUID;
  franchiseId: UUID;
  firstName: string;
  lastName: string;
  skinToneHex: string;
  jerseyNumber: number;
  baseStats: Stats;
  crdtClock: bigint;
}

export interface Stats {
  // === HITTING (4 attributes) ===
  contact: number;      // 0-99: Chance of putting ball in play, reduces strikeouts
  power: number;        // 0-99: Shifts hits toward doubles, triples, home runs
  eye: number;          // 0-99: Increases walks, improves swing decisions (was plateDiscipline)
  bunt: number;         // 0-99: Success rate for sacrifice bunts, squeeze plays, hit-and-runs

  // === DEFENSE & PITCHING (4 attributes) ===
  glove: number;        // 0-99: Reduces fielding errors, dropped catches (was fielding)
  range: number;        // 0-99: Reach ground balls, fly balls in gaps
  armStrength: number;  // 0-99: Pitch velocity, outfielders throwing out runners
  armAccuracy: number;   // 0-99: Pitch control, infielders turning double plays

  // === PHYSICAL & MENTAL (4 attributes) ===
  speed: number;        // 0-99: Stolen bases, stretching singles into doubles
  stamina: number;      // 0-99: Pitch count endurance, drill capacity before fatigue
  clutch: number;       // 0-99: Stat boost in scoring position, 9th inning
  baseballIq: number;     // 0-99: Reduces base-running blunders, improves defensive positioning
}

export interface StatMutation {
  id: UUID;
  playerId: UUID;
  mutationType: MutationType;
  delta: number;
  xpYield: number;
  appliedAt: number; // unix timestamp ms
  crdtClock: bigint;
}

// === 12-Attribute Training System ===
export type Attribute =
  | 'contact'
  | 'power'
  | 'eye'
  | 'bunt'
  | 'glove'
  | 'range'
  | 'armStrength'
  | 'armAccuracy'
  | 'speed'
  | 'stamina'
  | 'clutch'
  | 'baseballIq';

export type MutationType = 
  // Hitting
  | 'TRAIN_CONTACT'
  | 'TRAIN_POWER'
  | 'TRAIN_EYE'
  | 'TRAIN_BUNT'
  // Defense/Pitching
  | 'TRAIN_GLOVE'
  | 'TRAIN_RANGE'
  | 'TRAIN_ARM_STRENGTH'
  | 'TRAIN_ARM_ACCURACY'
  // Physical/Mental
  | 'TRAIN_SPEED'
  | 'TRAIN_STAMINA'
  | 'TRAIN_CLUTCH'
  | 'TRAIN_BASEBALL_IQ'
  // Match effects
  | 'MATCH_FATIGUE'
  | 'ENERGY_SPENT'
  | 'ENERGY_REGEN';

// === Match System ===
export interface Match {
  id: UUID;
  challengerFranchiseId: UUID;
  defenderFranchiseId: UUID;
  seed: number;
  challengerHash: string | null;
  defenderHash: string | null;
  status: 'pending' | 'validated' | 'disputed';
  createdAt: string;
  crdtClock: bigint;
}

export interface MatchHistoryEvent {
  id: UUID;
  matchId: UUID;
  sequenceId: number;
  actorId: UUID;
  actionType: ActionType;
  actionData: ActionData;
  crdtClock: bigint;
}

export type ActionType =
  | 'PITCH_THROWN'
  | 'SWING_TAKEN'
  | 'BALL_PUT_IN_PLAY'
  | 'OUT_RECORDED'
  | 'RUN_SCORED'
  | 'INNING_END'
  | 'GAME_END';

export interface ActionData {
  pitchVelocity?: number;
  pitchLocation?: [number, number]; // x, y in strike zone -1 to 1
  pitchType?: 'FASTBALL' | 'CURVEBALL' | 'SLIDER' | 'CHANGEUP';
  swingTiming?: number; // ms delta from perfect
  swingDecision?: 'TAKE' | 'SWING';
  exitVelocity?: number;
  launchAngle?: number;
  result?: 'BALL' | 'STRIKE' | 'FOUL' | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN' | 'OUT';
}

// === Event Sourcing ===
export interface EventLog<T> {
  id: UUID;
  entityId: UUID;
  type: string;
  payload: T;
  vectorClock: VectorClockEntry[];
  hash: string; // SHA-256
  timestamp: number;
}

export interface VectorClockEntry {
  nodeId: string;
  timestamp: bigint;
}

// === Game Mechanics ===
export interface CountState {
  balls: 0 | 1 | 2 | 3;
  strikes: 0 | 1 | 2;
}

export type PlateAppearanceState = 
  | CountState 
  | 'WALK' 
  | 'STRIKEOUT' 
  | 'IN_PLAY';

export interface AtBatResult {
  sequence: number;
  inning: number;
  isTop: boolean;
  batterId: string;
  pitcherId: string;
  finalState: PlateAppearanceOutcome;
  events: PlateAppearanceEvent[];
  prngState: number;
}

export interface PlateAppearanceOutcome {
  type: 'WALK' | 'STRIKEOUT' | 'IN_PLAY';
  result?: 'OUT' | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN';
}

export interface PlateAppearanceEvent {
  sequence: number;
  timestamp: number;
  pitch: Pitch;
  swingDecision: 'TAKE' | 'SWING';
  state: { balls: number; strikes: number };
  outcome?: string;
  result?: string;
  exitVelocity?: number;
  roll: number;
}

export interface Pitch {
  velocity: number; // mph
  location: [number, number]; // x, y in strike zone
  type: 'FASTBALL' | 'CURVEBALL' | 'SLIDER' | 'CHANGEUP';
}

export interface DefensiveAI {
  aggressionLevel: number; // 0-1
  pitchPreference: string[]; // sequence of pitch types
  shiftAlignment: 'STANDARD' | 'OVERSHIFT_LEFT' | 'OVERSHIFT_RIGHT';
  bullpenThreshold: number; // fatigue level to pull pitcher
}

export interface TeamStats {
  players: Array<{
    id: string;
    stats: Stats;
  }>;
}

export interface MatchParams {
  seed: string;
  matchId: string;
  innings: number;
  challengerStats: TeamStats;
  defenderStrategy: {
    aggressionLevel: number;
    pitchPreference: string[];
    shiftAlignment: 'STANDARD' | 'OVERSHIFT_LEFT' | 'OVERSHIFT_RIGHT';
    bullpenThreshold: number;
    teamStats: TeamStats;
  };
}

export interface MatchResult {
  events: AtBatResult[];
  finalScore: {
    challenger: number;
    defender: number;
  };
}

// === Training ===
export interface TrainingDrill {
  id: string;
  name: string;
  description: string;
  resinCost: number;
  durationMinutes: number;
  attributeTarget: keyof Stats | 'ALL';
  baseXPYield: number;
  spoonRequirement: SpoonState;
  type: 'PASSIVE' | 'MINIGAME';
}

// === Rendering ===
export interface BillboardSprite {
  id: UUID;
  playerId: UUID;
  position: [number, number, number]; // x, y, z in field coordinates
  animation: PlayerAnimation;
  direction: 'LEFT' | 'RIGHT' | 'FRONT' | 'BACK';
}

export type PlayerAnimation =
  | 'IDLE'
  | 'RUNNING'
  | 'SWINGING'
  | 'PITCHING'
  | 'FIELDING'
  | 'THROWING'
  | 'CATCHING';

export interface BallTrajectory {
  startPosition: [number, number, number];
  velocity: [number, number, number];
  spin: [number, number, number];
  gravity: number;
  drag: number;
}

// === Sync/Mesh ===
export interface SyncState {
  lastSyncAt: number;
  pendingMutations: number;
  connectedPeers: string[];
  meshStatus: 'OFFLINE' | 'CONNECTING' | 'SYNCING' | 'SYNCED';
}

export type MeshMessage =
  | { type: 'SYNC_REQUEST'; franchiseId: UUID; lastClock: bigint }
  | { type: 'SYNC_RESPONSE'; mutations: StatMutation[]; matches: Match[] }
  | { type: 'SEED_REQUEST'; matchId: UUID }
  | { type: 'SEED_RESPONSE'; matchId: UUID; seed: number }
  | { type: 'HASH_SUBMIT'; matchId: UUID; hash: string; events: MatchHistoryEvent[] }
  | { type: 'TRAINING_EVENT'; event: TrainingEvent };

// ============================================
// === TRAINING SYSTEM (12-Attribute Economy) ===
// ============================================

export type TrainingStation =
  | 'IRON_MIKE'      // Contact, Power (batting cage)
  | 'TRACK_SLEDS'    // Speed, Stamina (rapid-tap)
  | 'BULLPEN'        // Arm Strength, Arm Accuracy (target throwing)
  | 'POP_FLY'        // Glove, Range (spatial catching)
  | 'FILM_ROOM';     // Eye, Baseball IQ, Clutch (pitch recognition)

export interface StationConfig {
  id: TrainingStation;
  name: string;
  description: string;
  attributes: Attribute[];
  energyCost: number;
  baseXpYield: number;
  minigameDuration: number; // seconds
  unlockedAtFacilityLevel: number;
}

export interface PlayerEnergy {
  playerId: UUID;
  currentEnergy: number; // 0-100
  maxEnergy: number;     // default 100
  lastRegenTimestamp: number; // unix ms
  crdtClock: bigint;
}

export interface TrainingFacility {
  id: UUID;
  franchiseId: UUID;
  facilityType: TrainingStation;
  level: number; // 1-3
  packTier: 'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX';
  crdtClock: bigint;
}

export interface ScheduledTraining {
  id: UUID;
  playerId: UUID;
  station: TrainingStation;
  focusAttribute: Attribute | 'BALANCED';
  autoEnabled: boolean;
  scheduledAt: number; // unix ms
  lastExecutedAt: number | null;
  crdtClock: bigint;
}

export interface TrainingEvent {
  id: UUID;
  type: 'SCHEDULE_TRAINING' | 'EXECUTE_MANUAL' | 'EXECUTE_AUTO' | 'CANCEL_TRAINING';
  playerId: UUID;
  franchiseId: UUID;
  station: TrainingStation;
  timestamp: number; // unix ms
  energySpent: number;
  xpGained: Partial<Record<Attribute, number>>;
  facilityLevel: number;
  wasManual: boolean;
  crdtClock: bigint;
  crdtNodeId: string;
}

export interface TrainingResult {
  event: TrainingEvent;
  newEnergy: number;
  attributeDeltas: Partial<Record<Attribute, number>>;
}

export interface FacilityPack {
  tier: 'SANDLOT' | 'HS_GYM' | 'PRO_COMPLEX';
  name: string;
  energyCostMultiplier: number;
  xpMultiplier: number;
  energyRegenRate: number; // per hour
  unlockedStations: TrainingStation[];
  cost: number; // resin
}

export interface MinigameResult {
  station: TrainingStation;
  score: number; // 0-100
  timingQuality?: number; // for Iron Mike
  tapCount?: number; // for Track Sleds
  accuracy?: number; // for Bullpen
  catches?: number; // for Pop Fly
  correctCalls?: number; // for Film Room
  duration: number; // actual seconds played
  earlyExit: boolean;
}

export type TrainingMode = 'MANUAL' | 'AUTO' | 'SCHEDULED';

export interface WeeklyFocus {
  playerId: UUID;
  primaryStation: TrainingStation;
  secondaryStation: TrainingStation | null;
  daysPerWeek: number; // 1-7
  crdtClock: bigint;
}
