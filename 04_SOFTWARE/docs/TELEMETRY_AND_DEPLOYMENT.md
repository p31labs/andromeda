# P31 Mesh — Telemetry Pipeline

*How data flows from user input to long-term storage.*

---

## Pipeline Overview

```
User action (message, bio entry, fawn score)
    ↓
Durable Object SQLite (telemetry_pending table)
    ↓  ← 30-second alarm fires
D1 Database (telemetry table)
    ↓  ← Weekly cron (planned)
Reflective Chamber synthesis
```

Every piece of telemetry follows this path. Nothing writes directly to D1. The SQLite buffer is the shock absorber that keeps the system within Free Tier limits.

---

## D1 Schema

### Database: `p31-telemetry`

```sql
CREATE TABLE telemetry (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id    TEXT NOT NULL,
  node_id    TEXT NOT NULL,
  kind       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  ts         INTEGER NOT NULL,
  flushed_at INTEGER NOT NULL
);

CREATE INDEX idx_telemetry_room_ts ON telemetry(room_id, ts);
CREATE INDEX idx_telemetry_kind_ts ON telemetry(kind, ts);
```

### Kind Values

| Kind | Source | Payload contents |
|------|--------|-----------------|
| chat | FamilyMeshRoom | Raw message text |
| bio:calcium_serum | PersonalAgent | `{type, value, unit, ts, source}` |
| bio:medication_taken | PersonalAgent | `{type, value, unit, source}` |
| bio:spoon_check | PersonalAgent | `{type, value, unit}` |
| bio:heart_rate | PersonalAgent | `{type, value, unit}` |
| bio_alert | PersonalAgent | `{severity, message}` |
| fawn_score | PWA (future) | `{z, raw, triggered}` |
| fortress_activation | PWA (future) | `{from, ts}` |
| weekly_synthesis | Reflective Chamber | Full synthesis JSON |
| checkin_scheduled | Reflective Chamber | `{scheduledFor}` |

### DO Buffer Table (telemetry_pending)

Each DO (FamilyMeshRoom, PersonalAgent) maintains an identical buffer:

```sql
CREATE TABLE telemetry_pending (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  kind    TEXT NOT NULL,
  node_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts      INTEGER NOT NULL
);
```

### Flush Mechanics

1. On data ingest: synchronous `INSERT INTO telemetry_pending`
2. Check if alarm is set: `await ctx.storage.getAlarm()`
3. If no alarm: `await ctx.storage.setAlarm(Date.now() + 30000)`
4. When alarm fires: `SELECT ... FROM telemetry_pending LIMIT 500`
5. `env.DB.batch([INSERT, INSERT, ...])` to D1
6. On success: `DELETE FROM telemetry_pending WHERE id IN (...)`
7. If more rows remain: re-arm alarm for another 30 seconds
8. On failure: let platform retry (exponential backoff, 6 retries)
9. After 6 failures: park alarm for 5 minutes

### Querying Telemetry

```bash
# All entries for a room
npx wrangler d1 execute p31-telemetry \
  --command "SELECT kind, node_id, ts FROM telemetry WHERE room_id='family' ORDER BY ts DESC LIMIT 20"

# Bio data only
npx wrangler d1 execute p31-telemetry \
  --command "SELECT * FROM telemetry WHERE kind LIKE 'bio:%' ORDER BY ts DESC LIMIT 10"

# Calcium history
npx wrangler d1 execute p31-telemetry \
  --command "SELECT payload FROM telemetry WHERE kind='bio:calcium_serum' ORDER BY ts DESC LIMIT 30"

# Daily message volume
npx wrangler d1 execute p31-telemetry \
  --command "SELECT DATE(ts/1000, 'unixepoch') as day, COUNT(*) as msgs FROM telemetry WHERE kind='chat' GROUP BY day ORDER BY day DESC LIMIT 7"
```

---

## Data Retention

Currently: unlimited (no automatic deletion). D1 Free Tier provides 5 GB storage.

Planned retention policy (Reflective Chamber):
- Raw telemetry: 90 days
- Weekly synthesis: permanent
- Bio alerts: permanent
- Chat messages: 30 days (configurable per mesh)

---

# P31 Mesh — Deployment Guide

*How to deploy, update, and manage all workers.*

---

## Prerequisites

```bash
# Node.js 18+
node --version

# Wrangler CLI
npx wrangler --version

# Authenticated
npx wrangler whoami
# If not: npx wrangler login
```

## Deploy Order (First Time)

