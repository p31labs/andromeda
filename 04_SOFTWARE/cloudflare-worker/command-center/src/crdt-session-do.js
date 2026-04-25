// CRDT Session Durable Object
// Manages real-time multi-user mesh editing with conflict resolution
class CrdtSessionDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // sessionId -> WebSocket
    this.vectorClock = {}; // nodeId -> timestamp
    this.sessionNodeMap = {}; // sessionId -> nodeId (which node this session is "at")
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    const stored = await this.state.storage.get('vectorClock');
    if (stored) this.vectorClock = stored;
    this.initialized = true;
  }

  async fetch(request) {
    await this.initialize();
    const url = new URL(request.url);
    
    // WebTransport endpoint (HTTP/3 QUIC)
    if (url.pathname === '/api/crdt/quic' && 
        request.headers.get('Upgrade') === 'webtransport') {
      return this.handleWebTransport(request);
    }

    // WebSocket endpoint (HTTP/1.1)
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Standard HTTP endpoints
    if (url.pathname === '/state' && request.method === 'GET') {
      const meshState = await this.env.EPCP_DB.prepare(
        'SELECT key, value, vector_clock FROM mesh_state ORDER BY updated_at DESC LIMIT 100'
      ).all();
      return new Response(JSON.stringify({
        mesh_state: meshState.results || [],
        vector_clock: this.vectorClock
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('OK', { status: 200 });
  }

  async handleWebTransport(request) {
    // Accept WebTransport session
    const webtransportSession = await this.env.CRDT_SESSION_DO.get(
      this.state.idFromName('webtransport')
    ).fetch(request);
    
    return webtransportSession;
  }

  async handleWebTransportDatagram(sessionId, datagram) {
    // Process incoming QUIC datagram
    const decoder = new TextDecoder();
    const length = datagram[0];
    const vcStr = decoder.decode(datagram.slice(1, 1 + length));
    const payloadStr = decoder.decode(datagram.slice(1 + length));
    
    const vectorClock = JSON.parse(vcStr);
    const payload = JSON.parse(payloadStr);
    
    await this.handleMeshUpdateFromQuic(sessionId, vectorClock, payload);
  }

  async handleMeshUpdateFromQuic(sessionId, vectorClock, payload) {
    // Same CRDT logic as WebSocket handler
    if (!this.isNewerVector(vectorClock, payload.key)) {
      return; // Conflict detected
    }
    
    this.vectorClock[payload.key] = Date.now();
    await this.state.storage.put('vectorClock', this.vectorClock);
    
    // Broadcast to all connected clients
    this.broadcast({
      type: 'mesh_updated',
      key: payload.key,
      value: payload.value,
      vector_clock: this.vectorClock,
      source_session: sessionId,
      transport: 'quic'
    }, sessionId);
    
    // Broadcast mesh_message for visualization
    const fromNode = this.sessionNodeMap[sessionId] || 'unknown';
    this.broadcast({
      type: 'mesh_message',
      from: fromNode,
      to: payload.key,
      msgType: 'update',
      source_session: sessionId
    });
  }


  async handleWebSocket(request) {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    
    const sessionId = crypto.randomUUID();
    server.accept();
    this.sessions.set(sessionId, server);
    
    // Capture which node this session is associated with (from URL param)
    const url = new URL(request.url);
    const nodeId = url.searchParams.get('node_id') || 'unknown';
    this.sessionNodeMap[sessionId] = nodeId;
    
    server.send(JSON.stringify({
      type: 'connected',
      session_id: sessionId,
      vector_clock: this.vectorClock,
      node_id: nodeId
    }));

    server.addEventListener('message', async (event) => {
      try {
        const msg = JSON.parse(event.data);
        await this.handleMessage(sessionId, msg);
      } catch (e) {
        server.send(JSON.stringify({ type: 'error', message: e.message }));
      }
    });

    server.addEventListener('close', () => {
      this.sessions.delete(sessionId);
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleMessage(sessionId, msg) {
    switch (msg.type) {
      case 'mesh_update':
        await this.handleMeshUpdate(sessionId, msg);
        break;
      case 'get_state':
        await this.broadcastState(sessionId);
        break;
    }
  }

  async handleMeshUpdate(sessionId, msg) {
    const { key, value, vector_clock: clientVC } = msg;
    const serverWS = this.sessions.get(sessionId);

    if (!this.isNewerVector(clientVC, key)) {
      serverWS.send(JSON.stringify({
        type: 'conflict',
        key,
        message: 'Outdated vector clock'
      }));
      return;
    }

    this.vectorClock[key] = Date.now();
    await this.state.storage.put('vectorClock', this.vectorClock);

    await this.env.EPCP_DB.prepare(
      `INSERT OR REPLACE INTO mesh_state (key, value, updated_at, vector_clock)
       VALUES (?, ?, ?, ?)`
    ).bind(key, JSON.stringify(value), Date.now(), JSON.stringify(this.vectorClock)).run();

    this.broadcast({
      type: 'mesh_updated',
      key,
      value,
      vector_clock: this.vectorClock,
      source_session: sessionId
    }, sessionId);
    
    // Broadcast mesh_message for particle flow visualization
    const fromNode = this.sessionNodeMap[sessionId] || 'unknown';
    this.broadcast({
      type: 'mesh_message',
      from: fromNode,
      to: key,
      msgType: 'update',
      source_session: sessionId
    }); // Send to ALL including source
  }

  isNewerVector(clientVC, key) {
    const serverTS = this.vectorClock[key] || 0;
    const clientTS = clientVC?.[key] || 0;
    return clientTS >= serverTS;
  }

  broadcast(msg, excludeSessionId) {
    const data = JSON.stringify(msg);
    for (const [id, ws] of this.sessions) {
      if (id !== excludeSessionId) {
        try { ws.send(data); } catch (e) { this.sessions.delete(id); }
      }
    }
  }

  async broadcastState(sessionId) {
    const ws = this.sessions.get(sessionId);
    if (!ws) return;
    const meshState = await this.env.EPCP_DB.prepare(
      'SELECT key, value, vector_clock FROM mesh_state ORDER BY updated_at DESC LIMIT 100'
    ).all();
    ws.send(JSON.stringify({
      type: 'full_state',
      mesh_state: meshState.results || [],
      vector_clock: this.vectorClock
    }));
  }
}

module.exports = { CrdtSessionDO };
