# P31 Andromeda — Build Artifacts

**Source of truth for all deployable artifacts across the ecosystem.**

## BONDING (Monorepo)

| Artifact | Path | Type | Platform | URL |
|----------|------|------|----------|-----|
| Server | `bonding/apps/server` | Express + Socket.io | Render | https://bonding-server.onrender.com |
| Mobile | `bonding/apps/mobile` | React + Capacitor 8.4 | App Store (pending) | — |
| Onboarding | `bonding/apps/onboarding` | Vite + React 19 | Cloudflare Pages | https://bonding-meatspace.pages.dev |
| Chemistry | `andromeda/software/bonding` | R3F + React | Cloudflare Pages | https://bonding.p31ca.org |
| Shared Types | `bonding/packages/shared-types` | TypeScript + Zod | npm (workspace) | — |

**Tests:** 11 test files, 95 tests (server: 42, mobile: 32, shared: 21)
**CI:** `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

## Cloudflare Workers

| Worker | Path | URL |
|--------|------|-----|
| Command Center | `andromeda/software/cloudflare-worker/command-center` | https://command-center.trimtab-signal.workers.dev |
| K4 Cage | `andromeda/software/k4-cage` | https://k4-cage.trimtab-signal.workers.dev |
| P31 Forge | `andromeda/software/p31-forge` | https://p31-forge.trimtab-signal.workers.dev |
| P31 Cortex | `andromeda/software/p31-cortex` | https://p31-cortex.trimtab-signal.workers.dev |
| Donate API | `andromeda/software/donate-api` | https://donate-api.trimtab-signal.workers.dev |
| Genesis Gate | `andromeda/software/genesis-gate` | https://genesis-gate.trimtab-signal.workers.dev |

## Cloudflare Pages

| Site | Path | URL |
|------|------|-----|
| p31ca.org | `andromeda/software/p31ca` | https://p31ca.org |
| PHOS | `andromeda/phos` | https://phos.p31ca.org |
| phosphorus31.org | `andromeda/software/p31ca` (deploy: phosphorus31.org) | https://phosphorus31.org |
| ops.p31ca.org | `andromeda/software/p31-hearing-ops` | https://ops.p31ca.org |
| Bonding Chemistry | `andromeda/software/bonding` | https://bonding.p31ca.org |
| Bonding Onboarding | `bonding/apps/onboarding` | https://bonding-meatspace.pages.dev |
| Spaceship Earth | `andromeda/software/spaceship-earth` | https://spaceship-earth.pages.dev |

## Tools (Yardmaster-Managed)

| Tool | Path | Version |
|------|------|---------|
| WEAVE | `P31-local-workspace/weave-machine/weave.py` | 1.0 |
| 8-Ball | `P31-local-workspace/scripts/quantum-8ball.py` | 1.0 |
| NEXUS | `P31-local-workspace/scripts/nexus-daemon.py` | 1.0 |
| Yardmaster | `P31-local-workspace/scripts/p31-yardmaster.sh` | 0.1.0 |

## Key Paths

- **Monorepo root:** `/home/p31/andromeda`
- **BONDING monorepo:** `/home/p31/bonding`
- **P31 workspace:** `/home/p31/P31-local-workspace`
- **Software projects:** `/home/p31/andromeda/software/`
- **CI workflows:** `/home/p31/andromeda/.github/workflows/` (28 workflows)
- **Ecosystem verify:** `/home/p31/andromeda/software/verify.sh`
