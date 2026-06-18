# P31 Andromeda — Repository Layout
Date: 2026-06-18

## Top Level

```
andromeda/
├── README.md                  # Operator-facing overview
├── docs/
│   ├── ARTIFACTS.md           # ⚡ Single source of truth for live Cloudflare inventory
│   └── REPOSITORY_LAYOUT.md   # This file
├── software/
│   ├── verify.sh              # Canonical lifecycle verification script
│   ├── bonding/               # BONDING chemistry game (Vite + React + R3F + Zustand + Vitest)
│   │   ├── src/               # React app source
│   │   ├── public/            # Static assets
│   │   └── wrangler.toml      # Deploy config for the relay worker
│   ├── p31ca/                 # p31ca.org (Astro + Tailwind + React + Pages Functions)
│   │   ├── src/               # Astro pages/components
│   │   ├── public/            # Public static + health.json files
│   │   ├── functions/         # Cloudflare Pages Functions (/api/health, /health)
│   │   └── package.json
│   ├── p31-hearing-ops/       # ops.p31ca.org (Vite PWA — hearing prep)
│   │   ├── src/               # PWA source
│   │   └── public/health.json
│   ├── spaceship-earth/       # Dashboard (R3F + React + Vitest)
│   │   ├── src/
│   │   └── public/health.json
│   ├── phos/                  # phos.p31ca.org (Astro + Tailwind + React — numerical spoon-aware PWA)
│   ├── sovereign-command-center/  # Next.js static export
│   ├── donate-api/            # Stripe/Ko-fi API gateway Worker
│   ├── p31-forge/             # Document generation Worker + CLI
│   ├── p31-cortex/            # Cognitive agent Worker + Durable Objects
│   ├── k4-cage/               # K₄ unified graph Worker + Durable Objects
│   ├── spin-mesh/
│   │   ├── matchmaking-do/    # Spin matchmaking Durable Object
│   │   └── logistics-do/      # Spin logistics Durable Object
│   ├── cloudflare-worker/
│   │   ├── command-center/    # Status dashboard Worker + status.json + update-status.sh
│   │   ├── q-factor/          # Q-factor detail Worker
│   │   ├── bouncer/           # Access gateway Worker
│   │   ├── social-drop-automation/  # Scheduled social publish Worker
│   │   └── ...                # Additional workers (carrie-agent, fawn-guard, etc.)
│   ├── cloudflare-pages/
│   │   ├── p31-vault/         # p31-vault.pages.dev
│   │   └── p31-mesh/          # p31-mesh.pages.dev
│   ├── backend/               # Python backend (Dockerized CRDT, spoons substrate)
│   ├── matrix/                # Matrix bridge (Docker Compose)
│   ├── monitoring/            # Production monitoring Worker (development)
│   ├── ops/                   # Hearing Ops tooling (legacy location; canonical is p31-hearing-ops)
│   ├── kilo-node/             # KILO somatic shield (development)
│   ├── agents/                # Agent topology configs + spawn scripts
│   ├── tools/                 # Env generator + sync utility scripts
│   ├── integration-handoff/   # Controlled Work Packages (CWP-030, CWP-031, CWP-032)
│   └── orphan-manifest/       # Stale/incomplete services (archived intent)
├── archive/
│   ├── workers/2026-06-18/
│   │   ├── genesis-gate/      # Archived — no deployable source + empty intent
│   │   ├── k4-personal/       # Archived — KV mismatch + superseded by k4-cage
│   │   └── telemetry-worker/  # Archived — broken health route + no active deploy
│   └── empties/2026-06-18/    # Candidates if later confirmed dormant
└── phosphorus31.org/
    └── planetary-planet/      # Astro project root
```

## Out-of-tree Repositories

```
/home/p31/
├── andromeda/
└── bonding/                   # Separate repo for BONDING mobile + onboarding
    └── apps/
        ├── mobile/            # Capacitor 8.4.0 mobile shell
        └── onboarding/        # Vite + React onboarding flow
```

## Canonical URLs

| Service | URL | Source |
|---------|-----|--------|
| p31ca.org | https://p31ca.org | `software/p31ca` |
| bonding (chem) | https://bonding.p31ca.org | `software/bonding` |
| bonding-meatspace | https://bonding-meatspace.pages.dev | `/home/p31/bonding/apps/onboarding` |
| ops.p31ca.org | https://ops.p31ca.org | `software/p31-hearing-ops` |
| phos.p31ca.org | https://phos.p31ca.org | `software/phos` |
| phosphorus31.org | https://phosphorus31.org | `phosphorus31.org` |
| command-center | https://command-center.trimtab-signal.workers.dev | `software/cloudflare-worker/command-center` |
| k4-cage | https://k4-cage.trimtab-signal.workers.dev | `software/k4-cage` |
| donate-api | https://donate-api.trimtab-signal.workers.dev | `software/donate-api` |
| p31-forge | https://p31-forge.trimtab-signal.workers.dev | `software/p31-forge` |
| p31-cortex | https://p31-cortex.trimtab-signal.workers.dev | `software/p31-cortex` |
| spin-matchmaking | https://spin-matchmaking.trimtab-signal.workers.dev | `software/spin-mesh/matchmaking-do` |
| spin-logistics | https://spin-logistics.trimtab-signal.workers.dev | `software/spin-mesh/logistics-do` |

## Health Endpoint Standard

Every live service must serve JSON `{ ok, service, ts }` on `/health` (Pages) or `/api/health` (Workers).
