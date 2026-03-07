import { useEffect, useRef, useCallback, useState } from 'react';
import { useSovereignStore } from '../sovereign/useSovereignStore';
import type { SpatialTransport } from '../sovereign/types';
import {
  WebBluetoothScanner,
  WebSocketScanner,
  parseMfgData,
  emaSmooth,
} from '../services/spatialScanner';
import type { SpatialScanner, RawScanResult } from '../services/spatialScanner';

// ── Types ──

export type SpatialZone = 'immediate' | 'near' | 'far' | 'lost';

export interface SpatialNode {
  id: string;
  rssi: number;
  rawRssi: number;
  valency: number;
  flags: number;
  zone: SpatialZone;
  lastSeen: number;
  emaState: number;
}

export interface SpatialRadarState {
  nodes: SpatialNode[];
  scanning: boolean;
  transport: SpatialTransport;
  handshakeCandidate: string | null;
}

// ── Constants ──

const RSSI_IMMEDIATE = -50;
const RSSI_NEAR = -70;
const RSSI_FAR = -85;
const PRUNE_MS = 10_000;
const EMA_ALPHA = 0.3;
const FLAG_HANDSHAKE_READY = 0x01;

function classifyZone(rssi: number): SpatialZone {
  if (rssi > RSSI_IMMEDIATE) return 'immediate';
  if (rssi > RSSI_NEAR) return 'near';
  if (rssi > RSSI_FAR) return 'far';
  return 'lost';
}

// ── Hook ──

export function useSpatialRadar(): SpatialRadarState & {
  startScan: () => Promise<void>;
  stopScan: () => void;
} {
  const [state, setState] = useState<SpatialRadarState>({
    nodes: [],
    scanning: false,
    transport: 'none',
    handshakeCandidate: null,
  });

  const scannerRef = useRef<SpatialScanner | null>(null);
  const nodesMapRef = useRef(new Map<string, SpatialNode>());
  const pruneTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateStore = useCallback((nodes: SpatialNode[], transport: SpatialTransport, candidate: string | null) => {
    const store = useSovereignStore.getState();
    store.setSpatialNodes(nodes.length);
    store.setSpatialTransport(transport);
    store.setHandshakeCandidate(candidate);
  }, []);

  const handleScanResults = useCallback((results: RawScanResult[]) => {
    const map = nodesMapRef.current;
    const now = Date.now();

    for (const r of results) {
      const existing = map.get(r.id);
      const { valency, flags } = parseMfgData(r.manufacturerData);
      const ema = existing ? emaSmooth(existing.emaState, r.rssi, EMA_ALPHA) : r.rssi;
      const zone = classifyZone(ema);

      map.set(r.id, {
        id: r.id,
        rssi: ema,
        rawRssi: r.rssi,
        valency,
        flags,
        zone,
        lastSeen: now,
        emaState: ema,
      });
    }

    // Prune stale nodes
    for (const [id, node] of map) {
      if (now - node.lastSeen > PRUNE_MS) map.delete(id);
    }

    const nodes = Array.from(map.values());
    const candidate = nodes.find(
      (n) => n.zone === 'immediate' && (n.flags & FLAG_HANDSHAKE_READY) !== 0
    )?.id ?? null;

    setState((prev) => ({
      ...prev,
      nodes,
      handshakeCandidate: candidate,
    }));
    updateStore(nodes, state.transport, candidate);
  }, [updateStore, state.transport]);

  const startScan = useCallback(async () => {
    if (scannerRef.current) return;

    let scanner: SpatialScanner;
    let transport: SpatialTransport;

    // Try Web Bluetooth first, fall back to WebSocket
    try {
      scanner = new WebBluetoothScanner();
      await scanner.start();
      transport = 'web-bluetooth';
    } catch {
      try {
        scanner = new WebSocketScanner();
        await scanner.start();
        transport = 'websocket';
      } catch {
        setState((prev) => ({ ...prev, scanning: false, transport: 'none' }));
        return;
      }
    }

    scannerRef.current = scanner;
    scanner.onScan(handleScanResults);

    // Prune timer: every 2s, remove stale nodes
    pruneTimerRef.current = setInterval(() => {
      const now = Date.now();
      const map = nodesMapRef.current;
      let pruned = false;
      for (const [id, node] of map) {
        if (now - node.lastSeen > PRUNE_MS) {
          map.delete(id);
          pruned = true;
        }
      }
      if (pruned) {
        const nodes = Array.from(map.values());
        const candidate = nodes.find(
          (n) => n.zone === 'immediate' && (n.flags & FLAG_HANDSHAKE_READY) !== 0
        )?.id ?? null;
        setState((prev) => ({ ...prev, nodes, handshakeCandidate: candidate }));
        updateStore(nodes, transport, candidate);
      }
    }, 2000);

    setState({ nodes: [], scanning: true, transport, handshakeCandidate: null });
    useSovereignStore.getState().setSpatialTransport(transport);
  }, [handleScanResults, updateStore]);

  const stopScan = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    if (pruneTimerRef.current) clearInterval(pruneTimerRef.current);
    pruneTimerRef.current = null;
    nodesMapRef.current.clear();
    setState({ nodes: [], scanning: false, transport: 'none', handshakeCandidate: null });
    const store = useSovereignStore.getState();
    store.setSpatialNodes(0);
    store.setSpatialTransport('none');
    store.setHandshakeCandidate(null);
  }, []);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop();
      if (pruneTimerRef.current) clearInterval(pruneTimerRef.current);
    };
  }, []);

  return { ...state, startScan, stopScan };
}
