import { create } from 'zustand';
import type { SovereignState, SovereignRoom, K4Edge } from './types';
import { SOVEREIGN_ROOMS } from './types';
import { audioEngine, generateDID, hashTelemetry, exportLedgerJSON } from '@p31/shared/sovereign';

export const useSovereignStore = create<SovereignState>((set, get) => ({
  viewMode: 'cockpit',
  activeRoom: 'OBSERVATORY',
  openOverlay: null,
  pwaStatus: 'INITIALIZING...',
  audioEnabled: false,
  coherence: 0.99,
  noiseFloor: 0.05,
  didKey: 'UNINITIALIZED',
  ucanStatus: 'WAITING FOR HARDWARE ROOT',
  isGeneratingIdentity: false,
  crdtVersion: 0,
  telemetryHashes: [],
  bleStatus: 'DISCONNECTED',
  loraNodes: 0,
  // NodeContext bridge
  spoons: 12,
  maxSpoons: 12,
  tier: 'FULL',
  love: 0,
  nodeId: null,
  structureCount: 0,
  challengeName: null,
  // Centaur Engine
  centaurStatus: 'IDLE',
  centaurLastOutput: '',
  // Genesis Sync
  genesisSyncStatus: 'offline',
  // Dynamic slot hydration
  dynamicSlots: {},

  // M18: Somatic Tether
  somaticTetherStatus: 'disconnected',
  fawnGuardActive: false,
  somaticHr: 0,
  somaticHrv: 0,
  somaticWaveform: [],

  // M20: Spatial Mesh
  spatialNodes: 0,
  spatialTransport: 'none',
  handshakeCandidate: null,
  spatialNodeList: [],

  // M21: K4 Handshake
  k4Graph: { nodes: [], edges: [] },
  handshakeActive: false,
  handshakePartnerDID: null,

  // M19: Reactor Core
  mintStatus: 'idle',
  lastMintNonce: null,

  // D1.1: Polymorphic Skin Engine
  skinTheme: 'OPERATOR',

  // D4.6: Sierpinski Progressive Disclosure
  interactedSlots: [],
  sierpinskiDepth: 0,

  // D2.1: Tri-State Camera
  cameraMode: 'free',
  activeScreenIdx: 0,

  // Lock screen (boot sequence)
  shipLocked: true,

  setPwaStatus: (status) => set({ pwaStatus: status }),
  toggleView: () => set((state) => ({ viewMode: state.viewMode === 'cockpit' ? 'classic' : 'cockpit' })),

  initAudio: () => {
    audioEngine.init();
    if (audioEngine.ctx?.state === 'suspended') audioEngine.ctx.resume();
    set({ audioEnabled: true });
  },

  setOverlay: (roomId) => {
    // null or OBSERVATORY → go home
    if (roomId === null || roomId === 'OBSERVATORY') {
      set({ openOverlay: null });
      return;
    }
    const current = get().openOverlay;
    // Toggle: same room closes overlay
    if (roomId === current) {
      set({ openOverlay: null });
    } else if ((SOVEREIGN_ROOMS as readonly string[]).includes(roomId) || (typeof roomId === 'string' && roomId.startsWith('SLOT_'))) {
      set({ openOverlay: roomId as SovereignRoom });
      // D4.6: Track slot interaction for progressive disclosure
      const slotMap: Record<string, number> = {
        OBSERVATORY: 1, COLLIDER: 2, BONDING: 3, BRIDGE: 4, BUFFER: 5,
        COPILOT: 6, LANDING: 7, RESONANCE: 8, FORGE: 9,
      };
      const slot = slotMap[roomId];
      if (slot !== undefined) {
        get().markSlotInteracted(slot);
      }
    }
  },

  initIdentity: async () => {
    set({ isGeneratingIdentity: true, ucanStatus: 'GENERATING Ed25519 VIA WebCrypto...' });
    try {
      const didKey = await generateDID();
      setTimeout(() => {
        set({ didKey, ucanStatus: 'DELEGATION GRANTED (SE050 -> BROWSER)', isGeneratingIdentity: false });
      }, 2000);
    } catch {
      set({ ucanStatus: 'ERR: CRYPTO NOT AVAILABLE', isGeneratingIdentity: false });
    }
  },

  connectBLE: async () => {
    set({ bleStatus: 'REQUESTING GATT SERVER...' });
    setTimeout(() => set({ bleStatus: 'CONNECTED: ESP32-S3 (SIMULATED)', loraNodes: Math.floor(Math.random() * 8) + 3 }), 1200);
  },

  appendTelemetry: async () => {
    if (get().didKey === 'UNINITIALIZED') {
      set({ coherence: 0.2, noiseFloor: 0.8 });
      setTimeout(() => set({ coherence: 0.99, noiseFloor: 0.05 }), 1000);
      return;
    }
    const hashHex = await hashTelemetry(get().didKey, get().activeRoom);
    set((state) => ({ crdtVersion: state.crdtVersion + 1, telemetryHashes: [hashHex, ...state.telemetryHashes].slice(0, 8), coherence: 0.8 }));
    setTimeout(() => set({ coherence: 1.0 }), 200);
  },

  exportLedger: () => {
    const state = get();
    exportLedgerJSON(state.didKey, state.telemetryHashes);
  },

  setCentaurStatus: (status, output) => set({
    centaurStatus: status,
    ...(output !== undefined && { centaurLastOutput: output }),
  }),

  setGenesisSyncStatus: (status) => set({ genesisSyncStatus: status }),

  mountToSlot: (slot, name) => set((state) => ({
    dynamicSlots: { ...state.dynamicSlots, [slot]: { name } },
  })),

  unmountSlot: (slot) => set((state) => {
    const next = { ...state.dynamicSlots };
    next[slot] = null;
    return { dynamicSlots: next };
  }),

  // M18: Somatic Tether actions
  setSomaticStatus: (status) => set({ somaticTetherStatus: status }),
  setFawnGuard: (active) => set({ fawnGuardActive: active }),
  setSomaticHr: (hr) => set({ somaticHr: hr }),
  setSomaticHrv: (hrv) => set({ somaticHrv: hrv }),
  setSomaticWaveform: (buf) => set({ somaticWaveform: buf }),

  // M20: Spatial Mesh actions
  setSpatialNodes: (count) => set({ spatialNodes: count }),
  setSpatialTransport: (t) => set({ spatialTransport: t }),
  setHandshakeCandidate: (id) => set({ handshakeCandidate: id }),
  setSpatialNodeList: (nodes) => set({ spatialNodeList: nodes }),

  // M21: K4 Handshake actions
  addK4Edge: (edge) => set((state) => {
    const nodes = new Set(state.k4Graph.nodes);
    nodes.add(edge.from);
    nodes.add(edge.to);
    return {
      k4Graph: {
        nodes: Array.from(nodes),
        edges: [...state.k4Graph.edges, edge],
      },
    };
  }),
  setHandshakeActive: (active) => set({ handshakeActive: active }),
  setHandshakePartner: (did) => set({ handshakePartnerDID: did }),

  // M19: Reactor Core actions
  setMintStatus: (status) => set({ mintStatus: status }),
  setLastMintNonce: (nonce) => set({ lastMintNonce: nonce }),

  // D1.1: Polymorphic Skin Engine
  setSkinTheme: (theme) => {
    set({ skinTheme: theme });
    // D1.4: Sync DOM data-theme attribute
    if (typeof document !== 'undefined') {
      document.body.dataset.theme = theme.toLowerCase().replace('_', '-');
    }
  },

  // D4.6: Sierpinski Progressive Disclosure
  markSlotInteracted: (slot) => set((state) => ({
    interactedSlots: state.interactedSlots.includes(slot)
      ? state.interactedSlots
      : [...state.interactedSlots, slot],
  })),
  setSierpinskiDepth: (depth) => set({ sierpinskiDepth: Math.max(0, Math.min(2, depth)) }),

  // D2.1: Tri-State Camera
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setActiveScreenIdx: (idx) => set({ activeScreenIdx: Math.max(0, Math.min(2, idx)) }),

  // Lock screen
  unlockShip: () => set({ shipLocked: false }),
}));
