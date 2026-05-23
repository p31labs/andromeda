# P31 Ecosystem Service Levels

**Effective Date:** May 22, 2026  
**Version:** 1.0

---

## Availability SLA

**Target Uptime:** 99.5% (22 minutes maximum downtime per month)

**Measured Components:**
- All 27 Cloudflare endpoints must be reachable and returning 2xx/3xx responses
- Health checks run every 5 minutes from command-center worker
- Individual endpoint SLAs roll up to fleet SLA

**Exclusions:**
- Scheduled maintenance windows (announced 48 hours in advance, max 4 per month)
- DDoS mitigation (Cloudflare protection active; not counted as downtime)
- Third-party service failures (GitHub, Stripe, DNS) — reported separately

---

## Recovery Objectives

| Metric | Target | Definition |
|--------|--------|-----------|
| RTO (Recovery Time Objective) | 1 hour | Max time to restore service after detection |
| RPO (Recovery Point Objective) | 4 hours | Max data loss tolerance (4 hours of logs/state) |
| MTTR (Mean Time To Repair) | 30 minutes | Avg time from alert to incident resolution |

---

## Escalation Matrix

| Tier | Condition | Action | Deadline |
|------|-----------|--------|----------|
| **Tier 1** | 1 endpoint down >5 min | Automated Discord alert fired | Immediate |
| **Tier 2** | 2+ endpoints down OR 1 endpoint down >15 min | Manual review + incident commander paged | 15 min |
| **Tier 3** | 3+ endpoints down OR fleet-wide impact >30 min | Full incident response + status.html update | 30 min |
| **Tier 4** | Unresolved Tier 3 >2 hours | Post-mortem scheduled; comms to stakeholders | 2 hours |

---

## Incident Communication

- **Status Dashboard:** Public view at `https://status.p31ca.org` (updated every 5 min)
- **Discord Alert Channel:** `#p31-incidents` (ops team + on-call)
- **Stakeholder Notification:** Email to `ops@p31ca.org` on Tier 3+ incidents

---

## Performance Baselines

| Endpoint Class | P95 Latency | P99 Latency | Availability |
|----------------|------------|------------|--------------|
| Static Pages (Astro) | 200ms | 500ms | 99.9% |
| Workers (API) | 150ms | 400ms | 99.5% |
| KV Operations | 50ms | 150ms | 99.8% |
| D1 Queries | 100ms | 250ms | 99.5% |

---

## Compliance & Auditing

- Monthly uptime report published to stakeholders by 5th of following month
- Incident post-mortems public within 48 hours of resolution (redacted for security)
- SLA credits issued within 30 days of validated breach (proportional to downtime % exceeding target)

---

## Security Response SLA

- Security bug reports: acknowledged within 4 hours, patch deployed within 24 hours
- Secrets compromise: all affected tokens rotated within 1 hour
- DDoS/attack: Cloudflare mitigation active; no manual deployment required
