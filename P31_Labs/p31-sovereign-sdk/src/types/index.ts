export type Room = 'OBSERVATORY' | 'COLLIDER' | 'BONDING' | 'BRIDGE' | 'BUFFER';

export const ROOMS: readonly Room[] = ['OBSERVATORY', 'COLLIDER', 'BONDING', 'BRIDGE', 'BUFFER'];

export type ViewMode = 'cockpit' | 'classic';

export interface SovereignState {
  viewMode: ViewMode;
  activeRoom: Room;
  targetRoom: Room | null;
  isRoomTransitioning: boolean;
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
  setPwaStatus: (status: string) => void;
  toggleView: () => void;
  initAudio: () => void;
  navigateRoom: (roomId: string) => void;
  initIdentity: () => Promise<void>;
  connectBLE: () => Promise<void>;
  appendTelemetry: () => Promise<void>;
  exportLedger: () => void;
}
