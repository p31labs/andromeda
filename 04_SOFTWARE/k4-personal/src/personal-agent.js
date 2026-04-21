/**
 * CWP-23: PersonalAgent Durable Object
 *
 * One instance per user. Isolated SQLite. Scoped tools.
 * The "personal tetrahedron" from the QBD architecture.
 */

export class PersonalAgent {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;

    // Initialize SQLite schema
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        ts INTEGER NOT NULL,
        metadata TEXT DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        label TEXT NOT NULL,
        schedule_ts INTEGER NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS telemetry_pending (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        ts INTEGER NOT NULL
      );
    `);

    // Arm telemetry flush alarm
    this.ctx.storage.getAlarm().then(existing => {
      if (existing === null) {
        this.ctx.storage.setAlarm(Date.now() + parseInt(env.FLUSH_INTERVAL_MS || "30000", 10));
      }
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    switch (url.pathname) {
      case "/chat": return method === "POST" ? this._chat(request) : new Response("Method not allowed", { status: 405 });
      case "/history": return method === "GET" ? this._history(url) : new Response("Method not allowed", { status: 405 });
      case "/state": return ["GET", "PUT"].includes(method) ? this._state(request) : new Response("Method not allowed", { status: 405 });
      case "/reminders": return ["GET", "POST"].includes(method) ? this._reminders(request) : new Response("Method not allowed", { status: 405 });
      case "/energy": return ["GET", "PUT"].includes(method) ? this._energy(request) : new Response("Method not allowed", { status: 405 });
      case "/bio": return method === "POST" ? this._bioIngest(request) : new Response("Method not allowed", { status: 405 });
      case "/health": return Response.json({ status: "ok", agent: "personal" });
      default: return new Response("Not found", { status: 404 });
    }
  }

  async _chat(request) {
    const { message, scope, tools } = await request.json();

    if (!message || typeof message !== "string" || message.length > 4000) {
      return Response.json({ error: "Invalid message" }, { status: 400 });
    }

    // Persist user message
    this.ctx.storage.sql.exec(
      "INSERT INTO messages (role, content, ts) VALUES (?, ?, ?)",
      "user", message, Date.now()
    );

    // Build context from recent history (last 20 messages)
    const historyRows = this.ctx.storage.sql
      .exec("SELECT role, content FROM messages ORDER BY id DESC LIMIT 20")
      .toArray();
    const history = historyRows.reverse().map(m => ({ role: m.role, content: m.content }));

    // Build system prompt with personal context
    const profile = this._getState("profile") || {};
    const energy = this._getState("energy") || { spoons: 10, max: 12 };
    const scrubRules = this._getState("scrub_rules") || [];

    const systemPrompt = [
      `You are a personal assistant for ${profile.name || "this user"}.`,
      `Role: ${profile.role || "mesh participant"}.`,
      `Current energy: ${energy.spoons}/${energy.max} spoons.`,
      `Scope: ${scope || "personal"}. Do not access data outside this scope.`,
      `Available tools: ${(tools || []).map(t => t.name).join(", ") || "none"}.`,
      `Keep responses concise. This is a cognitive prosthetic, not a chatbot.`,
    ].join(" ");

    // Apply PII scrubbing (CWP-26 integration point)
    const scrubbedMessage = this._scrubPII(message, scrubRules);
    const scrubbedHistory = history.map(m => ({
      ...m,
      content: this._scrubPII(m.content, scrubRules)
    }));

    // Call Workers AI
    const aiResponse = await this.env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct-fast",
      {
        messages: [
          { role: "system", content: systemPrompt },
          ...scrubbedHistory.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: scrubbedMessage },
        ],
        temperature: 0,
        max_tokens: 512,
      }
    );

    const reply = aiResponse.response || "No response";

    // Persist assistant message (unscrubbed for user)
    this.ctx.storage.sql.exec(
      "INSERT INTO messages (role, content, ts) VALUES (?, ?, ?)",
      "assistant", reply, Date.now()
    );

    return Response.json({ reply, energy });
  }

  async _history(url) {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const rows = this.ctx.storage.sql
      .exec("SELECT id, role, content, ts, metadata FROM messages ORDER BY id DESC LIMIT ?", limit)
      .toArray()
      .reverse();
    return Response.json({ messages: rows });
  }

  async _state(request) {
    if (request.method === "GET") {
      const rows = this.ctx.storage.sql.exec("SELECT key, value FROM state").toArray();
      const obj = {};
      rows.forEach(r => {
        try { obj[r.key] = JSON.parse(r.value); } catch { obj[r.key] = r.value; }
      });
      return Response.json(obj);
    }

    if (request.method === "PUT") {
      const updates = await request.json();
      for (const [key, value] of Object.entries(updates)) {
        this.ctx.storage.sql.exec(
          "INSERT OR REPLACE INTO state (key, value, updated_at) VALUES (?, ?, ?)",
          key, JSON.stringify(value), Date.now()
        );
      }
      return Response.json({ ok: true });
    }
  }

  async _reminders(request) {
    if (request.method === "GET") {
      const rows = this.ctx.storage.sql.exec(
        "SELECT * FROM reminders WHERE completed = 0 ORDER BY schedule_ts ASC"
      ).toArray();
      return Response.json({ reminders: rows });
    }

    if (request.method === "POST") {
      const { kind, label, schedule_ts } = await request.json();
      if (!kind || !label || !schedule_ts) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }

      this.ctx.storage.sql.exec(
        "INSERT INTO reminders (kind, label, schedule_ts, created_at) VALUES (?, ?, ?, ?)",
        kind, label, schedule_ts, Date.now()
      );
      return Response.json({ ok: true });
    }
  }

  async _energy(request) {
    if (request.method === "GET") {
      const e = this._getState("energy") || { spoons: 10, max: 12, lastUpdate: Date.now() };
      return Response.json(e);
    }

    if (request.method === "PUT") {
      const update = await request.json();
      const current = this._getState("energy") || { spoons: 10, max: 12 };
      const merged = { ...current, ...update, lastUpdate: Date.now() };
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO state (key, value, updated_at) VALUES (?, ?, ?)",
        "energy", JSON.stringify(merged), Date.now()
      );
      return Response.json(merged);
    }
  }

  async _bioIngest(request) {
    const { type, value, unit, ts, source } = await request.json();

    const validTypes = [
      "calcium_serum", "heart_rate", "hrv_rmssd", "hrv_sdnn",
      "blood_pressure", "temperature", "medication_taken",
      "spoon_check", "sleep_hours", "hydration_oz",
    ];

    if (!validTypes.includes(type)) {
      return Response.json({ error: `Invalid type. Valid: ${validTypes.join(",")}` }, { status: 400 });
    }

    const record = {
      type,
      value: parseFloat(value) || 0,
      unit: unit || "",
      ts: ts || Date.now(),
      source: source || "manual",
      recorded_at: Date.now(),
    };

    // Store in telemetry_pending (flushed to D1 by alarm)
    this.ctx.storage.sql.exec(
      "INSERT INTO telemetry_pending (kind, payload, ts) VALUES (?, ?, ?)",
      `bio:${type}`, JSON.stringify(record), record.ts
    );

    // Calcium threshold alerting
    if (type === "calcium_serum") {
      const level = record.value;
      let alert = null;

      if (level < 7.6) {
        alert = {
          severity: "critical",
          message: `CRITICAL: Calcium at ${level} mg/dL. Seek immediate medical attention.`,
          timestamp: Date.now(),
        };
      } else if (level < 7.8) {
        alert = {
          severity: "warning",
          message: `WARNING: Calcium at ${level} mg/dL — below symptomatic threshold. Take calcium now.`,
          timestamp: Date.now(),
        };
      } else if (level < 8.0) {
        alert = {
          severity: "caution",
          message: `Calcium at ${level} mg/dL — approaching lower target. Monitor closely.`,
          timestamp: Date.now(),
        };
      }

      if (alert) {
        this.ctx.storage.sql.exec(
          "INSERT INTO telemetry_pending (kind, payload, ts) VALUES (?, ?, ?)",
          "bio_alert", JSON.stringify(alert), Date.now()
        );
        return Response.json({ ok: true, record, alert });
      }
    }

    // Medication tracking
    if (type === "medication_taken") {
      this.ctx.storage.sql.exec(
        `UPDATE reminders SET completed = 1
         WHERE kind = 'medication' AND completed = 0
         AND schedule_ts <= ? ORDER BY schedule_ts DESC LIMIT 1`,
        Date.now()
      );
    }

    return Response.json({ ok: true, record });
  }

  _getState(key) {
    const row = this.ctx.storage.sql.exec("SELECT value FROM state WHERE key = ?", key).one();
    if (!row) return null;
    try { return JSON.parse(row.value); } catch { return row.value; }
  }

  _scrubPII(text, rules) {
    if (!rules || rules.length === 0) return text;
    let result = text;
    for (const rule of rules) {
      const re = new RegExp(`\\b${rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
      result = result.replace(re, rule.replacement);
    }
    return result;
  }

  async alarm(alarmInfo) {
    const rows = this.ctx.storage.sql
      .exec("SELECT id, kind, payload, ts FROM telemetry_pending ORDER BY id LIMIT 500")
      .toArray();

    if (rows.length === 0) return;

    try {
      if (this.env.DB) {
        const stmts = rows.map(r =>
          this.env.DB.prepare(
            "INSERT INTO telemetry (room_id, node_id, kind, payload, ts, flushed_at) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind("personal", "self", r.kind, r.payload, r.ts, Date.now())
        );
        await this.env.DB.batch(stmts);
      }

      const ids = rows.map(r => r.id);
      this.ctx.storage.sql.exec(
        `DELETE FROM telemetry_pending WHERE id IN (${ids.map(() => "?").join(",")})`,
        ...ids
      );

      const remaining = this.ctx.storage.sql
        .exec("SELECT COUNT(*) as c FROM telemetry_pending").one();
      if (remaining && remaining.c > 0) {
        await this.ctx.storage.setAlarm(Date.now() + parseInt(this.env.FLUSH_INTERVAL_MS || "30000", 10));
      }
    } catch (err) {
      const retryCount = alarmInfo?.retryCount ?? 0;
      if (retryCount >= 5) {
        console.error(`[PersonalAgent] Flush exhausted 6 retries, parking 5min: ${err.message}`);
        await this.ctx.storage.setAlarm(Date.now() + 5 * 60 * 1000);
        return;
      }
      throw err;
    }
  }
}