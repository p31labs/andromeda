/**
 * P31 Agent Hub — Workers AI + K₄ service bindings (k4-cage, k4-personal, k4-hubs).
 */
import { AgentSession } from "./agent-session.js";

export { AgentSession };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Id",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

function corsPreflight(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...CORS } });
  }
  return null;
}

function authOk(request, env) {
  if (!env.AGENT_HUB_SECRET) return true;
  const h = request.headers.get("Authorization");
  return h === `Bearer ${env.AGENT_HUB_SECRET}`;
}

/** @param {Fetcher} fetcher */
async function safeJson(fetcher, url) {
  const r = await fetcher.fetch(
    new Request(url, { method: "GET", headers: { Accept: "application/json" } }),
  );
  const text = await r.text();
  try {
    return { ok: r.ok, status: r.status, body: JSON.parse(text) };
  } catch {
    return { ok: r.ok, status: r.status, body: text };
  }
}

export default {
  /** @param {ExecutionContext} _ctx */
  async fetch(request, env, _ctx) {
    const pre = corsPreflight(request);
    if (pre) return pre;

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/health" && request.method === "GET") {
      const mesh = await safeJson(env.K4_CAGE, "https://k4-cage/api/mesh");
      return json({
        ok: true,
        service: "p31-agent-hub",
        environment: env.ENVIRONMENT ?? "unknown",
        release_channel: env.RELEASE_CHANNEL ?? "unknown",
        workers_ai_model: env.WORKERS_AI_MODEL ?? null,
        k4_cage_mesh: mesh.ok ? "reachable" : "error",
        k4_cage_status: mesh.status,
        timestamp: new Date().toISOString(),
      });
    }

    if (path === "/api/tools" && request.method === "GET") {
      const writes =
        env.RELEASE_CHANNEL === "internal" && Boolean(env.HUBS_WRITE_TOKEN);
      return json({
        writes_enabled: writes,
        release_channel: env.RELEASE_CHANNEL ?? "public",
        tools: [
          {
            name: "k4_mesh",
            description: "GET k4-cage /api/mesh (family scope)",
            method: "GET",
            path: "/api/proxy/k4-cage/api/mesh",
          },
          {
            name: "k4_personal_mesh",
            description: "GET k4-personal /api/mesh",
            method: "GET",
            path: "/api/proxy/k4-personal/api/mesh",
          },
          {
            name: "k4_hubs",
            description: "GET k4-hubs /api/hubs",
            method: "GET",
            path: "/api/proxy/k4-hubs/api/hubs",
          },
        ],
      });
    }

    if (path.startsWith("/api/proxy/") && request.method === "GET") {
      const rest = path.slice("/api/proxy/".length);
      const [svc, ...parts] = rest.split("/");
      const tail = parts.length ? `/${parts.join("/")}` : "/";
      /** @type {Fetcher | undefined} */
      let target;
      if (svc === "k4-cage") target = env.K4_CAGE;
      else if (svc === "k4-personal") target = env.K4_PERSONAL;
      else if (svc === "k4-hubs") target = env.K4_HUBS;
      if (!target) return json({ error: "unknown_service", svc }, 404);
      const r = await target.fetch(
        new Request(`https://binding${tail}${url.search}`, {
          method: "GET",
          headers: request.headers,
        }),
      );
      const body = await r.text();
      return new Response(body, {
        status: r.status,
        headers: {
          "Content-Type": r.headers.get("Content-Type") ?? "application/json",
          ...CORS,
        },
      });
    }

    if (
      (path === "/api/chat" || path === "/api/agent-chat") &&
      request.method === "POST"
    ) {
      if (!authOk(request, env)) {
        return json({ error: "unauthorized" }, 401);
      }
      const raw = await request.text();
      let sessionId = request.headers.get("X-Session-Id")?.trim();
      if (!sessionId) {
        try {
          sessionId = JSON.parse(raw).sessionId;
        } catch {
          sessionId = "default";
        }
      }
      const safeSid = String(sessionId || "default").slice(0, 128) || "default";
      const id = env.AGENT_SESSION.idFromName(safeSid);
      const stub = env.AGENT_SESSION.get(id);
      const forward = new Request("https://agent-session/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
      });
      const res = await stub.fetch(forward);
      const h = new Headers(res.headers);
      Object.entries(CORS).forEach(([k, v]) => h.set(k, v));
      return new Response(res.body, { status: res.status, headers: h });
    }

    if (path === "/" && request.method === "GET") {
      return json({
        name: "p31-agent-hub",
        endpoints: [
          "GET  /api/health",
          "GET  /api/tools",
          "GET  /api/proxy/k4-cage/api/mesh",
          "GET  /api/proxy/k4-personal/api/mesh",
          "GET  /api/proxy/k4-hubs/api/hubs",
          "POST /api/chat",
          "POST /api/agent-chat",
        ],
      });
    }

    return json({ error: "not_found", path }, 404);
  },
};
