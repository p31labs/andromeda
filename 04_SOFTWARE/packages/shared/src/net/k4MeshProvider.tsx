/**
 * K4MeshProvider — React context for K₄ mesh connectivity using HybridTransport.
 *
 * Provides:
 *  - Connection state (connecting, connected, disconnected, error)
 *  - RTT measurement (ping latency)
 *  - Node/vertex presence
 *  - Telemetry submission (spoons + qFactor)
 *  - Offline queue size
 *
 * Replaces: useSovereignRelay (WebSocket-only) for K₄ mesh operations.
 *
 * Usage:
 *   import { K4MeshProvider } from '@/services/k4MeshProvider';
 *
 *   function App() {
 *     return (
 *       <K4MeshProvider nodeId="will-abc123" room="family-mesh">
 *         <Dashboard />
 *       </K4MeshProvider>
 *     );
 *   }
 *
 *   Inside Dashboard:
 *   const { connected, sendTelemetry, rtt } = useK4Mesh();
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { K4MeshClient, createK4MeshClient, disconnectK4Mesh } from './k4MeshClient';
import type { K4ClientState, TelemetryAck, TelemetryPayload } from './k4MeshClient';

// Minimal RelayPeer shape; canonical definition lives in spaceship-earth/src/sovereign/types.ts
export interface RelayPeer {
  did: string;
  room: string | null;
  lastSeen: number;
}

export interface CelebrationEvent {
  type: 'coherence' | 'covenant' | { type: 'molecule_complete'; formula: string };
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface K4MeshContextValue {
  state:        K4ClientState;
  transport:    'websocket' | 'webtransport' | null;
  rtt:          number;          // ms, smoothed
  nodeId:       string;
  room:         string;
  peers:        RelayPeer[];
  offlineQueue: number;
  telemetryAck: TelemetryAck | null;

  connect: () => void;
  disconnect: () => void;
  sendTelemetry: (data: { spoons: number; qfactor: number; [k: string]: unknown }) => Promise<void>;
  broadcastCelebration: (event: any) => void;
  measureRtt: () => Promise<number>;
}

const K4MeshContext = createContext<K4MeshContextValue | null>(null);

// ── Provider component ─────────────────────────────────────────────────────────

export interface K4MeshProviderProps {
  children: React.ReactNode;
  nodeId:   string;
  room:     string;
  endpoint?: string; // default: https://k4-cage.trimtab-signal.workers.dev
  autoConnect?: boolean; // default true
}

export function K4MeshProvider({
  children,
  nodeId,
  room,
  endpoint = 'https://k4-cage.trimtab-signal.workers.dev',
  autoConnect = true,
}: K4MeshProviderProps) {
  const [state, setState]       = useState<K4ClientState>('disconnected');
  const [transport, setTransport] = useState<'websocket' | 'webtransport' | null>(null);
  const [rtt, setRtt]           = useState(0);
  const [peers, setPeers]       = useState<RelayPeer[]>([]);
  const [queueSize, setQueueSize] = useState(0);
  const [telemetryAck, setTelemetryAck] = useState<TelemetryAck | null>(null);

  const clientRef = useRef<K4MeshClient | null>(null);

  // ── Initialize client ───────────────────────────────────────────────────────
  useEffect(() => {
    const client = createK4MeshClient({
      endpoint,
      nodeId,
      room,
      events: {
        onOpen:    () => setState('connected'),
  onClose:   (code: number, reason: string) => setState('disconnected'),
  onError:   (err: Error) => setState('error'),
        onMessage: (msg: any) => {
          if (msg.type === 'presence' && typeof msg.node === 'string') {
            setPeers(prev => {
              const exists = prev.find(p => p.did === msg.node);
              if (exists) {
                return prev.map(p => p.did === msg.node ? { ...p, room: msg.room as string, lastSeen: msg.ts as number } : p);
              }
              return [...prev, { did: msg.node as string, room: msg.room as string, lastSeen: msg.ts as number }];
            });
          }
          if (msg.type === 'peers' && Array.isArray(msg.peers)) {
            setPeers(msg.peers as RelayPeer[]);
          }
        },
        onStateChange: setState,
        onOfflineQueueSize: setQueueSize,
        onTelemetryAck: (ack: TelemetryAck) => {
          setTelemetryAck(ack);
          // Smooth RTT using exponential moving average
          setRtt(prev => prev === 0 ? ack.latencyMs : 0.8 * prev + 0.2 * ack.latencyMs);
        },
      },
    });

    clientRef.current = client;

    if (autoConnect) {
      client.connect();
    }

    return () => {
      disconnectK4Mesh();
      clientRef.current = null;
    };
  }, [endpoint, nodeId, room, autoConnect]);

  // ── API wrappers ────────────────────────────────────────────────────────────
  const connect = useCallback(() => clientRef.current?.connect(), []);
  const disconnect = useCallback(() => clientRef.current?.disconnect(), []);
  const measureRtt = useCallback(() => clientRef.current?.measureRtt() ?? Promise.resolve(0), []);

  const sendTelemetry = useCallback(async (data: { spoons: number; qfactor: number; [k: string]: unknown }) => {
    await clientRef.current?.sendTelemetry(data);
  }, []);

  const broadcastCelebration = useCallback((event: any) => {
    clientRef.current?.broadcastCelebration(event);
  }, []);

  // ── Context value ────────────────────────────────────────────────────────────
  const value: K4MeshContextValue = {
    state,
    transport: clientRef.current ? (clientRef.current.getTransport()) : null,
    rtt,
    nodeId,
    room,
    peers,
    offlineQueue: queueSize,
    telemetryAck,
    connect,
    disconnect,
    sendTelemetry,
    broadcastCelebration,
    measureRtt,
  };

  return (
    <K4MeshContext.Provider value={value}>
      {children}
    </K4MeshContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * useK4Mesh — subscribes to K₄ mesh connectivity within a K4MeshProvider.
 * Throws if used outside provider.
 */
export function useK4Mesh(): K4MeshContextValue {
  const ctx = useContext(K4MeshContext);
  if (!ctx) {
    throw new Error('useK4Mesh must be used within a K4MeshProvider');
  }
  return ctx;
}
