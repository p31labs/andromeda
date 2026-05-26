/**
 * @p31/k4-agent-hub-client — end-to-end tests against an in-process mock hub.
 *
 * The mock hub re-implements the same canonical envelope verification as the
 * Worker (packages/k4-agent-hub/src/dock-protocol.js). If the client and the
 * hub stay byte-identical on the canonical strings, this passes; otherwise
 * the test surfaces the drift immediately.
 */
import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import { webcrypto } from "node:crypto";

import { K4AgentHubClient, generateKeyPair } from "../src/index.mjs";
import { b64uDecode, canonicalCallString, canonicalDockString } from "../src/envelope.mjs";

const TEXT = new TextEncoder();

async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

async function importPublicKey(b64u) {
  const raw = b64uDecode(b64u);
  return await webcrypto.subtle.importKey("raw", raw, { name: "Ed25519" }, true, ["verify"]);
}

async function verifyEd25519({ publicKeyB64u, message, signatureB64u }) {
  const pub = await importPublicKey(publicKeyB64u);
  const sig = b64uDecode(signatureB64u);
  return await webcrypto.subtle.verify({ name: "Ed25519" }, pub, sig, TEXT.encode(message));
}

function startMockHub(seenNonces) {
  const sessions = new Map();
  const peers = new Map();
  const callsByHub = { forge: 0, counsel: 0, scholar: 0, scribe: 0 };
  const server = createServer(async (req, res) => {
    res.setHeader("content-type", "application/json");
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/v1/manifest" && req.method === "GET") {
      res.writeHead(200);
      return res.end(JSON.stringify({
        schema: "p31.k4AgentHub/1.1.0",
        vertices: [
          { id: "forge",   anchor: "teal",       verb: "make"       },
          { id: "counsel", anchor: "coral",      verb: "protect"    },
          { id: "scholar", anchor: "phosphorus", verb: "understand" },
          { id: "scribe",  anchor: "lavender",   verb: "remember"   },
        ],
        triadic: [
          { family: "will",     personal: "structure",  agent: "forge"   },
          { family: "sj",       personal: "rhythm",     agent: "scholar" },
          { family: "wj",       personal: "creation",   agent: "scribe"  },
          { family: "christyn", personal: "connection", agent: "counsel" },
        ],
      }));
    }

    if (url.pathname === "/v1/dock" && req.method === "POST") {
      const body = await readJson(req);
      const message = canonicalDockString({
        clientId: body.clientId,
        schema: body.personalTetra?.schema ?? "",
        capabilities: body.capabilities ?? [],
        ts: body.ts,
        nonce: body.nonce,
      });
      const valid = await verifyEd25519({
        publicKeyB64u: body.publicKey, message, signatureB64u: body.sig,
      });
      if (!valid) { res.writeHead(403); return res.end(JSON.stringify({ ok: false, error: "bad sig" })); }
      if (seenNonces.has(`dock:${body.nonce}`)) {
        res.writeHead(403); return res.end(JSON.stringify({ ok: false, error: "replay" }));
      }
      seenNonces.add(`dock:${body.nonce}`);
      const sessionId = webcrypto.randomUUID();
      const expires = new Date(Date.now() + 86_400_000).toISOString();
      sessions.set(sessionId, { clientId: body.clientId, publicKey: body.publicKey, allowedSkills: body.capabilities });
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true, signed: true, sessionId,
        hubs: ["forge", "counsel", "scholar", "scribe"].map((id) => ({ id, expires })),
        allowedSkills: body.capabilities,
        policies: { rpm: 30, burst: 8 },
      }));
    }

    const callMatch = url.pathname.match(/^\/v1\/(forge|counsel|scholar|scribe)\/call$/);
    if (callMatch && req.method === "POST") {
      const hub = callMatch[1];
      const auth = req.headers.authorization ?? "";
      const m = auth.match(/^Bearer (.+)$/);
      const sid = m?.[1];
      const session = sid && sessions.get(sid);
      if (!session) { res.writeHead(401); return res.end(JSON.stringify({ ok: false, error: "no session" })); }
      const body = await readJson(req);
      const message = canonicalCallString({
        skillId: body.skillId, input: body.input, ts: body.ts, nonce: body.nonce,
      });
      const valid = await verifyEd25519({
        publicKeyB64u: session.publicKey, message, signatureB64u: body.sig,
      });
      if (!valid) { res.writeHead(403); return res.end(JSON.stringify({ ok: false, error: "bad call sig" })); }
      if (seenNonces.has(`call:${body.nonce}`)) {
        res.writeHead(403); return res.end(JSON.stringify({ ok: false, error: "call replay" }));
      }
      seenNonces.add(`call:${body.nonce}`);
      callsByHub[hub] += 1;
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true, hub, skillId: body.skillId, ms: 1,
        result: { ok: true, dispatcher: "echo", hub, skill: body.skillId, mockReplyTo: body.input?.prompt ?? null },
      }));
    }

    const crossMatch = url.pathname.match(/^\/v1\/cross\/([a-z]+)\/([a-z]+)$/);
    if (crossMatch) {
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true, from: crossMatch[1], to: crossMatch[2],
        edgeLabel: "mock edge",
        brief: { hub: crossMatch[2], to: crossMatch[1], reply: `mock cross from ${crossMatch[1]}` },
      }));
    }

    if (url.pathname === "/v1/topology") {
      res.writeHead(200);
      return res.end(JSON.stringify({
        schema: "p31.k4AgentHub/1.1.0",
        vertices: [
          { id: "forge",   neighbors: ["counsel", "scholar", "scribe"] },
          { id: "counsel", neighbors: ["forge", "scholar", "scribe"]   },
          { id: "scholar", neighbors: ["forge", "counsel", "scribe"]   },
          { id: "scribe",  neighbors: ["forge", "counsel", "scholar"]  },
        ],
        edges: new Array(6).fill(null),
        triadic: [
          { family: "will",     personal: "structure",  agent: "forge"   },
          { family: "sj",       personal: "rhythm",     agent: "scholar" },
          { family: "wj",       personal: "creation",   agent: "scribe"  },
          { family: "christyn", personal: "connection", agent: "counsel" },
        ],
      }));
    }

    if (url.pathname === "/v1/federation") {
      res.writeHead(200);
      return res.end(JSON.stringify({
        schema: "p31.k4AgentHubFederation/1.0.0",
        peers: [...peers.values()],
        aggregateVertexCount: 4 + peers.size * 4,
      }));
    }

    if (url.pathname === "/v1/federation/peer" && req.method === "POST") {
      const body = await readJson(req);
      const message = canonicalDockString({
        clientId: body.instanceId, schema: body.manifestUrl,
        capabilities: [], ts: body.ts, nonce: body.instanceId,
      });
      const valid = await verifyEd25519({
        publicKeyB64u: body.publicKey, message, signatureB64u: body.sig,
      });
      if (!valid) { res.writeHead(403); return res.end(JSON.stringify({ ok: false, error: "bad peer sig" })); }
      peers.set(body.instanceId, body);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, registered: body.instanceId }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: `mock no route ${url.pathname}` }));
  });
  return new Promise((resolve) => server.listen(0, () => resolve({ server, port: server.address().port, sessions, peers, callsByHub })));
}

