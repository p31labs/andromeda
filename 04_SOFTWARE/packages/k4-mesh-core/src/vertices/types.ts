// ═══════════════════════════════════════════════════════════
// @p31/k4-mesh-core: Vertex Type Definitions
//
// Type definitions for the four K4 tetrahedron vertices
// ═══════════════════════════════════════════════════════════

// ─── VERTEX A: OperatorState ───────────────────────────────
export interface OperatorState {
  energy: EnergyState;
  bio: BioReading[];
  medication: MedicationReminder[];
  cognitiveLoad: CognitiveLoad;
}

export interface EnergyState {
  spoons: number;
  max: number;
  trend: 'rising' | 'falling' | 'stable';
  lastUpdate: number;
}

export interface BioReading {
  type: string;
  value: number;
  unit: string;
  source: string;
  ts: number;
}

export interface MedicationReminder {
  id: number;
  kind: string;
  label: string;
  schedule_ts: number;
  completed: 0 | 1;
}

export interface CognitiveLoad {
  voltage: number;
  fawnScore: number;
  messagesPending: number;
  fortressActive: boolean;
}

// ─── VERTEX B: SignalProcessor ─────────────────────────────
export interface SignalProcessor {
  messageQueue: QueuedMessage[];
  fawnBaseline: FawnBaseline;
  contactRegistry: ContactEntry[];
  draftBuffer: DraftMessage[];
}

export interface QueuedMessage {
  id: string;
  from: string;
  content: string;
  ts: number;
  voltage: number;
  fawnScore: number;
  held: boolean;
  holdUntil: number;
}

export interface FawnBaseline {
  samples: number[];
  mean: number;
  stdDev: number;
  lastCalibrated: number;
}

export interface ContactEntry {
  contactId: string;
  name: string;
  avgVoltage: number;
  messageCount: number;
  lastContact: number;
  relationship: string;
}

export interface DraftMessage {
  id: string;
  to: string;
  content: string;
  fawnScore: number;
  bluf: string;
  holdRecommended: boolean;
}

// ─── VERTEX C: ContextEngine ───────────────────────────────
export interface ContextEngine {
  timeline: TimelineEvent[];
  deadlines: Deadline[];
  meshTopology: MeshTopology;
  alignment: AlignmentDocument;
  arbitraryState: Record<string, any>;
}

export interface TimelineEvent {
  id: string;
  ts: number;
  kind: string;
  title: string;
  detail: string;
  source: string;
  tags: string[];
}

export interface Deadline {
  id: string;
  title: string;
  date: number; // Unix timestamp (matches CENTAUR)
  due: number; // Alias for date for backward compatibility
  priority: 'critical' | 'high' | 'medium' | 'low';
  track: 'legal' | 'medical' | 'admin' | 'tech';
  category: 'grant' | 'conference' | 'certification' | 'event' | 'application' | 'other';
  urgency: number;
  gate: boolean;
  status: 'pending' | 'in-progress' | 'completed' | 'missed';
  completed: boolean; // Alias for status === 'completed'
}

export interface MeshTopology {
  vertices: object;
  edges: object;
  totalLove: number;
  lastSync: number;
}

export interface AlignmentDocument {
  markdown: string;
  generatedAt: number;
  meshStatus: string;
}

// ─── VERTEX D: ShieldEngine ────────────────────────────────
export interface ShieldEngine {
  conversationHistory: ConversationSession[];
  synthesis: Synthesis;
  shieldFilter: ShieldConfig;
  toolResults: ToolResult[];
}

export interface ConversationSession {
  session: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  role: string;
  content: string;
  ts: number;
}

export interface Synthesis {
  period: string;
  maskingCost: number;
  messageVolume: number;
  patterns: string[];
  recommendations: string[];
  generatedAt: number;
}

export interface ShieldConfig {
  blockPatterns: string[];
  bufferThreshold: number;
  sanitizeThreshold: number;
  criticalKeywords: string[];
}

export interface ToolResult {
  tool: string;
  result: any;
  ts: number;
  ttl: number;
}