# Microsoft AI for Accessibility Grant — Application Draft

**CWP-012 F05**
**Program:** Microsoft AI for Accessibility
**Grant Range:** Up to $75,000
**Website:** microsoft.com/en-us/ai/ai-for-accessibility
**Organization:** P31 Labs, Inc.
**EIN:** 42-1888158
**Status:** Draft — ready for portal submission

---

## 1. ORGANIZATION OVERVIEW

**Name:** P31 Labs, Inc.
**Type:** Georgia nonprofit corporation (Articles filed April 3, 2026; SoS acceptance pending; 501(c)(3) pending, IRS determination expected June–July 2026)
**Mission:** Open-source assistive technology for neurodivergent individuals and families
**Website:** phosphorus31.org
**GitHub:** github.com/p31labs/andromeda
**EIN:** Pending — SS-4 to be filed upon SoS acceptance (~April 14)
**ORCID:** 0009-0002-2492-9079
**Contact:** William R. Johnson, Founder & President | will@p31ca.org | (912) 227-4980

---

## 2. PROJECT TITLE

**BONDING + Fawn Guard: AI-Augmented Cognitive Scaffolding for Neurodivergent Families**

---

## 3. PROBLEM STATEMENT

Neurodivergent individuals — particularly those with AuDHD (Autism + ADHD), executive dysfunction, and chronic illness — face compounding barriers to independence:

- **Executive function deficits** make task initiation, switching, and completion profoundly difficult
- **Fawn response patterns** (involuntary people-pleasing) cause neurodivergent individuals to mask distress, delay help-seeking, and accept harmful situations without protest
- **Communication barriers** prevent accurate self-advocacy in legal, medical, and housing contexts
- **Isolation** — neurodivergent parents in contested custody situations are particularly vulnerable; their disability is frequently used against them without data to refute it

Existing AI assistive tools are expensive, closed-source, and designed for neurotypical interaction patterns. There is no open-source, freely deployable AI scaffold specifically designed for AuDHD + chronic illness populations.

---

## 4. PROPOSED SOLUTION

P31 Labs is building a three-layer AI accessibility stack, all open-source, edge-deployed, and free:

### Layer 1: Fawn Guard (Deployed)
Pattern-recognition system that detects fawn response indicators in user interaction logs. When a user is systematically complying with requests that conflict with their stated preferences, Fawn Guard flags the session and offers a "recalibration" prompt. Built into Spaceship Earth dashboard.

### Layer 2: BONDING AI Companion (Phase 2 — this grant)
BONDING is a deployed multiplayer chemistry game (bonding.p31ca.org, 413 automated tests) that serves dual purposes:
- **For children:** Molecular puzzle gameplay teaching VSEPR chemistry
- **For parents in custody disputes:** Every session is a timestamped engagement record (Exhibit A Logger)

The AI Companion extension (proposed) would:
- Generate natural-language summaries of each play session ("Dad and Maya built 3 molecules together for 23 minutes — calcium phosphate, water, ammonia")
- Detect engagement quality patterns (distracted vs. focused play)
- Produce court-admissible PDF reports from session logs
- Surface suggested conversation starters based on molecular discoveries

**Technology stack:** Cloudflare AI Workers (edge inference, no PII leaves device), React 19, Zustand v5, Vitest 4

### Layer 3: Spoon Economy + Cognitive Load API (Phase 3)
Chronic illness resource management system (spoon theory implementation) with AI-driven daily capacity prediction based on sleep, medication, and interaction history. API-accessible for integration with other assistive tools.

---

## 5. TARGET POPULATION

**Primary:** Neurodivergent adults (AuDHD, autism, ADHD) in contested custody situations
- Estimated US population: 4.2M+ adults with ASD; ~17M with ADHD
- Subset in custody litigation: no reliable count, but NCJFCJ estimates 40% of custody cases involve a parent with disability

**Secondary:** Children of neurodivergent parents (ages 6–16) using BONDING game
- Neurotypical children benefit from the tool; neurodivergent children especially benefit from the predictable, low-sensory, gamified interaction model

**Founder's lived experience:** William R. Johnson has AuDHD + Hypoparathyroidism (ICD-10 E20.9). The BONDING game was built specifically to document his engagement with his two neurodivergent children during a contested custody case. Every feature reflects direct lived-experience design.

---

## 6. AI COMPONENT DETAILS

### Current AI Use
- **Fawn Guard:** Rule-based behavioral pattern detection (no ML inference — intentional, for transparency and FDA CDS compliance)
- **SIC-POVM Routing:** 34-vector quantum measurement system for cognitive state classification

### Proposed AI Use (this grant)
- **Cloudflare AI Workers:** On-device/edge inference using `@cf/meta/llama-3.1-8b-instruct` for session summarization
- **No PII transmitted:** All inference runs at edge; session data stays on device or in user-controlled KV store
- **Transparency-first:** Every AI output includes confidence score and human-override affordance
- **FDA CDS compliance:** AI supports, but does not direct, user decisions. All recommendations are non-binding.

