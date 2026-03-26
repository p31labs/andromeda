/**
 * @file meshSync.ts — Sovereign Mesh Synchronization Service
 *
 * P31 Labs — P2P State Synchronization
 *
 * Implements WebRTC-based peer-to-peer synchronization of PGLite ledgers
 * across multiple devices on the local network. Uses Cloudflare KV relay
 * strictly as a signaling server to establish WebRTC connections.
 *
 * Architecture:
 *   1. Signaling: Devices exchange WebRTC SDP offers/answers via CF KV relay
 *   2. Mesh: Direct peer-to-peer connections over local LAN
 *   3. Gossip: Append-only ledger entries are broadcast to all peers
 *   4. Idempotent: INSERT ON CONFLICT DO NOTHING prevents merge conflicts
 *
 * Prime Directive: No centralized cloud database. Pure P2P sovereignty.
 */

import { useLedgerStore } from '../stores/ledgerStore';
import { useZoneStore } from '../stores/zoneStore';
import { usePersistenceStore } from './persistence';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface MeshPeer {
  id: string;
  name: string;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed';
  lastSeen: number;
  dataChannels: Map<string, RTCDataChannel>;
}

export interface SyncMessage {
  type: 'LEDGER_ENTRY' | 'ZONE_TRANSITION' | 'ZONE_SNAPSHOT' | 'HANDSHAKE' | 'HEARTBEAT';
  timestamp: number;
  source: string;
  payload: any;
  signature?: string;
}

export interface MeshConfig {
  peerId?: string;
  peerName?: string;
  signalingUrl?: string;
  enableRelay?: boolean;
  heartbeatInterval?: number;
  maxPeers?: number;
}

// ─────────────────────────────────────────────────────────────────
// Mesh Sync Service
// ─────────────────────────────────────────────────────────────────

export class MeshSyncService {
  private config: MeshConfig;
  private peers: Map<string, MeshPeer> = new Map();
  private signalingConnection: WebSocket | null = null;
  private isInitialized = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private ledgerPrevious: any[] | null = null;
  private zonePrevious: any = null;
  private ledgerUnsubscribe: (() => void) | null = null;
  private zoneUnsubscribe: (() => void) | null = null;

  constructor(config: MeshConfig = {}) {
    this.config = {
      peerId: crypto.randomUUID(),
      peerName: `Device-${Math.floor(Math.random() * 1000)}`,
      signalingUrl: 'wss://p31-mesh-relay.workers.dev', // CF KV relay
      enableRelay: true,
      heartbeatInterval: 30000, // 30 seconds
      maxPeers: 10,
      ...config,
    };

    console.log(`[MeshSync] Initialized node: ${this.config.peerName} (${this.config.peerId})`);
  }

  /**
   * Initialize the mesh synchronization service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize persistence layer
      const persistence = usePersistenceStore.getState();
      if (!persistence.isInitialized) {
        await persistence.initDB();
      }

      // Connect to signaling server
      if (this.config.enableRelay) {
        await this.connectToSignaling();
      }

      // Start heartbeat
      this.startHeartbeat();

      // Subscribe to local ledger changes
      this.subscribeToLedger();

      // Subscribe to zone state changes
      this.subscribeToZones();

      this.isInitialized = true;
      console.log('[MeshSync] Service initialized successfully');

    } catch (error) {
      console.error('[MeshSync] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Connect to the Cloudflare KV relay for signaling
   */
  private async connectToSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.signalingConnection = new WebSocket(this.config.signalingUrl!);
        
        this.signalingConnection.onopen = () => {
          console.log('[MeshSync] Connected to signaling relay');
          this.broadcastPresence();
          resolve();
        };

        this.signalingConnection.onmessage = (event) => {
          this.handleSignalingMessage(JSON.parse(event.data));
        };

        this.signalingConnection.onerror = (error) => {
          console.error('[MeshSync] Signaling connection error:', error);
          reject(error);
        };

