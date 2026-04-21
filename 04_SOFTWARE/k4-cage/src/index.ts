/**
 * CWP-18: WebSocket Hibernation Room
 * CWP-19: Alarm-Based Telemetry Flush
 * 
 * Implements:
 * - Hibernating WebSocket room with SQLite state
 * - Auto-response ping/pong (zero billing)
 * - 8-connection cap
 * - 30-second alarm batch flush to D1
 */

export interface Env {
  FAMILY_MESH_ROOM: DurableObjectNamespace;
  DB: D1Database;
  FLUSH_INTERVAL_MS: string;
}

interface WSAttachment {
  userId: string;
  roomId: string;
  joinedAt: number;
}

interface TelemetryRow {
  id: number;
  kind: string;
  payload: string;
  ts: number;
}

export class FamilyMeshRoom extends DurableObject<Env> {
  static readonly MAX_WS = 8;
  static readonly FLUSH_MS = 30000;

  private sessions: Map<WebSocket, WSAttachment>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();

    // Initialize SQLite schema
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS telemetry_pending (
        id INTEGER PRIMARY KEY,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        ts INTEGER NOT NULL
      )
    `);

    // Reconstruct sessions from existing WebSockets
    for (const ws of ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as WSAttachment | null;
      if (att) this.sessions.set(ws, att);
    }

    // Auto-response ping → pong (zero billing, no wake)
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const roomId = url.pathname.split("/")[2] ?? "default";
    const userId = url.searchParams.get("node") ?? "anonymous";

    const currentWs = this.ctx.getWebSockets();
    if (currentWs.length >= FamilyMeshRoom.MAX_WS) {
      return new Response("K4 mesh full", { status: 429 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    // Store attachment for session rebuild
    server.serializeAttachment({
      userId,
      roomId,
      joinedAt: Date.now(),
    });

    this.ctx.acceptWebSocket(server, [`user:${userId}`, `room:${roomId}`]);
    this.sessions.set(server, { userId, roomId, joinedAt: Date.now() });

    // Broadcast join
    this.broadcast({
      type: "system",
      action: "join",
      userId,
      ts: Date.now(),
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer): Promise<void> {
    const att = this.sessions.get(ws);
    if (!att) return;

    const payload = typeof msg === "string" ? msg : new TextDecoder().decode(msg);

    // Persist to SQLite (survives eviction)
    this.ctx.storage.sql.exec(
      "INSERT INTO telemetry_pending (kind, payload, ts) VALUES (?, ?, ?)",
      "chat",
      payload,
      Date.now()
    );

    // Broadcast to other connections
    this.broadcast({
      type: "chat",
      userId: att.userId,
      content: payload,
      ts: Date.now(),
    });

    // Arm alarm if not already armed
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + FamilyMeshRoom.FLUSH_MS);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = this.sessions.get(ws);
    if (att) {
      this.broadcast({
        type: "system",
        action: "leave",
        userId: att.userId,
        ts: Date.now(),
      });
      this.sessions.delete(ws);
    }
  }

  async alarm(info?: { retryCount: number; isRetry: boolean }): Promise<void> {
    const rows = this.ctx.storage.sql
      .exec<TelemetryRow>(
        "SELECT id, kind, payload, ts FROM telemetry_pending ORDER BY id LIMIT 500"
      )
      .toArray();

    if (rows.length === 0) return;

    try {
      const stmts = rows.map((r) =>
        this.env.DB.prepare(
          "INSERT INTO telemetry (room_id, node_id, kind, payload, ts, flushed_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
      );

      await this.env.DB.batch(stmts);

      // Delete after successful flush
      const ids = rows.map((r) => r.id);
      this.ctx.storage.sql.exec(
        `DELETE FROM telemetry_pending WHERE id IN (${ids.map(() => "?").join(",")})`,
        ...ids
      );

      // Re-arm if more pending
      const remaining = this.ctx.storage.sql
        .exec<{ c: number }>("SELECT COUNT(*) as c FROM telemetry_pending")
        .one();
      if (remaining && remaining.c > 0) {
        await this.ctx.storage.setAlarm(Date.now() + FamilyMeshRoom.FLUSH_MS);
      }
    } catch (err) {
      console.error("[TelemetryFlush] error:", err);
      if (info && info.retryCount >= 5) {
        await this.ctx.storage.setAlarm(Date.now() + 5 * 60 * 1000);
        return;
      }
      throw err;
    }
  }

  private broadcast(data: Record<string, unknown>): void {
    const msg = JSON.stringify(data);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(msg);
      } catch {
        // Connection may be closed, ignore
      }
    }
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");

    if (pathParts[1] === "ws" && pathParts[2]) {
      const roomId = pathParts[2];
      const id = env.FAMILY_MESH_ROOM.idFromName(roomId);
      const stub = env.FAMILY_MESH_ROOM.get(id);
      return stub.fetch(req);
    }

    if (pathParts[1] === "api" && pathParts[2] === "mesh") {
      return Response.json({
        onlineCount: 4,
        totalLove: 0,
        nodes: [
          { id: "will", status: "active" },
          { id: "brenda", status: "active" },
          { id: "otto", status: "active" },
          { id: "cora", status: "active" },
        ],
      });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;