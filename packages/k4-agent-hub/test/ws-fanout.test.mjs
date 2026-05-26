/**
 * K4 agent hub — WebSocket fanout event shape tests.
 * Tests the pure ws-events.js helpers (no Cloudflare deps).
 *
 * Run: node --test --test-reporter=spec test/ws-fanout.test.mjs
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  WS_EVENT_SCHEMA,
  buildBroadcastEvent,
  buildDockEvent,
  buildCallEvent,
} from "../src/ws-events.js";

// ── event shape ───────────────────────────────────────────────────────────────

describe("buildBroadcastEvent", () => {
  it("includes schema, kind, ts, and extra payload", () => {
    const ev = buildBroadcastEvent("hello", { hub: "forge" });
    assert.equal(ev.schema, WS_EVENT_SCHEMA);
    assert.equal(ev.kind, "hello");
    assert.equal(ev.hub, "forge");
    assert.ok(typeof ev.ts === "number" && ev.ts > 0);
  });

  it("kind field discriminates event types", () => {
    const kinds = ["hello", "pong", "dock", "call", "fanout", "parse-error"];
    for (const kind of kinds) {
      const ev = buildBroadcastEvent(kind, {});
      assert.equal(ev.kind, kind);
    }
  });
});

// ── dock event ────────────────────────────────────────────────────────────────

describe("buildDockEvent", () => {
  it("includes hub, clientId, sessionId", () => {
    const ev = buildDockEvent("counsel", "client-abc", "sess-xyz");
    assert.equal(ev.schema, WS_EVENT_SCHEMA);
    assert.equal(ev.kind, "dock");
    assert.equal(ev.hub, "counsel");
    assert.equal(ev.clientId, "client-abc");
    assert.equal(ev.sessionId, "sess-xyz");
  });
});

// ── call event ────────────────────────────────────────────────────────────────

describe("buildCallEvent", () => {
  it("includes hub, skillId, sessionId, dispatcher", () => {
    const ev = buildCallEvent("forge", "ts-worker", "sess-xyz", "echo");
    assert.equal(ev.schema, WS_EVENT_SCHEMA);
    assert.equal(ev.kind, "call");
    assert.equal(ev.hub, "forge");
    assert.equal(ev.skillId, "ts-worker");
    assert.equal(ev.sessionId, "sess-xyz");
    assert.equal(ev.dispatcher, "echo");
  });
});
