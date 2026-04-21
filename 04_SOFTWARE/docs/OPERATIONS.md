# P31 Mesh — Operations Manual

*For anyone responsible for keeping the mesh running.*

---

## Health Check Dashboard (30 Seconds)

Run this to see everything at once:

```bash
for w in p31-agent-hub k4-cage k4-personal k4-hubs p31-bouncer; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${w}.trimtab-signal.workers.dev/health" --max-time 5 2>/dev/null)
  echo "${w}: HTTP ${STATUS}"
done
```

Expected output (all healthy):
```
p31-agent-hub: HTTP 200
k4-cage: HTTP 200
k4-personal: HTTP 200
k4-hubs: HTTP 200
p31-bouncer: HTTP 200
```

---

## Log Monitoring

### Real-Time Tail

```bash
# All logs from agent hub (includes LLM calls, tool execution, leakage events)
npx wrangler tail p31-agent-hub --format pretty

# WebSocket connections and telemetry flush
npx wrangler tail k4-cage --format pretty

# Personal agent requests and bio data
npx wrangler tail k4-personal --format pretty

# Authentication events
npx wrangler tail p31-bouncer --format pretty
```

### Filtered Monitoring

```bash
# Leakage parser recoveries only
npx wrangler tail p31-agent-hub | grep "CWP-17B"

# Bio alerts (calcium, medication)
npx wrangler tail k4-personal | grep "bio_alert"

# Telemetry flush failures
npx wrangler tail k4-cage | grep "CWP-19"

# Worker errors
npx wrangler tail p31-agent-hub | grep -i "error"
```

### Leakage Rate Check

```bash
curl -s https://p31-agent-hub.trimtab-signal.workers.dev/health | python3 -m json.tool
```

Look at `leakage.rate` — this is the fraction of LLM calls where the parser had to recover tool calls that the native binding missed. A rate of 0.0-0.3 is normal for llama-3.1-8b-instruct. Above 0.5 suggests a model or binding regression.

---

## Free Tier Limits & Budget

### Current Limits (Cloudflare Free Plan)

| Resource | Free limit | Per-unit overage (Paid) |
|----------|-----------|------------------------|
| Worker requests | 100,000/day | $0.30/million |
| CPU time | 10ms/invocation | 30ms on Paid |
| Workers AI neurons | 10,000/day | $0.011/1,000 neurons |
| D1 reads | 5,000,000/day | $0.001/million |
| D1 writes | 100,000/day | $1.00/million |
| D1 storage | 5 GB | $0.75/GB-month |
| DO requests | 100,000/day (Paid only) | $0.15/million |
| DO duration | 13,000 GB-s/day (Paid) | $12.50/million GB-s |
| DO storage | 5 GB (Paid included) | $0.20/GB-month |
| KV reads | 100,000/day | $0.50/million |
| KV writes | 1,000/day | $5.00/million |

### P31 Mesh Usage Estimates (8 users, moderate)

| Resource | Daily usage | % of Free limit | When to worry |
|----------|------------|-----------------|---------------|
| Worker requests | ~8,000 | 8% | >50,000 |
| Workers AI neurons | ~4,000 | 40% | >8,000 |
| D1 writes (batched) | ~3,500 | 3.5% | >50,000 |
| DO requests | ~5,000 | N/A (Paid) | >50,000 |

### Cost Alarm Thresholds

Set these in Cloudflare Dashboard → Account → Billing → Usage Notifications:

| Alert | Threshold |
|-------|-----------|
| Workers AI neurons | 8,000/day (80%) |
| D1 writes | 75,000/day (75%) |
| Worker requests | 75,000/day (75%) |

### The D1 Write Budget Constraint

This is the most important operational limit. Raw telemetry at 1 write/second/user would consume 100,000 writes in 3.5 hours for a single user. The 30-second alarm batch (CWP-19) collapses this to ~2,880 writes/day/user. With 8 users that's ~23,000 writes/day — 23% of the Free limit.

If you see `pendingTelemetry` growing in room stats instead of returning to 0, the D1 flush is failing. Check D1 Dashboard for errors.

---

## Incident Response

### Scenario: Agent Returns Raw JSON Instead of Natural Language

**Symptom:** Chat replies contain `{"tool_calls":[...]}` or `{"response":null,...}`

**Diagnosis:** The leakage parser or post-follow-up cleanup isn't catching a new format.

**Fix:**
1. Check `/health` for leakage stats — if `rate > 0`, parser is working but not catching everything
2. Check `wrangler tail p31-agent-hub` for the exact response format
3. If it's a new LLM output format, add a handler in the cleanup section of `/api/chat`

### Scenario: Workers AI Returns 9002 Error

**Symptom:** `{"error":"ai_failed","message":"9002: unknown internal error"}`

