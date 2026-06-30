# D1 Migration & Disaster Recovery Runbook

**Worker:** k4-core
**Databases:** capital-db, governance-db, love-ledger, p31-passport-db
**Last Updated:** July 1, 2026

## Migration Workflow

### Create a new migration

```bash
cd workers/k4-core
npx wrangler d1 migrations create capital-db add_care_composite_index
```

This creates a timestamped `.sql` file in `workers/k4-core/migrations/`.

### Apply migrations

```bash
# Apply to remote production
npx wrangler d1 migrations apply capital-db --remote

# Apply to local dev
npx wrangler d1 migrations apply capital-db
```

### Check migration status

```bash
npx wrangler d1 migrations list capital-db --remote
```

### Migration conventions

- Each migration is a single `.sql` file in `workers/k4-core/migrations/`
- Filenames are auto-prefixed with timestamps by wrangler
- Never edit an applied migration — create a new one instead
- For foreign key changes, wrap in a transaction:

```sql
PRAGMA defer_foreign_keys = true;
-- DDL here
PRAGMA defer_foreign_keys = false;
```

## Disaster Recovery — Time Travel (Primary)

**Do NOT use SQL imports for immediate production recovery.** Use D1 Time Travel.

D1 automatically journals all mutations. You can restore to any exact minute within the retention window.

### Restore via Time Travel

```bash
# Restore capital-db to a specific timestamp
npx wrangler d1 time-travel restore capital-db --timestamp="2026-07-01T14:30:00Z"

# Verify
npx wrangler d1 execute capital-db --command "SELECT COUNT(*) FROM care_state;"
```

### Retention windows

| Plan | Retention |
|------|-----------|
| Free | 7 days |
| Paid | 30 days |

### Check Time Travel availability

```bash
npx wrangler d1 time-travel info capital-db
```

## Offline Analytical Backups (Secondary)

For offline analysis or long-term archival, use the export script:

```bash
# Export to local SQL file
npx wrangler d1 export capital-db --remote --output=/tmp/capital-db-$(date +%Y%m%d).sql
```

**Do not rely on exports for production recovery.** Time Travel is faster, more consistent, and captures the exact database state.

## Backup Schedule

- **Production databases:** Time Travel (automatic, 30-day retention)
- **Weekly analytical exports:** Run via cron or manual execution
- **Before migrations:** Note current timestamp as rollback point

## Emergency Contacts

- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **D1 Docs:** https://developers.cloudflare.com/d1/
- **P31 Ops:** Check `docs/ENTERPRISE_QUALITY.md` for incident response
