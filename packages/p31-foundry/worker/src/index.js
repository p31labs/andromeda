/**
 * P31 Document Foundry — edge worker (v1.3).
 * R2: artifacts + job descriptors. Queue: async job stub consumer.
 * GET /v1/jobs lists recent job objects (R2 list). Optional bearer auth.
 * Per-isolate mutation rate limit (CF-Connecting-IP); disable with FOUNDRY_RL_PER_MINUTE=0.
 *
 * @typedef {{
 *   FOUNDRY_BUCKET: R2Bucket;
 *   FOUNDRY_JOBS: Queue;
 *   FOUNDRY_AUTH_SECRET?: string;
 *   FOUNDRY_RL_PER_MINUTE?: string;
 * }} Env
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

const WORKER_VERSION = 4;

/** Best-effort per-isolate counter (not global across Cloudflare POPs). */
const rlState = new Map();

/** @param {Request} request */
function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

/**
 * @param {Request} request
 * @param {Env} env
 * @returns {Response | null} 429 or null if allowed
 */
function mutationRateLimited(request, env) {
  const raw = env.FOUNDRY_RL_PER_MINUTE;
  if (raw === "0" || raw === "off") return null;
  const max = Math.min(5000, Math.max(1, parseInt(String(raw ?? "120"), 10) || 120));
  const windowMs = 60_000;
  const ip = clientIp(request);
  const now = Date.now();
  if (rlState.size > 3000) {
    rlState.clear();
  }
  let e = rlState.get(ip);
  if (!e || now - e.t0 >= windowMs) {
    e = { t0: now, n: 0 };
    rlState.set(ip, e);
  }
  e.n += 1;
  if (e.n > max) {
    const retrySec = Math.max(1, Math.ceil((windowMs - (now - e.t0)) / 1000));
    const res = json(
      { ok: false, error: "rate_limited", retry_after_seconds: retrySec, note: "Per-edge-isolate limit; use D1/KV for global limits in v2." },
      429
    );
    res.headers.set("retry-after", String(retrySec));
    res.headers.set("access-control-allow-origin", "*");
    return res;
  }
  return null;
}

/** @param {Record<string, string>} env */
function authConfigured(env) {
  const s = env.FOUNDRY_AUTH_SECRET;
  return typeof s === "string" && s.length > 0;
}

/**
 * @param {Request} request
 * @param {Env} env
 * @param {string} pathname
 */
