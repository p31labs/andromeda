/**
 * Hub base — shared Durable Object behavior for all four K₄ agent hubs.
 *
 * Each hub keeps:
 *   - a per-client `sessions` table (sessionId, clientId, expires_at)
 *   - a `calls` log (audit trail; rotated by alarm to MESSAGES_MAX_ROWS)
 *   - a `pulse` (last-seen timestamp; powers /v1/{hub}/health load estimate)
 */

import { DurableObject } from "cloudflare:workers";
import { ADJACENCY, ANCHOR_FOR, PERSONAL_DOCK_FOR, SKILLS, VERB_FOR } from "./topology.js";
import { extractSessionId, forbidden, methodNotAllowed, notFound, ok, readSession, unauthorized, verifyCallEnvelope } from "./dock-protocol.js";
import { dispatch } from "./dispatcher.js";
import { WS_EVENT_SCHEMA, buildBroadcastEvent, buildDockEvent, buildCallEvent } from "./ws-events.js";

const MAX_CALLS_LOG = 1000;

export class HubBase extends DurableObject {
  /** @type {string} subclass sets via `static get hubId()`. */
  get hubId() {
    throw new Error("HubBase: subclass must override hubId");
  }

  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sessionId TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId TEXT,
        skillId TEXT NOT NULL,
        ts INTEGER NOT NULL,
        ms INTEGER,
        status INTEGER,
        bytes_in INTEGER,
        bytes_out INTEGER
      );
      CREATE TABLE IF NOT EXISTS pulse (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);
    // Strip the /v1/{hubId} prefix if the parent Worker forwarded the full path.
    const tail = url.pathname.replace(new RegExp(`^/v1/${this.hubId}`), "") || "/";

    if (tail === "/health" && request.method === "GET") {
      return this._handleHealth();
    }
    if (tail === "/call" && request.method === "POST") {
      return this._handleCall(request);
    }
    if (tail === "/skills" && request.method === "GET") {
      return ok({ ok: true, hub: this.hubId, skills: SKILLS[this.hubId] });
    }
    if (tail === "/metrics" && request.method === "GET") {
      return this.metrics();
    }
    if (tail === "/edge" && request.method === "POST") {
      return this._handleEdge(request);
    }
    if (tail === "/stream" && request.headers.get("upgrade") === "websocket") {
      return this._handleWebSocket(request);
    }
    if (request.method !== "GET" && request.method !== "POST") {
      return methodNotAllowed("GET, POST");
    }
    return notFound(`unknown route ${tail} on hub ${this.hubId}`);
  }

  async _handleHealth() {
    // Crude load estimate: count of calls in the last 60s, normalized to RATE_LIMIT_RPM.
    const since = Date.now() - 60_000;
    const row = this.ctx.storage.sql.exec(
      "SELECT COUNT(*) AS c FROM calls WHERE ts > ?",
      since,
    ).one();
    const recent = row?.c ?? 0;
    const cap = Number(this.env.RATE_LIMIT_RPM ?? 30);
    const load = cap > 0 ? Math.min(1, recent / cap) : 0;
    return ok({
      ok: true,
      schema: "p31.k4AgentHub/1.0.0",
      hub: this.hubId,
      verb: VERB_FOR[this.hubId],
      anchor: ANCHOR_FOR[this.hubId],
      personalDock: PERSONAL_DOCK_FOR[this.hubId],
      load,
      recent60s: recent,
      skills: SKILLS[this.hubId].map((s) => s.id),
      pulse: Date.now(),
    });
  }

  async _handleCall(request) {
    const sessionId = extractSessionId(request);
    const session = await readSession(this.env, sessionId);
    if (!session) return unauthorized();

    let body;
    try {
      body = await request.json();
    } catch {
      return ok({ ok: false, error: "body must be JSON" }, { "x-cause": "parse" });
    }

    // Per-call signed envelope when the session was signed-dock.
    const env = await verifyCallEnvelope(this.env, session, body);
    if (!env.ok) return forbidden(env.error);

    const skillId = String(body?.skillId ?? "");
    const skill = SKILLS[this.hubId].find((s) => s.id === skillId);
    if (!skill) {
      return ok({ ok: false, error: `unknown skill ${skillId} on hub ${this.hubId}`, available: SKILLS[this.hubId].map((s) => s.id) });
    }
    if (!session.allowedSkills.includes(skillId)) {
      return forbidden(`skill ${skillId} not in this session's allowedSkills`);
    }
    if (skill.gate === "child-mesh-unlock") {
      const headerGate = request.headers.get("x-p31-child-mesh") === "1";
      if (!headerGate) {
        return forbidden("child-mesh-unlock required for this skill (matrix row 8)");
      }
    }

    // Hub-specific dispatch — subclasses override `runSkill`.
    const startedAt = Date.now();
    let result;
    try {
      result = await this.runSkill(skill, body?.input ?? {}, request);
    } catch (e) {
      result = { ok: false, error: String(e?.message ?? e) };
    }
    const ms = Date.now() - startedAt;

    this.ctx.storage.sql.exec(
      "INSERT INTO calls (sessionId, skillId, ts, ms, status, bytes_in, bytes_out) VALUES (?,?,?,?,?,?,?)",
      sessionId,
      skillId,
      Date.now(),
      ms,
      result.ok === false ? 500 : 200,
      Number(request.headers.get("content-length") ?? 0),
      JSON.stringify(result).length,
    );
    this._trimCalls();
    this._broadcast("call", buildCallEvent(this.hubId, skillId, sessionId, result?.dispatcher ?? "echo"));
    return ok({
      ok: true,
      hub: this.hubId,
      skillId,
      ms,
      result,
    });
  }

  /**
   * Default skill dispatcher — tries the local Ollama HTTP API when
   * env.OLLAMA_BASE_URL is set, otherwise returns a structured echo.
   * Subclasses can override to add edge-call enrichment (see hubs.js).
   */
  async runSkill(skill, input) {
    return await dispatch({ env: this.env, hubId: this.hubId, skill, input });
  }

  /**
   * Inter-hub edge call — used by subclasses that want to enrich a skill
   * answer with a sibling hub's response (e.g., FORGE asking SCHOLAR for
   * context before generating code). Adjacency-checked; v1.1.0 always
   * returns `true` since K₄ is complete, but the check prevents non-K₄
   * misuse if topology is later widened.
   */
  async edgeCall(toHubId, payload) {
    if (!ADJACENCY[this.hubId] || !ADJACENCY[this.hubId].includes(toHubId)) {
      return { ok: false, error: `no K₄ edge ${this.hubId}↔${toHubId}` };
    }
    const bindingName = toHubId.toUpperCase();
    const ns = this.env[bindingName];
    if (!ns) return { ok: false, error: `binding ${bindingName} not configured` };
    const stub = ns.get(ns.idFromName("singleton"));
    const req = new Request(`https://internal/v1/${toHubId}/edge`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-p31-edge-from": this.hubId },
      body: JSON.stringify(payload ?? {}),
    });
    try {
      const resp = await stub.fetch(req);
      return await resp.json();
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) };
    }
  }

  /** Inter-hub edge handler — accepts brief requests from sibling hubs. */
  async _handleEdge(request) {
    let body = {};
    try { body = await request.json(); } catch { /* tolerate empty */ }
    const fromHub = request.headers.get("x-p31-edge-from") || "unknown";
    return ok({
      ok: true,
      hub: this.hubId,
      verb: VERB_FOR[this.hubId],
      from: fromHub,
      brief: this.edgeBrief(fromHub, body),
      ts: Date.now(),
    });
  }

  /** Subclasses override to provide a pithy edge brief; default echoes input. */
  edgeBrief(fromHub, body) {
    return { hub: this.hubId, askedBy: fromHub, body };
  }

  /** Aggregate metrics for /v1/metrics. */
  async metrics() {
    const total = this.ctx.storage.sql.exec("SELECT COUNT(*) AS c FROM calls").one();
    const recent = this.ctx.storage.sql.exec(
      "SELECT COUNT(*) AS c FROM calls WHERE ts > ?",
      Date.now() - 60_000,
    ).one();
    const errs = this.ctx.storage.sql.exec(
      "SELECT COUNT(*) AS c FROM calls WHERE status >= 400",
    ).one();
    const avg = this.ctx.storage.sql.exec(
      "SELECT AVG(ms) AS a FROM calls",
    ).one();
    const last = this.ctx.storage.sql.exec(
      "SELECT MAX(ts) AS t FROM calls",
    ).one();
    return ok({
      ok: true,
      hub: this.hubId,
      verb: VERB_FOR[this.hubId],
      anchor: ANCHOR_FOR[this.hubId],
      personalDock: PERSONAL_DOCK_FOR[this.hubId],
      callsTotal: total?.c ?? 0,
      callsRecent60s: recent?.c ?? 0,
      errorsTotal: errs?.c ?? 0,
      avgMs: Math.round(avg?.a ?? 0),
      lastCallAt: last?.t ?? null,
      skills: SKILLS[this.hubId].map((s) => s.id),
    });
  }

  _trimCalls() {
    const row = this.ctx.storage.sql.exec("SELECT COUNT(*) AS c FROM calls").one();
    const c = row?.c ?? 0;
    if (c > MAX_CALLS_LOG) {
      const drop = c - MAX_CALLS_LOG;
      this.ctx.storage.sql.exec(
        "DELETE FROM calls WHERE id IN (SELECT id FROM calls ORDER BY id ASC LIMIT ?)",
        drop,
      );
    }
  }

  /** WebSocket stream — hibernatable WS; broadcasts call + dock events to all clients. */
  async _handleWebSocket(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify(buildBroadcastEvent("hello", { hub: this.hubId })));
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Hibernatable WS lifecycle — message handler. */
  async webSocketMessage(ws, data) {
    try {
      const msg = JSON.parse(typeof data === "string" ? data : "");
      if (msg?.kind === "ping") {
        ws.send(JSON.stringify(buildBroadcastEvent("pong", { hub: this.hubId })));
        return;
      }
      ws.send(JSON.stringify(buildBroadcastEvent("echo", { hub: this.hubId, msg })));
    } catch {
      ws.send(JSON.stringify(buildBroadcastEvent("parse-error", { hub: this.hubId })));
    }
  }

  webSocketClose(ws) { ws.close(); }
  webSocketError() {}

  /** Broadcast a pre-built event to all connected WebSocket clients on this hub. */
  _broadcast(_kind, event) {
    const sockets = this.ctx.getWebSockets();
    if (!sockets.length) return;
    const msg = JSON.stringify(event);
    for (const ws of sockets) {
      try { ws.send(msg); } catch { /* skip closed sockets */ }
    }
  }
}
