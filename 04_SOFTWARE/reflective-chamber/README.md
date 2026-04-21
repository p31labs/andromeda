# reflective-chamber

**Status:** 🟡 Scaffold on disk (not deployed as cron)
**CWP:** 22 (scaffold)

## Purpose

Cloudflare Workflow for weekly longitudinal synthesis. Queries D1 for 7-day telemetry windows, computes trends, writes summaries to PersonalAgent.

## Current State

Source exists. Not deployed because D1 database_id placeholder needs actual ID.

## Deploy (When Ready)

```bash
cd ~/andromeda/04_SOFTWARE/reflective-chamber
# Fix D1 database_id in wrangler.toml first
npx wrangler deploy
```

## See Also

- [Telemetry](../docs/TELEMETRY_AND_DEPLOYMENT.md)
