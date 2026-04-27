# p31ca — P31 Labs Technical Hub

**Live:** [p31ca.org](https://p31ca.org) · Cloudflare Pages  
**Stack:** Astro 5 · Tailwind · Three.js · Cloudflare Workers · D1 · KV

Technical hub for P31 Labs, Inc. (EIN 42-1888158). Hosts the product registry, interactive visualizations, neuro-inclusive onboarding, and passkey authentication.

---

## Quick start

```bash
npm ci
npm run dev        # localhost:4321 (Astro dev server)
npm run verify     # passport + constants + contracts + egg-hunt + build
npm run hub:ci     # registry → about pages → hub-landing.json → verify → build
npm run deploy     # predeploy checks → Cloudflare Pages
```

---

## Project structure

```
p31ca/
├── src/
│   ├── pages/           # Astro routes  (/dome, /orchestrator, /, /404)
│   ├── components/      # Shared Astro components
│   ├── layouts/         # BaseLayout.astro
│   └── data/            # hub-landing.json  (generated — do not edit by hand)
├── public/              # Static assets served as-is
│   ├── *.html           # Product surfaces, visualizations, onboarding
│   ├── _redirects       # Cloudflare Pages redirect rules
│   └── _headers         # Security headers (CORP, Clear-Site-Data, etc.)
├── scripts/
│   ├── hub/
│   │   ├── registry.mjs               # Product list, appUrl, related[]
│   │   ├── hub-app-ids.mjs            # HUB_COCKPIT_ORDER + prototypes (grid + verify)
│   │   ├── build-landing-data.mjs     # → src/data/hub-landing.json
│   │   └── verify.mjs                 # Hub invariants (registry ↔ ids ↔ abouts)
│   ├── generate-about-pages.mjs      # → public/*-about.html
│   ├── verify-ground-truth.mjs        # Routes + Three.js pins + redirect check
│   ├── verify-synergetic.mjs          # Multi-dome manifest check
│   └── verify-passport.mjs            # CogPass mirror sync check
├── ground-truth/
│   ├── p31.ground-truth.json          # Machine contract: routes, redirects, Three.js pins
│   └── synergetic-manifest.json       # Multi-dome surface map (version pins)
└── workers/
    └── passkey/                       # Cloudflare Worker: WebAuthn backend
        ├── src/index.ts               # CBOR decoder + SubtleCrypto passkey auth (v2)
        ├── schema.sql                 # D1 credentials table
        ├── wrangler.toml              # Config (fill KV + D1 IDs before deploy)
        └── README.md                  # Endpoints, deploy recipe, curl examples
```

---

## Key surfaces

| Path | Description | Stack |
|------|-------------|-------|
| `/` | Cockpit — product grid + dome background | Astro + Three.js r183 |
| `/dome` | K₄ interactive dome | Astro + Three.js r183 |
| `/orchestrator` | Internal ops dashboard | Astro — not on hub-landing grid |
| `/delta.html` | Wye→Delta public narrative | Tailwind CDN |
| `/planetary-onboard.html` | Five-phase neuro-inclusive onboarding | WebAuthn Phase 5 |
| `/auth.html` | Passkey authentication for returning members | Calls passkey Worker |
| `/connect.html` | K₄ mesh navigator — family cage + products | Three.js r160 |
| `/k4market.html` | Tetrahedral price geometry | Three.js r160 |
| `/tomography.html` | Symbol-seeded depth view + Larmor ring | Three.js r183 |
| `/lattice.html` | Prototype/research node graph | Canvas 2D |
| `/passport` | Cognitive Passport generator | → `passport-generator.html` |

Short-path aliases: `/onboard` `/mesh` `/delta` `/why` `/auth` — see `public/_redirects`.

---

## Contract system

Every verifier runs inside `npm run verify` (and `prebuild`):

| Script | What it checks |
|--------|---------------|
| `verify:passport` | CogPass generator ↔ home-repo mirror in sync |
| `verify:constants` | `p31-constants.json` values propagated everywhere |
| `verify:p31ca-contracts` | `p31.ground-truth.json` routes, Three.js pins, redirects |
| `verify:egg-hunt` | Quantum egg manifest anchors + Larmor coherence |
| `hub:verify` | Registry → hub-landing invariants; every id has an about page |

Any verifier failure blocks the Astro build.

---

## Registry pipeline

Product metadata lives in `scripts/hub/registry.mjs`; home grid order is `scripts/hub/hub-app-ids.mjs` (must stay in lockstep — see `docs/P31-HUB-CARD-ECOSYSTEM.md` in the home repo). To add or update a product:

1. Edit `registry.mjs` and add the id to `hub-app-ids.mjs` (cockpit or prototype list).
2. `npm run hub:ci` — regenerates about pages, hub-landing.json, and runs all verifiers.
3. If the product uses Three.js: add a pin to `ground-truth/p31.ground-truth.json` → `threejs` and a matching entry to `ground-truth/synergetic-manifest.json`.

---

## Workers

### Passkey Worker (`workers/passkey/`)

WebAuthn FIDO2 backend — four endpoints:

```
POST /api/passkey/register-begin
POST /api/passkey/register-finish
POST /api/passkey/auth-begin
POST /api/passkey/auth-finish
```

v2: full CBOR decoding, rpId hash verification, SubtleCrypto signature verification (ES256 + RS256). See `workers/passkey/README.md` for the deploy recipe.

---

## Design system

| Token | Value | Usage |
|-------|-------|-------|
| Void | `#0f1115` | Page background |
| Surface | `#161920` | Card backgrounds |
| Coral | `#cc6247` | Primary CTA, alerts |
| Teal | `#25897d` | Secondary CTA, cage edges |
| Cyan | `#4db8a8` | Accents, live status |
| Phosphorus | `#3ba372` | LIVE badges |
| Cloud | `#d8d6d0` | Body text |
| Butter | `#cda852` | BUILDING badges, trim |
| Lavender | `#8b7cc9` | Research / stub |
| Fonts | Atkinson Hyperlegible + JetBrains Mono | Google Fonts |

---

## Off-path entry points

`docs/EGG-HUNT.md` — documented non-default query params, keyboard shortcuts, unlisted routes. Machine-verified by `npm run verify:egg-hunt` on every build.

---

## Deploy

See **`DEPLOY.md`**.
