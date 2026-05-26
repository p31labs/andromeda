// P31 Smallball Mesh Synchronization Client
// WebRTC + Cloudflare Worker coordination

import type { MeshMessage, Match, StatMutation, UUID } from '../types';
import { getDatabase } from '../db/pglite';

// ============================================
// MESH CLIENT
// ============================================

const SIGNAL_SERVER = import.meta.env.VITE_SIGNAL_SERVER || 'wss://p31-smallball-signal.workers.dev';

interface MeshClientOptions {
  franchiseId: UUID;
  onSync: (mutations: StatMutation[], matches: Match[]) => void;
  onPeerConnect: (peerId: string) => void;
  onPeerDisconnect: (peerId: string) => void;
}

export class MeshClient {
  private franchiseId: UUID;
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private onSync: MeshClientOptions['onSync'];
  private onPeerConnect: MeshClientOptions['onPeerConnect'];
  private onPeerDisconnect: MeshClientOptions['onPeerDisconnect'];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(options: MeshClientOptions) {
    this.franchiseId = options.franchiseId;
    this.onSync = options.onSync;
    this.onPeerConnect = options.onPeerConnect;
    this.onPeerDisconnect = options.onPeerDisconnect;
  }

  // Connect to signaling server
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${SIGNAL_SERVER}/api/signal`);

        this.ws.onopen = () => {
          console.log('[Mesh] Connected to signaling server');
          this.reconnectAttempts = 0;
          this.requestSync();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleSignalMessage(JSON.parse(event.data));
        };

        this.ws.onclose = () => {
          console.log('[Mesh] Disconnected from signaling server');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[Mesh] WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // Request sync with mesh
  private requestSync(): void {
    if (!this.ws) return;

    this.ws.send(JSON.stringify({
      type: 'SYNC_REQUEST',
      franchiseId: this.franchiseId,
      lastClock: Date.now() - 86400000, // Last 24 hours
    }));
  }

  // Handle signaling messages
  private handleSignalMessage(message: MeshMessage | any): void {
    switch (message.type) {
      case 'SYNC_RESPONSE':
        this.onSync(message.mutations || [], message.matches || []);
        break;

      case 'SDP_OFFER':
        this.handleOffer(message.payload, message.from);
        break;

      case 'SDP_ANSWER':
        this.handleAnswer(message.payload);
        break;

      case 'ICE_CANDIDATE':
        this.handleIceCandidate(message.payload);
        break;

      case 'CONNECTED':
        console.log('[Mesh] Session ID:', message.sessionId);
        break;
    }
  }

  // Initiate WebRTC connection to peer
  async connectToPeer(targetSessionId: string): Promise<void> {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Create data channel
    this.dc = this.pc.createDataChannel('smallball-sync', {
      ordered: true,
    });
    this.setupDataChannel(this.dc);

    // ICE handling
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws) {
        this.ws.send(JSON.stringify({
          type: 'ICE_CANDIDATE',
          targetSessionId,
          payload: event.candidate,
        }));
      }
    };

    // Create and send offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    this.ws?.send(JSON.stringify({
      type: 'SDP_OFFER',
      targetSessionId,
      payload: offer,
    }));
  }

  // Handle incoming offer
  private async handleOffer(offer: RTCSessionDescriptionInit, from: string): Promise<void> {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    this.pc.ondatachannel = (event) => {
      this.dc = event.channel;
      this.setupDataChannel(this.dc);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws) {
        this.ws.send(JSON.stringify({
          type: 'ICE_CANDIDATE',
          targetSessionId: from,
          payload: event.candidate,
        }));
      }
    };

    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    this.ws?.send(JSON.stringify({
      type: 'SDP_ANSWER',
      targetSessionId: from,
      payload: answer,
    }));
  }

  // Handle incoming answer
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.pc?.setRemoteDescription(answer);
  }

  // Handle ICE candidate
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.pc?.addIceCandidate(candidate);
  }

  // Setup data channel handlers
  private setupDataChannel(dc: RTCDataChannel): void {
    dc.onopen = () => {
      console.log('[Mesh] Data channel open');
      this.onPeerConnect('peer');
    };

    dc.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleDataChannelMessage(message);
    };

    dc.onclose = () => {
      console.log('[Mesh] Data channel closed');
      this.onPeerDisconnect('peer');
    };
  }

  // Handle data channel messages (direct P2P sync)
  private handleDataChannelMessage(message: any): void {
    switch (message.type) {
      case 'MUTATIONS':
        this.applyMutations(message.mutations);
        break;

      case 'MATCH_RESULT':
        this.applyMatchResult(message.match);
        break;
    }
  }

  // Apply mutations to local database
  private async applyMutations(mutations: StatMutation[]): Promise<void> {
    const db = getDatabase();

    for (const mutation of mutations) {
      await db.query(`
        INSERT INTO player_stat_mutations 
        (id, player_id, mutation_type, delta, xp_yield, applied_at, _crdt_clock, _crdt_node_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        mutation.id,
        mutation.playerId,
        mutation.mutationType,
        mutation.delta,
        mutation.xpYield,
        new Date(mutation.appliedAt),
        mutation.crdtClock,
        'remote-peer',
      ]);
    }
  }

  // Apply match result
  private async applyMatchResult(match: Match): Promise<void> {
    const db = getDatabase();

    await db.query(`
      INSERT INTO matches 
      (id, challenger_franchise_id, defender_franchise_id, seed, challenger_hash, status, created_at, _crdt_clock)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        challenger_hash = EXCLUDED.challenger_hash,
        status = EXCLUDED.status
    `, [
      match.id,
      match.challengerFranchiseId,
      match.defenderFranchiseId,
      match.seed,
      match.challengerHash,
      match.status,
      new Date(match.createdAt),
      match.crdtClock,
    ]);
  }

  // Reconnection logic
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[Mesh] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`[Mesh] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  // Disconnect
  disconnect(): void {
    this.dc?.close();
    this.pc?.close();
    this.ws?.close();
  }
}

// ============================================
// DETERMINISTIC MATCH VALIDATION
// ============================================

export async function requestMatchSeed(matchId: string): Promise<{ seed: number; timestamp: number }> {
  const response = await fetch(`${SIGNAL_SERVER}/api/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId }),
  });

  if (!response.ok) {
    throw new Error('Failed to get match seed');
  }

  return response.json();
}