function requireAuthForV1(request, env, pathname) {
  if (pathname === "/" || pathname === "") return true;
  if (!authConfigured(env)) return true;
  const auth = request.headers.get("Authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return Boolean(m && m[1] === env.FOUNDRY_AUTH_SECRET);
}

/**
 * @param {unknown} body
 * @param {number} [status]
 */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/** @param {string} pathname */
function artifactKeyFromPath(pathname) {
  const m = /^\/v1\/artifacts\/by-sha\/([a-f0-9]{64})\/source$/i.exec(pathname);
  if (!m) return null;
  return `artifacts/${m[1].toLowerCase()}/source.bin`;
}

/** @param {string} pathname */
function jobIdFromPath(pathname) {
  const m = /^\/v1\/jobs\/(job_[a-f0-9-]{36})$/i.exec(pathname);
  return m ? m[1] : null;
}

/**
 * @param {string} jobKey
 * @param {Env} env
 */
async function readJobJson(jobKey, env) {
  const get = await env.FOUNDRY_BUCKET.get(jobKey);
  if (!get) return null;
  try {
    return JSON.parse(await get.text());
  } catch {
    return null;
  }
}

/**
 * @param {string} jobKey
 * @param {Record<string, unknown>} record
 * @param {Env} env
 */
async function writeJobJson(jobKey, record, env) {
  await env.FOUNDRY_BUCKET.put(jobKey, JSON.stringify(record), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} _ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS" && pathname.startsWith("/v1/")) {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, PUT, POST, HEAD, OPTIONS",
          "access-control-allow-headers": "Authorization, Content-Type",
          "access-control-max-age": "86400",
        },
      });
    }

    if (!requireAuthForV1(request, env, pathname)) {
      const res = json({ ok: false, error: "unauthorized" }, 401);
      if (pathname.startsWith("/v1/")) {
        res.headers.set("access-control-allow-origin", "*");
      }
      return res;
    }

    if (request.method === "GET" && pathname === "/") {
      return json({
        service: "p31-foundry-worker",
        version: WORKER_VERSION,
        ok: true,
        auth: authConfigured(env) ? "bearer" : "off",
        queue: "p31-foundry-jobs",
        rate_limit_mutations_per_ip_per_minute: env.FOUNDRY_RL_PER_MINUTE === "0" || env.FOUNDRY_RL_PER_MINUTE === "off" ? "off" : String(env.FOUNDRY_RL_PER_MINUTE ?? "120"),
        endpoints: {
          health: "GET /",
          job_list: "GET /v1/jobs?limit=&cursor=",
          job_create: "POST /v1/jobs",
          job_get: "GET /v1/jobs/:id",
          artifact_put: "PUT /v1/artifacts/by-sha/:sha256/source",
          artifact_get: "GET /v1/artifacts/by-sha/:sha256/source",
          artifact_head: "HEAD /v1/artifacts/by-sha/:sha256/source",
        },
      });
    }

    const r2Key = artifactKeyFromPath(pathname);
    if (r2Key && (request.method === "PUT" || request.method === "GET" || request.method === "HEAD")) {
      if (request.method === "PUT") {
        const rl = mutationRateLimited(request, env);
        if (rl) return rl;
        const ct = request.headers.get("content-type") || "application/octet-stream";
        try {
          const body = request.body ?? new Uint8Array(0);
          await env.FOUNDRY_BUCKET.put(r2Key, body, {
            httpMetadata: { contentType: ct },
          });
        } catch (e) {
          return json({ ok: false, error: "r2_put_failed", detail: String(e) }, 502);
        }
        const res = json({ ok: true, key: r2Key }, 201);
        res.headers.set("access-control-allow-origin", "*");
        return res;
      }
      if (request.method === "HEAD") {
        const obj = await env.FOUNDRY_BUCKET.head(r2Key);
        if (!obj) {
          const res = json({ ok: false, error: "not_found" }, 404);
          if (pathname.startsWith("/v1/")) res.headers.set("access-control-allow-origin", "*");
          return res;
        }
        return new Response(null, {
          status: 200,
          headers: {
            "content-type": obj.httpMetadata?.contentType || "application/octet-stream",
            "content-length": String(obj.size),
            "x-foundry-r2-key": r2Key,
            "access-control-allow-origin": "*",
          },
        });
      }
      const get = await env.FOUNDRY_BUCKET.get(r2Key);
      if (!get) {
        const res = json({ ok: false, error: "not_found" }, 404);
        if (pathname.startsWith("/v1/")) res.headers.set("access-control-allow-origin", "*");
        return res;
      }
      const res = new Response(get.body, {
        status: 200,
        headers: {
          "content-type": get.httpMetadata?.contentType || "application/octet-stream",
          "access-control-allow-origin": "*",
        },
      });
      return res;
    }

    if (request.method === "GET" && pathname === "/v1/jobs") {
      const lim = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50));
      const cursor = url.searchParams.get("cursor") || undefined;
      try {
        const listed = await env.FOUNDRY_BUCKET.list({
          prefix: "jobs/",
          limit: lim,
          ...(cursor ? { cursor } : {}),
        });
        const jobKeyRe = /^jobs\/(job_[0-9a-f-]{36})\.json$/i;
        const items = (listed.objects || [])
          .filter((o) => jobKeyRe.test(o.key))
          .map((o) => {
            const m = jobKeyRe.exec(o.key);
            const uploaded =
              o.uploaded instanceof Date ? o.uploaded.toISOString() : o.uploaded ? String(o.uploaded) : "";
            return {
              id: m ? m[1] : o.key,
              key: o.key,
              size: o.size,
              uploaded,
            };
          });
        items.sort((a, b) => (a.uploaded < b.uploaded ? 1 : a.uploaded > b.uploaded ? -1 : 0));
        const res = json({
          ok: true,
          items,
          truncated: listed.truncated === true,
          cursor: listed.truncated && listed.cursor ? listed.cursor : null,
        });
        res.headers.set("access-control-allow-origin", "*");
        return res;
      } catch (e) {
        const res = json({ ok: false, error: "r2_list_failed", detail: String(e) }, 502);
        res.headers.set("access-control-allow-origin", "*");
        return res;
      }
    }

    if (request.method === "POST" && pathname === "/v1/jobs") {
      const rl = mutationRateLimited(request, env);
      if (rl) return rl;
      let body = null;
      try {
        body = await request.json();
      } catch {
        const res = json({ ok: false, error: "invalid_json" }, 400);
        res.headers.set("access-control-allow-origin", "*");
        return res;
      }
      const id = `job_${crypto.randomUUID()}`;
      const jobKey = `jobs/${id}.json`;
      const record = {
        ok: true,
        id,
        status: "queued",
        created_at: new Date().toISOString(),
        payload: body,
      };
      try {
        await writeJobJson(jobKey, record, env);
      } catch (e) {
        return json({ ok: false, error: "r2_put_failed", detail: String(e) }, 502);
      }
      try {
        await env.FOUNDRY_JOBS.send({ job_id: id });
      } catch (e) {
        record.status = "queue_send_failed";
        record.queue_error = String(e);
        try {
          await writeJobJson(jobKey, record, env);
        } catch {
          /* ignore */
        }
        const res = json({ ok: false, error: "queue_send_failed", detail: String(e), id, r2_key: jobKey }, 502);
        res.headers.set("access-control-allow-origin", "*");
        return res;
      }
      const res = json(
        {
          ok: true,
          id,
          status: "queued",
          r2_key: jobKey,
          note: "Job enqueued; consumer updates status to completed (stub) or failed.",
        },
        202
      );
      res.headers.set("access-control-allow-origin", "*");
      return res;
    }

    const jobId = jobIdFromPath(pathname);
    if (request.method === "GET" && jobId) {
      const jobKey = `jobs/${jobId}.json`;
      const get = await env.FOUNDRY_BUCKET.get(jobKey);
      if (!get) {
        const res = json({ ok: false, error: "not_found" }, 404);
        res.headers.set("access-control-allow-origin", "*");
        return res;
      }
      const text = await get.text();
      const res = new Response(text, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "access-control-allow-origin": "*",
        },
      });
      return res;
    }

    const res = json({ ok: false, error: "not_found" }, 404);
    if (pathname.startsWith("/v1/")) res.headers.set("access-control-allow-origin", "*");
    return res;
  },

  /**
   * Push consumer: mark job processing → completed (stub; no PDF/D1 yet).
   * @param {MessageBatch<{ job_id?: string }>} batch
   * @param {Env} env
   * @param {ExecutionContext} _ctx
   */
  async queue(batch, env, _ctx) {
    for (const msg of batch.messages) {
      const job_id = msg.body && typeof msg.body.job_id === "string" ? msg.body.job_id : null;
      if (!job_id) {
        msg.ack();
        continue;
      }
      const jobKey = `jobs/${job_id}.json`;
      try {
        const rec = await readJobJson(jobKey, env);
        if (!rec || typeof rec !== "object") {
          msg.ack();
          continue;
        }
        if (rec.status === "completed") {
          msg.ack();
          continue;
        }
        rec.status = "processing";
        rec.processing_started_at = new Date().toISOString();
        await writeJobJson(jobKey, rec, env);

        rec.status = "completed";
        rec.processing_finished_at = new Date().toISOString();
        rec.result = {
          note: "v1.3 queue stub: no extract / D1; extend consumer for real work.",
          worker_version: WORKER_VERSION,
        };
        await writeJobJson(jobKey, rec, env);
        msg.ack();
      } catch (e) {
        console.error("foundry queue consumer error", job_id, e);
        msg.retry();
      }
    }
  },
};
