# P31 Mesh — System Architecture

*Last verified: April 21, 2026 — all 5 live workers responding*

---

## What Is This? (The 30-Second Version)

P31 Mesh is a private communication system for small groups — typically families or care teams. It connects up to 8 people through a shared chat with an AI assistant that can check on everyone's status, hold messages when someone needs space, and notice when you might be over-accommodating in your communication.

Think of it as a group chat with a built-in safety net.

---

## How It Works (The 5-Minute Version)

The system runs on Cloudflare's global network — the same infrastructure that powers about 20% of the internet. Your messages never touch a traditional server. They're processed at the nearest Cloudflare data center to you, which means they're fast and they stay close to where you are.

There are five main pieces:

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Your       │────▶│  Agent Hub   │────▶│   K₄ Cage     │
│   Phone/     │     │  (thinks)    │     │   (connects)  │
│   Tablet     │     └──────┬───────┘     └───────────────┘
└─────────────┘            │
                    ┌──────┴───────┐     ┌───────────────┐
                    │  Personal    │     │   Bouncer     │
                    │  Agent       │     │   (security)  │
                    │  (your data) │     └───────────────┘
                    └──────────────┘
                           │
                    ┌──────┴───────┐
                    │   Hub        │
                    │   Router     │
                    │   (traffic)  │
                    └──────────────┘
```

**Agent Hub** — The AI brain. When you send a message, it figures out what you need (check the mesh, look up someone's energy level, broadcast a message) and does it.

**K₄ Cage** — The connection room. Holds everyone's live WebSocket connections so messages arrive instantly. When nobody's talking, it hibernates to save money — literally $0.00 when idle.

**Personal Agent** — Your private vault. Stores your conversation history, energy level, medication reminders, and health data. Nobody else can read it.

**Hub Router** — The traffic director. When the Agent Hub needs data from your Personal Agent or wants to broadcast to the Cage, the Hub Router handles the delivery.

**Bouncer** — The door. Checks your room code, gives you a cryptographic token, and makes sure you can only access your own data.

---

## How It Works (The Engineering Version)

### Topology: K₄ Complete Graph

The system is named after the K₄ complete graph — a tetrahedron. Four nodes, six edges. Every node connects directly to every other node. This is the minimum 3D structure that is "isostatically rigid" (Maxwell's criterion: M = 3V − 6, and 6 = 3(4) − 6).

In practice this means: if two connections fail, every pair of nodes can still reach each other through the remaining paths. No single point of failure.

The five Cloudflare Workers are connected via Service Bindings — direct in-process RPC calls with zero network hops. When the Agent Hub calls the K₄ Cage, it's a function call on the same server, not an HTTP request across the internet.

```
Service Binding Topology:

  p31-agent-hub ──────┬──── k4-cage (FamilyMeshRoom DO)
       │              ├──── k4-personal (PersonalAgent DO)
       │              ├──── k4-hubs (Hub Router)
       │              └──── p31-bouncer (JWT Auth)
       │
       └── env.AI (Workers AI: llama-3.1-8b-instruct)
```

### Data Flow: Message Lifecycle

```
1. User types "show me the family mesh" in PWA
2. PWA sends POST /api/chat to p31-agent-hub
3. Agent Hub loads conversation history from AgentSession DO (SQLite)
4. Agent Hub sends messages + tool definitions to Workers AI
5. LLM returns tool_calls: [{name: "get_family_mesh"}]
   └─ If leaked as text: CWP-17B parser recovers it (O(n) bracket counting)
6. Agent Hub dispatches tool calls via Promise.all to Service Bindings
   └─ get_family_mesh → k4-cage.fetch("/room-stats/family-alpha")
