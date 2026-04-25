/**
 * HybridTransport — Protocol-agnostic connection manager for P31 edge mesh.
 *
 * Migration path: WebSocket → WebTransport with QUIC, with automatic fallback.
 *
 * Connection flow:
 *   1. Attempt WebTransport (HTTP/3 QUIC) — sub-100ms latency, no HOL blocking
 *   2. If WebTransport unsupported → fallback to WebSocket
 *   3. Maintain unified message API (JSON envelope) across both protocols
 *
 * Cloudflare Workers support: WebTransport available via request.transport binding.
 */

export type TransportState = 'connecting' | 'connected' | 'disconnected' | 'error';
export type K4ClientState = TransportState; // alias for consumer convenience

export interface HybridTransportEvents {
  onOpen?:           () => void;
  onClose?:          (code: number, reason: string) => void;
  onError?:          (err: Error) => void;
  onMessage?:        (data: unknown) => void;
  onStateChange?:    (state: TransportState) => void;
  onOfflineQueueSize?: (size: number) => void;
}

const HEARTBEAT_MS    = 15_000;
const MAX_BACKOFF_MS  = 30_000;
const BACKOFF_INITIAL = 1_000;
const CONNECT_TIMEOUT = 10_000;

// Internal runtime state
let _transport:      WebSocket | any = null; // `any` for WebTransport (evolving types)
let _transportType:  'websocket' | 'webtransport' | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _backoffMs       = BACKOFF_INITIAL;
let _intentionalClose = false;
let _url: string = '';
let _events: HybridTransportEvents = {};
let _pingSeq: number = 0;
let _pendingPongs: Map<number, { ts: number; resolve: (rtt: number) => void }> = new Map();

// ─── Feature detection ───────────────────────────────────────────────────────

/**
 * Detects WebTransport support in the current environment.
 */
export function supportsWebTransport(): boolean {
  if (typeof WebTransport === 'undefined') return false;
  return true;
}

// ─── Connection lifecycle ────────────────────────────────────────────────────

/**
 * Connect to the relay endpoint using best available transport.
 */
export function connect(url: string, events: HybridTransportEvents): void {
  _url   = url;
  _events = events;
  _intentionalClose = false;

  // Close existing
  if (_transport) {
    try { _transport.close(); } catch { }
    _transport = null;
    _transportType = null;
  }
  clearTimers();

  _events.onStateChange?.('connecting');

  // Strategy: attempt WebTransport → fallback WebSocket
  try {
    if (supportsWebTransport()) {
      const wt = new (WebTransport as any)(url);
      setupWebTransport(wt);
      _transport = wt;
      _transportType = 'webtransport';
      return;
    }
  } catch {
    // Fall through
  }

  // WebSocket fallback (legacy-compatible)
  const ws = new WebSocket(url);
  setupWebSocket(ws);
  _transport = ws;
  _transportType = 'websocket';
}

function setupWebTransport(wt: any): void {
  // Connection ready
  void wt.ready.catch((err: any) => {
    if (!_intentionalClose) {
      _events.onError?.(err as Error);
      _events.onStateChange?.('error');
      scheduleReconnect();
    }
  });

  void wt.ready.then(() => {
    _events.onStateChange?.('connected');
    _events.onOpen?.();

    // Heartbeat via datagrams
    _heartbeatTimer = setInterval(() => {
      const seq = ++_pingSeq;
      const ping = JSON.stringify({ type: 'ping', seq, ts: Date.now() });
      try {
        const writer = wt.datagrams?.writable?.getWriter();
        if (writer) {
          writer.write(new TextEncoder().encode(ping));
          writer.releaseLock();
        }
      } catch { /* ignore */ }
    }, HEARTBEAT_MS);

    // Incoming datagrams
    const reader = wt.datagrams?.readable?.getReader();
    if (!reader) return;

    (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            try {
              const msg = JSON.parse(new TextDecoder().decode(value));
              handleIncoming(msg);
            } catch { /* ignore malformed */ }
          }
        }
      } catch { /* ignore */ } finally {
        reader.releaseLock();
      }
    })();
  });

  // Close handling
  wt.closed?.then((closed: any) => {
    if (!_intentionalClose) {
      _events.onClose?.(closed.code ?? 1000, closed.reason ?? 'closed');
      _events.onStateChange?.('disconnected');
      scheduleReconnect();
    }
  }).catch(() => {});

  _heartbeatTimer = setInterval(() => {
    const seq = ++_pingSeq;
    const ping = JSON.stringify({ type: 'ping', seq, ts: Date.now() });
    try {
      const writer = wt.datagrams?.writable?.getWriter();
      if (writer) {
        writer.write(new TextEncoder().encode(ping));
        writer.releaseLock();
      }
    } catch { /* ignore */ }
  }, HEARTBEAT_MS);
}

