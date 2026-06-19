# P31 Andromeda — Ecosystem Brief

**Generated:** 2026-06-19T10:27Z
**Operator:** Will Johnson
**Canopy:** Yardmaster v0.1.0 (1470 lines)

---

## 1. Mission

P31 Labs builds sovereign assistive technology for neurodivergent families. The Andromeda ecosystem is the full-stack operational platform: public web presence, multiplayer chemistry game, passkey auth, device sync, health telemetry, and decision support — all running on Cloudflare + Render.

---

## 2. Architecture — 5 Operational Domains

### Services (6)
| Service | Status | Health | Notes |
|---------|--------|--------|-------|
| phos | Healthy | ✓ | Spoon-aware PWA, cognitive UX |
| p31-safe-router | Healthy | ✓ | Routing layer |
| affective-chemistry | Healthy | ✓ | Emotional kinematics engine |
| spoon-monitor | Healthy | ✓ | Spoon state tracking |
| bonding | Healthy | ✓ | Chemistry game backend |
| bonding-server | Healthy | ✓ | Express on Render, HTTP 200 |

### Lenses (5)
| Lens | URL | Status |
|------|-----|--------|
| spaceship-earth | cockpit.p31ca.org | HTTP 200 ✓ |
| p31ca | p31ca.org | HTTP 404 ⚠ |
| phos-web | phos.p31ca.org | HTTP 200 ✓ |
| willow | willow.p31ca.org | HTTP 200 ✓ |
| bonding-meatspace | bonding-meatspace.pages.dev | HTTP 200 ✓ |

### Money Streams (5)
All stale — stubs need replacement with real implementations:
- bounty-hunter (nuclei scan), package-assets (Gumroad), audit-crawler (HN), publish-action (gh release), post-sponsorships (sponsor check)

### Onboarding Portal (1)
| Portal | URL | Status |
|--------|-----|--------|
| p31ca.org/onboard | p31ca.org/onboard | HTTP 404 ⚠ — needs build config update |

### Tools (4 — Yardmaster-Managed)
| Tool | Schema | Last Run | Status |
|------|--------|----------|--------|
| WEAVE | PMM_WEAVE=1.0 | 2026-06-19 | ✓ 5 concepts, 1 doc, v3 |
| 8-Ball | PMM_8BALL=1.0 | 2026-06-19 | ✓ Spoons=3, Ca=8.5, peak |
| NEXUS | PMM_NEXUS=1.0 | 2026-06-19 | ✓ 6967B entanglement state |
| Yardmaster | v0.1.0 | 2026-06-19 | ✓ 1470 lines |

---

## 3. Live Deployment Canvas

### Cloudflare Pages (5 live, 1 pending)

| Site | URL | Last Deployed | Status |
|------|-----|---------------|--------|
| phos | phos.p31ca.org | 8 hours ago | ✓ health.json 200 |
| bonding chemistry | bonding.p31ca.org | 8 hours ago | ✓ health.json 200 |
| phosphorus31.org | phosphorus31.org | 8 hours ago | ✓ health.json 200 |
| bonding-meatspace | bonding-meatspace.pages.dev | 8 hours ago | ✓ health.json 200 |
| ops.p31ca.org | ops.p31ca.org | 20 hours ago | ✓ HTTP 200 |
| p31ca.org | p31ca.org | 31 hours ago | ✓ HTTP 200 |

### Cloudflare Workers (8+ deployed)

| Worker | URL | Health | Notes |
|--------|-----|--------|-------|
| geodesic-room | geodesic-room.trimtab-signal.workers.dev | ✓ /health 200 | DO, v0.2.2 |
| p31-passkey | passkey worker | ✓ /api/passkey/health 200 | WebAuthn RP, D1+KV |
| p31-sync | sync worker | ✓ /health 200 | CRDT Yjs sync, DO+R2 |
| p31-fhir | fhir worker | ✓ | FHIR API, D1+KV |
| command-center | command-center.trimtab-signal.workers.dev | ⚠ 302 redirect | Behind CF Access |
| bonding-server | bonding-server.onrender.com | ✓ /health 200 | Express + Socket.io |

