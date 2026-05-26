/**
 * Response shape checks for k4-personal public API (consumer contract).
 */

/**
 * @param {unknown} json
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateK4PersonalHealth(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, message: "health body is not a JSON object" };
  }
  const o = /** @type {Record<string, unknown>} */ (json);
  if (o.service !== "k4-personal") {
    return { ok: false, message: `health.service expected "k4-personal", got ${JSON.stringify(o.service)}` };
  }
  if (o.scope !== "personal") {
    return { ok: false, message: `health.scope expected "personal", got ${JSON.stringify(o.scope)}` };
  }
  return { ok: true };
}

/** Expected schema from GET /agent/:userId/manifest */
export const PERSONAL_AGENT_MANIFEST_SCHEMA = "p31.personalAgentManifest/0.1.0";

/**
 * @param {unknown} json
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validatePersonalAgentManifest(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, message: "manifest body is not a JSON object" };
  }
  const o = /** @type {Record<string, unknown>} */ (json);
  if (o.schema !== PERSONAL_AGENT_MANIFEST_SCHEMA) {
    return {
      ok: false,
      message: `manifest.schema expected "${PERSONAL_AGENT_MANIFEST_SCHEMA}", got ${JSON.stringify(o.schema)}`,
    };
  }
  return { ok: true };
}

/**
 * k4-cage unified Worker GET /api/health
 * @param {unknown} json
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateK4CageHealth(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, message: "cage health body is not a JSON object" };
  }
  const o = /** @type {Record<string, unknown>} */ (json);
  if (o.ok !== true) {
    return { ok: false, message: `cage health.ok expected true, got ${JSON.stringify(o.ok)}` };
  }
  if (o.service !== "k4-cage-unified") {
    return { ok: false, message: `cage health.service expected "k4-cage-unified", got ${JSON.stringify(o.service)}` };
  }
  return { ok: true };
}

/**
 * k4-hubs Worker GET /health
 * @param {unknown} json
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateK4HubsHealth(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, message: "hubs health body is not a JSON object" };
  }
  const o = /** @type {Record<string, unknown>} */ (json);
  if (o.status !== "ok") {
    return { ok: false, message: `hubs health.status expected "ok", got ${JSON.stringify(o.status)}` };
  }
  if (o.service !== "k4-hubs") {
    return { ok: false, message: `hubs health.service expected "k4-hubs", got ${JSON.stringify(o.service)}` };
  }
  return { ok: true };
}
