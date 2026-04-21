# P31 Mesh — API Reference

*All endpoints verified live as of April 21, 2026*

---

## Base URLs

| Worker | URL | Status |
|--------|-----|--------|
| p31-agent-hub | `https://p31-agent-hub.trimtab-signal.workers.dev` | Live |
| k4-cage | `https://k4-cage.trimtab-signal.workers.dev` | Live |
| k4-personal | `https://k4-personal.trimtab-signal.workers.dev` | Live |
| k4-hubs | `https://k4-hubs.trimtab-signal.workers.dev` | Live |
| p31-bouncer | `https://p31-bouncer.trimtab-signal.workers.dev` | Live |

All endpoints return JSON with `Content-Type: application/json`. CORS is enabled on p31-agent-hub (`Access-Control-Allow-Origin: *`).

---

## 1. p31-agent-hub

The LLM orchestrator. Receives chat messages, calls tools via Service Bindings, returns natural-language responses.

### GET /health

Health check with leakage parser telemetry.

```bash
curl -s https://p31-agent-hub.trimtab-signal.workers.dev/health
```

Response:
```json
{
  "status": "ok",
  "service": "p31-agent-hub",
  "leakage": { "leaked": 0, "total": 5, "rate": 0 }
}
```

### POST /api/chat

Send a message to the mesh agent. The agent may call tools (get_family_mesh, check_energy, etc.) and returns a synthesized response.

```bash
curl -s -X POST https://p31-agent-hub.trimtab-signal.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"session":"my-session","message":"[will] show me the family mesh"}'
```

Request body:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| session | string | No (default: "default") | Session ID for conversation memory |
| message | string | Yes | User message. Prefix with `[nodeId]` for attribution |

Response:
```json
{
  "reply": "The family mesh has 0 active connections and 0 pending telemetry.",
  "trace": "756b8466-46f5-4013-a84f-960708bfce9b",
  "session": "my-session",
  "model": "@cf/meta/llama-3.1-8b-instruct"
}
```

Error (500):
```json
{
  "error": "ai_failed",
  "message": "9002: unknown internal error",
  "trace": "e381cbd0-e665-4b8d-bd28-ce637e72eb3d"
}
```

Notes:
- LLM calls take 5-30 seconds. Set `--max-time 35` in curl.
- Session memory retains the last 100 messages per session ID.
- The agent has 6 tools: get_family_mesh, get_personal_state, list_hubs, check_energy, send_to_mesh, get_bio_alerts.
- Leakage parser runs on every LLM response. Check `/health` for leak rate.

### POST /api/clear

Clear conversation history for a session.

```bash
curl -s -X POST https://p31-agent-hub.trimtab-signal.workers.dev/api/clear \
  -H "Content-Type: application/json" \
  -d '{"session":"my-session"}'
```

Response:
```json
{ "ok": true }
```

---

## 2. k4-cage

WebSocket room manager. Hosts the FamilyMeshRoom Durable Object with hibernation, real-time messaging, and telemetry buffering.

### GET /health (or root /)

```bash
curl -s https://k4-cage.trimtab-signal.workers.dev/
```

Response: `k4-cage alive`

### GET /room-stats/:roomId

Get live statistics for a mesh room.

```bash
curl -s https://k4-cage.trimtab-signal.workers.dev/room-stats/family-alpha
```

Response:
```json
{
  "connections": 0,
  "maxConnections": 8,
  "pendingTelemetry": 0,
  "sessions": []
}
```

When users are connected:
```json
{
  "connections": 2,
  "maxConnections": 8,
  "pendingTelemetry": 3,
  "sessions": [
    { "nodeId": "will", "joinedAt": 1776795538000 },
    { "nodeId": "brenda", "joinedAt": 1776795540000 }
  ]
}
```

### WebSocket: /ws/:roomId?node=:nodeId

Upgrade to WebSocket for real-time messaging.

```bash
# Using wscat (npm install -g wscat)
wscat -c 'wss://k4-cage.trimtab-signal.workers.dev/ws/family-alpha?node=will'
```

Query parameters:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| node | string | No (default: "anonymous") | Your node ID |
| room | string | No (default: from URL path) | Room ID override |

Incoming message formats:

System event (join/leave):
```json
{
  "type": "system",
  "event": "join",
  "nodeId": "brenda",
  "timestamp": 1776795540000,
  "online": 2
}
```

Peer message:
```json
{
  "type": "message",
  "nodeId": "brenda",
  "content": "Hello from Brenda",
  "timestamp": 1776795545000
}
```

Sending: Any text sent over the WebSocket is broadcast to all other connected sockets.

