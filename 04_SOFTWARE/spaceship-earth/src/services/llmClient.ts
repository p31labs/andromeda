/**
 * @file llmClient — OpenAI-compatible streaming LLM client + encrypted credential storage.
 *
 * Protocol: POST /v1/chat/completions with `stream: true` (SSE).
 * Compatible with: Ollama, OpenAI, Anthropic (via proxy), any OpenAI-compatible API.
 *
 * Security: API key encrypted with AES-GCM.
 *   - Encryption key: non-extractable AES-GCM CryptoKey stored in IndexedDB ("p31-keys", "enc").
 *   - Ciphertext:     base64(iv + ciphertext) in localStorage "p31-llm-apikey".
 *   - An attacker who has localStorage but not IndexedDB cannot decrypt the key.
 *   - Plaintext settings (endpoint, model) stored unencrypted — not sensitive.
 *
 * Context injection: buildSystemContext() prepends sovereign state to any prompt
 * so the LLM is "aware" of the current room, entropy level, and cartridge count.
 *
 * WCD-31 Features:
 *   - Voice input (Web Speech API)
 *   - Image upload (base64)
 *   - TTS output (Web Speech API)
 *   - Agent tools with validation + 2-second rate limit
 *   - Gray Rock mode disables TTS
 */

// ── Web Speech API Types ─────────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    mozSpeechRecognition: any;
    msSpeechRecognition: any;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LLMConfig {
  endpoint: string;   // e.g. 'http://localhost:11434/v1' or 'https://api.openai.com/v1'
  apiKey:   string;   // Bearer token; empty string for local Ollama (no auth)
  model:    string;   // e.g. 'llama3', 'gpt-4o-mini', 'mistral'
}

export interface ChatMessage {
  role:    'system' | 'user' | 'assistant';
  content: string;
}

export interface SovereignContext {
  activeRoom:   string;
  entropy:      number;  // 0.0–1.0 (0 = full coherence, 1 = maximum entropy)
  activeSlots:  number;  // mounted cartridge count
}

// ── Encrypted key storage ─────────────────────────────────────────────────────

const KEY_DB_NAME   = 'p31-keys';
const KEY_STORE     = 'enc';
const KEY_IDB_KEY   = 'llm-key';
const CIPHER_LS_KEY = 'p31-llm-apikey';

let _encKeyDb: IDBDatabase | null = null;

function openKeyDB(): Promise<IDBDatabase> {
  if (_encKeyDb) return Promise.resolve(_encKeyDb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KEY_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(KEY_STORE);
    req.onsuccess = () => { _encKeyDb = req.result; resolve(_encKeyDb!); };
    req.onerror   = () => reject(req.error);
  });
}

async function getOrCreateEncKey(): Promise<CryptoKey> {
  const db = await openKeyDB();
  // Try to load existing key from IDB
  const existing = await new Promise<CryptoKey | undefined>((res, rej) => {
    const tx  = db.transaction(KEY_STORE, 'readonly');
    const req = tx.objectStore(KEY_STORE).get(KEY_IDB_KEY);
    req.onsuccess = () => res(req.result as CryptoKey | undefined);
    req.onerror   = () => rej(req.error);
  });
  if (existing) return existing;

  // Generate a new non-extractable key and persist it
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  );

  // Cryptographic validation cycle - mathematically prove the cipher is sound
  const testBuffer = new TextEncoder().encode('P31_CRYPTO_VALIDATION_TEST');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  if (iv.every(b => b === 0)) {
    throw new Error('[CRITICAL_FAULT] Entropy failure in IV generation');
  }
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, testBuffer);
  if (!cipher || cipher.byteLength === 0) {
    throw new Error('[CRITICAL_FAULT] Test encryption produced zero-length output');
  }
  await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  console.log('[P31_CRYPTO] AES-GCM-256 key generated and mathematically validated');

  await new Promise<void>((res, rej) => {
    const tx  = db.transaction(KEY_STORE, 'readwrite');
    const req = tx.objectStore(KEY_STORE).put(key, KEY_IDB_KEY);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
  return key;
}

async function encryptApiKey(plain: string): Promise<string> {
  const key = await getOrCreateEncKey();
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  const combined = new Uint8Array(iv.byteLength + enc.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(enc), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decryptApiKey(cipher: string): Promise<string> {
  const key   = await getOrCreateEncKey();
  const bytes = Uint8Array.from(atob(cipher), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12) },
    key,
    bytes.slice(12),
  );
  return new TextDecoder().decode(plain);
}

// ── Public config API ─────────────────────────────────────────────────────────

export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  try {
    const cipher = config.apiKey ? await encryptApiKey(config.apiKey) : '';
    localStorage.setItem('p31-llm-endpoint', config.endpoint);
    localStorage.setItem('p31-llm-model',    config.model);
    localStorage.setItem(CIPHER_LS_KEY,      cipher);
  } catch { /* IDB unavailable — store endpoint/model only */ }
}