### Why This Approach
Neurodivergent users have historically been harmed by opaque AI systems that "optimize" their behavior without consent. P31's AI layer is:
1. **Transparent:** Every inference result is explained in plain language
2. **Reversible:** Users can disable AI features without losing core functionality
3. **Open-source:** All model prompts and routing logic are public
4. **Local-first:** No cloud dependency for core function

---

## 7. DEPLOYMENT & REACH

### Current Traction (as of April 2026)
| Metric | Value |
|--------|-------|
| Automated tests | 670+ (30 suites) |
| Deployed products | 12 |
| Cloudflare Workers | 22 |
| Zenodo DOIs | 3 (280+ views, 240+ downloads) |
| Revenue streams | Stripe + Ko-fi active |

### Deployment Model
- **BONDING:** bonding.p31ca.org (Cloudflare Pages, global CDN, free)
- **Spaceship Earth:** spaceship-earth.pages.dev
- **phosphorus31.org:** Astro 5 static site

All products run on Cloudflare's free/Workers tier. Cost to user: $0. No account required for core function.

---

## 8. BUDGET REQUEST: $75,000

| Line Item | Amount | Justification |
|-----------|--------|---------------|
| AI Companion development (BONDING) | $30,000 | 3 months × $10K/month founder salary equivalent |
| Cloudflare AI Workers compute credits | $5,000 | Edge inference at scale (KV, D1, AI Workers) |
| Session summarization + PDF generation | $10,000 | Court-admissible report templating, LaTeX rendering |
| Spoon Economy API development | $15,000 | Cognitive load prediction, API design, documentation |
| Security audit | $8,000 | OWASP review of AI inference pipeline before public launch |
| Community accessibility testing | $5,000 | Paid usability sessions with 20 neurodivergent adults |
| Legal / compliance review | $2,000 | FDA CDS classification confirmation for AI layer |
| **TOTAL** | **$75,000** | |

---

## 9. OUTCOMES & METRICS (12 months)

| Outcome | Target | Measurement |
|---------|--------|-------------|
| AI Companion shipped | v1.0 | GitHub release tag |
| Session summaries generated | 500+ | Telemetry count |
| PDF reports produced | 50+ | Usage analytics |
| Neurodivergent users served | 200+ | Discord + BONDING analytics |
| Tests added for AI layer | 100+ | CI pipeline |
| Open-source forks/contributions | 10+ | GitHub metrics |

---

## 10. TEAM

**William R. Johnson** — Founder & President, P31 Labs, Inc.
- 16-year DoD civilian engineer (GS-12 equivalent)
- AuDHD + Hypoparathyroidism (lived experience designer)
- Solo technical founder: TypeScript, React, Three.js, Cloudflare Workers, ESP-IDF
- ORCID: 0009-0002-2492-9079

**Board of Directors:**
- Joseph Tyler Cisco (Independent Director)
- Brenda O'Dell (Director)

**AI / Technical Advisors:** (in development — CWP-013 community track)

---

## 11. ALIGNMENT WITH MICROSOFT AI FOR ACCESSIBILITY PRIORITIES

| Microsoft Priority | P31 Alignment |
|-------------------|---------------|
| Employment | Spoon Economy API enables capacity-aware work scheduling for disabled workers |
| Communication | BONDING Companion generates natural-language summaries for non-verbal periods |
| Independent living | Fawn Guard + Spaceship Earth dashboard for daily executive function support |
| Mental health | Larmor (863 Hz somatic regulation), breathing atoms (4-4-6 pattern), Buffer app |
| Blindness/low vision | WCAG 2.1 AA compliance across all products; high-contrast skin themes |

---

## 12. SUSTAINABILITY

Grant funds cover 12-month development sprint. Post-grant sustainability:
- **Dual licensing:** Enterprise licenses for clinics/schools at $20/month per user (AGPL-3.0 + commercial)
- **Ko-fi community:** Active, growing (bonding.p31ca.org users converting)
- **Hardware revenue:** Node One devices at cost + 20% margin
- **NIDILRR FIP:** Field-initiated project application in development (~$250K/yr × 3 potential)
- **Open-source:** Community contributions reduce marginal development cost to near zero

---

## 13. ATTACHMENTS (TO PREPARE BEFORE SUBMISSION)

- [ ] IRS determination letter (pending — include incorporation docs + EIN in interim)
- [ ] Georgia Articles of Incorporation (filed April 3, 2026)
- [ ] Founder resume / CV (William R. Johnson)
- [ ] BONDING product screenshots + video demo
- [ ] Zenodo DOI printouts (three publications: 10.5281/zenodo.18627420, 10.5281/zenodo.19411363, 10.5281/zenodo.19416491)
- [ ] GitHub repository links with star/fork counts

---

**Prepared:** April 5, 2026 | CWP-012 F05
**Status:** Draft — operator review required before submission
**Portal:** microsoft.com/en-us/ai/ai-for-accessibility (applications accepted on rolling basis)
