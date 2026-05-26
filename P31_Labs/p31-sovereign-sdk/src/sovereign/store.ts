import { create } from 'zustand';
import * as THREE from 'three';

// -------------------------------------------------------------------------
// 1. CONSTANTS
// -------------------------------------------------------------------------
export const ROOMS = ['OBSERVATORY', 'COLLIDER', 'BONDING', 'BRIDGE', 'BUFFER'];

// -------------------------------------------------------------------------
// 2. TYPES & INITIAL STATE (P31-OS / WCD-08)
// -------------------------------------------------------------------------

export interface SovereignState {
  pwaStatus: string;
  viewMode: 'cockpit' | 'classic';
  isRoomTransitioning: boolean;
  activeRoom: string;
  targetRoom: string;
  coherence: number;
  noiseFloor: number;
  audioEnabled: boolean;
  crdtVersion: number;
  telemetryHashes: string[];
  bleStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
  loraNodes: number;

  setPwaStatus: (status: string) => void;
  toggleView: () => void;
  navigateRoom: (room: string) => void;
  initAudio: () => void;
  initIdentity: () => void;
  connectBLE: () => void;
  appendTelemetry: (data: string) => void;
  exportLedger: () => void;
}

// Global Audio Engine Instance (singleton for performance)
export const audioEngine = {
  ctx: null as AudioContext | null,
  masterGain: null as GainNode | null, 
  filter: null as BiquadFilterNode | null, 
  oscBase: null as OscillatorNode | null, 
  oscNoise: null as OscillatorNode | null, 
  noiseGain: null as GainNode | null,
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.connect(this.masterGain);

    this.oscBase = this.ctx.createOscillator();
    this.oscBase.type = 'sine';
    this.oscBase.frequency.value = 55;
    this.oscBase.connect(this.filter);
    this.oscBase.start();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.05;
    noiseSource.connect(this.noiseGain);
    this.noiseGain.connect(this.filter);
    noiseSource.start();
  },
  update(coherence: number, transitioning: boolean, room: string) {
    if (!this.ctx || !this.oscBase || !this.filter || !this.noiseGain) return;
    const baseFreq = room === 'CORE' ? 40 : room === 'BUFFER' ? 20 : 55;
    this.oscBase.frequency.setTargetAtTime(baseFreq + (coherence * 20), this.ctx.currentTime, 0.1);
    this.filter.frequency.setTargetAtTime(200 + (coherence * 800), this.ctx.currentTime, 0.2);
    this.noiseGain.gain.setTargetAtTime(transitioning ? 0.2 : 0.05, this.ctx.currentTime, 0.1);
  }
};

export const useSovereignStore = create<SovereignState>((set, get) => ({
  pwaStatus: 'OFFLINE',
  viewMode: 'cockpit',
  isRoomTransitioning: false,
  activeRoom: 'CORE',
  targetRoom: 'CORE',
  coherence: 0.85,
  noiseFloor: 0.12,
  audioEnabled: false,
  crdtVersion: 0,
  telemetryHashes: [],
  bleStatus: 'DISCONNECTED',
  loraNodes: 0,

  setPwaStatus: (status) => set({ pwaStatus: status }),
  toggleView: () => set((state) => ({ viewMode: state.viewMode === 'cockpit' ? 'classic' : 'cockpit' })),
  navigateRoom: (room) => {
    if (get().activeRoom === room) return;
    set({ isRoomTransitioning: true, targetRoom: room });
    setTimeout(() => {
      set({ activeRoom: room, isRoomTransitioning: false, coherence: 0.5 + Math.random() * 0.4 });
    }, 1500);
  },
  initAudio: () => {
    audioEngine.init();
    if (audioEngine.ctx?.state === 'suspended') audioEngine.ctx.resume();
    set({ audioEnabled: true });
  },
  initIdentity: () => {
    const hash = Math.random().toString(16).slice(2, 10);
    set(state => ({ 
      telemetryHashes: [hash, ...state.telemetryHashes].slice(0, 10),
      crdtVersion: state.crdtVersion + 1,
      coherence: Math.min(1.0, state.coherence + 0.05)
    }));
  },
  connectBLE: () => {
    set({ bleStatus: 'CONNECTING' });
    setTimeout(() => set({ bleStatus: 'CONNECTED', loraNodes: Math.floor(Math.random() * 5) + 1 }), 2000);
  },
  appendTelemetry: (data) => {
    set(state => ({ 
      telemetryHashes: [data.slice(0, 8), ...state.telemetryHashes].slice(0, 10),
      crdtVersion: state.crdtVersion + 1
    }));
  },
  exportLedger: () => {
    console.log("Exporting P31 Ledger Group...");
  }
}));
