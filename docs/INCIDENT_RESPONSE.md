# P31 Ecosystem Incident Response Procedure

**Effective Date:** May 22, 2026  
**Version:** 1.0

---

## Incident Classification

| Severity | Definition | Response Time |
|----------|-----------|---|
| **P1 (Critical)** | Fleet-wide outage; ≥3 endpoints down | 5 min |
| **P2 (High)** | Major service down (BONDING, donation relay); 1-2 endpoints | 15 min |
| **P3 (Medium)** | Single non-critical endpoint down OR performance degradation | 30 min |
| **P4 (Low)** | Cosmetic issues; monitoring/logging lag | 1 hour |

---

## Detection & Alerting

**Automated Detection:**
- Command-center cron job pings all 27 endpoints every 5 minutes
- Failed health checks (4xx/5xx or timeout >8s) trigger immediate Discord alert to `#p31-incidents`
- Alert includes: endpoint name, HTTP status, timestamp, recovery suggestion

**Alert Example:**
```
🚨 **p31-bonding-relay** returned 502 Bad Gateway
  Last seen: 2026-05-22 14:35:22 UTC
  Suggested action: Check CF Workers dashboard for errors
  Dashboard: https://command-center.trimtab-signal.workers.dev
```

---

## Triage Phase (5–15 min)

### Step 1: Confirm Alert Legitimacy
1. Visit Cloudflare dashboard (`https://dash.cloudflare.com`)
2. Confirm endpoint status matches alert
3. Check for recent deployments in GitHub Actions (might indicate new bug)
4. Verify DNS resolution hasn't changed

### Step 2: Determine Root Cause
| Symptom | Most Likely Cause | Verification |
|---------|------|---|
| 502 / 503 | Worker crashed or out of memory | Cloudflare Workers → Errors tab |
| 404 | Route misconfigured or deleted | Wrangler.toml changed? Check git log |
| Timeout >8s | Database query slow or KV stuck | D1/KV dashboard; check query logs |
| All endpoints down | DNS hijacked or CF account compromised | Check CF account 2FA status |

### Step 3: Quick Assessment
- **Is this a deployment issue?** (Check `git log` last 30 min)
- **Is this a secrets/auth issue?** (Check wrangler secret list)
- **Is this a database issue?** (Try manual query in Cloudflare dashboard)
- **Is this Cloudflare infrastructure?** (Check status.cloudflare.com)

---

## Mitigation Phase (5–30 min)

### Option A: Git Rollback (if recent deploy)
```bash
# 1. Identify last working commit
git log --oneline | head -5

# 2. Revert
git revert HEAD

# 3. Redeploy
git push
# GitHub Actions triggers automatically
```

### Option B: Wrangler Secret Fix
```bash
# If a secret is wrong:
wrangler secret put SECRET_NAME --path 04_SOFTWARE/cloudflare-worker/[worker-name]
# Then trigger redeploy:
git commit --allow-empty -m "Force redeploy [worker-name]"
git push
```

### Option C: Config Fix (KV, D1, Routes)
```bash
# Update wrangler.toml
nano 04_SOFTWARE/cloudflare-worker/[worker-name]/wrangler.toml
# Apply:
wrangler deploy --path 04_SOFTWARE/cloudflare-worker/[worker-name]
```

### Option D: Infrastructure Rollback
- **If KV namespace corrupted:** Restore from R2 backup
  ```bash
  aws s3 cp s3://p31-status-backups/status-backup-2026-05-22.json status.json
  curl -X POST https://command-center.trimtab-signal.workers.dev/api/status \
    -H "Authorization: Bearer $COMMAND_CENTER_STATUS_TOKEN" \
    -d @status.json
  ```
- **If D1 corrupted:** Contact Cloudflare support (SLA: 4 hours to restore from daily backup)
- **If Pages build failed:** Check GitHub Actions logs; fix error; re-run workflow

---

## Recovery & Validation

### Step 1: Verify Endpoint Liveness
```bash
# Simple check
curl -I https://[endpoint]

# Full health check
curl https://command-center.trimtab-signal.workers.dev/api/status | jq '.workers[] | select(.status != "online")'
```

### Step 2: Smoke Test
- **BONDING:** Load `https://bonding.p31ca.org` in browser; join multiplayer room; verify relay connects
- **Donation:** Test Stripe Checkout flow; verify webhook delivery
- **APIs:** `curl https://[worker]/api/health` returns 200 + JSON
- **Pages:** Load each page; check no 404s in DevTools console

