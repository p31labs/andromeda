// src/sovereign/hardware.ts — Hardware command protocol (CBOR/JSON)
// Universal transport interface for BLE/WebSocket communication with ESP32-S3

export interface HardwareTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(data: Uint8Array): Promise<void>;
  onReceive(handler: (data: Uint8Array) => void): void;
  isConnected(): boolean;
}

// Hardware command types based on P31 specification
export const CMD = {
  HAPTIC:     0x01,  // { effect: uint8, intensity: uint8 }
  SE050_SIGN: 0x02,  // { data: bytes } → { signature: bytes }
  LORA_SEND:  0x03,  // { portnum: uint16, payload: bytes }
  LORA_RECV:  0x04,  // (notification from ESP32)
  STATUS:     0x05,  // → { battery: uint8, rssi: int8, meshNodes: uint8 }
  SYNC_DELTA: 0x06,  // { delta: bytes } — CRDT sync message
  GENESIS_HASH: 0x07, // → { hash: bytes } — Current Genesis Block hash
} as const;

// Hardware status interface
export interface HardwareStatus {
  battery: number;      // 0-100%
  rssi: number;        // Signal strength in dBm
  meshNodes: number;   // Number of nodes in LoRa mesh
  uptime: number;      // Seconds since boot
  temperature?: number; // Chip temperature in °C
}

// Haptic effect definitions (mapped to DRV2605L library waveforms)
export const HAPTIC_EFFECTS = {
  CLICK: 1,
  BUZZ: 2,
  PULSE: 3,
  DOUBLE_CLICK: 4,
  TRIPLE_CLICK: 5,
  RAMP_UP: 6,
  RAMP_DOWN: 7,
  HEARTBEAT: 8,
  ALERT: 9,
  CONFIRMATION: 10,
} as const;

export type HapticEffect = number;

// Command encoding/decoding utilities
export function encodeCommand(cmd: number, payload: Uint8Array): Uint8Array {
  // Simple TLV: [cmd_byte][length_u16_be][payload]
  const buf = new Uint8Array(3 + payload.length);
  buf[0] = cmd;
  buf[1] = (payload.length >> 8) & 0xff;
  buf[2] = payload.length & 0xff;
  buf.set(payload, 3);
  return buf;
}

export function decodeCommand(data: Uint8Array): { cmd: number; payload: Uint8Array } | null {
  if (data.length < 3) return null;
  
  const cmd = data[0];
  const length = (data[1] << 8) | data[2];
  
  if (data.length !== 3 + length) return null;
  
  return {
    cmd,
    payload: data.slice(3),
  };
}

// Specific command constructors
export function encodeHapticCommand(effect: HapticEffect, intensity: number = 100): Uint8Array {
  // intensity: 0-100%
  const intensityByte = Math.max(0, Math.min(255, Math.round(intensity * 2.55)));
  return encodeCommand(CMD.HAPTIC, new Uint8Array([effect, intensityByte]));
}

export function encodeSignCommand(data: Uint8Array): Uint8Array {
  return encodeCommand(CMD.SE050_SIGN, data);
}

export function encodeLoRaCommand(portnum: number, payload: Uint8Array): Uint8Array {
  // portnum: 0-65535 (256 for CRDT deltas per spec)
  const header = new Uint8Array(2);
  header[0] = (portnum >> 8) & 0xff;
  header[1] = portnum & 0xff;
  
  const combined = new Uint8Array(header.length + payload.length);
  combined.set(header);
  combined.set(payload, header.length);
  
  return encodeCommand(CMD.LORA_SEND, combined);
}

export function encodeSyncDelta(delta: Uint8Array): Uint8Array {
  return encodeCommand(CMD.SYNC_DELTA, delta);
}

