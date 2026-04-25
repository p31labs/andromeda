/**
 * K4MeshClient — High-level K₄ mesh connectivity for edge nodes and dashboard.
 */

import { connect as hybridConnect, disconnect as hybridDisconnect, ping, isConnected, getTransportType, send as transportSend, HybridTransportEvents, supportsWebTransport } from './hybridTransport';
import { enqueue, drainQueue, queueSize } from './offlineQueue';
import { computeQFactorFromBiometrics, type BiometricInput, type QFactorResult } from '@p31/shared/telemetry';

// ── Domain types ──────────────────────────────────────────────────────

export interface RelayPeer {
  did: string;
  room: string | null;
  lastSeen: number;
}

export type CelebrationEvent = 'coherence' | 'covenant' | { type: 'molecule_complete'; formula: string };

export type K4ClientState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface K4MeshClientOptions {
  endpoint: string;
  nodeId:   string;
  room:     string;
  events?:   HybridTransportEvents & {
    onTelemetryAck?:   (payload: TelemetryAck) => void;
    onOfflineQueueSize?: (size: number) => void;
  };
}

export interface TelemetryAck {
  received: boolean;
  transport: 'websocket' | 'webtransport';
  latencyMs: number;
}

export type TelemetryPayload = {
  spoons: number;
  qfactor?: number;
  hrv?: number;
  breathCoherence?: number;
  eda?: number;
} & Record<string, unknown>;

const HEARTBEAT_MS = 15_000;
const PRESENCE_MS  = 5_000;

// ── Internal state ────────────────────────────────────────────────────

let _client:     K4MeshClient | null = null;
let _heartbeat:  ReturnType<typeof setInterval> | null = null;
let _presence:   ReturnType<typeof setInterval> | null = null;

// ── Client implementation ─────────────────────────────────────────────────────

export class K4MeshClient {
  private endpoint:  string;
  private nodeId:    string;
  private room:      string;
  private events:    HybridTransportEvents & {
    onTelemetryAck?: (a: TelemetryAck) => void;
    onOfflineQueueSize?: (size: number) => void;
  };
  private backoffMs: number = 1_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connecting: boolean = false;

  constructor(opts: K4MeshClientOptions) {
    this.endpoint = opts.endpoint.replace(/\/$/, '');
    this.nodeId   = opts.nodeId;
    this.room     = opts.room;
    this.events   = opts.events ?? {};

    _client = this;
  }

  connect(): void {
    if (this.connecting) return;
    this.connecting = true;

    const useWt = supportsWebTransport();
    const base   = this.endpoint.replace(/\/$/, '');
    const url    = useWt
      ? `${base}/events?node=${encodeURIComponent(this.nodeId)}&room=${encodeURIComponent(this.room)}`
      : `${base}/ws/family-mesh?node=${encodeURIComponent(this.nodeId)}&room=${encodeURIComponent(this.room)}`;

    hybridConnect(url, {
      onOpen:    () => this.onOpen(),
      onClose:   (code, reason) => this.onClose(code, reason),
      onError:   (err)           => this.onError(err),
      onMessage: (data)          => this.onMessage(data),
      onStateChange: (state) => {
        this.events.onStateChange?.(state);
        this.connecting = state === 'connecting';
      },
    });
  }

  disconnect(): void {
    clearTimeout(this.reconnectTimer as ReturnType<typeof setTimeout> | null);
    hybridDisconnect();
    this.clearTimers();
    this.events.onStateChange?.('disconnected');
  }

