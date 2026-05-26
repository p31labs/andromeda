// src/sovereign/websocket-server.ts
// Phase 2: WebSocket server simulation for ESP32 WiFi AP
// Simulates the ESP32 WebSocket server (ws://192.168.4.1/ws) when offline

import { EventEmitter } from "eventemitter3";
import type {
  NetworkAdapterInterface,
  PeerMetadata,
  Message,
  PeerId,
} from "@automerge/automerge-repo";

export interface WiFiAPStatus {
  ssid: string;
  signalStrength: number; // dBm
  connected: boolean;
  localIp: string;
  clients: number;
}

export interface SimulatedWebSocketConfig {
  enabled: boolean;
  autoConnect: boolean;
  reconnectInterval: number; // ms
  maxReconnectAttempts: number;
  simulateLatency: boolean;
  latencyRange: [number, number]; // min, max ms
}

export class SimulatedWebSocketServer extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private messageQueue: Array<{ data: Uint8Array; timestamp: number }> = [];
  private config: SimulatedWebSocketConfig = {
    enabled: true,
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    simulateLatency: true,
    latencyRange: [10, 100],
  };

  private localServerUrl = 'ws://192.168.4.1/ws';
  private fallbackUrls = [
    'ws://localhost:8080/ws',
    'ws://127.0.0.1:8080/ws',
  ];

  constructor() {
    super();
    if (this.config.autoConnect) {
      this.connect();
    }
  }

  async connect(url?: string): Promise<void> {
    if (!this.config.enabled) {
      console.log('[SimulatedWebSocket] WebSocket simulation disabled');
      return;
    }

    const targetUrl = url || this.detectServerUrl();
    
    try {
      this.ws = new WebSocket(targetUrl);
      
      this.ws.onopen = () => {
        console.log('[SimulatedWebSocket] Connected to', targetUrl);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected', targetUrl);
        
        // Process any queued messages
        this.processMessageQueue();
      };
      
      this.ws.onclose = () => {
        console.log('[SimulatedWebSocket] Disconnected');
        this.isConnected = false;
        this.emit('disconnected');
        
        // Attempt reconnection
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`[SimulatedWebSocket] Reconnection attempt ${this.reconnectAttempts}`);
            this.connect();
          }, this.config.reconnectInterval);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('[SimulatedWebSocket] Error:', error);
        this.emit('error', error);
      };
      
      this.ws.onmessage = (event) => {
        this.handleIncomingMessage(event);
      };
      
    } catch (error) {
      console.error('[SimulatedWebSocket] Connection failed:', error);
      this.emit('error', error);
      
      // Try fallback URL
      if (!url) {
        const fallback = this.fallbackUrls.shift();
        if (fallback) {
          console.log('[SimulatedWebSocket] Trying fallback:', fallback);
          setTimeout(() => this.connect(fallback), 1000);
        }
      }
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.emit('disconnected');
  }

  send(data: Uint8Array): void {
    if (!this.isConnected || !this.ws) {
      console.log('[SimulatedWebSocket] Queueing message (offline)');
      this.messageQueue.push({
        data,
        timestamp: Date.now(),
      });
      return;
    }

    if (this.config.simulateLatency) {
      const latency = Math.random() * 
        (this.config.latencyRange[1] - this.config.latencyRange[0]) + 
        this.config.latencyRange[0];
      
      setTimeout(() => {
        this.sendImmediate(data);
      }, latency);
    } else {
      this.sendImmediate(data);
    }
  }

  private sendImmediate(data: Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Convert Uint8Array to ArrayBuffer for WebSocket.send
      // Create a new ArrayBuffer copy to avoid SharedArrayBuffer issues
      const arrayBuffer = new ArrayBuffer(data.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(data);
      this.ws.send(arrayBuffer);
      this.emit('sent', data);
    }
  }

  private handleIncomingMessage(event: MessageEvent): void {
    const data = event.data;
    let messageData: Uint8Array;
    
    if (data instanceof ArrayBuffer) {
      messageData = new Uint8Array(data);
    } else if (typeof data === 'string') {
      messageData = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      // Convert Blob to ArrayBuffer
      data.arrayBuffer().then(buffer => {
        this.handleIncomingMessage({ data: buffer } as MessageEvent);
      });
      return;
    } else {
      console.warn('[SimulatedWebSocket] Unknown message type:', typeof data);
      return;
    }
    
    this.emit('message', messageData);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const queued = this.messageQueue.shift();
      if (queued) {
        this.send(queued.data);
        console.log(`[SimulatedWebSocket] Sent queued message (queued for ${Date.now() - queued.timestamp}ms)`);
      }
    }
  }

  private detectServerUrl(): string {
    // Check if we're on localhost (development)
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:8080/ws';
    }
    
    // Check if ESP32 WiFi AP is reachable
    // In a real implementation, we'd ping 192.168.4.1
    // For now, return the ESP32 AP URL
    return this.localServerUrl;
  }

  async scanWiFiAPs(): Promise<WiFiAPStatus[]> {
    // Simulate WiFi AP scanning
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            ssid: 'Node-One-AP',
            signalStrength: -45,
            connected: true,
            localIp: '192.168.4.2',
            clients: 1,
          },
          {
            ssid: 'ESP32-Node',
            signalStrength: -60,
            connected: false,
            localIp: '',
            clients: 0,
          },
        ]);
      }, 500);
    });
  }

  isConnectedToAP(): boolean {
    return this.isConnected;
  }

  getConnectionStatus(): { connected: boolean; url: string | null } {
    return {
      connected: this.isConnected,
      url: this.ws ? this.localServerUrl : null,
    };
  }

  setConfig(config: Partial<SimulatedWebSocketConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  clearQueue(): void {
    this.messageQueue = [];
  }
}