### Step 3: Declare All-Clear
- Post to Discord: ✅ **Incident Resolved** — [endpoint] recovered at [UTC time]
- Update status.html dashboard to green
- Create GitHub issue for post-mortem (link in Discord)

---

## Post-Mortem (within 48 hours)

**Template:**

```markdown
## Incident Report: [Service] - [Date]

**Timeline:**
- 14:32 UTC: Alert fired (bonding-relay 502)
- 14:35 UTC: Root cause identified (out of memory bug in [file:line])
- 14:42 UTC: Git revert deployed
- 14:47 UTC: Service confirmed online

**Root Cause Analysis:**
[Explain what broke and why]

**Prevention:**
- Add monitoring for [metric] to alert earlier
- Add test case for [scenario]
- Code review checklist: [items]

**Remediation:**
- Fix merged in commit [hash]
- Deployed to production at [time]
- Verified at [time]
```

**Publish to:**
1. `docs/INCIDENT_LOG/[YYYY-MM-DD]-[name].md`
2. Link in Discord #p31-incidents
3. Include in monthly SLA report

---

## Escalation Contacts

| Role | Email | Phone | On-Call |
|------|-------|-------|---------|
| Incident Commander | ops@p31ca.org | N/A | Rotating weekly |
| Cloudflare Support | support@cloudflare.com | 1-844-996-4411 | Enterprise SLA |
| GitHub Support | support@github.com | Support portal | Standard |
| Stripe Support | support@stripe.com | Support portal | Standard |

---

## Do's and Don'ts

✅ **DO:**
- Communicate status updates every 15 min during outage
- Revert to last known good state if unsure
- Test in staging before applying to production
- Document all manual fixes for reproducibility

❌ **DON'T:**
- Force-push to main branch (always use `git revert`)
- Manually edit status.json (use `/api/status` POST)
- Rotate secrets without documenting in secret log
- Panic! Most incidents have a 30-min recovery time

---

## Runbooks by Service

### BONDING Game (P2 - Critical)
- Check: `bonding.p31ca.org` status
- Relay: `p31-bonding-relay` worker health
- Fix: Redeploy Pages project or Worker
- Verify: Test multiplayer join flow

### Donation API (P2 - Critical)
- Check: `donate-api.phosphorus31.org/health`
- Verify: Stripe webhook `p31-stripe-webhook` online
- Fix: Check `wrangler secret` for `STRIPE_API_KEY`
- Test: Checkout flow → verify webhook delivery to D1

### Institutional Sites (P3 - Medium)
- Check: `p31ca.org`, `phosphorus31.org` respond with 2xx
- Fix: Redeploy via GitHub Actions (push to main)
- Verify: Load in browser, check CSS/JS loads

---

## Disaster Recovery Procedures

**Scenario: Complete Fleet Outage (All 27 endpoints down)**

1. **Verify it's real** (check Cloudflare status page; confirm from multiple networks)
2. **Declare Tier 4 incident** → Notify stakeholders
3. **Contact Cloudflare** (1-844-996-4411, reference account `ee05f70c889cb6f876b9925257e3a2fa`)
4. **Failover strategy:**
   - Static sites (Astro Pages) should failover via Cloudflare's global cache (no action needed)
   - Workers deploy to alternate account if primary is compromised
   - D1 data recoverable from daily backups (Cloudflare support)
5. **ETA to recovery:** 1–4 hours (pending Cloudflare infra restoration)

**Scenario: Data Loss (status.json, D1 corrupted)**

1. Restore from R2 backup: `s3://p31-status-backups/`
2. Or from git history: `git log -- status.json` (historical snapshots)
3. Verify integrity: compare counts before/after backup
4. Redeploy to KV via `wrangler kv:key put`

---

## Monthly SLA Report

Due on the 5th of each month. Include:

- **Uptime %** (calculated from command-center ping logs)
- **Incidents** (count, avg duration, MTTR)
- **Major outages** (list any >30 min, with RCA link)
- **Trends** (improving? degrading?)
- **Action items** (what gets fixed next month)

---

**Last Updated:** 2026-05-22  
**Owner:** Will Johnson (ops@p31ca.org)