### Health Endpoint Coverage
8 endpoints returning HTTP 200:
- bonding.p31ca.org/health.json, phos.p31ca.org/health.json
- phosphorus31.org/health.json, bonding-meatspace.pages.dev/health.json
- geodesic-room.trimtab-signal.workers.dev/health
- p31-passkey.trimtab-signal.workers.dev/api/passkey/health
- p31-sync.trimtab-signal.workers.dev/health
- bonding-server.onrender.com/health

---

## 4. BONDING Ecosystem

| Component | Path | Status | Tests |
|-----------|------|--------|-------|
| Chemistry game | `andromeda/software/bonding` | ✓ Live, built | R3F + Vite + Tailwind |
| Server | `/home/p31/bonding/apps/server` | ✓ Render, HTTP 200 | 42 tests |
| Onboarding | `/home/p31/bonding/apps/onboarding` | ✓ Live, health.json 200 | — |
| Mobile | `/home/p31/bonding/apps/mobile` | Dev | 32 tests |
| Shared types | `/home/p31/bonding/packages/shared-types` | Workspace | 21 tests |
| **Total** | | | **95 tests, all passing** |

---

## 5. Current Health Snapshot

```
verify.sh — 2026-06-19T10:26Z
  Pass: 16    Fail: 0    Warn: 4    Total: 20

  4 warnings (all expected):
  - sovereign-command-center: no build output dir
  - p31-forge: no build output dir
  - p31-cortex: no build output dir
  - command-center: 302 redirect (CF Access)
```

**Yardmaster inspect all:**
- 6/6 services healthy
- 4/5 lenses HTTP 200 (p31ca returns 404 — `/onboard/health` missing)
- 5/5 money streams stale (all stubs)
- Onboarding portal: 404
- All 3 tools: operational (WEAVE, 8-Ball, NEXUS)

---

## 6. 8-Ball Priorities (Decision Engine)

| Rank | Action | Score | Spoons | Domain |
|------|--------|-------|--------|--------|
| 1 | Deploy 4 patched Workers | 0.849 | 1 | infrastructure |
| 2 | Launch money stream daemons | 0.560 | 1 | infrastructure |
| 3 | File ADA + Contempt Motion | 0.514 | 3 | legal |
| 4 | Review NEXUS report | 0.440 | 1 | cognitive |
| 5 | Run pnpm run quality | 0.390 | 1 | infrastructure |

State: Spoons=3/5, Calcium=8.5, Peak=True, Deadlines=1

---

## 7. Key Paths

| Resource | Path |
|----------|------|
| Yardmaster | `P31-local-workspace/scripts/p31-yardmaster.sh` |
| Shelf manifest | `P31-local-workspace/P31_SHELF_MANIFEST.yaml` |
| WEAVE | `P31-local-workspace/weave-machine/weave.py` |
| 8-Ball | `P31-local-workspace/scripts/quantum-8ball.py` |
| NEXUS | `P31-local-workspace/scripts/nexus-daemon.py` |
| Artifacts | `andromeda/docs/ARTIFACTS.md` |
| Verify script | `andromeda/software/verify.sh` |
| Deploy script | `andromeda/software/scripts/deploy-all-pages.sh` |

---

## 8. Open Items

| Item | Status | Owner | Blockers |
|------|--------|-------|----------|
| Money stream stubs → real impls | Pending | — | Implementation time |
| p31ca.org/onboard health 404 | Pending | — | Pages build config |
| Command-center KV push | Blocked | operator | CF_ACCESS_CLIENT_ID/SECRET |
| Onboard p31ca.org lens | Needs fix | — | `/onboard/health` returns 404 |
| Zenodo pipeline | Blocked | Will | Human account + Paper XII upload |