describe("@p31/k4-agent-hub-client end-to-end", () => {
  let mock;
  before(async () => { mock = await startMockHub(new Set()); });
  after(() => { mock.server.close(); });

  it("dock signs envelope and stores session", async () => {
    const key = await generateKeyPair();
    const c = await K4AgentHubClient.connect({
      baseUrl: `http://127.0.0.1:${mock.port}`,
      keyPair: key,
      capabilities: ["ts-worker"],
    });
    assert.equal(c.session.signed, true);
    assert.ok(c.session.sessionId);
    assert.equal(c.session.allowedSkills.length, 1);
  });

  it("call signs envelope; mock verifies and tallies", async () => {
    const key = await generateKeyPair();
    const c = await K4AgentHubClient.connect({
      baseUrl: `http://127.0.0.1:${mock.port}`,
      keyPair: key,
      capabilities: ["ts-worker", "voltage-triage"],
    });
    const before = mock.callsByHub.forge;
    const r = await c.call("forge", "ts-worker", { prompt: "hello" });
    assert.equal(r.ok, true);
    assert.equal(r.hub, "forge");
    assert.equal(mock.callsByHub.forge, before + 1);
    assert.equal(r.result.mockReplyTo, "hello");
  });

  it("topology() returns triadic cover", async () => {
    const key = await generateKeyPair();
    const c = await K4AgentHubClient.connect({ baseUrl: `http://127.0.0.1:${mock.port}`, keyPair: key });
    const topo = await c.topology();
    assert.equal(topo.vertices.length, 4);
    assert.equal(topo.triadic.length, 4);
    assert.deepEqual(
      topo.triadic.map((r) => r.family).sort(),
      ["christyn", "sj", "will", "wj"],
    );
  });

  it("cross() returns edge brief", async () => {
    const key = await generateKeyPair();
    const c = await K4AgentHubClient.connect({ baseUrl: `http://127.0.0.1:${mock.port}`, keyPair: key });
    const cross = await c.cross("forge", "scholar", "smoke");
    assert.equal(cross.ok, true);
    assert.equal(cross.from, "forge");
    assert.equal(cross.to, "scholar");
  });

  it("registerAsPeer signs the federation envelope", async () => {
    const key = await generateKeyPair();
    const c = await K4AgentHubClient.connect({ baseUrl: `http://127.0.0.1:${mock.port}`, keyPair: key });
    const r = await c.registerAsPeer(`http://127.0.0.1:${mock.port}`, "https://other-hub/v1/manifest");
    assert.equal(r.ok, true);
    assert.equal(r.registered, key.clientId);
  });
});
