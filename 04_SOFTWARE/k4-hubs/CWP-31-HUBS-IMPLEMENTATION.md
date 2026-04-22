# CWP-31: K₄ HUBS IMPLEMENTATION

## NERVOUS SYSTEM FOR THE TETRAHEDRON

k4-hubs is the central router that implements the six typed edge channels between the four vertices. No vertex communicates directly with any other vertex — all traffic flows through the hubs.

### THE SIX EDGES

| Edge | Name               | Vertices | Purpose                                                                 |
|------|--------------------|----------|-------------------------------------------------------------------------|
| AB   | energy-voltage     | A ↔ B    | Spoons modulate buffer thresholds, calcium critical → auto-Fortress     |
| AC   | energy-context     | A ↔ C    | Bio events become timeline entries, deadlines generate reminders        |
| AD   | energy-shield      | A ↔ D    | Energy state feeds AI prompt context, synthesis → energy recommendations |
| BC   | signal-context     | B ↔ C    | Message metadata → timeline, court dates → auto-tighten buffer          |
| BD   | signal-shield      | B ↔ D    | High-voltage messages → AI analysis, fawn drafts → AI rewrite           |
| CD   | context-shield     | C ↔ D    | Alignment document → AI system prompt, synthesis output → timeline      |

### HUB ROUTES

All hub routes are idempotent and fire-and-forget. They deliver messages to both vertices on the edge.

```
POST /hub/energy-voltage   # A↔B
POST /hub/energy-context   # A↔C
POST /hub/energy-shield    # A↔D
POST /hub/signal-context   # B↔C
POST /hub/signal-shield    # B↔D
POST /hub/context-shield   # C↔D
POST /hub/broadcast        # Fan-out to all four vertices
GET  /hub/q-factor         # Compute Fisher-Escolà coherence score
GET  /hub/health           # Fleet health check
```

### MESSAGE FORMAT

All hub messages follow this standard format:
```typescript
{
  type: string,           # Message type identifier
  timestamp: number,      # Unix timestamp
  payload: object,        # Typed payload per edge
  agentId?: string        # Optional agent ID for routing
}
```

### Q-FACTOR CALCULATION

The `/hub/q-factor` endpoint reads health from all four vertices and computes the Fisher-Escolà coherence score:

```
Q = (A_health + B_health + C_health + D_health) / 4
```

Where:
- `A_health`: Energy trend (rising=1, stable=0.7, falling=0.3)
- `B_health`: Message queue depth (0 pending=1, >10=0.2)
- `C_health`: Deadline urgency (no critical=1, critical<24h=0.2)
- `D_health`: Synthesis recency (this week=1, >2 weeks=0.3)

---

## IMPLEMENTATION PLAN

1. ✅ Create hub router with six edge endpoints
2. ✅ Implement message routing to appropriate vertex DOs
3. ✅ Implement Q-Factor calculation endpoint
4. ✅ Implement broadcast endpoint
5. ✅ Add health check endpoint
6. ✅ Configure Durable Object bindings
7. ✅ Deploy to Cloudflare

The hubs are stateless — they route messages but do not store any state themselves.