# Ecosystem overview (extended narrative)

Long-form product, gamification, and community context. For **engineering workflow**, see [`ENGINEERING.md`](ENGINEERING.md) and [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## Ecosystem metrics

### Node count

**Current: tracking toward 39 (Posner threshold)**

A node is a unique individual who has engaged with P31 Labs — Discord join, Ko-fi support, BONDING session, egg claim, or Zenodo download. 39 nodes = Posner molecule (Ca₉(PO₄)₆).

### Current numbers (April 2026)

- **Automated tests**: 650+ aggregate (BONDING alone: **413 / 30 suites**; other suites vary by package)
- **Cloudflare**: see [`WORKER_PAGES_MANIFEST.md`](WORKER_PAGES_MANIFEST.md) (regenerate: `pnpm run manifest:workers` from `04_SOFTWARE/`)
- **Zenodo DOIs**: see project publications
- **EIN**: 42-1888158 | **ORCID**: 0009-0002-2492-9079

## BONDING game

Cooperative molecular chemistry puzzle — real-time simulation, Larmor-themed UX, academic tie-ins. Development: `04_SOFTWARE/bonding/`.

## Cross-platform integration

Ko-fi, Zenodo/ORCID pipeline, IPFS archiving — see individual package READMEs under `04_SOFTWARE/`.

## Gamification and community

Karma, spoons ledger, achievements, challenges — product documentation in respective apps.

## Academic integration

Zenodo publications and citation standards — see `02_RESEARCH/` and Zenodo community.

## Security and privacy

No secrets in git. GDPR-aware defaults in user-facing apps — see package-level privacy notes.

## P31 Open Doc Suite (baked in)

**Git-native “office” layer** in the monorepo (no extra SaaS for letters, memos, watermarks, or grant CSV stubs): `docs/corporate/README.md` → `P31-DOC-SUITE.md` → `suite/print/*.html` and P31 Forge (`04_SOFTWARE/p31-forge`) for `.docx`. **Public explainer on the technical hub:** [p31ca.org/open-doc-suite.html](https://p31ca.org/open-doc-suite.html) (short: `/doc-suite`). **Brand tokens** sync: `cd 04_SOFTWARE/p31-forge && npm run brand:tokens`.

## Community and support

Discord, GitHub, Ko-fi — links on main [README](../README.md).

## License

MIT — see [LICENSE](../LICENSE).
