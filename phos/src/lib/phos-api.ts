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
 * Connection handle returned by connectStream.
 */
export interface StreamConnection {
  /** Close the WebSocket and cancel reconnection. */
  disconnect: () => void;
  /** Send a state sync up the socket. */
  send: (state: SyncPayload) => void;
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
            const msg: SyncMessage = JSON.parse(event.data);
            if (msg.type === 'SYNC' && msg.payload) {
              onMessage(msg.payload);
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
        // WebSocket unavailable (SSR or unsupported browser)
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
}

// Singleton export for convenient use across the app
export const phosAPI = new PHOSAPIClient();