// Network adapter for Automerge that uses the simulated WebSocket server
export class WebSocketNetworkAdapter extends EventEmitter implements NetworkAdapterInterface {
  peerId?: PeerId;
  peerMetadata?: PeerMetadata;
  private server: SimulatedWebSocketServer;

  constructor() {
    super();
    this.server = new SimulatedWebSocketServer();
    
    this.server.on('message', (data: Uint8Array) => {
      this.emit('message', data as unknown as Message);
    });
    
    this.server.on('connected', () => {
      this.emit('ready');
    });
    
    this.server.on('disconnected', () => {
      console.log('[WebSocketNetworkAdapter] Server disconnected');
    });
    
    this.server.on('error', (error) => {
      console.error('[WebSocketNetworkAdapter] Error:', error);
    });
  }

  isReady(): boolean {
    return this.server.isConnectedToAP();
  }

  async whenReady(): Promise<void> {
    if (this.isReady()) {
      return;
    }
    return new Promise((resolve) => {
      this.once('ready', () => resolve());
    });
  }

  connect(peerId: PeerId, peerMetadata?: PeerMetadata): void {
    this.peerId = peerId;
    this.peerMetadata = peerMetadata;
    
    // Announce ourselves to the network
    const peerCandidate = {
      peerId: this.peerId,
      peerMetadata: this.peerMetadata,
    };
    
    this.emit('peer-candidate', peerCandidate);
    
    // Connect to server
    this.server.connect();
  }

  send(message: Message): void {
    // Convert Automerge message to Uint8Array
    // This is a simplified version - in reality, we'd serialize properly
    const data = new TextEncoder().encode(JSON.stringify(message));
    this.server.send(data);
  }

  disconnect(): void {
    this.server.disconnect();
  }

  async scanNetworks(): Promise<WiFiAPStatus[]> {
    return this.server.scanWiFiAPs();
  }

  getConnectionStatus() {
    return this.server.getConnectionStatus();
  }
}

// Singleton instance for the app
let globalWebSocketServer: SimulatedWebSocketServer | null = null;

export function getWebSocketServer(): SimulatedWebSocketServer {
  if (!globalWebSocketServer) {
    globalWebSocketServer = new SimulatedWebSocketServer();
  }
  return globalWebSocketServer;
}

export function createWebSocketNetworkAdapter(): WebSocketNetworkAdapter {
  return new WebSocketNetworkAdapter();
}