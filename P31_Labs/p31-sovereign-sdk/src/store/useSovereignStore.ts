import { create } from 'zustand';
import type { SovereignState, Room } from '../types';
import { ROOMS } from '../types';
import { audioEngine } from '../lib/AudioEngine';
import { generateDID } from '../lib/crypto';
import { hashTelemetry } from '../lib/ledger';
import { exportLedgerJSON } from '../lib/export';

export const useSovereignStore = create<SovereignState>((set, get) => ({
  viewMode: 'cockpit',
  activeRoom: 'OBSERVATORY',
  targetRoom: null,
  isRoomTransitioning: false,
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

  setPwaStatus: (status) => set({ pwaStatus: status }),
  toggleView: () => set((state) => ({ viewMode: state.viewMode === 'cockpit' ? 'classic' : 'cockpit' })),

  initAudio: () => {
    audioEngine.init();
    if (audioEngine.ctx?.state === 'suspended') audioEngine.ctx.resume();
    set({ audioEnabled: true });
  },

  navigateRoom: (roomId) => {
    if (get().activeRoom === roomId || get().isRoomTransitioning || !(ROOMS as readonly string[]).includes(roomId)) return;
    set({ isRoomTransitioning: true, targetRoom: roomId as Room, noiseFloor: 0.5, coherence: 0.2 });
    setTimeout(() => {
      if (roomId === 'BUFFER') {
        set({ activeRoom: roomId as Room, targetRoom: null, isRoomTransitioning: false, noiseFloor: 0.0, coherence: 1.0 });
      } else {
        set({ activeRoom: roomId as Room, targetRoom: null, isRoomTransitioning: false, noiseFloor: 0.05, coherence: 0.99 });
      }
    }, 800);
  },

  initIdentity: async () => {
    if (get().isRoomTransitioning) return;
    set({ isGeneratingIdentity: true, ucanStatus: 'GENERATING Ed25519 VIA WebCrypto...' });
    if (get().activeRoom !== 'BONDING') get().navigateRoom('BONDING');
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
    if (get().isRoomTransitioning) return;
    set({ bleStatus: 'REQUESTING GATT SERVER...' });
    if (get().activeRoom !== 'BRIDGE') get().navigateRoom('BRIDGE');
    setTimeout(() => set({ bleStatus: 'CONNECTED: ESP32-S3 (SIMULATED)', loraNodes: Math.floor(Math.random() * 8) + 3 }), 1200);
  },

  appendTelemetry: async () => {
    if (get().isRoomTransitioning) return;
    if (get().didKey === 'UNINITIALIZED') {
      set({ coherence: 0.2, noiseFloor: 0.8 });
      setTimeout(() => set({ coherence: 0.99, noiseFloor: 0.05 }), 1000);
      return;
    }
    if (get().activeRoom !== 'COLLIDER') get().navigateRoom('COLLIDER');
    const hashHex = await hashTelemetry(get().didKey, get().activeRoom);
    setTimeout(() => {
      set((state) => ({ crdtVersion: state.crdtVersion + 1, telemetryHashes: [hashHex, ...state.telemetryHashes].slice(0, 8), coherence: 0.8 }));
      setTimeout(() => set({ coherence: 1.0 }), 200);
    }, get().activeRoom !== 'COLLIDER' ? 800 : 0);
  },

  exportLedger: () => {
    const state = get();
    exportLedgerJSON(state.didKey, state.telemetryHashes);
  }
}));
