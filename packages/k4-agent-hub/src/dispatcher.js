/**
 * Skill dispatcher — routes a (hubId, skill, input) tuple to the local Ollama
 * fleet via HTTP when env.OLLAMA_BASE_URL is reachable, otherwise returns a
 * structured echo with skill metadata.
 *
 * Wiring to simplex-v7 cloud lanes is queued in CWP-P31-K4-AGENT-HUB-WIRE-SIMPLEX-LANE
 * (for v1.2.0) so this module stays self-contained and testable in v1.1.0.
 */

const DEFAULT_TIMEOUT_MS = 8000;

/** Build the Ollama prompt envelope for a given hub + skill + input. */
function buildPrompt({ hubId, skill, input }) {
  const sysHints = {
    forge:   "You are FORGE — make. Reply with code or a runnable patch.",
    counsel: "You are COUNSEL — protect. Reply with a brief, sourced, no-fabrication response.",
    scholar: "You are SCHOLAR — understand. Reply with concise synthesis and citations when present.",
    scribe:  "You are SCRIBE — remember. Reply by recording or assembling structured notes.",
  };
  const userText = (input && typeof input === "object" && typeof input.prompt === "string")
    ? input.prompt
    : typeof input === "string" ? input : JSON.stringify(input ?? {}, null, 2);
  return {
    system: sysHints[hubId] ?? "You are a P31 agent hub. Reply concisely.",
    prompt: userText,
    skillLabel: skill.label,
  };
}

/** Race a fetch against a timeout. */
async function fetchWithTimeout(url, init, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Try the local Ollama HTTP API. Soft-fails to null when unreachable,
 * timeout, non-2xx, or model not found — caller falls back to structured echo.
 */
export async function tryOllama({ env, hubId, skill, input }) {
  const base = env?.OLLAMA_BASE_URL;
  if (!base || typeof base !== "string") return null;
  const url = `${base.replace(/\/$/, "")}/api/generate`;
  const { system, prompt } = buildPrompt({ hubId, skill, input });
  try {
    const resp = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: skill.ollamaPersona,
        prompt,
        system,
        stream: false,
        options: { temperature: 0.3 },
      }),
    }, Number(env?.OLLAMA_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS));
    if (!resp.ok) return { ok: false, dispatcher: "ollama", status: resp.status, error: `ollama http ${resp.status}` };
    const j = await resp.json();
    return {
      ok: true,
      dispatcher: "ollama",
      hub: hubId,
      skill: skill.id,
      persona: skill.ollamaPersona,
      reply: typeof j?.response === "string" ? j.response : "",
      tokens: typeof j?.eval_count === "number" ? j.eval_count : null,
    };
  } catch (e) {
    return { ok: false, dispatcher: "ollama", error: String(e?.message ?? e) };
  }
}

/**
 * Try the simplex-v7 cloud crew when local Ollama is unreachable.
 * Requires SIMPLEX_BASE_URL (e.g. https://simplex-worker.<sub>.workers.dev) and
 * SIMPLEX_OPERATOR_SECRET (same as simplex-v7 OPERATOR_SECRET wrangler secret).
 * Skipped when the skill has no simplexLane, or env vars are absent.
 */
export async function trySimplexCloud({ env, hubId, skill, input }) {
  const base = env?.SIMPLEX_BASE_URL;
  const secret = env?.SIMPLEX_OPERATOR_SECRET;
  if (!base || typeof base !== "string") return null;
  if (!skill.simplexLane) return null;

  const promptText = (input && typeof input === "object" && typeof input.prompt === "string")
    ? input.prompt
    : typeof input === "string" ? input : JSON.stringify(input ?? {}, null, 2);

  const url = `${base.replace(/\/$/, "")}/api/k4/dispatch`;
  try {
    const resp = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { "Authorization": `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({
        agentId: skill.simplexLane,
        skillId: skill.id,
        prompt: promptText,
      }),
    }, 20000);
    if (!resp.ok) {
      return { ok: false, dispatcher: "simplex-cloud", error: `http ${resp.status}` };
    }
    const j = await resp.json();
    return { ...j, dispatcher: "simplex-cloud", hub: hubId };
  } catch (e) {
    return { ok: false, dispatcher: "simplex-cloud", error: String(e?.message ?? e) };
  }
}

/** Structured echo — always succeeds; used when Ollama + simplex-cloud are both unreachable. */
export function structuredEcho({ hubId, skill, input }) {
  return {
    ok: true,
    dispatcher: "echo",
    hub: hubId,
    skill: skill.id,
    label: skill.label,
    persona: skill.ollamaPersona,
    simplexLane: skill.simplexLane,
    receivedKeys: input && typeof input === "object" ? Object.keys(input) : [],
    note: "echo dispatcher — set OLLAMA_BASE_URL for local fleet or SIMPLEX_BASE_URL + SIMPLEX_OPERATOR_SECRET for cloud fallback.",
  };
}

/** Dispatch entry point — used by HubBase.runSkill. Priority: Ollama → simplex-cloud → echo. */
export async function dispatch({ env, hubId, skill, input }) {
  const ollama = await tryOllama({ env, hubId, skill, input });
  if (ollama && ollama.ok) return ollama;
  const simplex = await trySimplexCloud({ env, hubId, skill, input });
  if (simplex && simplex.ok) return simplex;
  return structuredEcho({ hubId, skill, input });
}
