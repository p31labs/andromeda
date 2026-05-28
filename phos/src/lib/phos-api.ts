/**
 * PHOS API Client — robust TypeScript fetch wrapper for Cloudflare Workers.
 *
 * Communicates with phos-api and phos-atmosphere endpoints.
 * All routing is deterministic (no LLMs in the hot path).
 */

// Default base URL for the phos-atmosphere worker in production.
// Override via constructor for local dev / preview.
const DEFAULT_ATMOSPHERE_BASE = 'https://phos-atmosphere.trimtab-signal.workers.dev';

/**
 * Shape returned by the phos-atmosphere worker.
 */
export interface AtmosphereResponse {
  status: string;
  surface: string;
  preset: {
    starfield: 'dense' | 'sparse' | 'static' | 'void';
    palette: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      muted: string;
    };
    motion: {
      enabled: boolean;
      speed: number;
      particleCount: number;
      transitionMs: number;
    };
    tracking: boolean;
    voice: boolean;
  };
}

/**
 * Shape returned by the phos-api worker.
 */
export interface MeshNode {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  description: string;
  latencyMs?: number;
}

export interface CrisisAlertPayload {
  surface: string;
  spoons: number;
  message: string;
}

export interface CrisisAlertResponse {
  status: string;
  timestamp: string;
}

export interface DiscordStatusResponse {
  bot: 'online' | 'degraded' | 'offline';
  botLatencyMs: number;
  webhookConfigured: boolean;
  timestamp: string;
}

export interface APIStatusResponse {
  status: 'PHOS Online';
  version: string;
  surface: string;
  timestamp: string;
  meshStatus: MeshNode[];
}

/**
 * Custom error for PHOS API failures.
 */
export class PHOSAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string
  ) {
    super(message);
    this.name = 'PHOSAPIError';
  }
}

/**
 * Shape for WebSocket state sync messages.
 */
export interface SyncPayload {
  spoons?: number;
  surface?: string;
  grayRock?: boolean;
}

export interface SyncMessage {
  type: 'SYNC';
  payload: SyncPayload;
}

/**
 * CRDT sync message types for PGLite mesh synchronization.
 */
export interface StateVector {
  [siteId: string]: number;
}

export interface SyncHandshake {
  type: 'HANDSHAKE';
  siteId: string;
  stateVector: StateVector;
}

export interface SyncDelta {
  type: 'DELTA';
  siteId: string;
  events: Array<{
    id: string;
    tableName: string;
    operation: string;
    rowId: string;
    rowData: string;
    lamportClock: number;
    siteId: string;
    createdAt: string;
  }>;
}

export interface SyncAck {
  type: 'ACK';
  siteId: string;
  stateVector: StateVector;
}

export type CRDTMessage = SyncHandshake | SyncDelta | SyncAck;

export interface StreamConnection {
  disconnect: () => void;
  send: (state: SyncPayload) => void;
  sendCRDT: (msg: CRDTMessage) => void;
  onCRDT: (handler: (msg: CRDTMessage) => void) => void;
}

/**
 * PHOS API Client.
 *
 * Usage:
 * ```ts
 * const api = new PHOSAPIClient();
 * const preset = await api.getAtmosphere('BONDING', false);
 * const status = await api.getStatus();
 * ```
 */
export class PHOSAPIClient {
  private readonly atmosphereBase: string;
  private readonly apiBase: string;
  private readonly defaultTimeoutMs: number;

  constructor(options?: {
    atmosphereBase?: string;
    apiBase?: string;
    timeoutMs?: number;
  }) {
    this.atmosphereBase = options?.atmosphereBase ?? DEFAULT_ATMOSPHERE_BASE;
    this.apiBase = options?.apiBase ?? 'https://phos-api.trimtab-signal.workers.dev';
    this.defaultTimeoutMs = options?.timeoutMs ?? 5_000;
  }