Workers must be deployed in dependency order. Downstream workers first, then workers that bind to them.

```bash
cd ~/andromeda/04_SOFTWARE

# 1. Bouncer (no dependencies)
cd p31-bouncer && npx wrangler deploy && cd ..

# 2. K4 Personal (no dependencies, has AI binding)
cd k4-personal && npx wrangler deploy && cd ..

# 3. K4 Cage (D1 dependency)
cd k4-cage && npx wrangler deploy && cd ..

# 4. K4 Hubs (service bindings to cage + personal)
cd k4-hubs && npx wrangler deploy && cd ..

# 5. Agent Hub (service bindings to all four + AI)
cd p31-agent-hub && npx wrangler deploy && cd ..
```

### Post-Deploy Setup

```bash
# Set JWT secret
cd p31-bouncer && npx wrangler secret put P31_JWT_SECRET
# Enter a strong random string (e.g., openssl rand -hex 32)

# Verify D1 schema
npx wrangler d1 execute p31-telemetry --command "
  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL, node_id TEXT NOT NULL,
    kind TEXT NOT NULL, payload TEXT NOT NULL,
    ts INTEGER NOT NULL, flushed_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_telemetry_room_ts ON telemetry(room_id, ts);
  CREATE INDEX IF NOT EXISTS idx_telemetry_kind_ts ON telemetry(kind, ts);
"

# Verify all workers
for w in p31-bouncer k4-personal k4-cage k4-hubs p31-agent-hub; do
  echo "$w: $(curl -s -o /dev/null -w '%{http_code}' https://${w}.trimtab-signal.workers.dev/health --max-time 5)"
done
```

## Updating a Single Worker

```bash
cd ~/andromeda/04_SOFTWARE/[worker-name]
# Make your changes to src/
npx wrangler deploy
```

No need to redeploy dependent workers — Service Bindings resolve at runtime.

## Rolling Back

```bash
cd ~/andromeda/04_SOFTWARE/[worker-name]

# See recent versions
npx wrangler deployments list

# Rollback (interactive — confirms before applying)
npx wrangler rollback [version-id]
```

## Adding a New Worker

1. Create directory: `mkdir -p ~/andromeda/04_SOFTWARE/new-worker/src`
2. Write `src/index.js` with `export default { async fetch(request, env) { ... } }`
3. Write `wrangler.toml` with name, main, compatibility_date
4. Deploy: `npx wrangler deploy`
5. If other workers need to call it: add `[[services]]` binding to their wrangler.toml and redeploy

## DO Migration Notes

When adding a new Durable Object class, you must declare it in `[[migrations]]`:

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["MyNewDO"]
```

If a DO class already exists and you're adding another:

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["ExistingDO"]

[[migrations]]
tag = "v2"
new_sqlite_classes = ["NewDO"]
```

Migration tags must be unique and monotonically increasing. You cannot reuse a tag or change what's under it after first deployment.

## PWA Deployment

The PWA is a single HTML file (or React JSX) served from a local Python server or any static host.

```bash
# Local development
cd ~/p31-family-ui
python3 -m http.server 8080

# Production: deploy to Cloudflare Pages
cd ~/p31-family-ui
npx wrangler pages deploy . --project-name p31-mesh
```

## Environment Variables Reference

### p31-agent-hub wrangler.toml
```toml
name = "p31-agent-hub"
main = "src/index.js"
compatibility_date = "2026-04-04"
compatibility_flags = ["nodejs_compat"]

[[services]]
binding = "K4_CAGE"
service = "k4-cage"

[[services]]
binding = "K4_PERSONAL"
service = "k4-personal"

[[services]]
binding = "K4_HUBS"
service = "k4-hubs"

[[services]]
binding = "P31_BOUNCER"
service = "p31-bouncer"

[ai]
binding = "AI"

[[durable_objects.bindings]]
name = "AGENT_SESSION"
class_name = "AgentSession"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["AgentSession"]
```

### k4-cage wrangler.toml
```toml
name = "k4-cage"
main = "src/index.js"
compatibility_date = "2026-04-04"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "p31-telemetry"
database_id = "fc3b2ffb-4de4-4843-88b1-50e5c788dc50"

[[durable_objects.bindings]]
name = "FAMILY_MESH_ROOM"
class_name = "FamilyMeshRoom"

[[migrations]]
tag = "v2-hibernation"
new_sqlite_classes = ["FamilyMeshRoom"]

[vars]
FLUSH_INTERVAL_MS = "30000"
```