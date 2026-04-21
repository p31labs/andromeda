/**
 * CWP-17B: Three-Regex Leakage Parser for @cf/meta/llama-3.1-8b-instruct
 * Catches all three LLaMA tool-call emission formats that leak as plain text
 */
export const PYTHON_TAG_RE = /<\|python_tag\|>\s*(\{[\s\S]*?\})\s*(?:<\|eom_id\|>|$)/;
export const FUNCTION_TAG_RE = /<function\s*=\s*([A-Za-z0-9_\-.]+)\s*>\s*(\{[\s\S]*?\})\s*<\/function>/g;
export const BARE_JSON_RE = /^\s*(\{[\s\S]*?"name"\s*:\s*"[^"]+"[\s\S]*?"(?:parameters|arguments)"\s*:\s*\{[\s\S]*?\}\s*\})\s*$/;
export const JSON_ARRAY_RE = /^\s*\[([\s\S]*?"name"[\s\S]*?)\]\s*$/;

function parseArgs(argStr) {
  if (typeof argStr !== "string") return {};
  try { return JSON.parse(argStr); } catch { return {}; }
}

function normalizeCall(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (!obj.name || typeof obj.name !== "string") return null;
  return { name: String(obj.name), arguments: obj.parameters ?? obj.arguments ?? {} };
}

function parseAndNormalize(json) {
  try { return normalizeCall(JSON.parse(json)); } catch { return null; }
}

export function extractLeakedToolCalls(text) {
  if (!text || typeof text !== "string") return [];
  let match;
  match = PYTHON_TAG_RE.exec(text);
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
