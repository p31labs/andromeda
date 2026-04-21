/**
 * CWP-18: WebSocket Hibernation Room
 * CWP-19: Alarm-Based Telemetry Flush
 *
 * 8-socket K₄ family mesh room with:
 * - Zero-duration-billing hibernation
 * - Auto ping/pong without waking
 * - SQLite-buffered telemetry with 30s alarm flush to D1
 * - At-least-once delivery with exponential retry
 */

export class FamilyMeshRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.MAX_WS = 8;
    this.FLUSH_INTERVAL_MS = parseInt(env.FLUSH_INTERVAL_MS || "30000", 10);

    // Initialize SQLite schema
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS telemetry_pending (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        node_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        ts INTEGER NOT NULL
      )
    `);

    // Rebuild sessions from hibernated WebSockets
    this.sessions = new Map();
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const att = ws.deserializeAttachment();
        if (att) this.sessions.set(ws, att);
      } catch { /* orphaned socket */ }
    }

    // Heartbeat auto-reply: keeps connections alive without waking the DO
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }

  async fetch(request) {
    const url = new URL(request.url);

    // POST /synthesis — from Reflective Chamber Workflow
    if (url.pathname === '/synthesis' && request.method === 'POST') {
      const synthesis = await request.json();
      this.ctx.storage.sql.exec(
        "INSERT INTO telemetry_pending (kind, node_id, payload, ts) VALUES (?, ?, ?, ?)",
        'weekly_synthesis', 'system', JSON.stringify(synthesis), Date.now()
      );
      return new Response('ok');
    }

    // POST /checkin-queue — from Reflective Chamber
    if (url.pathname === '/checkin-queue' && request.method === 'POST') {
      const data = await request.json();
      this.ctx.storage.sql.exec(
        "INSERT INTO telemetry_pending (kind, node_id, payload, ts) VALUES (?, ?, ?, ?)",
        'checkin_scheduled', 'system', JSON.stringify(data), Date.now()
      );
      return new Response('ok');
    }

    // GET /stats — mesh status
    if (url.pathname === '/stats') {
      const pending = this.ctx.storage.sql
        .exec("SELECT COUNT(*) as c FROM telemetry_pending").one();
      return Response.json({
        connections: this.ctx.getWebSockets().length,
        maxConnections: this.MAX_WS,
        pendingTelemetry: pending?.c ?? 0,
        sessions: [...this.sessions.values()].map(s => ({
          nodeId: s.nodeId,
          joinedAt: s.joinedAt,
        })),
      });
    }

    // WebSocket upgrade
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const activeWS = this.ctx.getWebSockets();
    if (activeWS.length >= this.MAX_WS) {
      return new Response("K4 mesh full (8/8)", { status: 429 });
    }

    const nodeId = url.searchParams.get("node") || "anonymous";
    const roomId = url.searchParams.get("room") || "family-alpha";

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    const attachment = { nodeId, roomId, joinedAt: Date.now() };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    this.sessions.set(server, attachment);

    // Announce join to other sockets
    const joinMsg = JSON.stringify({
      type: "system",
      event: "join",
      nodeId,
      timestamp: Date.now(),
      online: activeWS.length + 1,
    });
    for (const ws of activeWS) {
      try { ws.send(joinMsg); } catch { /* stale socket */ }
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const att = this.sessions.get(ws) || ws.deserializeAttachment() || {};
    const nodeId = att.nodeId || "unknown";
    const msgStr = typeof message === "string" ? message : new TextDecoder().decode(message);

    // Persist BEFORE broadcast — survives eviction
    this.ctx.storage.sql.exec(
      "INSERT INTO telemetry_pending (kind, node_id, payload, ts) VALUES (?, ?, ?, ?)",
      'chat', nodeId, msgStr, Date.now()
    );

    // Arm flush alarm if not already set
    const existingAlarm = await this.ctx.storage.getAlarm();
    if (existingAlarm === null) {
      await this.ctx.storage.setAlarm(Date.now() + this.FLUSH_INTERVAL_MS);
    }

    // Broadcast to all OTHER sockets (sender already has the message)
    const broadcast = JSON.stringify({
      type: "message",
      nodeId,
      content: msgStr,
      timestamp: Date.now(),
    });

    for (const peer of this.ctx.getWebSockets()) {
      if (peer !== ws) {
        try { peer.send(broadcast); } catch { /* stale */ }
      }
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    const att = this.sessions.get(ws);
    this.sessions.delete(ws);

    if (att) {
      const leaveMsg = JSON.stringify({
        type: "system",
        event: "leave",
        nodeId: att.nodeId,
        timestamp: Date.now(),
        online: this.ctx.getWebSockets().length,
      });
      for (const peer of this.ctx.getWebSockets()) {
        try { peer.send(leaveMsg); } catch { /* stale */ }
      }
    }
  }

  async webSocketError(ws, error) {
    this.sessions.delete(ws);
    try { ws.close(1011, "WebSocket error"); } catch { /* already closed */ }
  }

  /**
   * CWP-19: Alarm-based telemetry flush
   * At-least-once delivery with exponential retry
   */
  async alarm(alarmInfo) {
    const rows = this.ctx.storage.sql
      .exec("SELECT id, kind, node_id, payload, ts FROM telemetry_pending ORDER BY id LIMIT 500")
      .toArray();

    if (rows.length === 0) return;

    try {
      // Batch insert to D1
      if (this.env.DB) {
        const stmts = rows.map(r =>
          this.env.DB.prepare(
            "INSERT INTO telemetry (room_id, node_id, kind, payload, ts, flushed_at) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind("family", r.node_id, r.kind, r.payload, r.ts, Date.now())
        );
        await this.env.DB.batch(stmts);
      }

      // Delete flushed rows
      const ids = rows.map(r => r.id);
      this.ctx.storage.sql.exec(
        `DELETE FROM telemetry_pending WHERE id IN (${ids.map(() => "?").join(",")})`,
        ...ids
      );

      // Check if more rows remain
      const remaining = this.ctx.storage.sql
        .exec("SELECT COUNT(*) as c FROM telemetry_pending").one();
      if (remaining && remaining.c > 0) {
        await this.ctx.storage.setAlarm(Date.now() + this.FLUSH_INTERVAL_MS);
      }
    } catch (err) {
      const retryCount = alarmInfo?.retryCount ?? 0;
      if (retryCount >= 5) {
        // Park for 5 minutes after 6 failures
        console.error(`[CWP-19] Flush exhausted 6 retries, parking 5min: ${err.message}`);
        await this.ctx.storage.setAlarm(Date.now() + 5 * 60 * 1000);
        return; // Don't re-throw — prevents infinite retry
      }
      throw err; // Let platform retry with exponential backoff
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route /ws/* to FamilyMeshRoom DO
    if (url.pathname.startsWith('/ws/')) {
      const roomId = url.pathname.split('/')[2] || 'family-alpha';
      const id = env.FAMILY_MESH_ROOM.idFromName(roomId);
      const stub = env.FAMILY_MESH_ROOM.get(id);
      return stub.fetch(request);
    }

    // Route /room-stats/* to FamilyMeshRoom stats
    if (url.pathname.startsWith('/room-stats/')) {
      const roomId = url.pathname.split('/')[2] || 'family-alpha';
      const id = env.FAMILY_MESH_ROOM.idFromName(roomId);
      const stub = env.FAMILY_MESH_ROOM.get(id);
      return stub.fetch(new Request(new URL('/stats', request.url)));
    }

    return new Response('k4-cage alive', { status: 200 });
  }
};