// Response decoders
export function decodeStatusResponse(payload: Uint8Array): HardwareStatus | null {
  if (payload.length < 4) return null;
  
  return {
    battery: payload[0],
    rssi: (payload[1] << 24 >> 24), // Sign-extend 8-bit signed
    meshNodes: payload[2],
    uptime: (payload[3] << 24) | (payload[4] << 16) | (payload[5] << 8) | payload[6],
    temperature: payload.length > 7 ? payload[7] - 40 : undefined, // -40 to +215°C
  };
}

export function decodeSignatureResponse(payload: Uint8Array): Uint8Array | null {
  // SE050 signatures are 64 bytes for Ed25519
  if (payload.length !== 64) return null;
  return payload;
}

// Hardware transport implementations
export class WebBLETransport implements HardwareTransport {
  private device: BluetoothDevice | null = null;
  private txChar: BluetoothRemoteGATTCharacteristic | null = null;
  private rxChar: BluetoothRemoteGATTCharacteristic | null = null;
  private receiveHandler: ((data: Uint8Array) => void) | null = null;
  private connected = false;

  // Nordic UART Service UUIDs
  static NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  static NUS_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify
  static NUS_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write

  async connect(): Promise<void> {
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [WebBLETransport.NUS_SERVICE] }],
        optionalServices: [WebBLETransport.NUS_SERVICE],
      });

      const server = await this.device.gatt!.connect();
      const service = await server.getPrimaryService(WebBLETransport.NUS_SERVICE);
      this.txChar = await service.getCharacteristic(WebBLETransport.NUS_TX);
      this.rxChar = await service.getCharacteristic(WebBLETransport.NUS_RX);

      // Start notifications
      await this.txChar.startNotifications();
      this.txChar.addEventListener('characteristicvaluechanged', (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (value && this.receiveHandler) {
          this.receiveHandler(new Uint8Array(value.buffer));
        }
      });

      this.connected = true;
      console.log('BLE connected, MTU:', await this.getMTU());
    } catch (error) {
      console.error('BLE connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.txChar = null;
    this.rxChar = null;
    this.connected = false;
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.rxChar) throw new Error('Not connected');
    
    // Fragment to MTU size (20 bytes default, 247 if negotiated)
    const MTU = await this.getMTU();
    for (let i = 0; i < data.length; i += MTU) {
      const chunk = data.slice(i, i + MTU);
      await this.rxChar.writeValueWithResponse(chunk);
    }
  }

  onReceive(handler: (data: Uint8Array) => void): void {
    this.receiveHandler = handler;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async getMTU(): Promise<number> {
    // Default BLE MTU is 23 bytes (20 payload)
    // ESP32-S3 can negotiate up to 247
    // For now, assume default until we implement MTU negotiation
    return 20;
  }
}

export class WebSocketTransport implements HardwareTransport {
  private ws: WebSocket | null = null;
  private receiveHandler: ((data: Uint8Array) => void) | null = null;
  private connected = false;

  constructor(private url: string = 'ws://192.168.4.1/ws') {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.connected = true;
        resolve();
      };
      
      this.ws.onclose = () => {
        this.connected = false;
      };
      
      this.ws.onerror = (error) => {
        reject(error);
      };
      
