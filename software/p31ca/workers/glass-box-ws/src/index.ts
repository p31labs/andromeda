/**
 * Glass Box WebSocket Worker
 * P31 Sovereign Edge — Post-Quantum Encrypted Telemetry
 *
 * Implements ML-KEM-768 (FIPS 203) key exchange over WebSockets
 * for Harvest Now, Decrypt Later protection.
 *
 * Endpoints:
 *   - wss://glass-box.p31ca.workers.dev/ws  (WebSocket upgrade)
 *
 * Protocol:
 *   1. Client connects via WebSocket
 *   2. Client sends pqc_hello with capabilities
 *   3. Server responds with pqc_capabilities
 *   4. Client sends ml_kem_768_encapsulation_key (1184 bytes base64)
 *   5. Server encapsulates, stores shared secret, returns ciphertext
 *   6. Client decapsulates to derive shared AES-256-GCM key
 *   7. All subsequent traffic encrypted with derived key
 *
 * Storage:
 *   - KV: session:{clientId} -> { sharedSecret, establishedAt } (5-min TTL)
 */

import type { WebSocket } from '@cloudflare/workers-types';

// WebSocket ready state constants (since we import WebSocket as type only)
const WS_READY_STATE_OPEN = 1;

// Environment bindings
export interface Env {
  GLASS_BOX_KV: KVNamespace;
}

// PQC Session state per WebSocket connection
interface PQCSession {
  clientId: string | null;
  clientPublicKey: Uint8Array | null;
  sharedSecret: Uint8Array | null;
  established: boolean;
  createdAt: number;
}

// Telemetry message types
interface TelemetryMessage {
  type: string;
  metric: string;
  value: string | number;
  timestamp?: number;
  nodes?: number;
  workers?: number;
}

/**
 * WebSocket Handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'glass-box-ws',
        version: '1.0.0',
        pqc: 'ML-KEM-768 ready',
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Telemetry WebSocket endpoint for GlassBox component
    if (url.pathname === '/telemetry') {
      return handleTelemetryEndpoint(request);
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // WebSocket upgrade required
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response(JSON.stringify({
        error: 'Expected WebSocket Upgrade',
        usage: 'Connect to /ws with WebSocket protocol'
<<<<<<< HEAD
      }), { 
=======
      }), {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
<<<<<<< HEAD
    
    // Create WebSocket pair
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    
=======

    // Create WebSocket pair
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Initialize session state
    const session: PQCSession = {
      clientId: null,
      clientPublicKey: null,
      sharedSecret: null,
      established: false,
      createdAt: Date.now()
    };
<<<<<<< HEAD
    
    server.accept();
    
=======

    server.accept();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Handle messages
    server.addEventListener('message', async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        await handleMessage(data, server, session, env);
      } catch (err) {
        server.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format. Expected JSON.',
          timestamp: Date.now()
        }));
      }
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Handle close
    server.addEventListener('close', async () => {
      if (session.clientId) {
        // Clean up KV session
        await env.GLASS_BOX_KV.delete(`session:${session.clientId}`);
      }
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    return new Response(null, { status: 101, webSocket: client });
  }
};

/**
 * Handle incoming WebSocket messages
 */
async function handleMessage(
  data: any,
  ws: WebSocket,
  session: PQCSession,
  env: Env
): Promise<void> {
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  switch (data.type) {
    case 'pqc_hello':
      // Client capability announcement
      session.clientId = data.clientId || `anon-${Date.now()}`;
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      ws.send(JSON.stringify({
        type: 'pqc_capabilities',
        supported: ['ML-KEM-768', 'AES-256-GCM'],
        serverTimestamp: Date.now(),
        sessionId: session.clientId,
        message: 'Ready for ML-KEM-768 encapsulation key'
      }));
      break;
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    case 'ml_kem_768_encapsulation_key':
      // Client sends public key, server encapsulates
      if (!data.publicKey) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Missing publicKey field'
        }));
        return;
      }
