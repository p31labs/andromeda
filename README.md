# P31 Andromeda

**Phosphorus31 / P31 Labs** — open-source assistive-technology and research software. Georgia nonprofit (**P31 Labs, Inc.**). 501(c)(3) pending.

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18627420.svg)](https://doi.org/10.5281/zenodo.18627420)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.19411363.svg)](https://doi.org/10.5281/zenodo.19411363)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

| | |
|---|---|
| **Tests (BONDING)** | **413 tests / 30 suites** (canonical — see `CLAUDE.md`) |
| **Edge / Pages** | Inventory: [`docs/WORKER_PAGES_MANIFEST.md`](docs/WORKER_PAGES_MANIFEST.md) |
| **Layout** | [`docs/REPOSITORY_LAYOUT.md`](docs/REPOSITORY_LAYOUT.md) |
| **Engineering** | [`docs/ENGINEERING.md`](docs/ENGINEERING.md) |

## Quick start (developers)

**Prerequisites:** Node **20** (see `.nvmrc`), **pnpm** 8+.

```bash
git clone https://github.com/p31labs/andromeda.git
cd andromeda
pnpm install
```

Build and test the main software tree (Turbo under `04_SOFTWARE`):

```bash
pnpm --dir 04_SOFTWARE run build
pnpm --dir 04_SOFTWARE run test
```

Individual apps (BONDING, p31ca, hearing-ops, etc.) live under **`04_SOFTWARE/`** — see [`04_SOFTWARE/README.md`](04_SOFTWARE/README.md).

## Repository structure

- **`04_SOFTWARE/`** — Primary applications, Cloudflare Workers, shared packages, VS Code extensions.
- **`05_FIRMWARE/`** — ESP32 / embedded documentation and prompts.
- **`02_RESEARCH/`**, **`zenodo_batch/`** — Papers and publication tooling.
- **`docs/`** — Engineering layout, worker manifest, tutorials.
- **`Legal_Instruments/`**, **`Discovery_Production_*`** (gitignored) — legal drafts and production; not reviewed here.

Extended product narrative: [`docs/ECOSYSTEM_OVERVIEW.md`](docs/ECOSYSTEM_OVERVIEW.md).

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** (CI, secrets, Pages deploy safety).

## License

[MIT](LICENSE)