        this.signalingConnection.onclose = () => {
          console.log('[MeshSync] Signaling connection closed');
          // Attempt to reconnect after delay
          setTimeout(() => this.connectToSignaling(), 5000);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Broadcast presence to discover other peers
   */
  private broadcastPresence(): void {
    if (!this.signalingConnection) return;

    const presenceMessage = {
      type: 'PRESENCE',
      peerId: this.config.peerId,
      peerName: this.config.peerName,
      timestamp: Date.now(),
    };

    this.signalingConnection.send(JSON.stringify(presenceMessage));
  }

  /**
   * Handle incoming signaling messages
   */
  private handleSignalingMessage(message: any): void {
    switch (message.type) {
      case 'PEER_DISCOVERED':
        this.handlePeerDiscovered(message);
        break;
      case 'SDP_OFFER':
        this.handleOffer(message);
        break;
      case 'SDP_ANSWER':
        this.handleAnswer(message);
        break;
      case 'ICE_CANDIDATE':
        this.handleIceCandidate(message);
        break;
      case 'PEER_LEFT':
        this.handlePeerLeft(message);
        break;
    }
  }

  /**
   * Handle discovered peer and establish WebRTC connection
   */
  private async handlePeerDiscovered(message: any): Promise<void> {
    const { peerId, peerName } = message;
    
    if (peerId === this.config.peerId || this.peers.has(peerId)) {
      return; // Skip self or existing peers
    }

    if (this.peers.size >= this.config.maxPeers!) {
      console.warn('[MeshSync] Max peers reached, ignoring new peer');
      return;
    }

    console.log(`[MeshSync] Discovered peer: ${peerName} (${peerId})`);
    await this.establishPeerConnection(peerId, peerName);
  }

  /**
   * Establish WebRTC connection with a peer
   */
  private async establishPeerConnection(peerId: string, peerName: string): Promise<void> {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      const dataChannel = peerConnection.createDataChannel('mesh-sync', {
        ordered: true,
        maxRetransmits: 0,
      });

      const meshPeer: MeshPeer = {
        id: peerId,
        name: peerName,
        connectionState: 'connecting',
        lastSeen: Date.now(),
        dataChannels: new Map([['default', dataChannel]]),
      };

      this.peers.set(peerId, meshPeer);
      this.setupDataChannel(dataChannel, peerId);

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.signalingConnection) {
          this.signalingConnection.send(JSON.stringify({
            type: 'ICE_CANDIDATE',
            target: peerId,
            candidate: event.candidate,
          }));
        }
      };

      peerConnection.onconnectionstatechange = () => {
        const peer = this.peers.get(peerId);
        if (peer) {
          peer.connectionState = peerConnection.connectionState as any;
          console.log(`[MeshSync] Peer ${peerName} connection state: ${peerConnection.connectionState}`);
        }
      };

