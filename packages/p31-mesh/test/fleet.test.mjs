import test from "node:test";
import assert from "node:assert/strict";
import { runMeshFleetProbe, runSingleHealthProbe } from "../src/fleet.mjs";
import { validateK4CageHealth, validateK4HubsHealth } from "../src/schemas.mjs";

test("validateK4CageHealth accepts cage unified payload", () => {
  const r = validateK4CageHealth({
    ok: true,
    service: "k4-cage-unified",
    workerVersion: "2.0.0",
    ts: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(r.ok, true);
});

test("validateK4HubsHealth accepts hubs payload", () => {
  const r = validateK4HubsHealth({ status: "ok", service: "k4-hubs", hubFusion: false });
  assert.equal(r.ok, true);
});

test("runSingleHealthProbe with mock fetch", async () => {
  /** @type {typeof fetch} */
  const fetch = async () =>
    /** @type {Response} */ ({
      status: 200,
      text: async () => JSON.stringify({ ok: true, service: "k4-cage-unified" }),
    });
  const out = await runSingleHealthProbe("https://cage.test", "/api/health", validateK4CageHealth, {
    fetch,
  });
  assert.equal(out.ok, true);
});

test("runMeshFleetProbe aggregates edges with mocks", async () => {
  /** @type {typeof fetch} */
  const fetch = async (url) => {
    const u = String(url);
    if (u.includes("personal") && u.endsWith("/api/health")) {
      return /** @type {Response} */ ({
        status: 200,
        text: async () =>
          JSON.stringify({
            ok: true,
            service: "k4-personal",
            scope: "personal",
          }),
      });
    }
    if (u.includes("personal") && u.endsWith("/api/mesh")) {
      return /** @type {Response} */ ({
        status: 200,
        text: async () => JSON.stringify({ api: { version: "1.0.0" } }),
      });
    }
    if (u.includes("cage") && u.endsWith("/api/health")) {
      return /** @type {Response} */ ({
        status: 200,
        text: async () => JSON.stringify({ ok: true, service: "k4-cage-unified" }),
      });
    }
    if (u.includes("hubs") && u.endsWith("/health")) {
      return /** @type {Response} */ ({
        status: 200,
        text: async () => JSON.stringify({ status: "ok", service: "k4-hubs" }),
      });
    }
    return /** @type {Response} */ ({ status: 404, text: async () => "" });
  };
  const result = await runMeshFleetProbe({
    endpoints: {
      personal: "https://personal.example",
      cage: "https://cage.example",
      hubs: "https://hubs.example",
    },
    fetch,
  });
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
  assert.equal(typeof result.durationMs, "number");
  assert.ok(result.durationMs >= 0);
});
