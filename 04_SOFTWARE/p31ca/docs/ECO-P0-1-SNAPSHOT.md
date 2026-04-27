# ECO WBS 0.1 — Index source diff snapshot

**Generated:** 2026-04-25 (automated `node scripts/hub/diff-index-sources.mjs`). Re-run after registry or hub-landing changes. (Legacy `public/legacy-mvp-hub.html` removed 2026-04-27.)

## Command

```bash
cd andromeda/04_SOFTWARE/p31ca
node scripts/hub/diff-index-sources.mjs
```

## Last output (representative)

```
diff-index-sources: hub-landing + optional mvpData index

[info] mvpData id set != COCKPIT index list (expected until ECO CWP merge):
  only in mvpData: book, appointment-tracker, love-ledger, medical-tracker, somatic-anchor, legal-evidence, kids-growth, contact-locker, sleep-tracker, budget-tracker, simple-sovereignty, node-one, node-zero, sovereign, bridge, mission-control, quantum-life-os, qg-ide, forge, prism, tether, echo, kinematics

diff-index-sources: OK (hard checks passed); see warnings above
```

## Interpretation

- **`src/data/hub-landing.json`** (COCKPIT list in `build-landing-data.mjs`) = **Astro home** product grid source path.
- ~~**`public/legacy-mvp-hub.html`** `mvpData`~~ **Retired** — file removed; hub index is `hub-landing.json` + registry + `hub-app-ids` only.
- **Stakeholder decision (0.1):** which ids belong on **/** vs “about only” — then remove drift or add ids to `COCKPIT_PRODUCT_IDS` / mvp.

## Strict mode (CI later)

- `--strict-mvp` — fail if any `mvpData` id is not in `registry.mjs` (use after mvp is cleaned up).
- `--strict` — fail on any warning (inline `index.astro` `coreProducts`, etc.).
