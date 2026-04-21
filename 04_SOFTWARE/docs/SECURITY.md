# P31 Mesh — Security

*How the mesh protects your data, your identity, and your cognitive state.*

---

## Security Model Overview

The P31 Mesh operates on three security layers:

1. **Cryptographic** — Room codes, JWT tokens, PBKDF2 key derivation
2. **Structural** — Durable Object isolation, scope-limited data access
3. **Cognitive** — Fortress Mode, Fawn Guard, PII scrubbing

Each layer protects against different threats. Together they form what the architecture calls the "Posner molecule" — a calcium cage around the phosphorus signal.

---

## Layer 1: Cryptographic Security

### Room Code Authentication

Room codes are 6-character strings from the alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. Ambiguous characters (0/O, 1/I/L) are excluded so codes can be spoken over a phone call without confusion.

The code space is 31^6 = 887,503,681 possible codes. This is not large enough to resist targeted brute-force attacks on the internet, but it is sufficient for a private family mesh where the threat model is accidental access, not determined adversaries.

### JWT Token Flow

```
Room Code → PBKDF2 (100,000 iterations, SHA-256, room code as salt)
         → HMAC signing key
         → JWT signed with HS256
         → 24-hour TTL
```

The PBKDF2 step makes each authentication attempt computationally expensive (~100ms per attempt). At this rate, brute-forcing all 887M codes would take ~2.8 years on a single core. The room code itself is never transmitted after the initial auth — only the signed token travels.

### Token Claims

```json
{
  "sub": "userId",
  "scope": "ROOMCODE",
  "name": "Display Name",
  "color": "#00F0FF",
  "role": "operator",
  "iat": 1776795472,
  "exp": 1776881872
}
```

The `scope` claim limits which mesh resources the token can access. A token scoped to room `HK4T9N` cannot query data from room `XYZ789`.

### Secret Management

The JWT signing key is derived from a server-side secret (`P31_JWT_SECRET`) combined with the room code. The secret is stored via `wrangler secret put` — encrypted at rest in Cloudflare's secret store, never visible in source code or logs.

---

## Layer 2: Structural Isolation

### Durable Object Isolation

Each user's PersonalAgent is a separate Durable Object instance. Cloudflare guarantees that:

- Each DO instance runs in its own isolate (V8 sandbox)
- One DO cannot access another DO's storage
- The only way to communicate between DOs is through explicit `fetch()` calls
- DO names are deterministic (`idFromName(userId)`) but not enumerable

This means even if the agent hub code has a bug, it cannot accidentally read User A's messages when processing User B's request — the storage is physically separated.

### Scope-Limited API Access

The Hub Router (`k4-hubs`) enforces scope rules:

| Action | What's exposed | What's hidden |
|--------|---------------|---------------|
| query_agent | Energy level (spoons/max) | Messages, reminders, bio data, state |
| send_to_mesh | Message delivered to room | No cross-user data read |
| broadcast | System message to agents | No user data returned |

A cross-agent query can tell you "Will has 6/12 spoons" but cannot read Will's conversation history, medication schedule, or calcium levels.

### WebSocket Room Isolation

Each room code maps to a separate FamilyMeshRoom DO. WebSocket connections are scoped to their room. A client connected to room `HK4T9N` cannot receive messages from room `XYZ789`.

---

## Layer 3: Cognitive Security

### Fortress Mode

Fortress Mode is not a technical security feature — it's a cognitive one. When activated:

- All incoming messages are buffered (held, not deleted)
- The UI strips all visual noise — black screen, two buttons only
- The primary action signals a pre-configured support person
- The secondary action exits Fortress Mode and releases buffered messages

This protects the operator from information overload during cognitive crises. The threat model here is not a hacker — it's a high-stress email arriving when the operator's executive function is depleted.

### Fawn Guard

Fawn Guard detects over-accommodation patterns in the operator's outgoing messages. This is a cognitive security layer: it prevents the operator from making commitments or agreements under social pressure that they would not make in a regulated state.

The system does NOT:
- Read message content for meaning
- Share scores with anyone else in the mesh
- Block or modify messages
- Contact anyone automatically

