# P31 Family Mesh (Cloudflare Pages) — CWP-079

K4 tetrahedron family mesh interface. Vanilla JS + Three.js r160 (ESM import map). Zero build step.

## Architecture

| Layer | Tech | Purpose |
|-------|------|---------|
| Signaling | `wss://p31-signaling.trimtab-signal.workers.dev` | Ephemeral SDP exchange + presence |
| P2P | WebRTC `RTCDataChannel` + Cloudflare STUN | Direct browser-to-browser |
| 3D | Three.js r160 `TetrahedronGeometry` | K4 complete graph (4 vertices, 6 edges) |
| LOVE | `AdditiveBlending` octahedron particles | Care flow visualization |
| Haptics | `navigator.vibrate` 4-4-6 rhythm | Autonomic entrainment |
| Offline | `localStorage` CRDT snapshot | Last-known-state resilience |
| Degradation | 1-3-6 Spoon token matrix | Cognitive load management |
| Content | SENTINEL whitelist guard | Safe spectate for sibling nodes |

## Routes

- `/mesh` — Primary family interface (sibling-optimized)
- `/mesh?node=wj` — Node auto-select via query param (will/sj/wj/christyn)
- `/mesh-noc` — Network Operations Center (raw telemetry)

## Deploy

From this folder (requires `CLOUDFLARE_API_TOKEN`):

```bash
npx wrangler pages deploy . --project-name=p31-mesh
```

If Cloudflare Pages is linked to the GitHub repo, pushing to the tracked branch auto-deploys.

## Files

| File | Role |
|------|------|
| `index.html` | Spatial HUD, import map, z-layer stack |
| `mesh-app.js` | All logic: WebRTC, Three.js, LOVE, spoons, SENTINEL, breathing |
| `mesh-overrides.css` | Glassmorphism HUD, spoon tracker, mobile breakpoints |
| `mesh-boot.js` | Fleet status chip from command-center API |

## No Build Step

All JS is vanilla ES modules via browser import map. Three.js loaded from unpkg CDN. No npm, no terminal, no installation required to edit and deploy.
