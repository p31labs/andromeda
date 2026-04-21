/**
 * p31-agent-hub — ES Module Worker
 * CWP-17B: Leakage Parser Inlined
 */

import type { Env } from "./env";

const PYTHON_TAG_RE = /<\|python_tag\|>\s*(\{[\s\S]*?\})\s*(?:<\|eom_id\|>|$)/;
const FUNCTION_TAG_RE = /<function\s*=\s*([A-Za-z0-9_\-.]+)\s*>\s*(\{[\s\S]*?\})\s*<\/function>/g;
const BARE_JSON_RE = /^\s*(\{[\s\S]*?"name"\s*:\s*"[^"]+"[\s\S]*?"(?:parameters|arguments)"\s*:\s*\{[\s\S]*?\}\s*\})\s*$/;
const JSON_ARRAY_RE = /^\s*\[([\s\S]*?"name"[\s\S]*?)\]\s*$/;

function parseArgs(argStr) {
  if (typeof argStr !== "string") return {};
  try { return JSON.parse(argStr); } catch { return {}; }
}

function normalizeCall(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (!obj.name || typeof obj.name !== "string") return null;
  return { name: String(obj.name), arguments: (obj.parameters ?? obj.arguments ?? {}) };
}

function parseAndNormalize(json) {
  try { return normalizeCall(JSON.parse(json)); } catch { return null; }
}

export function extractLeakedToolCalls(text: string): Array<{ name: string; arguments: Record<string, unknown> }> {
  if (!text || typeof text !== "string") return [];
  let match = PYTHON_TAG_RE.exec(text);
  if (match) { const r = parseAndNormalize(match[1]); if (r) return [r]; }
  const fnMatches = [...text.matchAll(FUNCTION_TAG_RE)];
  if (fnMatches.length > 0) return fnMatches.map(m => ({ name: m[1], arguments: parseArgs(m[2]) })).filter(c => c.name);
  const trimmed = text.trim();
  if (JSON_ARRAY_RE.test(trimmed)) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) { const norm = arr.map(normalizeCall).filter(Boolean); if (norm.length) return norm; }
    } catch {} }
  match = BARE_JSON_RE.exec(trimmed);
  if (match) { const r = parseAndNormalize(match[1]); if (r) return [r]; }
  try {
    const p = JSON.parse(trimmed);
    if (p?.name && (p?.parameters || p?.arguments)) { const r = normalizeCall(p); if (r) return [r]; }
  } catch {}
  return [];
}

export function extractToolCalls(
  response: { tool_calls?: unknown[]; response?: string; content?: string },
  log?: (msg: string) => void
): Array<{ name: string; arguments: Record<string, unknown> }> {
  let calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
  if (response.tool_calls?.length) {
    calls = (response.tool_calls as Array<{ name?: string; arguments?: Record<string, unknown> }>)
      .map(tc => ({ name: tc.name ?? "", arguments: tc.arguments ?? {} }))
      .filter(tc => tc.name);
  }
  if (calls.length === 0) {
    const raw = typeof response.response === "string" ? response.response : null;
    if (!raw && typeof response.content === "string") return extractLeakedToolCalls(response.content);
    if (raw) {
      calls = extractLeakedToolCalls(raw);
      if (calls.length > 0) log?.(`[LlamaLeakage] recovered ${calls.length}: ${calls.map(c => c.name).join(", ")}`);
    }
  }
  return calls;
}

/**
 * AgentSession Durable Object — kept for backwards compatibility
 * Existing deployment has active instances
 */
export class AgentSession {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/messages") {
      const raw = await this.ctx.storage.get("messages");
      return new Response(JSON.parse(raw || "[]"), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("AgentSession", { status: 200 });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response("p31-agent-hub alive — CWP-17B loaded", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env, any>;