# P31 Andromeda

**Phosphorus31 / P31 Labs** — open-source assistive-technology and research software. Georgia nonprofit (**P31 Labs, Inc.**). 501(c)(3) pending.

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18627420.svg)](https://doi.org/10.5281/zenodo.18627420)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.19411363.svg)](https://doi.org/10.5281/zenodo.19411363)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Open-source assistive technology for neurodivergent individuals and families. Georgia nonprofit corporation — incorporated April 3, 2026. 501(c)(3) pending.

**650+ automated tests** across packages (**BONDING:** **413 tests / 30 suites** — OQE). **19** Wrangler-defined **Workers + Pages** units in-repo ([`docs/WORKER_PAGES_MANIFEST.md`](docs/WORKER_PAGES_MANIFEST.md)). **12** deployed products (public-facing). **2** Zenodo DOIs. One operator.

| Product | URL | Status |
|---------|-----|--------|
| BONDING | bonding.p31ca.org | LIVE |
| EDE | p31ca.org/ede | LIVE |
| Larmor | phosphorus31.org | LIVE |
| Spaceship Earth | spaceship-earth.pages.dev | LIVE |
| phosphorus31.org | phosphorus31.org | LIVE |

## Architecture

### Core Products

- **BONDING**: Multiplayer molecular chemistry game — 413 tests, parental engagement logger, R3F + Zustand + Vitest
- **EDE**: Zero-dependency IDE — cognitive prosthetic for executive dysfunction
- **Larmor**: 863 Hz somatic regulation — calcium resonance frequency
- **Node Zero**: Open-source haptic feedback device with configurable tactile patterns
- **Spaceship Earth**: Sovereign mesh dashboard — ImmersiveCockpit, 185 tests

### Ecosystem Infrastructure

- **Ko-fi Integration**: Automated community monetization and Discord role management
- **Academic Pipeline**: GitHub → Zenodo → ORCID automated publication workflow
- **IPFS Data Sovereignty**: Decentralized content storage and censorship-resistant archives
- **Gamification Engine**: Achievement system, Larmor frequency locks, and dual-ledger economy

## 🚀 Quick Start
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

Then follow **[CONTRIBUTING.md](CONTRIBUTING.md)** for `04_SOFTWARE/` install, manifests, and CI.

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testNamePattern="BONDING"

# Run with coverage
npm run test:coverage
```

## Ecosystem Metrics

### Node Count
**Current: tracking toward 39 (Posner threshold)**

A node is a unique individual who has engaged with P31 Labs — Discord join, Ko-fi support, BONDING session, egg claim, or Zenodo download. 39 nodes = Posner molecule (Ca₉(PO₄)₆) — the calcium cage.

### Current Numbers (April 2026)
- **Automated Tests**: 650+ aggregate (BONDING alone: **413 / 30 suites**; other suites vary by package)
- **Cloudflare**: **16** Worker-style + **3** Pages-style `wrangler.toml` configs in-tree (**19** total) — see [`docs/WORKER_PAGES_MANIFEST.md`](docs/WORKER_PAGES_MANIFEST.md) (regenerate: `pnpm run manifest:workers` from `04_SOFTWARE/`)
- **Zenodo DOIs**: 2 published (280+ views, 240+ downloads combined)
- **Products deployed**: 12
- **Revenue streams**: Stripe (donate.phosphorus31.org) + Ko-fi (ko-fi.com/trimtab69420)
- **EIN**: 42-1888158 | **ORCID**: 0009-0002-2492-9079

## 🎮 BONDING Game

The BONDING game transforms molecular chemistry into an engaging puzzle experience:

### Features
- **Real-time Molecular Simulation**: Accurate VSEPR theory implementation
- **Quantum Puzzles**: Posner molecule assembly challenges
- **Larmor Frequency Locks**: ~863 Hz (³¹P Earth-field Larmor) temporal anchor in product copy
- **NMR Spectroscopy Jigsaws**: Academic paper decryption mechanics

### Getting Started
```bash
# Start the BONDING game
npm run bonding

# Access at http://localhost:3000/bonding
```

## 🔗 Cross-Platform Integration

### Ko-fi Integration
Automated workflow connecting community support to technical development:

1. **Payment Processing**: Ko-fi webhooks trigger GitHub Actions
2. **User Status Updates**: Automatic Discord role assignment
3. **Community Metrics**: Real-time Node count and contribution tracking

### Academic Pipeline
Seamless publication workflow:

1. **Code Release**: Semantic version tags trigger automation
2. **Zenodo Publication**: Automatic DOI minting and metadata generation
3. **ORCID Integration**: Automatic publication credit to contributors

### IPFS Deployment
Decentralized content sovereignty:

1. **Release Archiving**: Content-addressable archives via ipfs-car
2. **Multi-Provider Pinning**: Redundant storage across Pinata and Storacha
3. **Gateway Access**: Multiple IPFS gateway endpoints for accessibility

## 🎯 Gamification System

### Dual-Ledger Economy

#### Karma System
- **Peer-Reviewed Reputation**: Community awards for positive contributions
- **Formal Work Packages**: Submit projects for peer review and karma rewards
- **Tier Progression**: Supporter → Node → Guild Leader → Core Team

#### Spoons Ledger
- **Cognitive Capacity Tracking**: Prevent burnout through capacity awareness
- **Accessibility First**: Neurodivergent-friendly interaction limits
- **Automatic Regeneration**: Hourly spoon recovery to maintain engagement

### Achievement System
- **Secret Unlocks**: Hidden molecular recipes trigger notifications
- **Leaderboards**: Karma, contributions, and complex molecule creation
- **Cosmetic Rewards**: Unique elemental skins and visual enhancements

### Quantum Puzzles

#### The Tetrahedron Protocol
Assemble the Posner molecule ($Ca_9(PO_4)_6$) to unlock quantum computing secrets:
- Requires precise $S_6$ symmetry alignment
- 0.5 nanometer nearest-neighbor phosphorus spacing
- Academic paper study required for successful assembly

#### Larmor Frequency Temporal Locks
Synchronize inputs to the 863 Hz Larmor precession frequency (³¹P in Earth's magnetic field):
- Forces regulated, rhythmic interaction patterns
- Mirrors Phenix Navigator's somatic grounding capabilities
- Yields massive L.O.V.E. point multipliers

## 🏛️ Delta Hiring System

Merit-based community onboarding through skill demonstration:

### Phases
1. **Discovery**: Browse and accept challenges
2. **Validation**: Automated testing and peer review
3. **Integration**: Community introduction and ongoing development

### Challenge Types
- **Technical**: WCD-DEV (Build component), WCD-TEST (Write tests)
- **Design**: WCD-DES (UI mockup), WCD-UX (User flow)
- **Academic**: Research paper contributions and peer review

### Token Economy
- **L.O.V.E. Points**: Earn through challenge completion
- **Node Equity**: 0.1% to 1.0% ownership based on contribution level
- **Guild Leadership**: Path to Core Team membership

## 📚 Academic Integration

### Publications
All significant contributions are automatically published to Zenodo with proper academic metadata:

- **DOI Assignment**: Permanent digital object identifiers
- **ORCID Integration**: Automatic researcher profile updates
- **Citation Standards**: Proper academic formatting and attribution

### Research Areas
- **Quantum Biology**: Phosphorus-31 nuclear spin applications
- **Neurodiversity**: Inclusive design principles and accessibility
- **Decentralized Science**: Community-driven research methodologies

## 🔒 Security & Privacy

### Data Sovereignty
- **IPFS Storage**: Decentralized, censorship-resistant content
- **Zero-Knowledge Proofs**: Privacy-preserving analytics
- **GDPR Compliance**: Strict adherence to privacy regulations

### Security Measures
- **Quantum-Resistant Cryptography**: Future-proof security protocols
- **Multi-Signature Governance**: Decentralized decision making
- **Audit Trails**: Complete transparency in all transactions

## 🤝 Contributing

### Development Workflow
1. **Fork the Repository**: Create your own copy
2. **Create Feature Branch**: `git checkout -b feature/your-feature`
3. **Commit Changes**: `git commit -m 'Add your feature'`
4. **Push to Branch**: `git push origin feature/your-feature`
5. **Create Pull Request**: Submit for review

### Code Standards
- **Testing**: All features require comprehensive test coverage
- **Documentation**: Clear, accessible documentation for all contributions
- **Accessibility**: WCAG 2.1 AA compliance required

### Community Guidelines
- **Respect**: Inclusive, welcoming environment for all contributors
- **Collaboration**: Peer review and knowledge sharing encouraged
- **Transparency**: Open communication and decision making

## 📈 Monitoring & Analytics

### Ecosystem Dashboard
Real-time monitoring of all ecosystem components:
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