  async sendTelemetry(data: TelemetryPayload): Promise<void> {
    let qfactor = data.qfactor;

    if (qfactor === undefined) {
      const bio: BiometricInput = {
        spoons:          data.spoons,
        hrv:             data.hrv ?? 50,
        breathCoherence: data.breathCoherence ?? 0.5,
        eda:             data.eda,
      };
      const result: QFactorResult = await computeQFactorFromBiometrics(bio);
      qfactor = result.qfactor;
    }

    const { spoons, qfactor: _, ...extras } = data;
    const payload = {
      type:    'telemetry',
      node:    this.nodeId,
      room:    this.room,
      ts:      Date.now(),
      spoons,
      qfactor,
      ...extras,
    };

    if (!isConnected()) {
      await enqueue({ type: 'telemetry', payload, ts: payload.ts });
      const n = await queueSize();
      this.events.onOfflineQueueSize?.(n);
      return;
    }

    let latencyMs = 0;
    const t0 = Date.now();
    try {
      transportSend(payload);
      latencyMs = Date.now() - t0;

      this.events.onTelemetryAck?.{
        received: true,
        transport: getTransportType() ?? 'websocket',
        latencyMs,
      });
    } catch {
      await enqueue({ type: 'telemetry', payload, ts: payload.ts });
    }
  }

  async measureRtt(timeout = 5000): Promise<number> {
    return ping(timeout);
  }

  broadcastCelebration(event: CelebrationEvent): void {
    if (!isConnected()) return;
    try {
      transportSend({
        type: 'celebration',
        did:   this.nodeId,
        room:  this.room,
        event,
        ts:    Date.now(),
      });
    } catch { /* ignore */ }
  }

  getTransport(): 'websocket' | 'webtransport' | null {
    return getTransportType();
  }

  private onOpen(): void {
    this.backoffMs = 1_000;
    this.events.onStateChange?.('connected');
    this.sendFrame({ type: 'hello', node: this.nodeId, room: this.room, ts: Date.now() });

    void (async () => {
      const pending = await drainQueue();
      for (const item of pending) {
        await this.sendFrame(item).catch(() => {});
      }
      const remaining = await queueSize();
      this.events.onOfflineQueueSize?.(remaining);
    })();

    this.startHeartbeat();
    this.sendPresence();
  }

  private onClose(code: number, reason: string): void {
    this.clearTimers();
    this.events.onStateChange?.('disconnected');
    this.events.onClose?.(code, reason);
    this.scheduleReconnect();
  }

  private onError(err: Error): void {
    this.events.onStateChange?.('error');
    this.events.onError?.(err);
  }

  private onMessage(data: unknown): void {
    try {
      const msg = typeof data === 'string' ? JSON.parse(data) : data;
      switch (msg.type) {
        case 'pong':
          break;
        case 'presence':
          this.events.onMessage?.(msg);
          break;
        case 'peers':
          this.events.onMessage?.(msg);
          break;
        default:
          this.events.onMessage?.(msg);
      }
    } catch { /* ignore malformed */ }
  }

  private async sendFrame(frame: unknown): Promise<void> {
    if (!isConnected()) {
      await enqueue({ type: 'action', payload: (frame as any).type, ts: Date.now() });
      const n = await queueSize();
      this.events.onOfflineQueueSize?.(n);
      return;
    }
    try {
      transportSend(frame);
    } catch {
      await enqueue({ type: 'action', payload: (frame as any).type, ts: Date.now() });
    }
  }

  private startHeartbeat(): void {
    this.clearTimers();
    _heartbeat = setInterval(() => {
      this.sendFrame({ type: 'ping', node: this.nodeId, ts: Date.now() }).catch(() => {});
      this.sendPresence();
    }, HEARTBEAT_MS);
  }

  private sendPresence(): void {
    this.sendFrame({
      type: 'presence',
      node: this.nodeId,
      room: this.room,
      status: 'online',
      ts: Date.now(),
    }).catch(() => {});
  }

  private clearTimers(): void {
    if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
    if (_presence)  { clearInterval(_presence);  _presence  = null; }
    clearTimeout(this.reconnectTimer as ReturnType<typeof setTimeout> | null);
  }

  private scheduleReconnect(): void {
    clearTimeout(this.reconnectTimer as ReturnType<typeof setTimeout> | null);
    this.reconnectTimer = setTimeout(() => {
      this.backoffMs = Math.min(this.backoffMs * 2, 30_000);
      this.connect();
    }, this.backoffMs) as any;
  }
}

// ── Singleton factory ──────────────────────────────────────────────────────────

let singletonClient: K4MeshClient | null = null;

export function createK4MeshClient(opts: K4MeshClientOptions): K4MeshClient {
  if (singletonClient) return singletonClient;
  singletonClient = new K4MeshClient(opts);
  return singletonClient;
}

export function disconnectK4Mesh(): void {
  singletonClient?.disconnect();
  singletonClient = null;
}

export function isK4Connected(): boolean {
  return isConnected();
}

export function getK4MeshClient(): K4MeshClient | null {
  return singletonClient;
}