export async function submitMatchHash(
  matchId: string, 
  hash: string, 
  events: any[]
): Promise<{ received: boolean }> {
  const response = await fetch(`${SIGNAL_SERVER}/api/match/${matchId}/submit-hash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, hash, events }),
  });

  if (!response.ok) {
    throw new Error('Failed to submit match hash');
  }

  return response.json();
}

export async function validateMatchResult(
  matchId: string,
  eventLogHash: string,
  isChallenger: boolean
): Promise<{ valid: boolean | null; status: string }> {
  const response = await fetch(`${SIGNAL_SERVER}/api/match/${matchId}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, eventLogHash, isChallenger }),
  });

  if (!response.ok) {
    throw new Error('Failed to validate match');
  }

  return response.json();
}

// ============================================
// SYNC HOOK
// ============================================

import { useEffect, useState, useCallback } from 'react';

export function useMeshSync(franchiseId: UUID) {
  const [connected, setConnected] = useState(false);
  const [meshStatus, setMeshStatus] = useState<'OFFLINE' | 'CONNECTING' | 'SYNCED'>('OFFLINE');
  const [pendingMutations, setPendingMutations] = useState(0);

  const onSync = useCallback((mutations: StatMutation[]) => {
    setPendingMutations(prev => prev + mutations.length);
  }, []);

  useEffect(() => {
    const client = new MeshClient({
      franchiseId,
      onSync,
      onPeerConnect: () => setConnected(true),
      onPeerDisconnect: () => setConnected(false),
    });

    setMeshStatus('CONNECTING');
    client.connect()
      .then(() => {
        setMeshStatus('SYNCED');
      })
      .catch(() => {
        setMeshStatus('OFFLINE');
      });

    return () => {
      client.disconnect();
    };
  }, [franchiseId, onSync]);

  return { connected, meshStatus, pendingMutations };
}
