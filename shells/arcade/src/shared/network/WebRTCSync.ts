import { PGLiteDatabaseContract } from '../db/pglite-fallback';

export interface SyncMessage {
  type: 'SYNC_EVENT' | 'CHAT' | 'TURN' | 'IDENTITY';
  table?: string;
  payload: any;
  crdt_clock?: number;
}

/**
  * WebRTCSync manages peer-to-peer data synchronization for PGLite.
  * Designed for serverless/QR-based signaling to maintain local-first sovereignty.
  */
export interface NetworkStats {
  packetsSent: number;
  packetsReceived: number;
  bytesSent: number;
  bytesReceived: number;
  latency: number;
}

export class WebRTCSync {
  private peerConnection: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private db: PGLiteDatabaseContract;
  private onConnectionStateChange?: (state: string) => void;
  private onSync?: (msg: SyncMessage) => void;

  private stats: NetworkStats = {
    packetsSent: 0,
    packetsReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    latency: 0
  };

  constructor(db: PGLiteDatabaseContract, options: {
    onConnectionStateChange?: (state: string) => void;
    onSync?: (msg: SyncMessage) => void;
  } = {}) {
    this.db = db;
    this.onConnectionStateChange = options.onConnectionStateChange;
    this.onSync = options.onSync;

    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.peerConnection.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(this.peerConnection.connectionState);
    };

    // Receiver side: data channel event
    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.dataChannel.onmessage = (e) => {
      this.stats.packetsReceived++;
      this.stats.bytesReceived += typeof e.data === 'string' ? e.data.length : (e.data as Blob).size || 0;
      this.handleIncomingMessage(e.data);
    };
    this.dataChannel.onopen = () => console.log("[WebRTCSync] DataChannel Open");
  }

  private async handleIncomingMessage(data: string) {
    try {
      const msg: SyncMessage = JSON.parse(data);
      console.log("[WebRTCSync] Received:", msg);

      if (msg.type === 'SYNC_EVENT' && msg.table) {
        // LWW (Last Write Wins) CRDT Merge based on _crdt_clock
        const { table, payload } = msg;
        const keys = Object.keys(payload);
        const values = Object.values(payload);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        // Using query instead of exec for better param safety
        await this.db.query(`
          INSERT INTO ${table} (${keys.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET
            ${keys.map(k => `${k} = EXCLUDED.${k}`).join(', ')}
          WHERE EXCLUDED._crdt_clock > ${table}._crdt_clock
        `, values);
      }

      this.onSync?.(msg);
    } catch (err) {
      console.error("[WebRTCSync] Failed to process message:", err);
    }
  }

  public async createOffer(): Promise<string> {
    this.setupDataChannel(this.peerConnection.createDataChannel('p31-sync'));
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // In a real local-mesh scenario, we wait for ICE gathering to complete or use trickle ICE
    // For QR simplicity, we return the SDP after a short delay or full gathering
    return new Promise((resolve) => {
      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve(JSON.stringify(this.peerConnection.localDescription));
      } else {
        this.peerConnection.onicecandidate = (event) => {
          if (!event.candidate) {
            resolve(JSON.stringify(this.peerConnection.localDescription));
          }
        };
      }
    });
  }

  public async handleOffer(offerSdp: string): Promise<string> {
    const offer = JSON.parse(offerSdp);
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    return new Promise((resolve) => {
      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve(JSON.stringify(this.peerConnection.localDescription));
      } else {
        this.peerConnection.onicecandidate = (event) => {
          if (!event.candidate) {
            resolve(JSON.stringify(this.peerConnection.localDescription));
          }
        };
      }
    });
  }

  public async handleAnswer(answerSdp: string) {
    const answer = JSON.parse(answerSdp);
    await this.peerConnection.setRemoteDescription(answer);
  }
  public broadcastSync(table: string, payload: any) {
    if (this.dataChannel?.readyState === 'open') {
      const start = performance.now();
      const msg: SyncMessage = {
        type: 'SYNC_EVENT',
        table,
        payload
      };
      const data = JSON.stringify(msg);
      this.stats.packetsSent++;
      this.stats.bytesSent += data.length;
      this.dataChannel.send(data);
      this.stats.latency = performance.now() - start;
    }
  }

  public send(msg: SyncMessage) {
    if (this.dataChannel?.readyState === 'open') {
      const data = JSON.stringify(msg);
      this.stats.packetsSent++;
      this.stats.bytesSent += data.length;
      this.dataChannel.send(data);
    }
  }

  public getStats(): NetworkStats {
    return { ...this.stats };
  }
}
