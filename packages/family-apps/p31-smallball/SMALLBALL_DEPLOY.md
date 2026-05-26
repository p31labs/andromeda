# smallball.p31ca.org — Deployment Instructions

## Custom Domain Setup

| Item | Value |
|------|-------|
| Cloudflare Pages project | **p31-smallball** |
| Current URL | `https://p31-smallball.pages.dev` |
| Target domain | `smallball.p31ca.org` |

**DNS step:** Cloudflare Dashboard → p31ca.org → DNS → Add CNAME record:
- Name: `smallball`
- Target: `p31-smallball.pages.dev`
- Proxy: Proxied (orange cloud)

**Pages step:** Cloudflare Dashboard → Workers & Pages → p31-smallball → Custom domains → Add custom domain → `smallball.p31ca.org`

---

## Wrangler Deploy (alternative)

```powershell
npx wrangler pages deploy dist --project-name p31-smallball
```

Existing `wrangler.toml`:

```toml
name = "p31-smallball"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"
```

---

## Build Command

```powershell
cd packages/family-apps/p31-smallball
npx vite build
```

---

## Sync Worker (Cloud Persistence)

| Item | Value |
|------|-------|
| Worker | `p31-sync-edge` |
| URL | `https://p31-sync-edge.trimtab-signal.workers.dev` |
| D1 DB | `p31-smallball-sync` (7 tables) |
| Source | `04_SOFTWARE/cloudflare-worker/p31-sync-edge/` |

**Deploy:**
```powershell
# After schema changes:
npx wrangler d1 execute p31-smallball-sync --remote --file="04_SOFTWARE/cloudflare-worker/p31-sync-edge/schema.sql"

# Deploy worker:
npx wrangler deploy --config="04_SOFTWARE/cloudflare-worker/p31-sync-edge/wrangler.toml" --name p31-sync-edge
```

**Verified architecture:**
- Local-First: gameplay runs at 0ms latency (PGLite IndexedDB)
- Cloud sync: async, non-blocking, cursor-based incremental
- Push: POST `/api/sync/push` (upsert players/facilities/energy/schedules, append-only events/mutations)
- Pull: GET `/api/sync/pull?franchiseId=` (full state for new-device restore)
- Auto-save: 2-second debounce trigger on training events + energy changes

---

## Infrastructure Context

- Cloudflare Pages project uses `vite build` output (skipping `tsc` due to ~187 pre-existing type errors in orphaned AAA graphics)
- PGLite WASM embedded in build (~8MB postgres.wasm included)
- All 3 energy views (Low/Medium/High) fully wired
- 5 training minigames built (IronMike, TrackSleds, Bullpen, PopFly, FilmRoom)
