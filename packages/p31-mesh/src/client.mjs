/**
 * Minimal HTTP helpers for mesh Workers (GET + JSON parse + timeout).
 * GET uses one retry on transient HTTP (502/503/504/429) or a single refetch
 * after a non-abort network throw — helps cold Workers / edge blips. Opt out: P31_MESH_RETRY_GET=0
 */

/** @param {string} baseUrl */
function baseNoSlash(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {number} status
 * @returns {boolean}
 */
function isTransientStatus(status) {
  return status === 502 || status === 503 || status === 504 || status === 429;
}

function retryGetEnabled() {
  try {
    return process.env.P31_MESH_RETRY_GET !== "0";
  } catch {
    return true;
  }
}

/**
 * @param {unknown} e
 * @returns {boolean}
 */
function isRetriableFetchError(e) {
  if (e instanceof Error && e.name === "AbortError") return false;
  return e instanceof TypeError;
}

/**
 * @param {string} baseUrl - Origin, no trailing slash preferred
 * @param {string} suffix - Path e.g. /api/health
 * @param {{
 *   fetch?: typeof fetch,
 *   timeoutMs?: number,
 *   retryTransient?: boolean,
 *   retryDelayMs?: number,
 * }} [opts]
 */
export async function meshGet(baseUrl, suffix, opts = {}) {
  const { fetch: fetchImpl = globalThis.fetch, timeoutMs = 20_000, retryDelayMs = 280 } = opts;
  const allowRetry = opts.retryTransient !== false && retryGetEnabled();
  const u = new URL(
    suffix.startsWith("/") ? suffix : `/${suffix}`,
    baseNoSlash(baseUrl)
  );

  async function once() {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    let r;
    try {
      r = await fetchImpl(u, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
    const text = await r.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* leave null */
    }
    return { url: u.href, status: r.status, text, json };
  }

  try {
    let res = await once();
    if (allowRetry && isTransientStatus(res.status)) {
      await sleep(retryDelayMs);
      res = await once();
    }
    return res;
  } catch (e) {
    if (allowRetry && isRetriableFetchError(e)) {
      await sleep(retryDelayMs);
      return await once();
    }
    throw e;
  }
}

/**
 * @param {string} baseUrl
 * @param {string} suffix - Path e.g. /agent/demo/chat
 * @param {unknown} body - JSON-serializable
 * @param {{ fetch?: typeof fetch, timeoutMs?: number }} [opts]
 */
export async function meshPost(baseUrl, suffix, body, opts = {}) {
  const { fetch: fetchImpl = globalThis.fetch, timeoutMs = 20_000 } = opts;
  const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
  const u = new URL(path, baseNoSlash(baseUrl));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let r;
  try {
    r = await fetchImpl(u, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave null */
  }
  return { url: u.href, status: r.status, text, json };
}