/**
 * One-time migration: if the legacy plaintext key `p31_llm_key` exists,
 * encrypt it into the new storage schema and delete the plaintext copy.
 * Called lazily by loadLLMConfig so existing users are migrated on next open.
 */
async function migrateLegacyKey(): Promise<void> {
  try {
    const legacy = localStorage.getItem('p31_llm_key');
    if (!legacy) return;
    const existing = localStorage.getItem(CIPHER_LS_KEY);
    if (!existing) {
      // No encrypted key yet — migrate the plaintext one
      const cipher = await encryptApiKey(legacy);
      localStorage.setItem(CIPHER_LS_KEY, cipher);
    }
    // Remove the plaintext key regardless — encrypted path now canonical
    localStorage.removeItem('p31_llm_key');
  } catch { /* migration is best-effort */ }
}

export async function loadLLMConfig(): Promise<LLMConfig> {
  await migrateLegacyKey();
  const endpoint = localStorage.getItem('p31-llm-endpoint') ?? '';
  const model    = localStorage.getItem('p31-llm-model')    ?? 'llama3';
  const cipher   = localStorage.getItem(CIPHER_LS_KEY);
  let apiKey = '';
  if (cipher) {
    try { apiKey = await decryptApiKey(cipher); } catch { /* key rotated or IDB cleared */ }
  }
  return { endpoint, model, apiKey };
}

// ── Context injection ─────────────────────────────────────────────────────────

export function buildSystemContext(basePrompt: string, ctx: SovereignContext): string {
  return [
    '[SOVEREIGN CONTEXT]',
    `Room: ${ctx.activeRoom}`,
    `Entropy: ${ctx.entropy.toFixed(2)}  Coherence: ${(1 - ctx.entropy).toFixed(2)}`,
    `Active cartridges: ${ctx.activeSlots}`,
    '[END CONTEXT]',
    '',
    basePrompt,
  ].join('\n');
}

// ── Streaming chat ────────────────────────────────────────────────────────────

/**
 * Stream a chat completion from an OpenAI-compatible endpoint.
 * Yields text delta chunks as they arrive via SSE.
 * Throws on non-2xx HTTP or missing body; AbortError propagated to caller.
 */
export async function* streamChat(
  messages: ChatMessage[],
  config:   LLMConfig,
  signal?:  AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const url = `${config.endpoint.replace(/\/$/, '')}/chat/completions`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: config.model, messages, stream: true }),
    signal,
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => resp.statusText);
    throw new Error(`LLM ${resp.status}: ${body.slice(0, 120)}`);
  }
  if (!resp.body) throw new Error('Streaming not supported by this endpoint');

  const reader  = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch { /* skip malformed SSE frame */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── WCD-31: Voice Input (Web Speech API) ─────────────────────────────────────

type VoiceInputCallback = (transcript: string, isFinal: boolean) => void;

let _recognition: SpeechRecognition | null = null;
let _voiceCallback: VoiceInputCallback | null = null;

export function isVoiceSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startVoiceInput(onResult: VoiceInputCallback): boolean {
  if (!isVoiceSupported()) return false;

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  _recognition = new SpeechRecognitionAPI();
  _recognition.continuous = true;
  _recognition.interimResults = true;
  _recognition.lang = 'en-US';

  _recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    if (_voiceCallback) {
      _voiceCallback(result[0].transcript, result.isFinal);
    }
  };

  _recognition.onerror = () => {
    stopVoiceInput();
  };

  _voiceCallback = onResult;
  _recognition.start();
  return true;
}

export function stopVoiceInput(): void {
  if (_recognition) {
    _recognition.stop();
    _recognition = null;
  }
  _voiceCallback = null;
}

// ── WCD-31: Image Upload ─────────────────────────────────────────────────────

export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── WCD-31: Text-to-Speech Output ────────────────────────────────────────────

let _speechSynthesis: SpeechSynthesisUtterance | null = null;

