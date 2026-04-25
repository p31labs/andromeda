// src/crdt-transport.js
// Hybrid WebTransport/WebSocket connection for CRDT mesh
// Supports HTTP/3 QUIC datagrams with WebSocket fallback

export class CrdtTransport {
  constructor(endpoint, options = {}) {
    this.endpoint = endpoint;
    this.priority = options.priority || 'quic'; // 'quic' | 'websocket'
    this.webtransport = null;
    this.websocket = null;
    this.datagrams = null;
    this.state = 'disconnected';
    this.messageHandler = options.onMessage || null;
  }

  async connect() {
    if (this.priority === 'quic' && this.supportsWebTransport()) {
      return this.connectWebTransport();
    }
    return this.connectWebSocket();
  }

  supportsWebTransport() {
    return 'WebTransport' in window && 
           window.WebTransport.prototype.datagrams !== undefined;
  }

  async connectWebTransport() {
    try {
      const url = `https://${window.location.host}/api/crdt/quic`;
      this.webtransport = new WebTransport(url);
      
      await this.webtransport.ready;
      this.datagrams = this.webtransport.datagrams;
      
      // Bidirectional stream for CRDT state sync
      const stream = await this.webtransport.createBidirectionalStream();
      this.setupStreamHandlers(stream);
      
      this.state = 'connected-quic';
      console.log('[CRDT] Connected via WebTransport (QUIC)');
      return { type: 'quic', latency: await this.measureQuicLatency() };
      
    } catch (err) {
      console.warn('[CRDT] WebTransport failed, falling back to WebSocket:', err);
      return this.connectWebSocket();
    }
  }

  async connectWebSocket() {
    const url = `wss://${window.location.host}/api/crdt/session`;
    this.websocket = new WebSocket(url);
    
    await new Promise((resolve, reject) => {
      this.websocket.onopen = () => {
        console.log('[CRDT] Connected via WebSocket');
        resolve();
      };
      this.websocket.onerror = reject;
    });
    
    this.state = 'connected-websocket';
    return { type: 'websocket' };
  }

  async sendDatagram(vectorClock, payload) {
    if (this.state === 'connected-quic' && this.datagrams) {
      const packet = this.encodeCrdtPacket(vectorClock, payload);
      await this.datagrams.write(packet);
    } else if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'mesh_update',
        vector_clock: vectorClock,
        value: payload
      }));
    }
  }

  encodeCrdtPacket(vectorClock, payload) {
    const encoder = new TextEncoder();
    const vcStr = JSON.stringify(vectorClock);
    const payloadStr = JSON.stringify(payload);
    const buffer = new Uint8Array(2 + vcStr.length + payloadStr.length);
    
    buffer[0] = vcStr.length;
    buffer.set(encoder.encode(vcStr), 1);
    buffer.set(encoder.encode(payloadStr), 1 + vcStr.length);
    
    return buffer;
  }

  setupStreamHandlers(stream) {
    const reader = stream.readable.getReader();
    const writer = stream.writable.getWriter();
    
    // Read incoming CRDT updates
    const readStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const decoder = new TextDecoder();
          const message = JSON.parse(decoder.decode(value));
          if (this.messageHandler) {
            this.messageHandler(message);
          }
        }
      } catch (err) {
        console.warn('[CRDT] Stream read error:', err);
      }
    };
    
    readStream();
  }

  async measureQuicLatency() {
    const start = performance.now();
    await this.sendDatagram({ ping: start }, { type: 'ping' });
    // Latency measured via echo response
    return performance.now() - start;
  }

  disconnect() {
    if (this.webtransport) {
      this.webtransport.close();
      this.webtransport = null;
    }
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.state = 'disconnected';
  }
}
