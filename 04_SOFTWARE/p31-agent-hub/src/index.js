/**
 * p31-agent-hub — Complete Production Worker
 * 
 * LLM orchestrator for the K₄ mesh.
 * Includes: tool definitions, parallel dispatch, leakage parser, AgentSession DO.
 * Deploys clean — no Quick Edit injection needed.
 */

// ═══════════════════════════════════════════════════════════════════
// CWP-17B: Leakage Parser (Production v1.0, Opus-audited)
// ═══════════════════════════════════════════════════════════════════
const MAX_SCAN_LENGTH = 4096;
const PYTHON_TAG_START = '<|python_tag|>';
const FUNCTION_TAG_OPEN = '<function=';
const FUNCTION_TAG_CLOSE = '</function>';
let _leakCount = 0, _totalCalls = 0;

function getLeakageStats() {
  return { leaked: _leakCount, total: _totalCalls, rate: _totalCalls > 0 ? _leakCount / _totalCalls : 0 };
}

function safeParse(str) {
  try {
    const obj = JSON.parse(str);
    if (obj === null || typeof obj !== 'object') return null;
    if ('__proto__' in obj || 'constructor' in obj || 'prototype' in obj) {
      const clean = Object.create(null);
      for (const [k, v] of Object.entries(obj)) {
        if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') clean[k] = v;
      }
      return clean;
    }
    return obj;
  } catch { return null; }
}

function extractBalancedJSON(text, startIdx) {
  const open = text[startIdx];
  const close = open === '{' ? '}' : open === '[' ? ']' : null;
  if (!close) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') { depth--; if (depth === 0) return text.substring(startIdx, i + 1); }
  }
  return null;
}

function normalizeCall(obj, knownTools) {
  if (!obj || typeof obj !== 'object') return null;
  if (!obj.name || typeof obj.name !== 'string') return null;
  const name = String(obj.name).trim();
  if (knownTools && knownTools.size > 0 && !knownTools.has(name)) return null;
  const args = obj.parameters ?? obj.arguments ?? {};
  return { name, arguments: typeof args === 'object' ? args : {} };
}

function tryPythonTag(text, knownTools) {
  const tagIdx = text.indexOf(PYTHON_TAG_START);
  if (tagIdx === -1) return null;
  let i = tagIdx + PYTHON_TAG_START.length;
  while (i < text.length && ' \n\r\t'.includes(text[i])) i++;
  if (i >= text.length || (text[i] !== '{' && text[i] !== '[')) return null;
  const jsonStr = extractBalancedJSON(text, i);
  if (!jsonStr) return null;
  const parsed = safeParse(jsonStr);
  if (!parsed) return null;
  if (Array.isArray(parsed)) {
    const calls = parsed.map(item => normalizeCall(item, knownTools)).filter(Boolean);
    return calls.length > 0 ? calls : null;
  }
  const call = normalizeCall(parsed, knownTools);
  return call ? [call] : null;
}

function tryFunctionTags(text, knownTools) {
  const calls = [];
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const tagStart = text.indexOf(FUNCTION_TAG_OPEN, searchFrom);
    if (tagStart === -1) break;
    const nameStart = tagStart + FUNCTION_TAG_OPEN.length;
    const nameEnd = text.indexOf('>', nameStart);
    if (nameEnd === -1) break;
    const name = text.substring(nameStart, nameEnd).trim();
    let j = nameEnd + 1;
    while (j < text.length && text[j] === ' ') j++;
    if (j < text.length && text[j] === '{') {
      const jsonStr = extractBalancedJSON(text, j);
      if (jsonStr) {
        const args = safeParse(jsonStr);
        if (args) { const call = normalizeCall({ name, parameters: args }, knownTools); if (call) calls.push(call); }
      }
    }
    const closeTag = text.indexOf(FUNCTION_TAG_CLOSE, j);
    searchFrom = closeTag !== -1 ? closeTag + FUNCTION_TAG_CLOSE.length : nameEnd + 1;
  }
  return calls.length > 0 ? calls : null;
}