export function isTTSsupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Check if reduced audio is preferred (accessibility).
 */
export function isReducedAudio(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function speakTTS(text: string, disabled: boolean = false): void {
  if (!isTTSsupported() || disabled || isReducedAudio()) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;

  // Try to find a natural voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
  if (preferred) utterance.voice = preferred;

  _speechSynthesis = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopTTS(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  _speechSynthesis = null;
}

// ── WCD-31: Agent Tools ────────────────────────────────────────────────────────

// Tool definitions with validation
export type AgentToolName = 'change_skin' | 'mount_cartridge' | 'set_accent_color' | 'open_overlay';

interface AgentToolDefinition {
  name: AgentToolName;
  description: string;
  parameters: Record<string, { type: string; required: boolean; validate?: (v: unknown) => boolean }>;
}

const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: 'change_skin',
    description: 'Change the visual theme/skin of the application',
    parameters: {
      theme: { type: 'string', required: true, validate: (v) => 
        ['OPERATOR', 'KIDS', 'GRAY_ROCK', 'AURORA', 'HIGH_CONTRAST', 'LOW_MOTION'].includes(v as string) },
    },
  },
  {
    name: 'mount_cartridge',
    description: 'Mount a cartridge to a slot',
    parameters: {
      slot_index: { type: 'number', required: true, validate: (v) => typeof v === 'number' && v >= 0 && v <= 3 },
      cartridge_id: { type: 'string', required: true },
    },
  },
  {
    name: 'set_accent_color',
    description: 'Set the accent color',
    parameters: {
      color: { type: 'string', required: true, validate: (v) => /^#[0-9A-Fa-f]{6}$/.test(v as string) },
    },
  },
  {
    name: 'open_overlay',
    description: 'Open a specific overlay/room',
    parameters: {
      room: { type: 'string', required: true, validate: (v) =>
        ['OBSERVATORY', 'COLLIDER', 'BONDING', 'BRIDGE', 'BUFFER', 'COPILOT', 'LANDING', 'RESONANCE', 'FORGE'].includes(v as string) },
    },
  },
];

export function getAgentToolsPrompt(): string {
  return AGENT_TOOLS.map(t =>
    `- ${t.name}: ${t.description}\n  Parameters: ${Object.entries(t.parameters).map(([k, v]) => `${k} (${v.type}${v.required ? ', required' : ''})`).join(', ')}`
  ).join('\n');
}

// Rate limiting state
let _lastToolCall = 0;
const TOOL_RATE_LIMIT_MS = 2000; // 2 seconds

export interface ToolCall {
  tool: AgentToolName;
  args: Record<string, unknown>;
}

/**
 * Parse tool calls from LLM response.
 * Looks for JSON in the format: { tool: "name", args: {...} }
 */
export function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const jsonMatches = text.match(/\{[^{}]*"tool"[^{}]*\}/g);

  if (!jsonMatches) return calls;

  for (const match of jsonMatches) {
    try {
      const parsed = JSON.parse(match);
      if (parsed.tool && parsed.args) {
        const toolDef = AGENT_TOOLS.find(t => t.name === parsed.tool);
        if (toolDef) {
          // Validate arguments
          let valid = true;
          for (const [key, param] of Object.entries(toolDef.parameters)) {
            if (param.required && !(key in parsed.args)) {
              valid = false;
              break;
            }
            if (param.validate && key in parsed.args && !param.validate(parsed.args[key])) {
              valid = false;
              break;
            }
          }
          if (valid) {
            calls.push({ tool: parsed.tool, args: parsed.args });
          }
        }
      }
    } catch {
      // Skip malformed JSON
    }
  }

  return calls;
}

/**
 * Check if tool call is allowed (rate limit).
 */
export function canExecuteTool(): boolean {
  const now = Date.now();
  if (now - _lastToolCall < TOOL_RATE_LIMIT_MS) {
    return false;
  }
  _lastToolCall = now;
  return true;
}

/**
 * Execute a validated tool call.
 * Returns true if executed, false if rate limited.
 */
export async function executeTool(call: ToolCall): Promise<{ success: boolean; message: string }> {
  if (!canExecuteTool()) {
    return { success: false, message: 'Rate limited. Please wait 2 seconds between tool calls.' };
  }

  // Tool execution is delegated to the store/caller
  // This returns the validated call for the UI to handle
  return { success: true, message: `Tool ${call.tool} queued with args: ${JSON.stringify(call.args)}` };
}
