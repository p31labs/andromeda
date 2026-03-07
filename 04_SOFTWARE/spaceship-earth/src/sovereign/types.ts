export type SovereignRoom = 'OBSERVATORY' | 'COLLIDER' | 'BONDING' | 'BRIDGE' | 'BUFFER' | 'COPILOT' | 'LANDING' | 'RESONANCE' | 'FORGE';

export const SOVEREIGN_ROOMS: readonly SovereignRoom[] = ['OBSERVATORY', 'COLLIDER', 'BONDING', 'BRIDGE', 'BUFFER', 'COPILOT', 'LANDING', 'RESONANCE', 'FORGE'];

export type CentaurStatus = 'IDLE' | 'GENERATING' | 'COMPILING' | 'ERROR' | 'SUCCESS';

export type GenesisSyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

export type ViewMode = 'cockpit' | 'classic';

// M18: Somatic Tether
export type SomaticStatus = 'disconnected' | 'calibrating' | 'active' | 'stress';

// M19: Reactor Core
export type MintStatus = 'idle' | 'collecting-signatures' | 'minting' | 'success' | 'error';

// M20: Spatial Mesh
export type SpatialTransport = 'web-bluetooth' | 'websocket' | 'none';

// M21: K4 Handshake
export interface K4Edge {
  from: string;
  to: string;
  timestamp: number;
  signature: string;
}

export interface SovereignState {
  viewMode: ViewMode;
  activeRoom: SovereignRoom;
  openOverlay: SovereignRoom | string | null;
  pwaStatus: string;
  audioEnabled: boolean;
  coherence: number;
  noiseFloor: number;
  didKey: string;
  ucanStatus: string;
  isGeneratingIdentity: boolean;
  crdtVersion: number;
  telemetryHashes: string[];
  bleStatus: string;
  loraNodes: number;
  // NodeContext bridge fields (synced from useNode)
  spoons: number;
  maxSpoons: number;
  tier: string;
  love: number;
  nodeId: string | null;
  structureCount: number;
  challengeName: string | null;
  // Centaur Engine state
  centaurStatus: CentaurStatus;
  centaurLastOutput: string;
  // Genesis Sync state
  genesisSyncStatus: GenesisSyncStatus;
  // Dynamic slot hydration (Jitterbug Mount)
  dynamicSlots: Record<number, { name: string } | null>;

  // M18: Somatic Tether
  somaticTetherStatus: SomaticStatus;
  fawnGuardActive: boolean;
  somaticHr: number;
  somaticHrv: number;
  somaticWaveform: number[];

  // M20: Spatial Mesh
  spatialNodes: number;
  spatialTransport: SpatialTransport;
  handshakeCandidate: string | null;
  spatialNodeList: Array<{ id: string; rssi: number; valency: number; flags: number }>;

  // M21: K4 Handshake
  k4Graph: { nodes: string[]; edges: K4Edge[] };
  handshakeActive: boolean;
  handshakePartnerDID: string | null;

  // M19: Reactor Core
  mintStatus: MintStatus;
  lastMintNonce: string | null;

  // Lock screen (boot sequence)
  shipLocked: boolean;

  // Actions (existing)
  setPwaStatus: (status: string) => void;
  toggleView: () => void;
  initAudio: () => void;
  setOverlay: (roomId: SovereignRoom | string | null) => void;
  initIdentity: () => Promise<void>;
  connectBLE: () => Promise<void>;
  appendTelemetry: () => Promise<void>;
  exportLedger: () => void;
  setCentaurStatus: (status: CentaurStatus, output?: string) => void;
  setGenesisSyncStatus: (status: GenesisSyncStatus) => void;
  mountToSlot: (slot: number, name: string) => void;
  unmountSlot: (slot: number) => void;

  // Actions (M18: Somatic Tether)
  setSomaticStatus: (status: SomaticStatus) => void;
  setFawnGuard: (active: boolean) => void;
  setSomaticHr: (hr: number) => void;
  setSomaticHrv: (hrv: number) => void;
  setSomaticWaveform: (buf: number[]) => void;

  // Actions (M20: Spatial Mesh)
  setSpatialNodes: (count: number) => void;
  setSpatialTransport: (t: SpatialTransport) => void;
  setHandshakeCandidate: (id: string | null) => void;
  setSpatialNodeList: (nodes: Array<{ id: string; rssi: number; valency: number; flags: number }>) => void;

  // Actions (M21: K4 Handshake)
  addK4Edge: (edge: K4Edge) => void;
  setHandshakeActive: (active: boolean) => void;
  setHandshakePartner: (did: string | null) => void;

  // Actions (M19: Reactor Core)
  setMintStatus: (status: MintStatus) => void;
  setLastMintNonce: (nonce: string | null) => void;

  // Lock screen
  unlockShip: () => void;
}
