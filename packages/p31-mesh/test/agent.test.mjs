import test from "node:test";
import assert from "node:assert/strict";
import { createK4PersonalAgentClient } from "../src/agent.mjs";
import { validatePersonalAgentManifest, PERSONAL_AGENT_MANIFEST_SCHEMA } from "../src/schemas.mjs";

const sampleManifest = {
  schema: PERSONAL_AGENT_MANIFEST_SCHEMA,
  personalTetra: {},
  profile: { name: null, role: null },
  energy: { spoons: 10, max: 12 },
  soulsafeTetra: { schema: "p31.soulsafeTetra/0.1.0", chatDefault: false, minSpoonsForFusion: 3 },
  retention: { schema: "p31.agentRetention/0.1.0", chatMessagesMaxRows: 2000, strategy: "delete_oldest_over_cap" },
  service: { name: "k4-personal", durableObject: "PersonalAgent" },
};

test("validatePersonalAgentManifest accepts fixture", () => {
  const r = validatePersonalAgentManifest(sampleManifest);
  assert.equal(r.ok, true);
});

test("createK4PersonalAgentClient getManifest with mock fetch", async () => {
  /** @type {typeof fetch} */
  const fetch = async (url) => {
    const u = String(url);
    assert.ok(u.includes("/agent/demo%2Fuser/manifest") || u.includes("/agent/demo/user/manifest"));
    return /** @type {Response} */ ({
      status: 200,
      text: async () => JSON.stringify(sampleManifest),
    });
  };
  const client = createK4PersonalAgentClient({
    baseUrl: "https://k4.example.test",
    userId: "demo/user",
    fetch,
  });
  const out = await client.getManifest();
  assert.equal(out.ok, true);
});

test("createK4PersonalAgentClient getHistory uses limit query", async () => {
  /** @type {string | undefined} */
  let gotUrl;
  /** @type {typeof fetch} */
  const fetch = async (url) => {
    gotUrl = String(url);
    return /** @type {Response} */ ({
      status: 200,
      text: async () => JSON.stringify({ messages: [] }),
    });
  };
  const client = createK4PersonalAgentClient({
    baseUrl: "https://k4.example.test",
    userId: "u1",
    fetch,
  });
  await client.getHistory(42);
  assert.ok(gotUrl?.includes("limit=42"));
});

test("createK4PersonalAgentClient getHistory clamps limit", async () => {
  /** @type {string | undefined} */
  let gotUrl;
  /** @type {typeof fetch} */
  const fetch = async (url) => {
    gotUrl = String(url);
    return /** @type {Response} */ ({
      status: 200,
      text: async () => JSON.stringify({ messages: [] }),
    });
  };
  const client = createK4PersonalAgentClient({
    baseUrl: "https://k4.example.test",
    userId: "u1",
    fetch,
  });
  await client.getHistory(9999);
  assert.ok(gotUrl?.includes("limit=100"));
});

test("createK4PersonalAgentClient chat posts JSON body", async () => {
  /** @type {string | undefined} */
  let posted;
  /** @type {typeof fetch} */
  const fetch = async (url, init) => {
    const u = String(url);
    if (u.endsWith("/chat") && init && init.method === "POST") {
      posted = /** @type {string} */ (init.body);
      return /** @type {Response} */ ({
        status: 200,
        text: async () => JSON.stringify({ reply: "ok", energy: { spoons: 5, max: 12 } }),
      });
    }
    return /** @type {Response} */ ({ status: 404, text: async () => "" });
  };
  const client = createK4PersonalAgentClient({
    baseUrl: "https://k4.example.test",
    userId: "u1",
    fetch,
  });
  const res = await client.chat({ message: "hi", soulsafe: false });
  assert.equal(res.status, 200);
  assert.ok(posted);
  const body = JSON.parse(/** @type {string} */ (posted));
  assert.equal(body.message, "hi");
  assert.equal(body.soulsafe, false);
});
