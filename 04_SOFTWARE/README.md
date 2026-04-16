# 04_SOFTWARE — Active engineering tree

Install **from the repository root** (single workspace — see root `pnpm-workspace.yaml`):

```bash
cd ..   # repo root
pnpm install
```

Then from repo root, or with `pnpm --dir 04_SOFTWARE`:

```bash
pnpm --dir 04_SOFTWARE run build
pnpm --dir 04_SOFTWARE run test
```

Use project-local scripts per package as documented in each project README.

## Applications and sites

| Project | Stack | Notes |
|---------|--------|--------|
| `bonding/` | Vite + React + R3F | BONDING game; Vitest. |
| `p31ca/` | Astro | p31ca.org technical hub. |
| `p31-hearing-ops/` | Vite + React PWA | ops.p31ca.org — Pages project **`p31-hearing-ops`** (never `p31ca`). |
| `spaceship-earth/` | Vite + R3F | Dashboard. |
| `frontend/` | Vite | Legacy/aux UI. |
| `sovereign-command-center/` | Next | Command UI (check env). |
| `spoon-calculator/` | Vite | Utility. |
| `docs/` | Astro | Internal docs site if used. |

## Cloudflare Workers / edge

| Path | Role |
|------|------|
| `cloudflare-worker/` | Multiple Workers (command-center, bouncer, social-drop, etc.). |
| `k4-cage/` | K₄ graph Worker (canonical). |
| `p31-forge/` | Forge + Worker + crons. |
| `telemetry-worker/` | Telemetry. |
| `donate-api/` | Donation API. |
| `kenosis-mesh/` | Mesh / edge. |
| `p31-cortex/` | Cortex worker. |

## Shared packages

`packages/` — `shared`, `game-engine`, `k4-mesh-core`, `node-zero`, `love-ledger`, `sovereign-sdk`, `quantum-core`, etc.

## Extensions

`extensions/` — VS Code / tooling extensions (p31ca, progressive disclosure, cognitive shield, cockpit, spoon gauge).

## Other

| Path | Role |
|------|------|
| `discord/p31-bot/` | Discord bot. |
| `workers/` | Additional worker sources (see each folder). |

For the **full monorepo** (research, firmware, legal handoff), see `docs/REPOSITORY_LAYOUT.md`.
