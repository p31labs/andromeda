# P31 Ecosystem Launch Prep Checklist

**Target Date:** May 23, 2026  
**Status:** Building (Tier 1 + 2 in progress)

---

## TIER 1 COMPLETE ✅ (Documentation Layer)

- [x] docs/SERVICE_LEVELS.md — SLA targets, uptime metrics, escalation matrix
- [x] docs/INCIDENT_RESPONSE.md — Incident detection, triage, mitigation, post-mortem
- [x] docs/SECRET_ROTATION.md — Quarterly rotation schedule + audit trail
- [x] Command-center worker updated — Discord alert function added
- [x] Wrangler.toml for command-center — DISCORD_WEBHOOK_URL secret binding added

---

## TIER 2 IN PROGRESS (Operational Hardening)

### Tier 2a: Alerts & Observability

- [x] Discord alert function: `sendDiscordAlert()` wired into `pingFleet()`
- [x] Wrangler.toml updated with `DISCORD_WEBHOOK_URL` binding
- [ ] **NEXT:** Deploy command-center worker with alerts enabled
  ```bash
  cd 04_SOFTWARE/cloudflare-worker/command-center
  wrangler secret put DISCORD_WEBHOOK_URL  # Get URL from P31 team Discord
  wrangler deploy
  # Test: Check #p31-incidents channel for test alert
  ```

### Tier 2b: Disaster Recovery

- [x] Backup script created: `src/backup-status.js` (R2 backup for status.json daily)
- [ ] **NEXT:** Integrate backup into cron trigger
  - Modify wrangler.toml to add cron: `0 2 * * *` (2 AM UTC daily)
  - Deploy to enable daily backups

### Tier 2c: Performance Testing

- [x] Load test script created: `scripts/load-test-bonding.k6.js`
- [ ] **NEXT:** Run test and document baseline
  ```bash
  npm install -g k6
  k6 run scripts/load-test-bonding.k6.js --vus 20 --duration 5m
  # Document P95/P99 latencies in docs/PERFORMANCE_BASELINE.md
  ```

### Tier 2d: Public Status Dashboard

- [x] Status dashboard HTML created: `04_SOFTWARE/status-dashboard/index.html`
- [ ] **NEXT:** Deploy to Cloudflare Pages
  1. Visit https://dash.cloudflare.com/pages
  2. Connect p31-andromeda repo
  3. Create "p31-status-dashboard" project
  4. Build output: `/04_SOFTWARE/status-dashboard`
  5. Custom domain: `status.p31ca.org`
  6. Verify: Load in browser → should show endpoint health grid

### Tier 2e: Spaceship Earth Deployment

- [x] Deployment plan documented: `docs/SPACESHIP_DEPLOYMENT.md`
- [ ] **NEXT:** Execute merge or standalone deploy
  - **Option A (Recommended):** Merge into p31ca Pages project
    ```bash
    cd 04_SOFTWARE
    mv spaceship-earth/src/* p31ca/src/pages/spaceship/
    git commit -am "feat(spaceship): merge into p31ca Pages"
    git push
    ```
  - **Option B:** Deploy as standalone Pages project
    - Create new Pages project in Cloudflare
    - Point to `04_SOFTWARE/spaceship-earth` directory
    - Custom domain: `spaceship.p31ca.org` or `spaceship-earth.pages.dev`

---

## GO/NO-GO DECISION MATRIX

| Component | Status | Blocker? | Action |
|-----------|--------|----------|--------|
| BONDING (game) | ✅ Live, 413 tests | NO | No action needed |
| Buffer (Fawn Guard) | ✅ Live, merged | NO | CWP-066 audit pending (not blocking) |
| Node Zero (firmware) | ⚠️ Beta | NO | CWP-046 DeepSeek pending (not blocking) |
| p31ca.org | ✅ Live | NO | Awaiting Quantum Weave refactor |
| phosphorus31.org | ✅ Live | NO | No action needed |
| Command-center worker | ✅ Live → ⚠️ Updating | YES | Deploy with Discord alerts |
| Health monitoring | ✅ Active (5min ping) | NO | Alerts enable Tier 2 readiness |
| Incident response docs | ✅ Complete | NO | Review & link in runbooks/ |
| SLA definitions | ✅ Published | NO | No action needed |
| Public status page | ⚠️ Built, not live | MAYBE | Deploy if time permits (nice-to-have) |
| Spaceship Earth | ⚠️ Built, not deployed | NO | Deploy if time permits (not critical for launch) |
| Secret rotation SOP | ✅ Documented | NO | Schedule quarterly (Aug 22, 2026 first rotation) |

---

