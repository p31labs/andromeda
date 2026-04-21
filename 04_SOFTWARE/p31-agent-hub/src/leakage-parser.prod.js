/**
 * CWP-17B: LLaMA 3.1 Leakage Parser — Production v1.0
 * 
 * Opus audit: 2026-04-21
 * Changes from draft:
 *   - Bracket-counted JSON extraction (O(n), zero backtracking)
 *   - Tool name allowlist validation (no false positives)
 *   - Input length cap (4 KB scan limit)
 *   - Python_tag array support
 *   - Safe JSON parse (no prototype pollution)
 *   - Telemetry counter for leak rate monitoring
 */

// ── Constants ────────────────────────────────────────────────────────
const MAX_SCAN_LENGTH = 4096;
const PYTHON_TAG_START = '<|python_tag|>';
const PYTHON_TAG_END_MARKERS = ['<|eom_id|>', '<|eot_id|>'];
const FUNCTION_TAG_OPEN = '<function=';
const FUNCTION_TAG_CLOSE = '</function>';

// ── Telemetry (lives for worker lifetime, not across isolates) ──────
let _leakCount = 0;
let _totalCalls = 0;

/** Returns { leaked, total } for monitoring */
function getLeakageStats() {
  return { leaked: _leakCount, total: _totalCalls, rate: _totalCalls > 0 ? _leakCount / _totalCalls : 0 };
}

// ── Safe JSON parse ─────────────────────────────────────────────────
function safeParse(str) {
  try {
    const obj = JSON.parse(str);
    if (obj === null || typeof obj !== 'object') return null;
    // Prototype pollution guard
    if ('__proto__' in obj || 'constructor' in obj || 'prototype' in obj) {
      const clean = Object.create(null);
      for (const [k, v] of Object.entries(obj)) {
        if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
          clean[k] = v;
        }
      }
      return clean;
    }
    return obj;
  } catch {
    return null;
  }
}

// ── Bracket-counted JSON extraction ─────────────────────────────────
/**
 * Starting from `text[startIdx]` (which must be `{` or `[`),
 * find the matching closing bracket. Returns the substring
 * including both brackets, or null if unbalanced.
 * 
 * O(n) scan, zero regex, zero backtracking.
 */
function extractBalancedJSON(text, startIdx) {
  const open = text[startIdx];
  const close = open === '{' ? '}' : open === '[' ? ']' : null;
  if (!close) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];

    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return text.substring(startIdx, i + 1);
    }
  }
  return null; // unbalanced
}

// ── Normalizer ──────────────────────────────────────────────────────
function normalizeCall(obj, knownTools) {
  if (!obj || typeof obj !== 'object') return null;
  if (!obj.name || typeof obj.name !== 'string') return null;
  const name = String(obj.name).trim();
  
  // Allowlist check — reject if tool name isn't in the set we gave the model
  if (knownTools && knownTools.size > 0 && !knownTools.has(name)) return null;

  const args = obj.parameters ?? obj.arguments ?? {};
  return { name, arguments: typeof args === 'object' ? args : {} };
}

// ── Format-specific extractors ──────────────────────────────────────

/** Format 1: <|python_tag|>{...}<|eom_id|> or <|python_tag|>[{...},{...}] */
function tryPythonTag(text, knownTools) {
  const tagIdx = text.indexOf(PYTHON_TAG_START);
  if (tagIdx === -1) return null;

  const jsonStart = tagIdx + PYTHON_TAG_START.length;
  // Skip whitespace
  let i = jsonStart;
  while (i < text.length && (text[i] === ' ' || text[i] === '\n' || text[i] === '\r' || text[i] === '\t')) i++;
  
  if (i >= text.length) return null;
  const ch = text[i];
  if (ch !== '{' && ch !== '[') return null;

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

/** Format 2: <function=name>{...}</function> (can appear multiple times) */
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
    const jsonStart = nameEnd + 1;

    // Skip whitespace to find {
    let j = jsonStart;
    while (j < text.length && text[j] === ' ') j++;

    if (j < text.length && text[j] === '{') {
      const jsonStr = extractBalancedJSON(text, j);
      if (jsonStr) {
        const args = safeParse(jsonStr);
        if (args) {
          const call = normalizeCall({ name, parameters: args }, knownTools);
          if (call) calls.push(call);
        }
      }
    }

    // Advance past </function> or past current position
    const closeTag = text.indexOf(FUNCTION_TAG_CLOSE, jsonStart);
    searchFrom = closeTag !== -1 ? closeTag + FUNCTION_TAG_CLOSE.length : nameEnd + 1;
  }

  return calls.length > 0 ? calls : null;
}

