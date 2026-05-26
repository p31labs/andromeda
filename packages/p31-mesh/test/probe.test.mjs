import test from "node:test";
import assert from "node:assert/strict";
import { runK4PersonalMeshProbe } from "../src/probe.mjs";
import { validateK4PersonalHealth } from "../src/schemas.mjs";
import { resolveK4PersonalBaseUrl, k4PersonalUrlFromEnv } from "../src/config.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");
const fakeRoot = path.join(pkgRoot, "test", "fixtures", "fake-home");

test("validateK4PersonalHealth accepts k4-personal personal", () => {
  const r = validateK4PersonalHealth({ service: "k4-personal", scope: "personal" });
  assert.equal(r.ok, true);
});

test("validateK4PersonalHealth rejects wrong service", () => {
  const r = validateK4PersonalHealth({ service: "other", scope: "personal" });
  assert.equal(r.ok, false);
});

test("runK4PersonalMeshProbe succeeds with mock fetch", async () => {
  /** @type {typeof fetch} */
  const fetch = async (url) => {
    const u = String(url);
    if (u.endsWith("/api/health")) {
      return /** @type {Response} */ ({
        status: 200,
        text: async () => JSON.stringify({ service: "k4-personal", scope: "personal" }),
      });
    }
    if (u.endsWith("/api/mesh")) {
      return /** @type {Response} */ ({
        status: 200,
        text: async () => JSON.stringify({ ok: true, test: true }),
      });
    }
    return /** @type {Response} */ ({ status: 404, text: async () => "" });
  };
  const result = await runK4PersonalMeshProbe({
    baseUrl: "https://k4-personal.example.test",
    fetch,
  });
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
  assert.equal(typeof result.durationMs, "number");
  assert.ok(result.durationMs >= 0);
});

test("resolveK4PersonalBaseUrl reads fixture constants", () => {
  const r = resolveK4PersonalBaseUrl(fakeRoot, {});
  assert.equal(r.skipReason, undefined);
  assert.equal(r.baseUrl, "https://k4-personal.fixture.test");
});

test("k4PersonalUrlFromEnv overrides", () => {
  const u = k4PersonalUrlFromEnv({ P31_K4_PERSONAL_URL: "https://env.override/" });
  assert.equal(u, "https://env.override");
});
