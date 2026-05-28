import type { Env } from '../src/index';

export function makeEnv(overrides: Partial<Env> = {}): Env {
  const store = new Map<string, string>();
  const kv: Env['EVENTS_KV'] = {
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    put: (key: string, value: string, options?: { expirationTtl?: number }) => {
      store.set(key, value);
      return Promise.resolve();
    },
    list: async (opts?: { prefix?: string; limit?: number }) => {
      const prefix = opts?.prefix ?? '';
      const limit = opts?.limit ?? 1000;
      const keys = [...store.keys()].filter(k => k.startsWith(prefix)).slice(0, limit);
      return { keys: keys.map(name => ({ name })), list_complete: true };
    },
    delete: (key: string) => { store.delete(key); return Promise.resolve(); },
  } as Env['EVENTS_KV'];

  return {
    EVENTS_KV: kv,
    ALLOWED_ORIGINS: 'https://p31ca.org,https://phosphorus31.org',
    EVENT_TTL_DAYS: '30',
    MAX_PAYLOAD_BYTES: '4096',
    GOVERNANCE_ERROR_THRESHOLD: '5',
    GOVERNANCE_WINDOW_SECONDS: '60',
    ADMIN_TOKEN: undefined,
    DISCORD_WEBHOOK_URL: undefined,
    ...overrides,
  };
}

export function makeRequest(
  method: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string>; url?: string } = {},
): Request {
  const url = options.url ?? `https://genesis-gate${path}`;
  const headers = options.headers ?? {};
  let body: string | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers['Content-Type'] = 'Content-Type' in headers ? headers['Content-Type'] : 'application/json';
  }
  return new Request(url, { method, headers, body });
}
