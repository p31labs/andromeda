# P31 Labs — Traction Package v3
## Current as of April 5, 2026 | CWP-2026-012 The Grant Cascade

---

## Organization

| Field | Value |
|-------|-------|
| Name | P31 Labs, Inc. |
| Type | Georgia nonprofit corporation (501(c)(3) pending) |
| Incorporated | April 3, 2026 — Georgia Secretary of State |
| EIN | 42-1888158 |
| Mission | Open-source assistive technology for neurodivergent individuals and families |
| Founder / President | William R. Johnson (ORCID: 0009-0002-2492-9079) |
| ORCID | 0009-0002-2492-9079 |
| Location | Saint Marys, GA 31558 (Camden County) |
| Revenue (live) | Stripe Checkout (donate.phosphorus31.org) + Ko-fi (ko-fi.com/trimtab69420) |

---

## Board of Directors

| Name | Role | Relationship |
|------|------|-------------|
| William R. Johnson | President / Founder | Interested party |
| Joseph Tyler Cisco | Independent Director | Unrelated |
| Brenda O'Dell | Director | Unrelated |

*4th seat targeted: Hunter McFeron (GA Tools for Life) — pending board inquiry*

---

## Products Deployed

| Product | Status | URL | Description |
|---------|--------|-----|-------------|
| BONDING | LIVE | bonding.p31ca.org | Multiplayer chemistry game — parental engagement logger, court-admissible |
| EDE | LIVE | p31ca.org/ede | Zero-dependency IDE / cognitive prosthetic |
| Larmor | LIVE | phosphorus31.org (integrated) | 863 Hz somatic regulation — calcium resonance |
| TACTILE | LIVE | — | Keyboard builder for haptic input customization |
| Spaceship Earth | LIVE (rebuilt) | spaceship-earth.pages.dev | Sovereign mesh dashboard, ImmersiveCockpit |
| phosphorus31.org | LIVE | phosphorus31.org | Org homepage, transparency, donate, products, research |
| Buffer | LIVE (92% complete) | — | Fawn Guard, progressive disclosure, Spoon economy |
| Genesis Gate | LIVE (rebuilt) | — | Control plane, telemetry, intercept, governance |
| Kenosis Mesh | LIVE | kenosis-mesh.trimtab-signal.workers.dev | 7-node K₄ topology |
| Node Zero frontend | DEPLOYED | — | Cockpit, parent dashboard, serial comms |
| Ko-fi page | LIVE | ko-fi.com/trimtab69420 | Phase 2 active ($863 Larmor target) |
| Discord Bot | LIVE | — | Spoon ledger, egg hunt, community commands |

**12 products deployed. All open-source. All edge-deployed.**

---

## Software Metrics

| Metric | Value |
|--------|-------|
| BONDING tests passing | **413** (30 suites) — verified 2026-03-30 |
| Spaceship Earth tests | 185 (13 suites) |
| Genesis Gate tests | 4 (all green, ESM) |
| Discord bot tests | 43 (4 suites) |
| Frontend tests | 25 (2 suites) |
| **Total automated tests** | **670+** |
| Cloudflare Workers deployed | **22** |
| GitHub Actions workflows | 10 |
| Lines of open-source code | ~50,000+ |
| TypeScript strict mode | Yes (verbatimModuleSyntax, erasableSyntaxOnly) |
| CI/CD | GitHub Actions — code-quality, coverage, build-release |

---

## Research Output

| Output | Detail |
|--------|--------|
| Zenodo DOI #1 | 10.5281/zenodo.18627420 (Tetrahedron Protocol) |
| Zenodo DOI #2 | 10.5281/zenodo.19411363 (Genesis Whitepaper v1.1) |
| Zenodo DOI #3 | 10.5281/zenodo.19416491 (Consciousness, Memory & Architecture) |
| Zenodo views | 280+ combined |
| Zenodo downloads | 240+ combined |
| White papers (finalized) | 5 — March 17, 2026 |
| Defensive publication | Internet Archive — February 25, 2026 |
| Tetrahedron Protocol | CC BY 4.0, v2 — open prior art |
| SIC-POVM systems | Deployed April 2026 — 34 measurement vectors |

---

## Infrastructure

