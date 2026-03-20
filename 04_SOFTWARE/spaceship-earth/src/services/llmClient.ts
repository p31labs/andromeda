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
 */

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