Limits: 8 concurrent WebSockets per room. Returns HTTP 429 if full.

Heartbeat: Send `"ping"` to receive `"pong"` without waking the DO.

### POST /synthesis (Internal only)

Accepts weekly synthesis data from the Reflective Chamber Workflow.

### POST /checkin-queue (Internal only)

Queues a check-in prompt from the Reflective Chamber.

---

## 3. k4-personal

Per-user isolated agent. Each user gets their own Durable Object with private SQLite storage.

All endpoints are prefixed with `/agent/:userId/`.

### GET /agent/:userId/health

```bash
curl -s https://k4-personal.trimtab-signal.workers.dev/agent/will/health
```

Response:
```json
{ "status": "ok", "agent": "personal" }
```

### POST /agent/:userId/chat

Send a message to a user's personal agent for AI-powered response.

```bash
curl -s -X POST https://k4-personal.trimtab-signal.workers.dev/agent/will/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are my pending reminders?","scope":"personal"}'
```

Request body:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Yes | User message |
| scope | string | No | Access scope (default: "personal") |
| tools | array | No | Additional tool definitions |

Response:
```json
{
  "reply": "You have no pending reminders.",
  "energy": { "spoons": 10, "max": 12 }
}
```

### GET /agent/:userId/history?limit=50

Get conversation history for this agent.

```bash
curl -s https://k4-personal.trimtab-signal.workers.dev/agent/will/history?limit=10
```

Response:
```json
{
  "messages": [
    { "id": 1, "role": "user", "content": "hello", "ts": 1776795538000, "metadata": "{}" },
    { "id": 2, "role": "assistant", "content": "Hi! How can I help?", "ts": 1776795539000, "metadata": "{}" }
  ]
}
```

### GET /agent/:userId/state

Get all key-value state for this user.

```bash
curl -s https://k4-personal.trimtab-signal.workers.dev/agent/will/state
```

Response:
```json
{
  "profile": { "name": "Will", "role": "operator", "color": "#00F0FF" },
  "energy": { "spoons": 8, "max": 12, "lastUpdate": 1776795538000 },
  "scrub_rules": [{ "pattern": "Sebastian Robert Johnson", "replacement": "S.J." }]
}
```

### PUT /agent/:userId/state

Update key-value state.

```bash
curl -s -X PUT https://k4-personal.trimtab-signal.workers.dev/agent/will/state \
  -H "Content-Type: application/json" \
  -d '{"profile":{"name":"Will","role":"operator","color":"#00F0FF"}}'
```

Response:
```json
{ "ok": true }
```

### GET /agent/:userId/energy

Get current energy/spoon level.

```bash
curl -s https://k4-personal.trimtab-signal.workers.dev/agent/will/energy
```

Response:
```json
{ "spoons": 8, "max": 12, "lastUpdate": 1776795538000 }
```

### PUT /agent/:userId/energy

Update energy level.

```bash
curl -s -X PUT https://k4-personal.trimtab-signal.workers.dev/agent/will/energy \
  -H "Content-Type: application/json" \
  -d '{"spoons":6}'
```

Response:
```json
{ "spoons": 6, "max": 12, "lastUpdate": 1776795600000 }
```

### GET /agent/:userId/reminders

Get pending reminders.

```bash
curl -s https://k4-personal.trimtab-signal.workers.dev/agent/will/reminders
```

Response:
```json
{
  "reminders": [
    { "id": 1, "kind": "medication", "label": "Calcitriol", "schedule_ts": 1776800000000, "completed": 0, "created_at": 1776795538000 }
  ]
}
```

### POST /agent/:userId/reminders

Create a reminder.

```bash
curl -s -X POST https://k4-personal.trimtab-signal.workers.dev/agent/will/reminders \
  -H "Content-Type: application/json" \
  -d '{"kind":"medication","label":"Calcitriol","schedule_ts":1776800000000}'
```

### POST /agent/:userId/bio

Submit biometric data. Triggers calcium threshold alerts automatically.

```bash
# Calcium check
curl -s -X POST https://k4-personal.trimtab-signal.workers.dev/agent/will/bio \
  -H "Content-Type: application/json" \
  -d '{"type":"calcium_serum","value":7.8,"unit":"mg/dL"}'

# Medication taken
curl -s -X POST https://k4-personal.trimtab-signal.workers.dev/agent/will/bio \
  -H "Content-Type: application/json" \
  -d '{"type":"medication_taken","value":1,"unit":"dose","source":"calcitriol"}'

# Spoon check
curl -s -X POST https://k4-personal.trimtab-signal.workers.dev/agent/will/bio \
  -H "Content-Type: application/json" \
  -d '{"type":"spoon_check","value":6,"unit":"spoons"}'
```