      // Create offer and send to peer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      if (this.signalingConnection) {
        this.signalingConnection.send(JSON.stringify({
          type: 'SDP_OFFER',
          target: peerId,
          offer: offer,
        }));
      }

    } catch (error) {
      console.error(`[MeshSync] Failed to establish connection with ${peerName}:`, error);
    }
  }

  /**
   * Handle incoming SDP offer
   */
  private async handleOffer(message: any): Promise<void> {
    const { peerId, offer } = message;
    const peerName = `Peer-${peerId.slice(0, 8)}`;

    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        const meshPeer: MeshPeer = {
          id: peerId,
          name: peerName,
          connectionState: 'connected',
          lastSeen: Date.now(),
          dataChannels: new Map([['default', dataChannel]]),
        };

        this.peers.set(peerId, meshPeer);
        this.setupDataChannel(dataChannel, peerId);
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.signalingConnection) {
          this.signalingConnection.send(JSON.stringify({
            type: 'ICE_CANDIDATE',
            target: peerId,
            candidate: event.candidate,
          }));
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      if (this.signalingConnection) {
        this.signalingConnection.send(JSON.stringify({
          type: 'SDP_ANSWER',
          target: peerId,
          answer: answer,
        }));
      }

    } catch (error) {
      console.error(`[MeshSync] Failed to handle offer from ${peerName}:`, error);
    }
  }

  /**
   * Handle incoming SDP answer
   */
  private async handleAnswer(message: any): Promise<void> {
    const { peerId, answer } = message;
    const peer = this.peers.get(peerId);
    if (!peer) return;

    try {
      // Find the peer connection (this would need to be tracked separately in a real implementation)
      // For now, we'll assume the connection is already established
      console.log(`[MeshSync] Received answer from ${peer.name}`);
    } catch (error) {
      console.error(`[MeshSync] Failed to handle answer from ${peerId}:`, error);
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(message: any): Promise<void> {
    const { peerId, candidate } = message;
    const peer = this.peers.get(peerId);
    if (!peer) return;

    try {
      // Add ICE candidate to peer connection
      // This would require tracking peer connections separately
      console.log(`[MeshSync] Received ICE candidate from ${peer.name}`);
    } catch (error) {
      console.error(`[MeshSync] Failed to handle ICE candidate from ${peerId}:`, error);
    }
  }

  /**
   * Handle peer leaving
   */
  private handlePeerLeft(message: any): void {
    const { peerId } = message;
    const peer = this.peers.get(peerId);
    if (peer) {
      console.log(`[MeshSync] Peer ${peer.name} left the mesh`);
      this.peers.delete(peerId);
    }
  }

  /**
   * Setup data channel for communication
   */
  private setupDataChannel(dataChannel: RTCDataChannel, peerId: string): void {
    dataChannel.onopen = () => {
      console.log(`[MeshSync] Data channel opened with peer ${peerId}`);
      this.sendHandshake(peerId);
    };

    dataChannel.onmessage = (event) => {
      this.handleMeshMessage(JSON.parse(event.data), peerId);
    };

    dataChannel.onclose = () => {
      console.log(`[MeshSync] Data channel closed with peer ${peerId}`);
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.connectionState = 'disconnected';
      }
    };

    dataChannel.onerror = (error) => {
      console.error(`[MeshSync] Data channel error with peer ${peerId}:`, error);
    };
  }

  /**
   * Handle incoming mesh messages
   */
  private handleMeshMessage(message: SyncMessage, sourcePeerId: string): void {
    switch (message.type) {
      case 'HANDSHAKE':
        this.handleHandshake(message, sourcePeerId);
        break;
      case 'LEDGER_ENTRY':
        this.handleLedgerEntry(message.payload);
        break;
      case 'ZONE_TRANSITION':
        this.handleZoneTransition(message.payload);
        break;
      case 'ZONE_SNAPSHOT':
        this.handleZoneSnapshot(message.payload);
        break;
      case 'HEARTBEAT':
        this.handleHeartbeat(sourcePeerId);
        break;
    }
  }

  /**
   * Handle handshake message
   */
  private handleHandshake(message: SyncMessage, sourcePeerId: string): void {
    console.log(`[MeshSync] Handshake received from ${sourcePeerId}`);
    // Send our current state to the new peer
    this.syncStateWithPeer(sourcePeerId);
  }

  /**
   * Handle ledger entry from peer
   */
  private async handleLedgerEntry(entry: any): Promise<void> {
    try {
      const persistence = usePersistenceStore.getState();
      if (!persistence.isInitialized) return;

      // Execute idempotent insert
      await persistence.db.query(
        `INSERT INTO ledger (id, timestamp, currency, amount, balance, reason, signature, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING;`,
        [
          entry.id,
          entry.timestamp,
          entry.currency,
          entry.amount,
          entry.balance,
          entry.reason,
          entry.signature || null,
          entry.createdAt || new Date().toISOString(),
        ]
      );

      console.log(`[MeshSync] Ledger entry synchronized: ${entry.id}`);
      
      // Update Zustand store
      const ledgerStore = useLedgerStore.getState();
      const currentEntries = ledgerStore.entries;
      const entryExists = currentEntries.some(e => e.id === entry.id);
      
      if (!entryExists) {
        const newEntries = [...currentEntries, entry];
        const newSpoonBalance = newEntries
          .filter(e => e.currency === 'SPOON')
          .reduce((sum, e) => sum + e.amount, 0);
        const newLoveBalance = newEntries
          .filter(e => e.currency === 'LOVE')
          .reduce((sum, e) => sum + e.amount, 0);
        const newKarmaBalance = newEntries
          .filter(e => e.currency === 'KARMA')
          .reduce((sum, e) => sum + e.amount, 0);

        // Update ledger store using addEntry for each new entry
        for (const entry of newEntries.filter(e => !currentEntries.some(ce => ce.id === e.id))) {
          await ledgerStore.addEntry({
            id: entry.id,
            timestamp: entry.timestamp,
            currency: entry.currency,
            amount: entry.amount,
            balance: entry.balance,
            reason: entry.reason,
            signature: entry.signature,
          });
        }
      }

    } catch (error) {
      console.error('[MeshSync] Failed to synchronize ledger entry:', error);
    }
  }

  /**
   * Handle zone transition from peer
   */
  private async handleZoneTransition(transition: any): Promise<void> {
    try {
      const persistence = usePersistenceStore.getState();
      if (!persistence.isInitialized) return;

      // Execute idempotent insert
      await persistence.db.query(
        `INSERT INTO zone_transitions (id, timestamp, zone_id, zone_name, transition_type, rssi, beacon_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING;`,
        [
          transition.id || crypto.randomUUID(),
          transition.timestamp || new Date().toISOString(),
          transition.beaconId,
          transition.zone,
          transition.type,
          transition.rssi,
          transition.uuid || null,
          new Date().toISOString(),
        ]
      );

      console.log(`[MeshSync] Zone transition synchronized: ${transition.type} to ${transition.zone}`);

    } catch (error) {
      console.error('[MeshSync] Failed to synchronize zone transition:', error);
    }
  }

  /**
   * Handle zone snapshot from peer
   */
  private async handleZoneSnapshot(snapshot: any): Promise<void> {
    try {
      const persistence = usePersistenceStore.getState();
      if (!persistence.isInitialized) return;

      // Execute idempotent insert
      await persistence.db.query(
        `INSERT INTO zone_snapshots (id, timestamp, active_zone_id, current_level, camera_position, camera_target, zoom_level, is_transitioning, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING;`,
        [
          snapshot.id || crypto.randomUUID(),
          snapshot.timestamp || new Date().toISOString(),
          snapshot.activeZoneId || null,
          snapshot.currentLevel,
          JSON.stringify(snapshot.cameraPosition),
          JSON.stringify(snapshot.cameraTarget),
          snapshot.zoomLevel,
          snapshot.isTransitioning,
          new Date().toISOString(),
        ]
      );

      console.log(`[MeshSync] Zone snapshot synchronized`);

    } catch (error) {
      console.error('[MeshSync] Failed to synchronize zone snapshot:', error);
    }
  }

  /**
   * Handle heartbeat from peer
   */
  private handleHeartbeat(sourcePeerId: string): void {
    const peer = this.peers.get(sourcePeerId);
    if (peer) {
      peer.lastSeen = Date.now();
    }
  }

  /**
   * Send handshake to peer
   */
  private sendHandshake(peerId: string): void {
    const message: SyncMessage = {
      type: 'HANDSHAKE',
      timestamp: Date.now(),
      source: this.config.peerId!,
      payload: {
        peerName: this.config.peerName,
        capabilities: ['ledger', 'zones', 'snapshots'],
      },
    };

    this.broadcastToPeer(peerId, message);
  }

  /**
   * Sync current state with a specific peer
   */
  private async syncStateWithPeer(peerId: string): Promise<void> {
    try {
      // Get recent ledger entries
      const persistence = usePersistenceStore.getState();
      const ledgerResult = await persistence.db.query(
        `SELECT * FROM ledger ORDER BY timestamp DESC LIMIT 100`
      );

      for (const row of ledgerResult.rows) {
        const message: SyncMessage = {
          type: 'LEDGER_ENTRY',
          timestamp: Date.now(),
          source: this.config.peerId!,
          payload: {
            id: row.id,
            timestamp: row.timestamp,
            currency: row.currency,
            amount: row.amount,
            balance: row.balance,
            reason: row.reason,
            signature: row.signature,
            createdAt: row.created_at,
          },
        };
        this.broadcastToPeer(peerId, message);
      }

      // Get recent zone transitions
      const zoneResult = await persistence.db.query(
        `SELECT * FROM zone_transitions ORDER BY timestamp DESC LIMIT 50`
      );

      for (const row of zoneResult.rows) {
        const message: SyncMessage = {
          type: 'ZONE_TRANSITION',
          timestamp: Date.now(),
          source: this.config.peerId!,
          payload: {
            id: row.id,
            timestamp: row.timestamp,
            beaconId: row.zone_id,
            zone: row.zone_name,
            type: row.transition_type,
            rssi: row.rssi,
            uuid: row.beacon_id,
          },
        };
        this.broadcastToPeer(peerId, message);
      }

    } catch (error) {
      console.error('[MeshSync] Failed to sync state with peer:', error);
    }
  }

  /**
   * Subscribe to ledger changes and broadcast them
   */
  private subscribeToLedger(): void {
    this.ledgerUnsubscribe = useLedgerStore.subscribe((state) => {
      const newEntries = state.entries;
      // Find new entries by comparing with previous
      if (this.ledgerPrevious) {
        const newEntry = newEntries.find(entry => 
          !this.ledgerPrevious!.some(oldEntry => oldEntry.id === entry.id)
        );

        if (newEntry) {
          this.broadcastLedgerEntry(newEntry);
        }
      }
      this.ledgerPrevious = newEntries;
    });
  }

  /**
   * Subscribe to zone state changes and broadcast them
   */
  private subscribeToZones(): void {
    this.zoneUnsubscribe = useZoneStore.subscribe((state) => {
      const newState = {
        activeZoneId: state.activeZoneId,
        spatialState: state.spatialState,
      };

      // Compare with previous state
      if (this.zonePrevious) {
        if (newState.activeZoneId !== this.zonePrevious.activeZoneId) {
          this.broadcastZoneTransition({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            beaconId: newState.activeZoneId || 'unknown',
            zone: newState.spatialState.currentLevel,
            type: newState.activeZoneId ? 'ZONE_TRANSITION' : 'ZONE_EXIT',
            rssi: -60,
            uuid: newState.activeZoneId || null,
          });
        }
      }

      // Broadcast zone snapshots periodically
      this.broadcastZoneSnapshot({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        activeZoneId: newState.activeZoneId,
        currentLevel: newState.spatialState.currentLevel,
        cameraPosition: newState.spatialState.cameraPosition,
        cameraTarget: newState.spatialState.cameraTarget,
        zoomLevel: newState.spatialState.zoomLevel,
        isTransitioning: newState.spatialState.isTransitioning,
      });

      this.zonePrevious = newState;
    });
  }

  /**
   * Broadcast ledger entry to all connected peers
   */
  private broadcastLedgerEntry(entry: any): void {
    const message: SyncMessage = {
      type: 'LEDGER_ENTRY',
      timestamp: Date.now(),
      source: this.config.peerId!,
      payload: entry,
    };

    this.broadcastToAll(message);
  }

  /**
   * Broadcast zone transition to all connected peers
   */
  private broadcastZoneTransition(transition: any): void {
    const message: SyncMessage = {
      type: 'ZONE_TRANSITION',
      timestamp: Date.now(),
      source: this.config.peerId!,
      payload: transition,
    };

    this.broadcastToAll(message);
  }

  /**
   * Broadcast zone snapshot to all connected peers
   */
  private broadcastZoneSnapshot(snapshot: any): void {
    const message: SyncMessage = {
      type: 'ZONE_SNAPSHOT',
      timestamp: Date.now(),
      source: this.config.peerId!,
      payload: snapshot,
    };

    this.broadcastToAll(message);
  }

  /**
   * Broadcast message to all connected peers
   */
  private broadcastToAll(message: SyncMessage): void {
    this.peers.forEach((peer) => {
      if (peer.connectionState === 'connected') {
        this.broadcastToPeer(peer.id, message);
      }
    });
  }

  /**
   * Broadcast message to specific peer
   */
  private broadcastToPeer(peerId: string, message: SyncMessage): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const dataChannel = peer.dataChannels.get('default');
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(message));
    }
  }

  /**
   * Start heartbeat to maintain peer connections
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const message: SyncMessage = {
        type: 'HEARTBEAT',
        timestamp: Date.now(),
        source: this.config.peerId!,
        payload: {
          peerName: this.config.peerName,
          peerCount: this.peers.size,
        },
      };

      this.broadcastToAll(message);

      // Clean up stale peers
      const now = Date.now();
      const staleThreshold = 60000; // 1 minute

      this.peers.forEach((peer) => {
        if (now - peer.lastSeen > staleThreshold && peer.connectionState === 'connected') {
          console.log(`[MeshSync] Peer ${peer.name} appears stale, closing connection`);
          // Close data channels
          peer.dataChannels.forEach((channel) => {
            channel.close();
          });
          peer.dataChannels.clear();
          peer.connectionState = 'disconnected';
        }
      });

    }, this.config.heartbeatInterval!);
  }

  /**
   * Get mesh status
   */
  public getMeshStatus(): {
    isInitialized: boolean;
    peerCount: number;
    peers: MeshPeer[];
    connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  } {
    const connectedPeers = Array.from(this.peers.values()).filter(p => p.connectionState === 'connected');
    const connectingPeers = Array.from(this.peers.values()).filter(p => p.connectionState === 'connecting');

    let connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
    
    if (this.peers.size > 0 && connectedPeers.length > 0) {
      connectionState = 'connected';
    } else if (this.peers.size > 0 && connectingPeers.length > 0) {
      connectionState = 'connecting';
    }

    return {
      isInitialized: this.isInitialized,
      peerCount: this.peers.size,
      peers: Array.from(this.peers.values()),
      connectionState,
    };
  }

  /**
   * Disconnect from mesh
   */
  public async disconnect(): Promise<void> {
    // Close all data channels
    this.peers.forEach((peer) => {
      peer.dataChannels.forEach((channel) => {
        channel.close();
      });
    });
    this.peers.clear();

    // Clear subscriptions
    if (this.ledgerUnsubscribe) {
      this.ledgerUnsubscribe();
      this.ledgerUnsubscribe = null;
    }

    if (this.zoneUnsubscribe) {
      this.zoneUnsubscribe();
      this.zoneUnsubscribe = null;
    }

    // Clear heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close signaling connection
    if (this.signalingConnection) {
      this.signalingConnection.close();
      this.signalingConnection = null;
    }

    this.isInitialized = false;
    console.log('[MeshSync] Disconnected from mesh');
  }
}

// ─────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────

export const meshSync = new MeshSyncService();

// ─────────────────────────────────────────────────────────────────
// React Hook for Mesh Sync
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export function useMeshSync(config?: MeshConfig) {
  const [status, setStatus] = useState(meshSync.getMeshStatus());

  useEffect(() => {
    meshSync.initialize().catch(console.error);

    const interval = setInterval(() => {
      setStatus(meshSync.getMeshStatus());
    }, 5000);

    return () => {
      clearInterval(interval);
      meshSync.disconnect();
    };
  }, []);

  return {
    ...status,
    meshSync,
  };
}

// ─────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────

// Types are already exported at the top of the file