7. Tool results returned to Agent Hub
8. Agent Hub sends second LLM call with tool results as context
9. LLM synthesizes natural-language reply
10. Reply stored in AgentSession DO, returned to PWA
11. If WebSocket is open: message also broadcast to mesh peers via k4-cage
```

### Durable Objects (Stateful Compute)

| DO Class | Worker | Storage | Purpose |
|----------|--------|---------|---------|
| AgentSession | p31-agent-hub | SQLite (100 msg cap) | Conversation memory per session |
| FamilyMeshRoom | k4-cage | SQLite (telemetry buffer) | WebSocket room, 8-socket cap, hibernation |
| PersonalAgent | k4-personal | SQLite (messages, state, reminders) | Per-user isolated agent |

All DOs use SQLite storage (not the legacy KV backend). SQLite provides strictly consistent reads, multi-row transactions, and up to 10 GB per DO.

### WebSocket Hibernation (CWP-18)

The FamilyMeshRoom DO uses Cloudflare's Hibernation API. When no messages are flowing:

- The DO's JavaScript is evicted from memory
- WebSocket connections are held by Cloudflare's edge network
- Ping/pong is handled automatically via `setWebSocketAutoResponse`
- Duration billing: **$0.00**
- Wake-up on incoming message: single-digit milliseconds

### Telemetry Pipeline (CWP-19)

Raw telemetry (chat messages, bio data, fawn scores) is NOT written directly to D1. Instead:

```
Ingest → SQLite DO buffer → 30-second alarm → Batch INSERT to D1
```

This collapses 28,800 potential writes/day (1 per second per user) into ~2,880 batched transactions — well within D1's 100,000 writes/day Free Tier limit.

The alarm uses at-least-once delivery: rows are persisted to SQLite before acknowledgment, deleted only after successful D1 batch write. If the DO is evicted between alarms, data survives in SQLite. If D1 fails, the platform retries with exponential backoff (6 retries, then parks for 5 minutes).

### LLM Tool-Call Leakage Parser (CWP-17B)

Workers AI's `@cf/meta/llama-3.1-8b-instruct` emits tool calls in three formats that the native binding sometimes fails to parse:

1. `<|python_tag|>{...}<|eom_id|>` — Meta's built-in format
2. `<function=name>{...}</function>` — Meta's custom format
3. Bare JSON `{"name":"...","parameters":{...}}` — Untagged

The production parser uses O(n) bracket-counted JSON extraction (zero regex backtracking), validates against a tool name allowlist, caps scan length at 4 KB, and guards against prototype pollution. It runs in <0.1ms per invocation.

A fourth failure mode was discovered during deployment: the LLM returns `response: null` with valid `tool_calls`, tools execute correctly, but the second LLM call's response is wrapped in a JSON envelope rather than being plain text. A post-follow-up cleanup pass strips these artifacts.

### Authentication (CWP-25)

```
Room Code (6 chars) → PBKDF2 (100k iterations, SHA-256) → HMAC signing key
                                                                    ↓
User credentials ─────────────────────────────────────→ JWT (24h TTL)
                                                         │
                                                         ├─ sub: userId
                                                         ├─ scope: roomCode
                                                         ├─ name, color, role
                                                         └─ exp: 24h from now
```

Room codes use the alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — no ambiguous characters (0/O, 1/I/L removed). Codes can be spoken over a phone call, which matters for accessibility.

### PII Scrubbing (CWP-26)

Before any text reaches Workers AI, a deterministic regex scrubber replaces configured names with anonymized initials. This protects minors' data from appearing in LLM context windows or inference logs.

The scrubber is configurable per-mesh: the mesh creator defines `[{pattern, replacement}]` rules stored in the PersonalAgent's state. Rules propagate to all agents in the mesh via hub broadcast.

### Biometric Webhook (CWP-27)

The PersonalAgent accepts health data via `POST /agent/:userId/bio`:

| Type | Threshold | Alert |
|------|-----------|-------|
| calcium_serum | < 7.6 mg/dL | CRITICAL — seek medical attention |
| calcium_serum | < 7.8 mg/dL | WARNING — take calcium now |
| calcium_serum | < 8.0 mg/dL | CAUTION — monitor closely |
| medication_taken | — | Marks matching reminder as completed |
| spoon_check | — | Updates energy envelope state |

---

## Free Tier Budget (8 Users, Moderate Usage)

| Resource | Daily usage estimate | Free limit | Headroom |
|----------|---------------------|------------|----------|
| Worker requests | ~8,000 | 100,000 | 92% |
| Workers AI neurons | ~4,000 | 10,000 | 60% |
| D1 writes | ~3,500 (batched) | 100,000 | 96.5% |
| DO requests | ~5,000 | 100,000 | 95% |
| KV reads | ~500 | 100,000 | 99.5% |

The entire mesh runs on Cloudflare's Free Tier for development and light family use. Paid tier ($5/month each for Workers and D1) is needed only above ~100 messages/user/day.

---

## CWP Registry (What Built What)

| CWP | Component | Status |
|-----|-----------|--------|
| 17A | Promise.all parallel dispatch | Live |
| 17B | Leakage parser (O(n) bracket counting) | Live |
| 18 | FamilyMeshRoom WebSocket hibernation | Live |
| 19 | 30-second alarm telemetry flush | Live |
| 20 | Fortress Mode UI | Live (PWA) |
| 21 | Fawn Guard baseline classifier | Live (PWA) |
| 22 | Reflective Chamber scaffold | On disk |
| 23 | PersonalAgent DO | Live |
| 24 | Hub Router | Live |
| 25 | Bouncer v2 JWT auth | Live |
| 26 | PII Scrubber | Integrated |
| 27 | Bio Webhook | Live |
| 28 | PWA v2 (onboarding, settings) | Live |

---

## Staging Components (Not Yet Live)

**p31-cortex** — 7-agent Durable Object orchestration system. Intended to coordinate multiple AI agents with different specialties. Currently a stub with schema definitions.

**kenosis-mesh** — 7-node peer network implementing the full family graph (beyond the K₄ core four). Uses RNode protocol for peer-to-peer state synchronization. Currently architectural design only.

**reflective-chamber** — Cloudflare Workflow for weekly synthesis. Queries D1 for 7-day telemetry, computes masking cost and energy envelope trends, writes summaries to operator's PersonalAgent. Queues check-in prompt if masking cost exceeds threshold. Scaffold on disk, awaiting cron trigger configuration.