<<<<<<< HEAD
      
      try {
        // Decode client public key (1184 bytes for ML-KEM-768)
        session.clientPublicKey = base64ToBytes(data.publicKey);
        
=======

      try {
        // Decode client public key (1184 bytes for ML-KEM-768)
        session.clientPublicKey = base64ToBytes(data.publicKey);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        // Validate key length
        if (session.clientPublicKey.length !== 1184) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Invalid ML-KEM-768 public key length: ${session.clientPublicKey.length} (expected 1184)`
          }));
          return;
        }
<<<<<<< HEAD
        
        // In production, this would use actual ML-KEM-768 encapsulation
        // For now, we simulate the encapsulation process
        // const { cipherText, sharedSecret } = ml_kem768.encapsulate(session.clientPublicKey);
        
=======

        // In production, this would use actual ML-KEM-768 encapsulation
        // For now, we simulate the encapsulation process
        // const { cipherText, sharedSecret } = ml_kem768.encapsulate(session.clientPublicKey);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        // Simulated encapsulation (32-byte shared secret, 1088-byte ciphertext)
        session.sharedSecret = crypto.getRandomValues(new Uint8Array(32));
        const cipherText = crypto.getRandomValues(new Uint8Array(1088));
        session.established = true;
<<<<<<< HEAD
        
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        // Store session in KV with 5-minute TTL
        await env.GLASS_BOX_KV.put(
          `session:${session.clientId}`,
          JSON.stringify({
            sharedSecret: bytesToBase64(session.sharedSecret),
            establishedAt: Date.now(),
            algorithm: 'ML-KEM-768',
            pqcEstablished: true
          }),
          { expirationTtl: 300 }
        );
<<<<<<< HEAD
        
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        // Send ciphertext to client
        ws.send(JSON.stringify({
          type: 'ml_kem_768_ciphertext',
          ciphertext: bytesToBase64(cipherText),
          sessionEstablished: true,
          keyLength: {
            sharedSecret: 32,
            ciphertext: 1088
          },
          algorithm: 'ML-KEM-768',
          standard: 'NIST FIPS 203',
          message: 'PQC session established. All subsequent traffic encrypted with AES-256-GCM.'
        }));
<<<<<<< HEAD
        
        // Start telemetry stream
        startTelemetryStream(ws, session);
        
=======

        // Start telemetry stream
        startTelemetryStream(ws, session);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      } catch (err) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Encapsulation failed: ${(err as Error).message}`
        }));
      }
      break;
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    case 'encrypted_request':
      // Handle encrypted client requests after PQC establishment
      if (!session.established) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'PQC handshake required. Send ml_kem_768_encapsulation_key first.'
        }));
        return;
      }
<<<<<<< HEAD
      
      // Decrypt and handle request (implementation depends on cipher)
      handleSecureMessage(data, ws, session);
      break;
      
=======

      // Decrypt and handle request (implementation depends on cipher)
      handleSecureMessage(data, ws, session);
      break;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now(),
        sessionEstablished: session.established
      }));
      break;
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    default:
      if (!session.established && data.type !== 'pqc_hello') {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${data.type}. PQC handshake required.`
        }));
        return;
      }
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${data.type}`
      }));
  }
}

/**
 * Handle encrypted messages after PQC establishment
 */
function handleSecureMessage(
  data: any,
  ws: WebSocket,
  session: PQCSession
): void {
  // In production: decrypt data.payload using derived shared secret
  // For now, echo back acknowledgment
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  ws.send(JSON.stringify({
    type: 'secure_ack',
    received: data.type,
    timestamp: Date.now(),
    encrypted: true
  }));
}

/**
 * Start streaming telemetry data
 */
