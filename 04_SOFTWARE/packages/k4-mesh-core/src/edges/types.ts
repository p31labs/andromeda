// ═══════════════════════════════════════════════════════════
// @p31/k4-mesh-core: Edge Type Definitions
//
// Type definitions for the six K4 tetrahedron hub edges
// ═══════════════════════════════════════════════════════════

import type {
  EnergyState,
  BioReading,
  CognitiveLoad,
  QueuedMessage,
  ContactEntry,
  TimelineEvent,
  Deadline,
  AlignmentDocument,
  ChatMessage,
  Synthesis
} from '../vertices/types';

// ─── EDGE AB: Energy ↔ Voltage ─────────────────────────────
export interface EdgeABMessage {
  type: 'energy-update' | 'voltage-update' | 'fortress-toggle' | 'bio-alert';
  timestamp: number;
  payload: {
    energy?: EnergyState;
    voltage?: number;
    fortressActive?: boolean;
    bioAlert?: BioReading;
  };
}

// ─── EDGE AC: Energy ↔ Context ─────────────────────────────
export interface EdgeACMessage {
  type: 'bio-event' | 'medication-event' | 'deadline-reminder' | 'mesh-update';
  timestamp: number;
  payload: {
    bioEvent?: BioReading;
    medicationEvent?: any;
    deadline?: Deadline;
    meshState?: any;
  };
}

// ─── EDGE AD: Energy ↔ Shield ──────────────────────────────
export interface EdgeADMessage {
  type: 'energy-state' | 'synthesis-output' | 'shield-update';
  timestamp: number;
  payload: {
    energy?: EnergyState;
    cognitiveLoad?: CognitiveLoad;
    synthesis?: Synthesis;
    recommendation?: string;
  };
}

// ─── EDGE BC: Signal ↔ Context ─────────────────────────────
export interface EdgeBCMessage {
  type: 'message-metadata' | 'court-date' | 'mesh-presence' | 'calendar-event';
  timestamp: number;
  payload: {
    message?: QueuedMessage;
    contact?: ContactEntry;
    deadline?: Deadline;
    meshState?: any;
  };
}

// ─── EDGE BD: Signal ↔ Shield ──────────────────────────────
export interface EdgeBDMessage {
  type: 'high-voltage-message' | 'fawn-flagged-draft' | 'blocked-message' | 'ai-response';
  timestamp: number;
  payload: {
    message?: QueuedMessage;
    draft?: any;
    analysis?: string;
    rewrite?: string;
    summary?: string;
  };
}

// ─── EDGE CD: Context ↔ Shield ─────────────────────────────
export interface EdgeCDMessage {
  type: 'alignment-update' | 'timeline-update' | 'deadline-update' | 'synthesis-complete';
  timestamp: number;
  payload: {
    alignment?: AlignmentDocument;
    timeline?: TimelineEvent[];
    deadlines?: Deadline[];
    synthesis?: Synthesis;
    pattern?: string;
  };
}

// Union type for all hub messages
export type HubMessage =
  | EdgeABMessage
  | EdgeACMessage
  | EdgeADMessage
  | EdgeBCMessage
  | EdgeBDMessage
  | EdgeCDMessage;

// Q-Factor computation result
export interface QFactor {
  score: number;
  timestamp: number;
  vertexHealth: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  factors: {
    energyTrend: string;
    queueDepth: number;
    deadlineUrgency: number;
    synthesisRecency: number;
  };
}