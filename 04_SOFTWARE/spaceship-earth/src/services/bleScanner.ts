/**
 * @file bleScanner.ts — BLE Threshold Scanner Service
 *
 * P31 Labs — Spatial Proximity Detection
 *
 * Implements zone-based BLE beacon scanning with RSSI threshold detection.
 * Uses moving average (EMA) to prevent signal bounce and dispatches zone
 * transitions when sustained proximity is detected.
 *
 * Features:
 *   - Eddystone-UID and iBeacon support for p31ca namespace
 *   - RSSI moving average calculation (configurable alpha)
 *   - Sustained threshold detection (3 seconds by default)
 *   - Zone transition events dispatched to Zustand store
 *
 * Requires: chrome://flags/#enable-experimental-web-platform-features
 */

import { create } from 'zustand';
import { emaSmooth } from './spatialScanner';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type BeaconType = 'eddystone-uid' | 'ibeacon' | 'unknown';

export interface BeaconInfo {
  id: string;
  type: BeaconType;
  rssi: number;
  rssiSmoothed: number;
  txPower: number;
  namespace?: string;   // Eddystone namespace (10 bytes hex)
  instance?: string;   // Eddystone instance (6 bytes hex)
  uuid?: string;       // iBeacon UUID
  major?: number;
  minor?: number;
  lastSeen: number;
  sustainedAbove: number | null;  // Timestamp when RSSI first exceeded threshold
}

export interface ZoneTransition {
  type: 'ZONE_TRANSITION' | 'ZONE_EXIT';
  beaconId: string;
  zone: 'IMMEDIATE' | 'NEAR' | 'FAR';
  rssi: number;
  timestamp: number;
  uuid?: string;  // Full beacon UUID for p31ca namespace
}

// P31CA namespace prefix (first 6 bytes of namespace for matching)
const P31_NAMESPACE_PREFIX = 'p31ca';

// RSSI thresholds (dBm)
const RSSI_IMMEDIATE = -60;  // Strong signal (< 1m)
const RSSI_NEAR = -70;        // Moderate signal (< 3m)
const RSSI_FAR = -80;         // Weak signal (< 10m)

// Sustained threshold duration (ms)
const SUSTAINED_DURATION = 3000;

// Moving average alpha (higher = more responsive)
const EMA_ALPHA = 0.3;

// ─────────────────────────────────────────────────────────────────
// BLE Scanner Store
// ─────────────────────────────────────────────────────────────────

interface BLEScannerState {
  // Scanner status
  isScanning: boolean;
  isSupported: boolean;
  error: string | null;
  
  // Discovered beacons (by ID)
  beacons: Map<string, BeaconInfo>;
  
  // Active zones (beacons currently above threshold)
  activeZones: Map<string, 'IMMEDIATE' | 'NEAR' | 'FAR'>;
  
  // Transition callbacks
  onTransition: ((transition: ZoneTransition) => void) | null;
  
  // Actions
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  setTransitionCallback: (cb: (transition: ZoneTransition) => void) => void;
  getBeacon: (id: string) => BeaconInfo | undefined;
  getActiveBeacons: () => BeaconInfo[];
  
  // Internal: process scan result
  _processScanResult: (result: RawScanResult) => void;
}

// ─────────────────────────────────────────────────────────────────
// Raw scan result from Web Bluetooth
// ─────────────────────────────────────────────────────────────────

interface RawScanResult {
  id: string;
  rssi: number;
  manufacturerData?: Uint8Array;
}

// ─────────────────────────────────────────────────────────────────
// Beacon Parsing
// ─────────────────────────────────────────────────────────────────

/**
 * Parse Eddystone-UID from manufacturer data
 * Eddystone-UID frame format:
 *   Byte 0: Frame type (0x00 = UID)
 *   Byte 1: TX Power at 0m
 *   Bytes 2-11: 10-byte namespace
 *   Bytes 12-17: 6-byte instance ID
 *   Byte 18+: RFU (should be 0x00)
 */
function parseEddystone(data: Uint8Array): BeaconInfo | null {
  if (data.length < 18 || data[0] !== 0x00) return null;
  
  const txPower = data[1] - 256;  // Signed byte
  const namespace = Array.from(data.slice(2, 12))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const instance = Array.from(data.slice(12, 18))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return {
    id: `${namespace}:${instance}`,
    type: 'eddystone-uid',
    rssi: 0,  // Will be set by caller
    rssiSmoothed: 0,
    txPower,
    namespace,
    instance,
    lastSeen: Date.now(),
    sustainedAbove: null,
  };
}

/**
 * Parse iBeacon from manufacturer data
 * iBeacon frame format:
 *   Bytes 0-1: 0x02 0x15 (iBeacon prefix)
 *   Bytes 2-17: 16-byte UUID
 *   Bytes 18-19: Major (big-endian)
 *   Bytes 20-21: Minor (big-endian)
 *   Byte 22: TX Power at 1m
 */
