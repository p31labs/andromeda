/**
 * WebRTC P2P Synchronization for P31 Card Table
 * Handles real-time multiplayer card game synchronization
 */

import { PGlite } from '@electric-sql/pglite';

export type WebRTCMessageType =
  | 'PEER_JOIN'
  | 'PEER_LEAVE'
  | 'PLAY_CARD'
  | 'BET'
  | 'FOLD'
  | 'COOP_LINK'
  | 'GAME_WIN'
  | 'STATE_SYNC'
  | 'PING';

export interface WebRTCMessage {
  type: WebRTCMessageType;
  payload: Record<string, unknown>;
  timestamp: number;
  sender: string;
  sequence: number;
}

export interface P2PSession {
  sessionId: string;
  localPeerId: string;
  remotePeerId?: string;
  dataChannel?: RTCDataChannel;
  connection?: RTCPeerConnection;
  isConnected: boolean;
}

export class WebRTCSync {
  private db: PGlite;
  private sessions: Map<string, P2PSession> = new Map();
  private messageQueue: WebRTCMessage[] = [];
  private sequenceNumber = 0;
  private onMessageCallbacks: Array<(msg: WebRTCMessage) => void> = [];
  private signalingServer: string;

  constructor(db: PGlite, signalingServer: string = 'wss://chump-edge.trimtab-signal.workers.dev') {
    this.db = db;
    this.signalingServer = signalingServer;
  }

  /**
   * Initialize WebRTC connection
   */
  async initializeSession(sessionId: string, localPeerId: string): Promise<P2PSession> {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);
    const session: P2PSession = {
      sessionId,
      localPeerId,
      connection: pc,
      isConnected: false,
    };

    // Create data channel
    const channel = pc.createDataChannel('game', {
      ordered: true,
      maxRetransmits: 3,
    });

    this.setupDataChannel(channel, session);
    session.dataChannel = channel;

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendSignalingMessage({
          type: 'ICE_CANDIDATE',
          candidate: event.candidate,
          sessionId,
          peerId: localPeerId,
        });
      }
    };

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await this.sendSignalingMessage({
      type: 'OFFER',
      offer,
      sessionId,
      peerId: localPeerId,
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Join existing session
   */
  async joinSession(sessionId: string, localPeerId: string, remotePeerId: string): Promise<P2PSession> {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);
    const session: P2PSession = {
      sessionId,
      localPeerId,
      remotePeerId,
      connection: pc,
      isConnected: false,
    };

    // Handle incoming data channel
    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, session);
      session.dataChannel = event.channel;
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendSignalingMessage({
          type: 'ICE_CANDIDATE',
          candidate: event.candidate,
          sessionId,
          peerId: localPeerId,
        });
      }
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Setup data channel handlers
   */
  private setupDataChannel(channel: RTCDataChannel, session: P2PSession): void {
    channel.onopen = () => {
      console.log('[WebRTC] Data channel opened');
      session.isConnected = true;
      this.triggerLoveEconomyVisual('COOP_LINK_REQUEST');
    };

    channel.onclose = () => {
      console.log('[WebRTC] Data channel closed');
      session.isConnected = false;
    };

    channel.onmessage = async (event) => {
      try {
        const message: WebRTCMessage = JSON.parse(event.data);
        await this.handleIncomingMessage(message, session);
      } catch (err) {
        console.error('[WebRTC] Failed to parse message:', err);
      }
    };
  }

  /**
   * Handle incoming P2P message
   */
  private async handleIncomingMessage(message: WebRTCMessage, session: P2PSession): Promise<void> {
    // Write to local PGLite (source of truth)
    if (message.type === 'PLAY_CARD' || message.type === 'BET' || message.type === 'FOLD') {
      const { sequence_id, payload, sender } = message.payload as {
        sequence_id: number;
        payload: Record<string, unknown>;
        sender: string;
      };

      await this.db.query(
        `INSERT INTO game_events (session_id, sequence_id, actor_pubkey, action_type, action_payload, deterministic_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session_id, sequence_id) DO NOTHING`,
        [
          session.sessionId,
          sequence_id,
          sender,
          message.type,
          JSON.stringify(payload),
          await this.hashMessage(message),
        ]
      );
    }

    // Trigger Love Economy visuals
    if (message.type === 'COOP_LINK') {
      this.triggerLoveEconomyVisual('COOP_LINK_REQUEST');
    } else if (message.type === 'GAME_WIN') {
      this.triggerLoveEconomyVisual('GAME_WIN');
    }

    // Notify subscribers
    this.onMessageCallbacks.forEach(cb => cb(message));
  }

  /**
   * Send message to peer
   */
  sendMessage(sessionId: string, type: WebRTCMessageType, payload: Record<string, unknown>): void {
    const session = this.sessions.get(sessionId);
    if (!session?.dataChannel || !session.isConnected) {
      console.warn('[WebRTC] No active connection');
      return;
    }

    this.sequenceNumber++;

    const message: WebRTCMessage = {
      type,
      payload: {
        ...payload,
        sequence_id: this.sequenceNumber,
        sender: session.localPeerId,
      },
      timestamp: Date.now(),
      sender: session.localPeerId,
      sequence: this.sequenceNumber,
    };

    session.dataChannel.send(JSON.stringify(message));

    // Also write to local DB
    this.handleIncomingMessage(message, session);
  }

  /**
   * Subscribe to messages
   */
  onMessage(callback: (msg: WebRTCMessage) => void): () => void {
    this.onMessageCallbacks.push(callback);
    return () => {
      const idx = this.onMessageCallbacks.indexOf(callback);
      if (idx > -1) this.onMessageCallbacks.splice(idx, 1);
    };
  }

  /**
   * Close session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.dataChannel?.close();
      session.connection?.close();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Send to signaling server (for WebRTC handshake)
   */
  private async sendSignalingMessage(data: unknown): Promise<void> {
    try {
      const response = await fetch(`${this.signalingServer.replace('wss', 'https')}/api/signaling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.warn('[WebRTC] Signaling failed:', response.status);
      }
    } catch (err) {
      console.error('[WebRTC] Signaling error:', err);
    }
  }

  /**
   * Hash message for integrity
   */
  private async hashMessage(message: WebRTCMessage): Promise<string> {
    const data = JSON.stringify(message);
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Trigger Love Economy visual effects
   */
  private triggerLoveEconomyVisual(event: 'COOP_LINK_REQUEST' | 'GAME_WIN'): void {
    // Dispatch custom event for React components to listen
    window.dispatchEvent(new CustomEvent('love-economy-visual', {
      detail: { event, timestamp: Date.now() },
    }));
  }
}

export function createWebRTCSync(db: PGlite): WebRTCSync {
  return new WebRTCSync(db);
}
