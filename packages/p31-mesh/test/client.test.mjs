import test from "node:test";
import assert from "node:assert/strict";
import { meshGet } from "../src/client.mjs";

test("meshGet retries once on 503 then succeeds", async () => {
  let calls = 0;
  /** @type {typeof fetch} */
  const fetch = async () => {
    calls++;
    if (calls === 1) {
      return /** @type {Response} */ ({ status: 503, text: async () => "upstream" });
    }
    return /** @type {Response} */ ({
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
  };
  const out = await meshGet("https://w.test", "/x", {
    fetch,
    retryTransient: true,
    retryDelayMs: 0,
  });
  assert.equal(out.status, 200);
  assert.equal(calls, 2);
  assert.equal(out.json && out.json.ok, true);
});

test("meshGet does not retry on 404", async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    return /** @type {Response} */ ({ status: 404, text: async () => "no" });
  };
  const out = await meshGet("https://w.test", "/x", { fetch, retryDelayMs: 0 });
  assert.equal(out.status, 404);
  assert.equal(calls, 1);
});

test("meshGet retries once when fetch throws then succeeds", async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    if (calls === 1) throw new TypeError("connection reset");
    return /** @type {Response} */ ({
      status: 200,
      text: async () => "{}",
    });
  };
  const out = await meshGet("https://w.test", "/x", { fetch, retryDelayMs: 0 });
  assert.equal(out.status, 200);
  assert.equal(calls, 2);
});

test("meshGet does not retry on AbortError (timeout)", async () => {
  let calls = 0;
  const e = new Error("aborted");
  e.name = "AbortError";
  const fetch = async () => {
    calls++;
    throw e;
  };
  await assert.rejects(
    () => meshGet("https://w.test", "/x", { fetch, retryDelayMs: 0 }),
    (err) => err === e
  );
  assert.equal(calls, 1);
});