  /**
   * Open a WebSocket connection to the state sync stream.
   *
   * Implements exponential backoff reconnection (1s → 2s → 4s → ... → 30s max).
   * The returned `disconnect` function cancels reconnection and closes the socket.
   *
   * @param onMessage  Called with parsed SyncPayload from remote clients.
   * @returns          StreamConnection handle with `disconnect` and `send`.
   */
  connectStream(onMessage: (payload: SyncPayload) => void): StreamConnection {
    let reconnectAttempt = 0;
    let isActive = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const crdtHandlers: Array<(msg: CRDTMessage) => void> = [];

    const wsUrl = this.apiBase.replace('https://', 'wss://') + '/api/phos/stream';

    const connect = () => {
      if (!isActive) return;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          reconnectAttempt = 0;
        };

        ws.onmessage = (event: MessageEvent) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'SYNC' && parsed.payload) {
              onMessage(parsed.payload as SyncPayload);
            } else if (['HANDSHAKE', 'DELTA', 'ACK'].includes(parsed.type)) {
              for (const handler of crdtHandlers) {
                handler(parsed as CRDTMessage);
              }
            }
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onclose = () => {
          ws = null;
          if (!isActive) return;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
          reconnectAttempt++;
          reconnectTimer = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!isActive) return;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        reconnectAttempt++;
        reconnectTimer = setTimeout(connect, delay);
      }
    };

    connect();

    return {
      disconnect: () => {
        isActive = false;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (ws) {
          ws.onclose = null;
          ws.close();
          ws = null;
        }
      },
      send: (state: SyncPayload) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          const msg: SyncMessage = { type: 'SYNC', payload: state };
          ws.send(JSON.stringify(msg));
        }
      },
      sendCRDT: (msg: CRDTMessage) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      },
      onCRDT: (handler: (msg: CRDTMessage) => void) => {
        crdtHandlers.push(handler);
      },
    };
  }

  /**
   * Fetch the atmosphere preset for a given surface.
   *
   * Deterministic — no LLM calls. Pure pattern matching on the worker.
   *
   * @param surface  Uppercase surface key (e.g. 'BONDING', 'GREETING')
   * @param isUrgent If true, the worker returns the GRAY_ROCK preset unconditionally
   */
  async getAtmosphere(
    surface: string,
    isUrgent: boolean = false
  ): Promise<AtmosphereResponse> {
    const params = new URLSearchParams({ surface: surface.toUpperCase() });
    if (isUrgent) {
      params.set('urgent', 'true');
    }

    const url = `${this.atmosphereBase}?${params.toString()}`;
    return this._fetch<AtmosphereResponse>(url, 'phos-atmosphere');
  }

  /**
   * Get the PHOS API health status.
   */
  async getStatus(): Promise<APIStatusResponse> {
    const url = `${this.apiBase}`;
    return this._fetch<APIStatusResponse>(url, 'phos-api');
  }

  /**
   * Get the mesh status from the PHOS API worker.
   * Returns the status of all ecosystem service nodes.
   */
  async getMeshStatus(): Promise<APIStatusResponse> {
    return this._fetch<APIStatusResponse>(this.apiBase, 'phos-api');
  }

  /**
   * Check Discord bot status for PHOS HUD.
   */
  async getDiscordStatus(): Promise<DiscordStatusResponse> {
    const url = `${this.apiBase}/api/phos/discord-status`;
    return this._fetch<DiscordStatusResponse>(url, 'phos-api-discord');
  }

  /**
   * Send a crisis alert to the PHOS API worker.
   * The worker will optionally forward to a Discord webhook.
   * Fire-and-forget: errors are caught internally, never thrown.
   */
  async sendCrisisAlert(data: CrisisAlertPayload): Promise<void> {
    try {
      await this._fetch<CrisisAlertResponse>(
        `${this.apiBase}/api/phos/alert`,
        'phos-api-alert',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
    } catch {
      // Silently fail — crisis alert must never block the UI
    }
  }

  /**
   * Generic fetch with timeout, error wrapping, and CORS.
   * Supports both GET and POST.
   */
  private async _fetch<T>(
    url: string,
    endpoint: string,
    options?: { method?: string; body?: string }
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const response = await fetch(url, {
        method: options?.method ?? 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: options?.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new PHOSAPIError(
          `Atmosphere worker returned ${response.status}: ${body || response.statusText}`,
          response.status,
          endpoint
        );
      }

      const data: T = await response.json();
      return data;
    } catch (err) {
      if (err instanceof PHOSAPIError) throw err;

      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new PHOSAPIError(
          `Request to ${endpoint} timed out after ${this.defaultTimeoutMs}ms`,
          undefined,
          endpoint
        );
      }

      throw new PHOSAPIError(
        err instanceof Error ? err.message : 'Unknown fetch error',
        undefined,
        endpoint
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── GOOGLE DRIVE ──

  async getDriveAuthUrl(): Promise<{ authUrl: string }> {
    return this._fetch<{ authUrl: string }>(`${this.apiBase}/api/drive/auth-url`, 'drive-auth-url');
  }

  async exchangeDriveCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    return this._fetch(`${this.apiBase}/api/drive/callback?code=${encodeURIComponent(code)}`, 'drive-callback');
  }

  async refreshDriveToken(refreshToken: string): Promise<string | null> {
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ refresh_token: refreshToken, grant_type: 'refresh_token' }).toString(),
      });
      if (!res.ok) return null;
      const data = await res.json() as { access_token: string };
      return data.access_token;
    } catch { return null; }
  }
}

// Singleton export for convenient use across the app
export const phosAPI = new PHOSAPIClient();