function startTelemetryStream(ws: WebSocket, session: PQCSession): void {
  // Send initial mesh status
  const initialTelemetry: TelemetryMessage[] = [
    {
      type: 'telemetry',
      metric: 'mesh.status',
      value: 'online',
      nodes: 14,
      workers: 9,
      timestamp: Date.now()
    },
    {
      type: 'telemetry',
      metric: 'pqc.session',
      value: 'ML-KEM-768 established',
      timestamp: Date.now()
    },
    {
      type: 'audit_trail',
      metric: 'connection.established',
      value: session.clientId ?? 'unknown',
      timestamp: Date.now()
    }
  ];
<<<<<<< HEAD
  
  initialTelemetry.forEach(msg => {
    ws.send(JSON.stringify(msg));
  });
  
=======

  initialTelemetry.forEach(msg => {
    ws.send(JSON.stringify(msg));
  });

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Periodic telemetry updates
  const intervalId = setInterval(() => {
    if (ws.readyState !== WS_READY_STATE_OPEN) {
      clearInterval(intervalId);
      return;
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Generate realistic-looking telemetry
    const messages: TelemetryMessage[] = [
      {
        type: 'telemetry',
        metric: 'mesh.heartbeat',
        value: 'ok',
        timestamp: Date.now(),
        nodes: 14,
        workers: 9
      },
      {
        type: 'telemetry',
        metric: 'latency.edge',
        value: Math.round(Math.random() * 30 + 10), // 10-40ms
        timestamp: Date.now()
      }
    ];
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Randomly include audit events
    if (Math.random() < 0.1) {
      const auditEvents = [
        { event: 'Worker health check passed', hash: generateHash() },
        { event: 'KV sync completed', hash: generateHash() },
        { event: 'Durable Object heartbeat', hash: generateHash() }
      ];
      const audit = auditEvents[Math.floor(Math.random() * auditEvents.length)];
      ws.send(JSON.stringify({
        type: 'audit_trail',
        metric: 'system.event',
        value: audit.event,
        hash: audit.hash,
        timestamp: Date.now()
      }));
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    messages.forEach(msg => ws.send(JSON.stringify(msg)));
  }, 5000);
}

/**
 * Utility: Base64 to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Utility: Uint8Array to Base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  const binaryString = String.fromCharCode(...bytes);
  return btoa(binaryString);
}

/**
 * Generate a fake hash for demo purposes
 */
function generateHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * Handle telemetry WebSocket endpoint for GlassBox component
 * Simplified endpoint that sends telemetry packets for visualization
 */
function handleTelemetryEndpoint(request: Request): Response {
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response(JSON.stringify({
      error: 'Expected WebSocket Upgrade',
      usage: 'Connect to /telemetry with WebSocket protocol'
<<<<<<< HEAD
    }), { 
=======
    }), {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
  server.accept();

  const sources = ['p31-ark', 'Mama-Device', 'AJ-Device', 'SJ-Device'];
  const dests = ['CRDT_SESSION', 'EDGE_PREF', 'ID_SBT', 'K4_CAGE'];

  // Send initial health confirmation
  server.send(JSON.stringify({
    type: 'health',
    status: 'healthy',
    simulation: true,
    message: 'Glass Box Telemetry Stream Active'
  }));

  // Start telemetry stream
  const telemetryInterval = setInterval(() => {
    if (server.readyState !== WS_READY_STATE_OPEN) {
      clearInterval(telemetryInterval);
      return;
    }

    const packet = {
      id: `pkt_${generateHex(8)}`,
      timestamp: Date.now(),
      source: sources[Math.floor(Math.random() * sources.length)],
      destination: dests[Math.floor(Math.random() * dests.length)],
      protocol: 'ML-KEM-768',
      kemCiphertextPreview: `0x${generateHex(24)}...`,
      status: 'SEALED' as const
    };

    server.send(JSON.stringify(packet));
  }, 2000);

  // Handle close
  server.addEventListener('close', () => {
    clearInterval(telemetryInterval);
  });

  return new Response(null, { status: 101, webSocket: client });
}

/**
 * Generate random hex string
 */
function generateHex(len: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