      this.ws.onmessage = (event) => {
        if (this.receiveHandler) {
          if (event.data instanceof ArrayBuffer) {
            this.receiveHandler(new Uint8Array(event.data));
          } else if (typeof event.data === 'string') {
            // Convert string to Uint8Array
            this.receiveHandler(new TextEncoder().encode(event.data));
          } else {
            console.warn('Unknown message type:', typeof event.data);
          }
        }
      };
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    // Send as ArrayBuffer
    this.ws.send(data);
  }

  onReceive(handler: (data: Uint8Array) => void): void {
    this.receiveHandler = handler;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Runtime transport detection
export function createTransport(): HardwareTransport {
  const globalWindow = window as typeof window & { __TAURI__?: unknown };
  if (globalWindow.__TAURI__) {
    // Phase 4: Tauri native BLE
    console.log('Using Tauri transport (Phase 4)');
    // TODO: Import and return TauriBLETransport
    return new WebSocketTransport(); // Fallback for now
  }
  
  if ('bluetooth' in navigator) {
    console.log('Using Web Bluetooth transport (Phase 1)');
    return new WebBLETransport();
  }
  
  console.log('Using WebSocket transport (Phase 2 - WiFi AP)');
  return new WebSocketTransport();
}

// Import UCAN type
import type { SignedUCAN, P31Capability } from './ucan';

// Hardware manager for coordinating all hardware interactions
export class HardwareManager {
  private transport: HardwareTransport;
  private ucan: SignedUCAN | null = null;
  private statusCallbacks: ((status: HardwareStatus) => void)[] = [];
  private syncCallbacks: ((delta: Uint8Array) => void)[] = [];

  constructor() {
    this.transport = createTransport();
    this.transport.onReceive(this.handleReceive.bind(this));
  }

  async connect(): Promise<void> {
    await this.transport.connect();
    
    // Request initial status
    await this.requestStatus();
    
    // Set up periodic status updates (every 30 seconds)
    setInterval(() => this.requestStatus(), 30000);
  }

  async disconnect(): Promise<void> {
    await this.transport.disconnect();
  }

  isConnected(): boolean {
    return this.transport.isConnected();
  }

  async triggerHaptic(effect: HapticEffect, intensity: number = 100): Promise<void> {
    const cmd = encodeHapticCommand(effect, intensity);
    await this.transport.send(cmd);
  }

  async signData(data: Uint8Array): Promise<Uint8Array> {
    const cmd = encodeSignCommand(data);
    await this.transport.send(cmd);
    
    // Wait for signature response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Sign timeout')), 10000);
      
      // TODO: Implement proper response routing with correlation IDs
      // For now, we'll assume immediate response
      // In real implementation, register temporary handler
      // and remove after response received
      
      // Placeholder - in real implementation, we'd listen for response
      // For now, just reject after timeout
    });
  }

  async sendLoRaMessage(portnum: number, payload: Uint8Array): Promise<void> {
    const cmd = encodeLoRaCommand(portnum, payload);
    await this.transport.send(cmd);
  }

  async sendSyncDelta(delta: Uint8Array): Promise<void> {
    const cmd = encodeSyncDelta(delta);
    await this.transport.send(cmd);
  }

  async requestStatus(): Promise<void> {
    const cmd = encodeCommand(CMD.STATUS, new Uint8Array(0));
    await this.transport.send(cmd);
  }

  onStatusUpdate(callback: (status: HardwareStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  onSyncDelta(callback: (delta: Uint8Array) => void): void {
    this.syncCallbacks.push(callback);
  }

  private handleReceive(data: Uint8Array): void {
    const decoded = decodeCommand(data);
    if (!decoded) {
      console.warn('Received invalid command frame');
      return;
    }

    switch (decoded.cmd) {
      case CMD.STATUS: {
        const status = decodeStatusResponse(decoded.payload);
        if (status) {
          this.statusCallbacks.forEach(cb => cb(status));
        }
        break;
      }
      
      case CMD.LORA_RECV:
        // LoRa message received from mesh
        console.log('LoRa message received:', decoded.payload);
        break;
      
      case CMD.SYNC_DELTA:
        // CRDT sync delta from another node
        this.syncCallbacks.forEach(cb => cb(decoded.payload));
        break;
      
      case CMD.GENESIS_HASH:
        // Genesis Block hash from hardware
        console.log('Genesis Block hash:', decoded.payload);
        break;
      
      default:
        console.log('Received command:', decoded.cmd, 'payload:', decoded.payload);
    }
  }

  setUCAN(ucan: SignedUCAN | null): void {
    this.ucan = ucan;
  }

  hasCapability(capability: P31Capability): boolean {
    // Check UCAN for capability
    // TODO: Integrate with UCAN verification
    return this.ucan !== null; // For development, just check if UCAN exists
  }
}