function setupWebSocket(ws: WebSocket): void {
  ws.onopen = () => {
    _events.onStateChange?.('connected');
    _events.onOpen?.();
  };

  ws.onmessage = (ev: MessageEvent) => {
    try {
      const msg = JSON.parse(ev.data as string);
      handleIncoming(msg);
    } catch { /* ignore */ }
  };

  ws.onclose = (ev: CloseEvent) => {
    clearTimers();
    if (!_intentionalClose) {
      _events.onClose?.(ev.code, ev.reason);
      _events.onStateChange?.('disconnected');
      scheduleReconnect();
    }
  };

  ws.onerror = () => {
    _events.onError?.(new Error('WebSocket error'));
    _events.onStateChange?.('error');
  };

  // Heartbeat
  _heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const seq = ++_pingSeq;
      ws.send(JSON.stringify({ type: 'ping', seq, ts: Date.now() }));
    }
  }, HEARTBEAT_MS);
}

// ─── Messaging API ───────────────────────────────────────────────────────────

export function send(data: unknown): void {
  if (_transportType === 'webtransport') {
    sendDatagram(data);
  } else if (_transportType === 'websocket' && _transport instanceof WebSocket && _transport.readyState === WebSocket.OPEN) {
    _transport.send(JSON.stringify(data));
  } else {
    throw new Error('Transport not connected');
  }
}

function sendDatagram(data: unknown): void {
  if (_transportType !== 'webtransport') return;
  const wt = _transport as any;
  const payload = JSON.stringify(data);
  const bytes = new TextEncoder().encode(payload);
  try {
    const writer = wt.datagrams?.writable?.getWriter();
    if (writer) {
      writer.write(bytes);
      writer.releaseLock();
    }
  } catch { /* ignore */ }
}

export function ping(timeout = 5000): Promise<number> {
  return new Promise((resolve) => {
    const seq = ++_pingSeq;
    const ts  = Date.now();
    _pendingPongs.set(seq, { ts, resolve });

    setTimeout(() => {
      _pendingPongs.delete(seq);
      resolve(-1);
    }, timeout);

    send({ type: 'ping', seq, ts });
  });
}

export function disconnect(): void {
  _intentionalClose = true;
  clearTimers();
  if (_transport) {
    try { _transport.close(); } catch {}
    _transport = null;
    _transportType = null;
  }
  _events.onStateChange?.('disconnected');
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function handleIncoming(msg: { type: string; seq?: number; ts?: number; [k: string]: unknown }): void {
  switch (msg.type) {
    case 'pong': {
      const entry = _pendingPongs.get(msg.seq as number);
      if (entry?.ts) {
        const rtt = Date.now() - entry.ts;
        entry.resolve(rtt);
        _pendingPongs.delete(msg.seq as number);
      }
      break;
    }
    default:
      _events.onMessage?.(msg);
  }
}

function clearTimers(): void {
  if (_heartbeatTimer !== null) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  if (_reconnectTimer !== null) { clearTimeout(_reconnectTimer);  _reconnectTimer = null; }
}

function scheduleReconnect(): void {
  _reconnectTimer = setTimeout(() => {
    connect(_url, _events);
  }, _backoffMs);
  _backoffMs = Math.min(_backoffMs * 2, MAX_BACKOFF_MS);
}

export function isConnected(): boolean {
  return _transportType === 'websocket'
    ? _transport instanceof WebSocket && _transport.readyState === WebSocket.OPEN
    : _transportType === 'webtransport';
}

export function getTransportType(): 'websocket' | 'webtransport' | null {
  return _transportType;
}