function parseIBeacon(data: Uint8Array): BeaconInfo | null {
  if (data.length < 23 || data[0] !== 0x02 || data[1] !== 0x15) return null;
  
  const uuid = Array.from(data.slice(2, 18))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('-');
  const major = (data[18] << 8) | data[19];
  const minor = (data[20] << 8) | data[21];
  const txPower = data[22] - 256;  // Signed byte
  
  // Generate ID from UUID + major + minor
  const id = `${uuid}-${major}-${minor}`;
  
  return {
    id,
    type: 'ibeacon',
    rssi: 0,
    rssiSmoothed: 0,
    txPower,
    uuid,
    major,
    minor,
    lastSeen: Date.now(),
    sustainedAbove: null,
  };
}

/**
 * Parse manufacturer data to extract beacon info
 */
function parseManufacturerData(data?: Uint8Array): BeaconInfo | null {
  if (!data || data.length < 2) return null;
  
  // Try Eddystone first
  const eddystone = parseEddystone(data);
  if (eddystone) return eddystone;
  
  // Try iBeacon
  const ibeacon = parseIBeacon(data);
  if (ibeacon) return ibeacon;
  
  return null;
}

/**
 * Check if beacon matches p31ca namespace
 */
function isP31Beacon(beacon: BeaconInfo): boolean {
  if (beacon.type === 'eddystone-uid' && beacon.namespace) {
    return beacon.namespace.startsWith(P31_NAMESPACE_PREFIX);
  }
  if (beacon.type === 'ibeacon' && beacon.uuid) {
    // p31ca UUIDs start with specific prefix (configurable)
    return beacon.uuid.startsWith('p31ca');
  }
  return true;  // Allow all beacons in dev mode
}

// ─────────────────────────────────────────────────────────────────
// Zone Detection
// ─────────────────────────────────────────────────────────────────

/**
 * Determine zone based on smoothed RSSI
 */
function getZone(rssi: number): 'IMMEDIATE' | 'NEAR' | 'FAR' {
  if (rssi >= RSSI_IMMEDIATE) return 'IMMEDIATE';
  if (rssi >= RSSI_NEAR) return 'NEAR';
  return 'FAR';
}

// ─────────────────────────────────────────────────────────────────
// Zustand Store
// ─────────────────────────────────────────────────────────────────