Valid types: calcium_serum, heart_rate, hrv_rmssd, hrv_sdnn, blood_pressure, temperature, medication_taken, spoon_check, sleep_hours, hydration_oz.

Response (with alert):
```json
{
  "ok": true,
  "record": { "type": "calcium_serum", "value": 7.8, "unit": "mg/dL", "ts": 1776795538311, "source": "manual" },
  "alert": { "severity": "warning", "message": "WARNING: Calcium at 7.8 mg/dL — below symptomatic threshold. Take calcium now." }
}
```

---

## 4. k4-hubs

Hub router for cross-agent communication and mesh state aggregation.

### GET /health

```bash
curl -s https://k4-hubs.trimtab-signal.workers.dev/health
```

Response:
```json
{ "status": "ok", "service": "k4-hubs" }
```

### POST /route

Route messages between agents and mesh rooms.

```bash
# Send to mesh
curl -s -X POST https://k4-hubs.trimtab-signal.workers.dev/route \
  -H "Content-Type: application/json" \
  -d '{"from":"will","to":null,"action":"send_to_mesh","payload":{"message":"Hello mesh"},"scope":"family-alpha"}'

# Query another agent's availability
curl -s -X POST https://k4-hubs.trimtab-signal.workers.dev/route \
  -H "Content-Type: application/json" \
  -d '{"from":"brenda","to":"will","action":"query_agent","scope":"family-alpha"}'

# Broadcast to all agents
curl -s -X POST https://k4-hubs.trimtab-signal.workers.dev/route \
  -H "Content-Type: application/json" \
  -d '{"from":"will","action":"broadcast","payload":{"message":"Meeting at 5pm","members":["will","brenda","ashley"]},"scope":"family-alpha"}'
```

Actions:
| Action | Description | Required fields |
|--------|-------------|-----------------|
| send_to_mesh | Fan out to FamilyMeshRoom | from, scope, payload.message |
| query_agent | Check another user's energy (public data only) | from, to, scope |
| broadcast | Send to multiple personal agents | from, scope, payload.message, payload.members |

### GET /mesh-state/:scope

Aggregated mesh state for a scope.

```bash
curl -s https://k4-hubs.trimtab-signal.workers.dev/mesh-state/family-alpha
```

---

## 5. p31-bouncer

Cryptographic gateway. Mints and verifies JWTs from room codes.

### POST /auth

Authenticate with a room code to receive a JWT.

```bash
curl -s -X POST https://p31-bouncer.trimtab-signal.workers.dev/auth \
  -H "Content-Type: application/json" \
  -d '{"userId":"will","roomCode":"HK4T9N","name":"Will","color":"#00F0FF","role":"operator"}'
```

Request body:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | Unique user identifier |
| roomCode | string | Yes | 4-6 character alphanumeric room code |
| name | string | No | Display name |
| color | string | No | Hex color (default: #00F0FF) |
| role | string | No | Role label (default: "participant") |

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1776881872563
}
```

Token claims:
```json
{
  "sub": "will",
  "scope": "HK4T9N",
  "name": "Will",
  "color": "#00F0FF",
  "role": "operator",
  "iat": 1776795472,
  "exp": 1776881872
}
```

### POST /verify

Validate a JWT and return its claims.

```bash
curl -s -X POST https://p31-bouncer.trimtab-signal.workers.dev/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

Response (valid):
```json
{
  "valid": true,
  "claims": { "sub": "will", "scope": "HK4T9N", "name": "Will", "role": "operator", "iat": 1776795472, "exp": 1776881872 }
}
```

Response (expired):
```json
{ "valid": false, "error": "Token expired" }
```

Response (invalid signature):
```json
{ "valid": false, "error": "Invalid signature" }
```

---

## Monitoring

Tail logs for any worker in real time:

```bash
# All logs
npx wrangler tail p31-agent-hub --format pretty

# Leakage parser events only
npx wrangler tail p31-agent-hub | grep CWP-17B

# WebSocket events
npx wrangler tail k4-cage --format pretty

# Bio alerts
npx wrangler tail k4-personal | grep bio_alert
```

---

## Error Codes

| Code | Source | Meaning |
|------|--------|---------|
| 400 | Any | Bad request (missing required field) |
| 401 | p31-bouncer | Token expired or invalid |
| 404 | p31-agent-hub | Unknown route |
| 405 | k4-personal | Wrong HTTP method |
| 426 | k4-cage | WebSocket upgrade expected |
| 429 | k4-cage | Room full (8/8 connections) |
| 500 | p31-agent-hub | Workers AI failure (usually transient, retry in 60s) |