/** Format 3: bare JSON object or array (whole response is just tool calls) */
function tryBareJSON(text, knownTools) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  
  const ch = trimmed[0];
  if (ch !== '{' && ch !== '[') return null;

  const jsonStr = extractBalancedJSON(trimmed, 0);
  if (!jsonStr) return null;
  
  // Only match if the JSON consumes (nearly) the entire response
  // Allow up to 20 chars of trailing whitespace/tags
  if (jsonStr.length < trimmed.length - 20) return null;

  const parsed = safeParse(jsonStr);
  if (!parsed) return null;

  if (Array.isArray(parsed)) {
    const calls = parsed.map(item => normalizeCall(item, knownTools)).filter(Boolean);
    return calls.length > 0 ? calls : null;
  }

  const call = normalizeCall(parsed, knownTools);
  return call ? [call] : null;
}

// ── Main entry point ────────────────────────────────────────────────
/**
 * Extract tool calls from raw LLM response text.
 * 
 * @param {string} text - The raw response string from Workers AI
 * @param {Set<string>} [knownTools] - Set of tool names given to the model.
 *   If provided, only tool calls matching these names are returned.
 *   If omitted, all syntactically valid tool calls are returned (less safe).
 * @returns {Array<{name: string, arguments: object}>}
 */
function extractLeakedToolCalls(text, knownTools) {
  if (!text || typeof text !== 'string') return [];
  
  // Input length guard — no legitimate tool call exceeds 4 KB
  const scanText = text.length > MAX_SCAN_LENGTH ? text.substring(0, MAX_SCAN_LENGTH) : text;

  // Priority order: python_tag (most specific) → function tags → bare JSON (least specific)
  return tryPythonTag(scanText, knownTools)
    ?? tryFunctionTags(scanText, knownTools)
    ?? tryBareJSON(scanText, knownTools)
    ?? [];
}

// ── Integration shim ────────────────────────────────────────────────
/**
 * Drop-in patch for handleToolCalls. Call at the top of the function.
 * Mutates `out` in place to inject recovered tool calls.
 * 
 * @param {object} out - The Workers AI response object
 * @param {string[]} [toolNames] - Array of tool name strings from the tools config
 * @returns {boolean} true if leakage was recovered
 */
function recoverLeakedToolCalls(out, toolNames) {
  _totalCalls++;
  
  if (Array.isArray(out?.tool_calls) && out.tool_calls.length > 0) return false;

  const raw = typeof out?.response === 'string' ? out.response
    : typeof out?.content === 'string' ? out.content
    : null;
  if (!raw) return false;

  const knownTools = toolNames ? new Set(toolNames) : undefined;
  const recovered = extractLeakedToolCalls(raw, knownTools);
  if (recovered.length === 0) return false;

  _leakCount++;
  
  // Inject in native Cloudflare tool_calls format:
  // - arguments is a JSON STRING, not an object
  // - id is synthetic (prefixed to avoid collision with native IDs)
  out.tool_calls = recovered.map((c, i) => ({
    id: `leak_${Date.now()}_${i}`,
    type: 'function',
    function: {
      name: c.name,
      arguments: JSON.stringify(c.arguments),
    },
  }));

  return true;
}

// ── Integration Instructions ────────────────────────────────────────
//
// Paste at TOP of handleToolCalls():
//
// const TOOL_NAMES = tools.map(t => t.function?.name ?? t.name).filter(Boolean);
// const leaked = recoverLeakedToolCalls(out, TOOL_NAMES);
// if (leaked) {
//   console.warn(
//     `[CWP-17B] Recovered ${out.tool_calls.length} leaked calls: ` +
//     `${out.tool_calls.map(c => c.function.name).join(', ')} | ` +
//     `Leak rate: ${(getLeakageStats().rate * 100).toFixed(1)}%`
//   );
// }
//
// existing handleToolCalls code continues unchanged below