**Diagnosis:** Cloudflare's inference backend crashed. This is transient.

**Fix:** Wait 60 seconds and retry. If it persists > 5 minutes, check [Cloudflare Status](https://www.cloudflarestatus.com/). Worker code is not the issue.

### Scenario: WebSocket Connections Not Establishing

**Symptom:** PWA shows gray dot (disconnected), room stats shows 0 connections.

**Diagnosis:** Either the DO crashed, the network is blocked, or the DO migration is broken.

**Fix:**
1. Test directly: `wscat -c 'wss://k4-cage.trimtab-signal.workers.dev/ws/test?node=test'`
2. If 426 error: WebSocket upgrade isn't reaching the DO — check wrangler.toml routing
3. If 429: Room is full (8/8) — this shouldn't happen unless connections leaked
4. Check `wrangler tail k4-cage` for error messages

### Scenario: Bio Alert Not Triggering

**Symptom:** Calcium value < 7.8 submitted but no alert in response.

**Diagnosis:** The bio endpoint may be storing data but not evaluating thresholds.

**Fix:**
1. Test: `curl -X POST .../agent/will/bio -d '{"type":"calcium_serum","value":7.5}'`
2. Response should include `"alert":{"severity":"critical",...}`
3. If `alert` is null, check the PersonalAgent source for the threshold logic
4. Verify the `type` field is exactly `"calcium_serum"` (not `"calcium"` or `"serum_calcium"`)

### Scenario: JWT Expired or Invalid

**Symptom:** PWA can't connect, bouncer returns 401.

**Diagnosis:** Token TTL is 24 hours. If user hasn't refreshed in > 24h, token expired.

**Fix:** Re-authenticate: `POST /auth` with room code. PWA should handle this automatically on reconnect.

### Scenario: Telemetry Flush Failing

**Symptom:** `pendingTelemetry` in room stats keeps growing.

**Diagnosis:** D1 writes are failing (quota exceeded, database error, or schema mismatch).

**Fix:**
1. Check D1 Dashboard for the `p31-telemetry` database
2. Verify schema: `npx wrangler d1 execute p31-telemetry --command "SELECT name FROM sqlite_master WHERE type='table'"`
3. If `telemetry` table is missing, create it:
   ```bash
   npx wrangler d1 execute p31-telemetry --command "
     CREATE TABLE IF NOT EXISTS telemetry (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       room_id TEXT NOT NULL,
       node_id TEXT NOT NULL,
       kind TEXT NOT NULL,
       payload TEXT NOT NULL,
       ts INTEGER NOT NULL,
       flushed_at INTEGER NOT NULL
     )"
   ```
4. If quota exceeded, wait until midnight UTC for daily reset, or upgrade to Paid

---

## Deployment

### Deploying a Worker Update

```bash
cd ~/andromeda/04_SOFTWARE/[worker-name]
npx wrangler deploy
```

### Rolling Back

```bash
# List recent deployments
npx wrangler deployments list

# Rollback to a specific version
npx wrangler rollback [version-id]
```

### Viewing Deployed Source

Cloudflare doesn't support `wrangler download`. To see what's deployed, use the Cloudflare Dashboard → Workers → [worker] → Quick Edit.

### Required Secrets

```bash
# Set JWT signing secret (required for p31-bouncer)
cd ~/andromeda/04_SOFTWARE/p31-bouncer
npx wrangler secret put P31_JWT_SECRET
# Enter a strong random string when prompted
```

---

## D1 Database Management

### Listing Databases

```bash
npx wrangler d1 list
```

### Querying Telemetry

```bash
# Count telemetry rows
npx wrangler d1 execute p31-telemetry --command "SELECT COUNT(*) FROM telemetry"

# Recent entries
npx wrangler d1 execute p31-telemetry --command "SELECT kind, node_id, ts FROM telemetry ORDER BY ts DESC LIMIT 10"

# Bio alerts
npx wrangler d1 execute p31-telemetry --command "SELECT * FROM telemetry WHERE kind LIKE 'bio%' ORDER BY ts DESC LIMIT 10"
```

### Backing Up

```bash
# Export all telemetry as JSON
npx wrangler d1 execute p31-telemetry --command "SELECT * FROM telemetry" --json > telemetry_backup.json
```

---

## Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Health check | Daily | Health check dashboard script above |
| Leakage rate check | Daily | `curl -s .../health` |
| D1 row count | Weekly | `SELECT COUNT(*) FROM telemetry` |
| Log review | Weekly | `npx wrangler tail` for 5 min per worker |
| JWT secret rotation | Quarterly | `npx wrangler secret put P31_JWT_SECRET` |
| Dependency updates | Monthly | Check wrangler version, Workers AI model availability |