export const useBLEScannerStore = create<BLEScannerState>((set, get) => ({
  isScanning: false,
  isSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
  error: null,
  beacons: new Map(),
  activeZones: new Map(),
  onTransition: null,
  
  /**
   * Start BLE scanning
   */
  startScanning: async () => {
    const state = get();
    if (state.isScanning) return;
    if (!state.isSupported) {
      set({ error: 'Web Bluetooth not supported' });
      return;
    }
    
    try {
      const bt = navigator.bluetooth as any;
      
      // Check if requestLEScan is available
      if (typeof bt.requestLEScan !== 'function') {
        throw new Error('Web Bluetooth Scanning API not available. Enable chrome://flags/#enable-experimental-web-platform-features');
      }
      
      // Request BLE scan with filters for p31ca beacons
      await bt.requestLEScan({
        acceptAllAdvertisements: true,
        // Could filter by services, but we want all for now
      });
      
      // Add event listener
      bt.addEventListener('advertisementreceived', handleAdvertisement);
      
      set({ isScanning: true, error: null });
      console.log('[BLEScanner] Scanning started');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, isScanning: false });
      console.error('[BLEScanner] Start failed:', errorMessage);
    }
  },
  
  /**
   * Stop BLE scanning
   */
  stopScanning: () => {
    const bt = navigator.bluetooth as any;
    if (bt) {
      bt.removeEventListener('advertisementreceived', handleAdvertisement);
    }
    set({ isScanning: false });
    console.log('[BLEScanner] Scanning stopped');
  },
  
  /**
   * Set transition callback
   */
  setTransitionCallback: (cb) => {
    set({ onTransition: cb });
  },
  
  /**
   * Get beacon by ID
   */
  getBeacon: (id) => {
    return get().beacons.get(id);
  },
  
  /**
   * Get all active beacons (above FAR threshold)
   */
  getActiveBeacons: () => {
    const { beacons } = get();
    return Array.from(beacons.values()).filter(b => b.rssiSmoothed >= RSSI_FAR);
  },
  
  /**
   * Process raw scan result
   */
  _processScanResult: (result: RawScanResult) => {
    const { beacons, activeZones, onTransition } = get();
    const now = Date.now();
    
    // Parse manufacturer data
    const parsed = parseManufacturerData(result.manufacturerData);
    if (!parsed) return;
    
    // Get or create beacon entry
    let beacon = beacons.get(parsed.id);
    if (!beacon) {
      beacon = {
        ...parsed,
        rssi: result.rssi,
        rssiSmoothed: result.rssi,
        lastSeen: now,
        sustainedAbove: null,
      };
    } else {
      // Update RSSI with EMA smoothing
      beacon.rssi = result.rssi;
      beacon.rssiSmoothed = emaSmooth(beacon.rssiSmoothed, result.rssi, EMA_ALPHA);
      beacon.lastSeen = now;
    }
    
    // Check zone transition
    const currentZone = getZone(beacon.rssiSmoothed);
    const previousZone = activeZones.get(beacon.id);
    
    if (currentZone !== previousZone) {
      // Zone changed
      if (currentZone !== 'FAR') {
        // Entering a zone (IMMEDIATE or NEAR)
        
        // Check if sustained
        if (!beacon.sustainedAbove) {
          beacon.sustainedAbove = now;
        } else if (now - beacon.sustainedAbove >= SUSTAINED_DURATION) {
          // Sustained for threshold duration - dispatch transition
          const transition: ZoneTransition = {
            type: 'ZONE_TRANSITION',
            beaconId: beacon.id,
            zone: currentZone,
            rssi: beacon.rssiSmoothed,
            timestamp: now,
            uuid: beacon.uuid ?? beacon.id,
          };
          
          console.log('[BLEScanner] Zone transition:', transition);
          
          // Update active zones
          const newActiveZones = new Map(activeZones);
          newActiveZones.set(beacon.id, currentZone);
          set({ activeZones: newActiveZones });
          
          // Dispatch callback
          if (onTransition) {
            onTransition(transition);
          }
        }
      } else {
        // Exiting to FAR - dispatch exit
        const transition: ZoneTransition = {
          type: 'ZONE_EXIT',
          beaconId: beacon.id,
          zone: 'FAR',
          rssi: beacon.rssiSmoothed,
          timestamp: now,
          uuid: beacon.uuid ?? beacon.id,
        };
        
        console.log('[BLEScanner] Zone exit:', transition);
        
        // Remove from active zones
        const newActiveZones = new Map(activeZones);
        newActiveZones.delete(beacon.id);
        set({ activeZones: newActiveZones });
        
        // Reset sustained timer
        beacon.sustainedAbove = null;
        
        // Dispatch callback
        if (onTransition) {
          onTransition(transition);
        }
      }
    } else {
      // Same zone - check if we need to reset sustained timer
      if (currentZone === 'FAR') {
        beacon.sustainedAbove = null;
      }
    }
    
    // Update beacon in map
    const newBeacons = new Map(beacons);
    newBeacons.set(beacon.id, beacon);
    set({ beacons: newBeacons });
  },
}));

// ─────────────────────────────────────────────────────────────────
// Event Handler (module-level for removal)
// ─────────────────────────────────────────────────────────────────

const handleAdvertisement = (event: any) => {
  const store = useBLEScannerStore.getState();
  if (!store.isScanning) return;
  
  // Extract device info
  const deviceId = event.device?.id ?? 'unknown';
  
  // Get RSSI
  const rssi = event.rssi ?? -100;
  
  // Get manufacturer data
  let manufacturerData: Uint8Array | undefined;
  if (event.manufacturerData) {
    for (const [, value] of event.manufacturerData) {
      manufacturerData = new Uint8Array(value.buffer);
      break;
    }
  }
  
  // Process the result
  store._processScanResult({
    id: deviceId,
    rssi,
    manufacturerData,
  });
};

// ─────────────────────────────────────────────────────────────────
// Mock Scanner for Development/Testing
// ─────────────────────────────────────────────────────────────────

/**
 * Create a mock scanner that simulates BLE beacons
 * Useful for development without hardware
 */
export function createMockScanner(): {
  start: () => void;
  stop: () => void;
  injectBeacon: (id: string, rssi: number) => void;
} {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  
  return {
    start: () => {
      if (intervalId) return;
      
      // Simulate scanning every second
      intervalId = setInterval(() => {
        const store = useBLEScannerStore.getState();
        
        // Inject mock beacons
        // Simulate a beacon at -55 dBm (IMMEDIATE)
        store._processScanResult({
          id: 'mock:p31ca:0001',
          rssi: -55 + Math.random() * 10 - 5,
          manufacturerData: new Uint8Array([
            0x02, 0x15,  // iBeacon prefix
            0x70, 0x31, 0x63, 0x61,  // p31ca
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x01,  // Major
            0x00, 0x01,  // Minor
            0xC5,        // TX Power (-59)
          ]),
        });
        
      }, 1000);
      
      console.log('[BLEScanner] Mock scanner started');
    },
    
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      console.log('[BLEScanner] Mock scanner stopped');
    },
    
    injectBeacon: (id: string, rssi: number) => {
      const store = useBLEScannerStore.getState();
      store._processScanResult({ id, rssi });
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────

export type { BLEScannerState };