It DOES:
- Count linguistic patterns (hedges, apologies, permission-seeking)
- Compare against the operator's personal baseline
- Display a private alert when patterns exceed 1.5σ
- Offer one-tap access to Fortress Mode

### PII Scrubbing

Before any user text reaches the LLM (Workers AI), a deterministic regex scrubber replaces configured names with anonymized initials.

**Why this matters:** LLM inference services may log inputs for quality assurance. Even with Cloudflare's on-device execution model, token sequences pass through the inference pipeline. Scrubbing names before inference ensures minors' identities never enter the model context.

**How to configure:**

```bash
curl -X PUT https://k4-personal.trimtab-signal.workers.dev/agent/will/state \
  -H "Content-Type: application/json" \
  -d '{
    "scrub_rules": [
      {"pattern": "Sebastian Robert Johnson", "replacement": "S.J."},
      {"pattern": "Willow Marie Johnson", "replacement": "W.J."},
      {"pattern": "Sebastian", "replacement": "S.J."},
      {"pattern": "Willow", "replacement": "W.J."},
      {"pattern": "Bash", "replacement": "S.J."}
    ]
  }'
```

The scrubber catches full names, first names, and nicknames. It runs word-boundary-aware regex (`\b`) to avoid false matches within other words.

---

## Threat Model

### What P31 Mesh IS Designed to Protect Against

| Threat | Mitigation |
|--------|-----------|
| Accidental access by non-family members | Room code authentication |
| Cross-user data leakage via shared LLM context | Per-user DO isolation, scope-limited queries |
| Minors' names appearing in LLM inference logs | Pre-inference PII scrubbing |
| Information overload during cognitive crisis | Fortress Mode message buffering |
| Social pressure leading to unintended commitments | Fawn Guard pattern detection |
| Centralized server compromise | Decentralized K₄ topology, edge execution |
| Cost-based denial of service (Free Tier exhaustion) | 30-second batched writes, hibernation, neuron budgeting |

### What P31 Mesh Is NOT Designed to Protect Against

| Threat | Why not | What to do instead |
|--------|---------|-------------------|
| Determined adversary with compute resources | Room code space is 31^6, not 2^128 | Use a VPN or Tailscale mesh for additional network security |
| Government-level surveillance | Cloudflare can see traffic metadata | Use Signal or Matrix for high-sensitivity communications |
| Physical device compromise | Local storage is unencrypted | Use device-level encryption (full disk encryption) |
| Malicious mesh member | Room code grants full access | Only share codes with trusted people |
| LLM hallucination of medical advice | The AI is not a medical professional | Always verify bio alerts with a real doctor |

---

## Data Residency

All computation runs on Cloudflare's global edge network. Data is processed at the nearest data center to the user. Cloudflare Workers and Durable Objects do not have fixed data residency — the DO instance runs where the first request arrives and may migrate for performance.

For EU users or GDPR compliance, Cloudflare's Data Localization Suite (Enterprise only) can pin DOs to EU jurisdictions. This is not configured on the Free Tier.

---

## Incident Response for Security Events

### Unauthorized Access Detected

If an unknown person appears in the mesh:

1. Activate Fortress Mode (protect your cognitive state first)
2. Note the unknown node ID
3. Create a new mesh with a new room code
4. Share the new code only with verified members
5. The old mesh continues to exist but you won't be in it

### Suspected Data Breach

If you believe someone has accessed PersonalAgent data they shouldn't have:

1. Check `wrangler tail k4-personal` for unusual request patterns
2. Rotate the JWT secret: `npx wrangler secret put P31_JWT_SECRET`
3. All existing tokens are invalidated immediately (users must re-authenticate)
4. Review D1 telemetry for unexpected reads

### PII Exposure in LLM Output

If a minor's real name appears in an AI assistant response:

1. Clear the session: `POST /api/clear {"session":"[session-id]"}`
2. Verify scrub rules are configured: `GET /agent/[userId]/state`
3. Add missing name patterns to scrub_rules
4. The LLM does not have persistent memory — clearing the session removes the name from future context