| Component | Detail |
|-----------|--------|
| Edge deployment | Cloudflare Workers (22 deployed) |
| Relay | bonding-relay.trimtab-signal.workers.dev (live Feb 27, 2026) |
| Revenue processing | Stripe Checkout (acct_1T6z3U4Kt3K4WuBD) — live |
| Donations | Ko-fi (ko-fi.com/trimtab69420) — live |
| Uptime monitoring | Active |
| Domain infrastructure | phosphorus31.org, p31ca.org, bonding.p31ca.org |
| CI/CD | GitHub Actions — automated on every PR |
| Mesh resilience | Kenosis design — survives without operator |

---

## Community

| Metric | Value |
|--------|-------|
| Discord server | Active (founded March 2026) |
| Quantum Egg Hunt | Active — 4 eggs → founding Node Zero hardware |
| Founding Nodes program | Tracked — slot claims and shipping manifest |
| Reddit presence | r/Superstonk DD post live |
| Ko-fi | ko-fi.com/trimtab69420 — Phase 2 active |
| Current node count | Tracking toward 39 (Posner threshold) |

---

## Technical Stack

- **Game / 3D:** React 19 + Three.js r183 (R3F 9) + Zustand v5 + Tailwind v4 + Vitest 4
- **Edge:** Cloudflare Workers + KV + Pages
- **Hardware:** ESP32-S3-Touch-LCD-3.5B + DRV2605L haptic + SX1262 LoRa + NXP SE050 secure element
- **Firmware:** ESP-IDF v5.5.3 + Xiaozhi v2.2.3, 16MB flash
- **Security:** NXP SE050 (FIPS 140-2 Level 3) — ML-KEM-768 roadmap
- **AI:** Claude claude-sonnet-4-6 (agent engine), ORCID-linked researcher
- **License:** MIT (open source)

---

## Medical Device Classification

- **Node Zero:** FDA Class II exempt (21 CFR §890.3710 — biofeedback device)
- **Regulatory path:** Class II exempt → 510(k) optional
- **Condition addressed:** Hypoparathyroidism (ICD-10 E20.9) + AuDHD
- **Primary user:** William R. Johnson (founder, diagnosed)
- **Family users:** 2 children (AuDHD, documented)

---

## Founder Profile

| Field | Detail |
|-------|--------|
| Diagnosis | AuDHD (autism + ADHD), hypoparathyroidism (ICD-10 E20.9) |
| SNAP / Medicaid | Active — documented financial need |
| ORCID | 0009-0002-2492-9079 |
| Role | Sole developer, architect, researcher, operator |
| Housing | Contested legal proceeding — active (not determined) |

---

## Grant Pipeline (current)

| Grant | Amount | Deadline | Status |
|-------|--------|----------|--------|
| ESG Housing Grant | TBD | May 8, 2026 (portal opens Apr 13) | Preparing |
| NIDILRR / Switzer Fellowship | $80K | Rolling | Contact initiated |
| NIDILRR FIP Development | ~$250K/yr × 3 | Rolling | Contact initiated |
| NDEP | $19K | April 15, 2026 | Eligibility check |
| Microsoft AI for Accessibility | $75K | Rolling | Drafting |
| GA Tools for Life (Hunter McFeron) | TBD | Rolling | Contact initiated |
| Pollination Project | $500 | Submitted Mar 10 | Checking status |
| Awesome Foundation | $1K | Submitted Mar 10 | ~Apr 15 response |
| Makers Making Change | TBD | Rolling | Submitting |

**Total pipeline: $550K+**

---

## Why This Matters

P31 Labs builds the tools neurodivergent families need — free, forever, open-source.

**BONDING** is a multiplayer chemistry game that doubles as a court-admissible parental engagement logger — every atom bonded, every ping sent, timestamped evidence of a father staying present across distance and legal barriers.

**EDE** is a zero-dependency IDE that eliminates cognitive overhead for developers with executive dysfunction — no install, no config, no friction.

**Larmor** targets 863 Hz, the Larmor precession frequency for calcium ions at physiological field strength — a somatic grounding signal for hypoparathyroidism and calcium dysregulation.

**Node Zero** is an open-source haptic feedback device (FDA Class II exempt) designed for the body, not the screen.

The entire stack: 670+ automated tests. 22 edge workers. 3 Zenodo DOIs. Incorporated nonprofit. 12 live products. One operator who built all of it while fighting to stay housed.

---

*Updated: April 5, 2026 | CWP-2026-012 The Grant Cascade | F06*
