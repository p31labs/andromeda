/**
 * K4 dispatcher — unit tests for tryOllama, trySimplexCloud, structuredEcho, dispatch().
 * Run: node --test --test-reporter=spec test/dispatcher.test.mjs
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import { dispatch, structuredEcho, tryOllama, trySimplexCloud } from "../src/dispatcher.js";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeSkill({ id = "ts-worker", label = "TypeScript", ollamaPersona = "p31-mechanic", simplexLane = "FORGE", gate = null } = {}) {
  return { id, label, ollamaPersona, simplexLane, gate };
}

function makeInput(prompt = "scaffold a /healthz route") {
  return { prompt };
}

/** Spin up a tiny http server and return { url, close }. */
async function fakeServer(handler) {
  return new Promise((resolve) => {
    const srv = createServer(handler);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      resolve({ url: `http://127.0.0.1:${port}`, close: () => srv.close() });
    });
  });
}

// ── structuredEcho ────────────────────────────────────────────────────────────

describe("structuredEcho", () => {
  it("always returns ok:true with dispatcher=echo", () => {
    const skill = makeSkill();
    const result = structuredEcho({ hubId: "forge", skill, input: makeInput() });
    assert.equal(result.ok, true);
    assert.equal(result.dispatcher, "echo");
    assert.equal(result.hub, "forge");
    assert.equal(result.skill, skill.id);
    assert.equal(result.simplexLane, "FORGE");
  });

  it("carries receivedKeys for object input", () => {
    const result = structuredEcho({ hubId: "scribe", skill: makeSkill({ id: "passport-mirror", simplexLane: "SCRIBE" }), input: { prompt: "x", extra: 1 } });
    assert.deepEqual(result.receivedKeys, ["prompt", "extra"]);
  });

  it("note no longer mentions the CWP todo (lane is wired)", () => {
    const result = structuredEcho({ hubId: "forge", skill: makeSkill(), input: {} });
    assert.ok(!result.note.includes("CWP-P31-K4-AGENT-HUB-WIRE-SIMPLEX-LANE"), "stale CWP note still present");
  });
});

// ── tryOllama soft-fail ───────────────────────────────────────────────────────

describe("tryOllama", () => {
  it("returns null when OLLAMA_BASE_URL is absent", async () => {
    const result = await tryOllama({ env: {}, hubId: "forge", skill: makeSkill(), input: makeInput() });
    assert.equal(result, null);
  });

  it("soft-fails to {ok:false} on connection refused", async () => {
    const result = await tryOllama({ env: { OLLAMA_BASE_URL: "http://127.0.0.1:19999", OLLAMA_TIMEOUT_MS: "500" }, hubId: "forge", skill: makeSkill(), input: makeInput() });
    assert.ok(result !== null);
    assert.equal(result.ok, false);
    assert.equal(result.dispatcher, "ollama");
  });
});

// ── trySimplexCloud ───────────────────────────────────────────────────────────

describe("trySimplexCloud", () => {
  it("returns null when SIMPLEX_BASE_URL is absent", async () => {
    const result = await trySimplexCloud({ env: {}, hubId: "forge", skill: makeSkill(), input: makeInput() });
    assert.equal(result, null);
  });

  it("returns null when skill has no simplexLane", async () => {
    const skill = makeSkill({ simplexLane: null });
    const result = await trySimplexCloud({ env: { SIMPLEX_BASE_URL: "http://x" }, hubId: "forge", skill, input: makeInput() });
    assert.equal(result, null);
  });

  it("soft-fails to {ok:false} on connection refused", async () => {
    const skill = makeSkill();
    const result = await trySimplexCloud({ env: { SIMPLEX_BASE_URL: "http://127.0.0.1:19998" }, hubId: "forge", skill, input: makeInput() });
    assert.ok(result !== null);
    assert.equal(result.ok, false);
    assert.equal(result.dispatcher, "simplex-cloud");
  });

  it("posts {agentId, skillId, prompt} with Bearer auth and returns reply on 200", async () => {
    let receivedBody = null;
    let receivedAuth = null;
    const fake = await fakeServer((req, res) => {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        receivedBody = JSON.parse(body);
        receivedAuth = req.headers["authorization"];
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, dispatcher: "simplex-v7", agentId: "FORGE", skillId: "ts-worker", reply: "here is your healthz route", offline: false }));
      });
    });
    try {
      const skill = makeSkill();
      const result = await trySimplexCloud({
        env: { SIMPLEX_BASE_URL: fake.url, SIMPLEX_OPERATOR_SECRET: "test-secret" },
        hubId: "forge", skill, input: makeInput("scaffold a /healthz route"),
      });
      assert.equal(result.ok, true);
      assert.equal(result.dispatcher, "simplex-cloud");
      assert.equal(result.hub, "forge");
      assert.equal(result.reply, "here is your healthz route");
      assert.equal(receivedBody.agentId, "FORGE");
      assert.equal(receivedBody.skillId, "ts-worker");
      assert.equal(receivedBody.prompt, "scaffold a /healthz route");
      assert.equal(receivedAuth, "Bearer test-secret");
    } finally {
      fake.close();
    }
  });

  it("soft-fails on 4xx from simplex-v7", async () => {
    const fake = await fakeServer((req, res) => {
      req.resume();
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
    });
    try {
      const result = await trySimplexCloud({
        env: { SIMPLEX_BASE_URL: fake.url },
        hubId: "forge", skill: makeSkill(), input: makeInput(),
      });
      assert.equal(result.ok, false);
      assert.match(result.error, /401/);
    } finally {
      fake.close();
    }
  });
});

// ── dispatch() priority chain ─────────────────────────────────────────────────

describe("dispatch() priority: Ollama → simplex-cloud → echo", () => {
  it("uses simplex-cloud when Ollama is down but simplex is up", async () => {
    const fake = await fakeServer((req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, dispatcher: "simplex-v7", agentId: "FORGE", reply: "cloud reply", offline: false }));
    });
    try {
      const result = await dispatch({
        env: {
          OLLAMA_BASE_URL: "http://127.0.0.1:19997",
          OLLAMA_TIMEOUT_MS: "300",
          SIMPLEX_BASE_URL: fake.url,
        },
        hubId: "forge",
        skill: makeSkill(),
        input: makeInput(),
      });
      assert.equal(result.ok, true);
      assert.equal(result.dispatcher, "simplex-cloud");
    } finally {
      fake.close();
    }
  });

  it("falls to echo when both Ollama and simplex are down", async () => {
    const result = await dispatch({
      env: {
        OLLAMA_BASE_URL: "http://127.0.0.1:19996",
        OLLAMA_TIMEOUT_MS: "200",
        SIMPLEX_BASE_URL: "http://127.0.0.1:19995",
      },
      hubId: "scholar",
      skill: makeSkill({ id: "grants-synthesis", simplexLane: "SCHOLAR" }),
      input: makeInput("find grants"),
    });
    assert.equal(result.ok, true);
    assert.equal(result.dispatcher, "echo");
  });

  it("falls to echo when simplex is absent and Ollama is absent", async () => {
    const result = await dispatch({
      env: {},
      hubId: "counsel",
      skill: makeSkill({ id: "pro-se-georgia", simplexLane: "COUNSEL" }),
      input: makeInput(),
    });
    assert.equal(result.dispatcher, "echo");
  });
});