## LAUNCH READINESS CRITERIA

### MUST-HAVES (Blocking Launch)
- [x] All 26 endpoints live and responding
- [x] CI/CD automated (GitHub → Cloudflare)
- [x] Incident response procedure documented
- [x] SLA targets documented (99.5% uptime)
- [ ] Command-center alerts deployed (Discord webhook active)
- [ ] Team trained on incident response (review INCIDENT_RESPONSE.md)

### SHOULD-HAVES (Strongly Recommended)
- [ ] Public status dashboard live
- [ ] Load test results documented
- [ ] Disaster recovery procedure tested (restore from R2 backup)
- [ ] Secret rotation schedule posted (quarterly, next: Aug 22)

### NICE-TO-HAVES (Post-Launch Hardening)
- [ ] Spaceship Earth deployed
- [ ] k6 load test in CI/CD
- [ ] Prometheus/Grafana metrics dashboard
- [ ] Distributed tracing (OpenTelemetry)

---

## DEPLOYMENT EXECUTION (Next 4 Hours)

### Phase 1: Alerts (30 min)
```bash
cd 04_SOFTWARE/cloudflare-worker/command-center
# Get Discord webhook URL from P31 team
wrangler secret put DISCORD_WEBHOOK_URL
wrangler deploy
# Verify: Wait for next health check (5 min interval) or trigger manually
```

### Phase 2: Status Dashboard (30 min)
```bash
# Create Pages project in Cloudflare dashboard
# Point to 04_SOFTWARE/status-dashboard
# Custom domain: status.p31ca.org
# Verify: curl https://status.p31ca.org/
```

### Phase 3: Spaceship Earth (45 min - Optional)
```bash
# Option A: Merge into p31ca
cd 04_SOFTWARE
mv spaceship-earth/src/* p31ca/src/pages/spaceship/
git commit -am "feat(spaceship): merge into p31ca Pages"
git push  # Auto-deploys via GitHub Actions

# Option B: Standalone Pages project (30 min instead)
# Create new Pages project, point to spaceship-earth/
```

### Phase 4: Git Commit (15 min)
```bash
cd c:\Users\sandra\Documents\P31_Andromeda
git add docs/ 04_SOFTWARE/cloudflare-worker/ 04_SOFTWARE/status-dashboard/ scripts/
git commit -m "chore(launch): add Tier 1+2 operational hardening

- Docs: SERVICE_LEVELS.md, INCIDENT_RESPONSE.md, SECRET_ROTATION.md
- Alerts: Discord webhook integration in command-center
- Observability: Backup script, load test, public status dashboard
- Timeline: 1h alerts + status page, 45m spaceship Earth (optional)"

git push
```

---

## POST-LAUNCH (Next 48 Hours)

1. **Verify Alerts Fire** (30 min)
   - Kill one endpoint temporarily (or wait for natural failure)
   - Confirm Discord alert posts to #p31-incidents
   - Document alert lag time

2. **Test Incident Response** (1 hour)
   - Simulate P2 incident (e.g., "BONDING down")
   - Walk through INCIDENT_RESPONSE.md
   - Measure time to detect → triage → mitigate
   - Post-mortem: was process smooth?

3. **Load Test** (30 min)
   - Run k6 against bonding-relay
   - Document P95/P99 latencies
   - Verify relay handles 20 concurrent users

4. **Monthly SLA Report** (1 hour)
   - Calculate fleet uptime % (last 30 days)
   - List any incidents + MTTR
   - Publish to stakeholders

---

## OWNER & SIGN-OFF

**Architect:** Claude Code  
**Operator:** Will Johnson  
**Target Launch:** May 23, 2026, 00:00 UTC

**Sign-off Checklist:**
- [ ] All Tier 1 docs pushed to git
- [ ] Command-center alerts deployed & tested
- [ ] Public status dashboard live
- [ ] Team notified of new SLA / incident response procedures
- [ ] First alert received & verified working

---

## BLOCKED OR DEFERRED ITEMS

| Item | Status | Reason | Timeline |
|------|--------|--------|----------|
| API Versioning | Deferred | No active API consumer contracts | Q3 2026 |
| Rate Limiting Rules | Deferred | No DDoS activity detected | Q3 2026 |
| CORS / CSP Hardening | Deferred | Cloudflare defaults sufficient | Q3 2026 |
| Node Zero Market Launch | Blocked | CWP-046 DeepSeek display boot pending | Post-May 23 |
| Spaceship Earth | Optional | Not critical for ecosystem launch | If time permits |

---

**Last Updated:** 2026-05-22  
**Next Review:** 2026-05-23 (post-launch)