function tryBareJSON(text, knownTools) {
  const trimmed = text.trim();
  if (!trimmed.length) return null;
  const ch = trimmed[0];
  if (ch !== '{' && ch !== '[') return null;
  const jsonStr = extractBalancedJSON(trimmed, 0);
  if (!jsonStr || jsonStr.length < trimmed.length - 20) return null;
  const parsed = safeParse(jsonStr);
  if (!parsed) return null;
  if (Array.isArray(parsed)) {
    const calls = parsed.map(item => normalizeCall(item, knownTools)).filter(Boolean);
    return calls.length > 0 ? calls : null;
  }
  const call = normalizeCall(parsed, knownTools);
  return call ? [call] : null;
}

function extractLeakedToolCalls(text, knownTools) {
  if (!text || typeof text !== 'string') return [];
  const scanText = text.length > MAX_SCAN_LENGTH ? text.substring(0, MAX_SCAN_LENGTH) : text;
  return tryPythonTag(scanText, knownTools)
    ?? tryFunctionTags(scanText, knownTools)
    ?? tryBareJSON(scanText, knownTools)
    ?? [];
}

function recoverLeakedToolCalls(out, toolNames) {
  _totalCalls++;
  if (Array.isArray(out?.tool_calls) && out.tool_calls.length > 0) return false;
  const raw = typeof out?.response === 'string' ? out.response
    : typeof out?.content === 'string' ? out.content : null;
  if (!raw) return false;
  const knownTools = toolNames ? new Set(toolNames) : undefined;
  const recovered = extractLeakedToolCalls(raw, knownTools);
  if (recovered.length === 0) return false;
  _leakCount++;
  out.tool_calls = recovered.map((c, i) => ({
    id: `leak_${Date.now()}_${i}`, type: 'function',
    function: { name: c.name, arguments: JSON.stringify(c.arguments) },
  }));
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// Tool Definitions
// ═══════════════════════════════════════════════════════════════════
const TOOLS = [
  {
    name: "get_family_mesh",
    description: "Get the current state of the K₄ family mesh including all vertices, edges, online status, and LOVE telemetry.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_personal_state",
    description: "Get the personal agent state for a specific user including energy level, reminders, and recent activity.",
    parameters: {
      type: "object",
      properties: { user_id: { type: "string", description: "The user ID to query" } },
      required: ["user_id"],
    },
  },
  {
    name: "list_hubs",
    description: "List all active hubs and their connected members in the mesh.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "check_energy",
    description: "Check a user's current energy/spoon level. Returns spoons remaining out of max.",
    parameters: {
      type: "object",
      properties: { user_id: { type: "string", description: "The user ID to check" } },
      required: ["user_id"],
    },
  },
  {
    name: "send_to_mesh",
    description: "Broadcast a message to all connected nodes in the family mesh room.",
    parameters: {
      type: "object",
      properties: { message: { type: "string", description: "The message to broadcast" } },
      required: ["message"],
    },
  },
  {
    name: "get_bio_alerts",
    description: "Get any active biometric alerts for a user (calcium levels, medication reminders).",
    parameters: {
      type: "object",
      properties: { user_id: { type: "string", description: "The user ID to check" } },
      required: ["user_id"],
    },
  },
];

const TOOL_NAMES = TOOLS.map(t => t.name);

// ═══════════════════════════════════════════════════════════════════
// Tool Execution — Parallel Dispatch via Service Bindings
// ═══════════════════════════════════════════════════════════════════
async function executeTool(name, args, env) {
  try {
    switch (name) {
      case "get_family_mesh": {
        const res = await env.K4_CAGE.fetch(new Request("https://internal/room-stats/family-alpha"));
        return await res.json();
      }
      case "get_personal_state": {
        const userId = args.user_id || "will";
        const res = await env.K4_PERSONAL.fetch(new Request(`https://internal/agent/${userId}/state`));
        return await res.json();
      }
      case "list_hubs": {
        const res = await env.K4_HUBS.fetch(new Request("https://internal/health"));
        return await res.json();
      }
      case "check_energy": {
        const userId = args.user_id || "will";
        const res = await env.K4_PERSONAL.fetch(new Request(`https://internal/agent/${userId}/energy`));
        return await res.json();
      }
      case "send_to_mesh": {
        // This is informational — actual broadcast happens via WebSocket
        return { sent: true, message: args.message, timestamp: Date.now() };
      }
      case "get_bio_alerts": {
        const userId = args.user_id || "will";
        const res = await env.K4_PERSONAL.fetch(new Request(`https://internal/agent/${userId}/reminders`));
        return await res.json();
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: `Tool ${name} failed: ${e.message}` };
  }
}

async function executeToolCalls(toolCalls, env) {
  // Parallel dispatch — wall-clock = max(legs), not sum
  const results = await Promise.all(
    toolCalls.map(async (tc) => {
      const name = tc.function?.name || tc.name;
      const rawArgs = tc.function?.arguments || tc.arguments || "{}";
      const args = typeof rawArgs === "string" ? safeParse(rawArgs) || {} : rawArgs;
      const result = await executeTool(name, args, env);
      return { tool_call_id: tc.id || name, name, result };
    })
  );
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// System Prompt
// ═══════════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `You are the P31 Mesh Agent — a cognitive communication prosthetic built on K₄ topology.

Your job:
- Help mesh members communicate, check on each other, and manage their energy
- Execute tool calls to query mesh state, never guess or hallucinate mesh data
- Keep responses concise and actionable — this is a prosthetic, not a chatbot
- When asked about mesh state, ALWAYS call get_family_mesh first

Available tools: ${TOOL_NAMES.join(", ")}

Rules:
- Never fabricate mesh data. If you need mesh state, call the tool.
- Never expose one user's private messages to another user.
- Keep responses under 200 words unless specifically asked for detail.
- If a tool call fails, say so honestly and suggest what the user can do.

You are grounded in the K₄ complete graph — four nodes, six edges, isostatic rigidity.
Every node can reach every other node. No single point of failure.`;

// ═══════════════════════════════════════════════════════════════════
// AgentSession Durable Object — Conversation Memory
// ═══════════════════════════════════════════════════════════════════
export class AgentSession {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        ts INTEGER NOT NULL
      )
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/messages" && request.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const rows = this.ctx.storage.sql
        .exec("SELECT role, content FROM messages ORDER BY id DESC LIMIT ?", limit)
        .toArray()
        .reverse();
      return Response.json(rows);
    }

    if (url.pathname === "/messages" && request.method === "POST") {
      const { role, content } = await request.json();
      this.ctx.storage.sql.exec(
        "INSERT INTO messages (role, content, ts) VALUES (?, ?, ?)",
        role, content, Date.now()
      );
      // Keep only last 100 messages per session
      this.ctx.storage.sql.exec(
        "DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT 100)"
      );
      return Response.json({ ok: true });
    }

    if (url.pathname === "/clear" && request.method === "POST") {
      this.ctx.storage.sql.exec("DELETE FROM messages");
      return Response.json({ ok: true });
    }

    return new Response("AgentSession", { status: 200 });
  }
}

// ═══════════════════════════════════════════════════════════════════
// Main Worker — HTTP Handler
// ═══════════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers for PWA
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json(
        { status: "ok", service: "p31-agent-hub", leakage: getLeakageStats() },
        { headers: corsHeaders }
      );
    }

    // Main chat endpoint
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const { session, message } = await request.json();
        if (!message) {
          return Response.json({ error: "No message" }, { status: 400, headers: corsHeaders });
        }

        const sessionId = session || "default";
        const traceId = crypto.randomUUID();

        // Get or create AgentSession DO for conversation memory
        const sessionDO = env.AGENT_SESSION.idFromName(sessionId);
        const sessionStub = env.AGENT_SESSION.get(sessionDO);

        // Store user message
        await sessionStub.fetch(new Request("https://internal/messages", {
          method: "POST",
          body: JSON.stringify({ role: "user", content: message }),
        }));

        // Load conversation history
        const historyRes = await sessionStub.fetch(
          new Request("https://internal/messages?limit=16")
        );
        const history = await historyRes.json();

        // Build messages for LLM
        const llmMessages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map(m => ({ role: m.role, content: m.content })),
        ];

        // Format tools for Workers AI
        const aiTools = TOOLS.map(t => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }));

        // Call Workers AI
        const aiResponse = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct",
          {
            messages: llmMessages,
            tools: aiTools,
            temperature: 0,
            max_tokens: 1024,
          }
        );

        // ── CWP-17B: Leakage Recovery ──
        const leaked = recoverLeakedToolCalls(aiResponse, TOOL_NAMES);
        if (leaked) {
          console.warn(
            `[CWP-17B] Recovered ${aiResponse.tool_calls.length} leaked calls: ` +
            `${aiResponse.tool_calls.map(c => c.function.name).join(", ")} | ` +
            `Leak rate: ${(getLeakageStats().rate * 100).toFixed(1)}%`
          );
        }

        // Execute tool calls if any
        let reply = aiResponse.response || "";
        const toolCalls = aiResponse.tool_calls || [];

        if (toolCalls.length > 0) {
          const toolResults = await executeToolCalls(toolCalls, env);

          // Build follow-up with tool results
          const toolMessages = [];
          for (const result of toolResults) {
            toolMessages.push({
              role: "tool",
              content: JSON.stringify(result.result),
              tool_call_id: result.tool_call_id,
            });
          }

          // Second LLM call with tool results
          const followUp = await env.AI.run(
            "@cf/meta/llama-3.1-8b-instruct",
            {
              messages: [
                ...llmMessages,
                {
                  role: "assistant",
                  content: "",
                  tool_calls: toolCalls.map(tc => ({
                    id: tc.id || tc.function?.name || "call",
                    type: "function",
                    function: {
                      name: tc.function?.name || tc.name,
                      arguments: tc.function?.arguments || JSON.stringify(tc.arguments || {}),
                    },
                  })),
                },
                ...toolMessages,
              ],
              temperature: 0,
              max_tokens: 1024,
            }
          );

          reply = followUp.response || JSON.stringify(toolResults.map(r => r.result));

          // If follow-up still outputs JSON/tool_calls, clean it up
          if (reply && typeof reply === "string" && reply.trim().startsWith("{") && (reply.includes("tool_calls") || reply.includes('"name"'))) {
            reply = `Executed ${toolResults.length} tool call(s). Results: ${toolResults.map(r => `${r.name}: ${JSON.stringify(r.result).slice(0,100)}`).join('; ')}`;
          }
        }

        // Clean up any residual leakage in the final reply
        if (reply && typeof reply === "string") {
          if (reply.startsWith("{") && (reply.includes("tool_calls") || reply.includes('"name"'))) {
            // Last-resort cleanup: try to extract meaningful text, or summarize tool results
            const parsed = safeParse(reply);
            if (parsed) {
              reply = "Mesh query completed. " + JSON.stringify(parsed).slice(0, 200);
            }
          }
          if (reply.includes("<|python_tag|>") || reply.includes("<|eom_id|>")) {
            reply = reply.replace(/<\|[^|]+\|>/g, "").trim() || "Processing complete.";
          }
        }

        // Fallback if reply is empty
        if (!reply || reply.trim() === "") {
          reply = "Mesh is active. Use 'show mesh' to see current state, or ask me anything.";
        }

        // Store assistant reply
        await sessionStub.fetch(new Request("https://internal/messages", {
          method: "POST",
          body: JSON.stringify({ role: "assistant", content: reply }),
        }));

        return Response.json(
          { reply, trace: traceId, session: sessionId, model: "@cf/meta/llama-3.1-8b-instruct" },
          { headers: corsHeaders }
        );

      } catch (e) {
        console.error(`[agent-hub] Error: ${e.message}`, e.stack);
        return Response.json(
          { error: "ai_failed", message: e.message, trace: crypto.randomUUID() },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Session management
    if (url.pathname === "/api/clear" && request.method === "POST") {
      const { session } = await request.json();
      const sessionDO = env.AGENT_SESSION.idFromName(session || "default");
      const sessionStub = env.AGENT_SESSION.get(sessionDO);
      await sessionStub.fetch(new Request("https://internal/clear", { method: "POST" }));
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // 404 for everything else
    return Response.json(
      { error: "not_found", routes: ["/health", "/api/chat", "/api/clear"] },
      { status: 404, headers: corsHeaders }
    );
  },
};