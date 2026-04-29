# P31 LABS — MASTER OPERATIONS MANUAL
## Controlled Work Packages, Work Control Documents, and Ecosystem Troubleshooting
### Version 1.0 | March 21, 2026
### Operator: William R. Johnson | Kilo Code (CC/Sonnet) as Primary VS Code Executor

---

## TABLE OF CONTENTS

1. CWP Registry & Status Board
2. CWP-WYE-001: Legal Defense & Court Operations
3. CWP-DELTA-001: Outreach, Revenue & Community Building
4. CWP-FUND-001: Incorporation, Grants & Federal Pipeline
5. CWP-SHELTER-001: Housing Stability & Eviction Response
6. CWP-NODE-001: Node One Hardware Sprint
7. CWP-PHOSPHORUS-001: phosphorus31.org Content Expansion
8. CWP-IP-001: Defensive Publications & Prior Art
9. CWP-SE-002: Spaceship Earth Phase 2 (ORACLE)
10. CWP-BUFFER-001: The Buffer to 100%
11. CWP-BONDING-002: BONDING Maintenance & Post-Ship
12. Ecosystem Troubleshooting Tree

---

## 1. CWP REGISTRY & STATUS BOARD

```
CWP-BONDING-001   ✅ COMPLETE   Shipped March 10, 2026. All WCDs closed.
CWP-WYE-001       🔴 ACTIVE     Legal defense. Gates W3 (Mar 24), W4 (Mar 26).
CWP-DELTA-001     🟡 ACTIVE     Ko-fi, SuperStonk, festival, content calendar.
CWP-FUND-001      🟡 BLOCKED    $425 incorporation → SAM.gov → federal grants.
CWP-SHELTER-001   🔴 NEW        Eviction Apr 4. ESG Apr 13. Housing stability.
CWP-NODE-001      🟡 QUEUED     ESP32-S3 firmware. Xiaozhi v2. Haptic. LoRa.
CWP-PHOSPHORUS-001 🟡 QUEUED    HypoPT page, quantum security page, SOP repo.
CWP-IP-001        🟡 QUEUED     5 defensive publications + 3 white papers to Zenodo.
CWP-SE-002        ⚪ PARKED     ORACLE directive. ZUI. Dual-currency economy.
CWP-BUFFER-001    ⚪ PARKED     Fawn Guard, chaos ingestion, ~85% → 100%.
CWP-BONDING-002   ⚪ PARKED     Post-ship maintenance, parking lot items.
```

### Sequencing Dependencies
```
CWP-WYE-001 ──→ W3 (Mar 24) ──→ W4 (Mar 26) ──→ Psych Eval (TBD)
CWP-SHELTER-001 ──→ S1 (Apr 4) ──→ S2 (ESG Apr 13)
CWP-DELTA-001 ──→ D2 (Ko-fi loaded) ──→ D3 (SuperStonk) ──→ D4 (festival)
CWP-FUND-001 ──→ F1 ($425) ──→ F2 (SAM.gov) ──→ F3 (Switzer/FIP/DARE)
CWP-IP-001 ──→ IP1 (Larmor pub) ──→ IP2-IP5 (remaining 4) ──→ IP6-IP8 (white papers)
CWP-PHOSPHORUS-001 ──→ P1 (HypoPT page) ──→ P2 (Quantum page) ──→ P3 (SOP repo)
CWP-NODE-001 ──→ N1 (display) ──→ N2 (haptic) ──→ N3 (LoRa) ──→ N4 (identity)
CWP-SE-002 ──→ SE1 (ZUI) ──→ SE2 (economy) ──→ SE3 (BLE nudging)
CWP-BUFFER-001 ──→ BF1 (Fawn Guard) ──→ BF2 (Chaos Ingestion) ──→ BF3 (integration)
CWP-BONDING-002 ──→ BM1 (sound static) ──→ BM2 (z-100 modals) ──→ BM3 (CSS import)
```

### Priority Matrix (Eisenhower)
```
URGENT + IMPORTANT:     CWP-WYE-001, CWP-SHELTER-001
IMPORTANT + NOT URGENT: CWP-DELTA-001, CWP-FUND-001, CWP-IP-001
URGENT + NOT IMPORTANT: (none — all urgent items are important)
NOT URGENT + NOT IMPORTANT: CWP-BONDING-002 parking lot items
```

---

## 2. CWP-WYE-001: LEGAL DEFENSE & COURT OPERATIONS

**Status:** 🔴 ACTIVE
**Owner:** Operator (pro se) + Opus (QA/strategy)
**Objective:** Navigate Johnson v. Johnson (2025CV936) through discovery, psych eval, and custody restoration.
**Gate Structure:** W1 ✅ → W2 ✅ → W3 🔴 → W4 🔴 → W5 (psych eval) → W6 (custody modification)

### WCD-WYE-01: Psychiatrist Appointment Preparation
```
STATUS:        ✅ COMPLETE (artifacts generated, pending physical execution)
ASSIGNED TO:   Operator (physical), Opus (verification)
GATE:          W3 — March 24, 2026
DELIVERABLES:
  [x] Concise prep packet (Psychiatrist_Prep_March24.docx)
  [x] Comprehensive prep packet (psych-prep-packet-march24.docx)
  [x] Differential diagnosis table (AuDHD vs. Bipolar Mania, 12 features)
  [x] Medical timeline (2003–present)
  [x] Masking paradox documentation
  [x] Suggested letter language for psychiatrist
PHYSICAL EXECUTION (Operator):
  [ ] Print both packets
  [ ] Pull January 2026 lab results (Ca 7.8 mg/dL, PTH <6 pg/mL)
  [ ] Print JCEM 2025 citation (Tmava-Berisha et al., PMC12261092)
  [ ] Bring all to appointment Monday morning
ACCEPTANCE CRITERIA:
  - Psychiatrist produces letter distinguishing AuDHD from bipolar mania
  - Letter references hypoparathyroidism as neurological comorbidity
  - Neuropsychologist recommendation for court-ordered eval
  - Letter suitable for court submission
```

### WCD-WYE-02: Discovery Response Assembly & Filing
```
STATUS:        🟡 IN PROGRESS (documents drafted, physical assembly pending)
ASSIGNED TO:   Operator (assembly/filing), Kilo Code (verification)
GATE:          W4 — March 26, 2026
DELIVERABLES:
  [x] Johnson_Discovery_Response.docx — 15 requests, all responses + objections
  [x] Johnson_Production_Cover_Sheet.docx — Exhibits WRJ-001 through WRJ-009
  [x] Financial_Summary_Exhibit.docx — Monthly balances Oct 2025–Mar 2026
  [x] Johnson_Financial_Summary.xlsx — 4-sheet workbook
  [ ] NFCU bank statements Aug 2025–Mar 2026 as PDFs (WRJ-001 through WRJ-008)
KILO CODE TASKS:
  [ ] Verify discovery response references correct request number
      (check: "First" vs "Second" Request for Production — cross-reference
       McGhan's Good Faith letter dated March 18)
  [ ] Verify all 15 response numbers align with request numbers
  [ ] Verify case caption formatting matches Camden County requirements
  [ ] Verify financial exhibit totals match spreadsheet calculations
PHYSICAL EXECUTION (Operator):
  [ ] Download NFCU statements from online banking (8 statements)
  [ ] Print discovery response (sign + date verification page)
  [ ] Print production cover sheet
  [ ] Print financial summary exhibit
  [ ] Assemble binder: cover sheet → discovery response → exhibits (WRJ-001–009)
  [ ] File with Camden County Superior Court Clerk
  [ ] Serve on McGhan via email (use Gemini service template)
  [ ] Retain proof of service (email confirmation + file-stamp copy)
ACCEPTANCE CRITERIA:
  - Filed on or before March 26, 2026
  - Service email sent to McGhan with all attachments
  - Receipt confirmed
  - Copy retained for personal records
OBJECTION MATRIX:
  Req 1  (DoD records)        → Redirect to NPRC (SF-180)
  Req 2  (Bank statements)    → Produce sole accounts; joint = Plaintiff has access
  Req 3  (TSP records)        → Produce (supports fraud argument)
  Req 4  (Tax returns)        → Produce 2023-2024; 2025 not yet filed
  Req 5  (Income sources)     → Produce (demonstrates $0 income)
  Req 6  (P31 Labs)           → OBJECT: overbroad, work product, separate property, $0 revenue
  Req 7  (Medical records)    → Partial: diagnostic confirmations only, psychotherapy notes protected
  Req 8  (Prescriptions)      → OBJECT: overbroad. List current meds only.
  Req 9  (FERS records)       → Produce SF-3112A + deadline
  Req 10 (SSA records)        → OBJECT: Privacy Act + 42 USC 1306
  Req 11 (Public benefits)    → Produce: confirm SNAP/Medicaid enrollment
  Req 12 (AI chat logs)       → OBJECT: overbroad, work product, trade secrets
  Req 13 (Software/websites)  → OBJECT: post-separation IP. Provide public URLs only.
  Req 14 (Cryptocurrency)     → Flat denial. None exists.
  Req 15 (Financial Affidavit)→ Produce: $5.00 total assets.
```

### WCD-WYE-03: Court Reporter Transcript Acquisition
```
STATUS:        ⚪ QUEUED (pending funds — $75)
ASSIGNED TO:   Operator
GATE:          Post-W4 (after discovery filed)
DELIVERABLES:
  [ ] Request transcript from March 18, 2026 hearing
  [ ] Request transcript from February 5, 2026 hearing (if not already obtained)
NOTES:
  - Same court reporter present at both hearings
  - March 18 transcript documents: "manic" label, psych eval order, paramedic request/denial
  - February 5 transcript documents: metabolic crisis, attorney withdrawal, visitation suspension
  - Both transcripts are critical evidence for ADA Title II pattern
ACCEPTANCE CRITERIA:
  - Certified transcripts received
  - Paramedic request denial confirmed on record
  - "Manic" characterization confirmed verbatim
```

### WCD-WYE-04: Court-Ordered Psychological Evaluation
```
STATUS:        ⚪ QUEUED (dependent on WCD-WYE-01 outcome)
ASSIGNED TO:   Operator + psychiatrist guidance
GATE:          W5 — TBD (after March 24 appointment)
DELIVERABLES:
  [ ] Identify neuropsychologist with late-diagnosed adult autism expertise
  [ ] Schedule evaluation
  [ ] Prepare evaluation context packet (CogPass v2.6 + work samples)
  [ ] Complete evaluation
  [ ] Receive report
CRITICAL NOTES:
  - Evaluator selection is the highest-leverage decision in the case
  - Neuropsychologist > general psychologist > forensic evaluator (preference order)
  - Evaluation at Defendant's expense per March 18 order
  - Result determines whether "manic" label is confirmed or overturned
  - If AuDHD confirmed: entire court narrative flips to vindication
  - If bipolar confirmed: everything becomes harder
ACCEPTANCE CRITERIA:
  - Evaluation report distinguishes AuDHD hyperfocus from bipolar mania
  - Report notes hypoparathyroidism as confounding neurological condition
  - Report suitable for court submission
```

### WCD-WYE-05: ADA Title II Complaint Package
```
STATUS:        ⚪ QUEUED (accumulating events)
ASSIGNED TO:   Opus (strategy), Operator (filing)
GATE:          W6 — after psych eval results
DELIVERABLES:
  [ ] Consolidated ADA complaint documenting 5 events
  [ ] Hearing transcripts as exhibits (WCD-WYE-03)
  [ ] Medical documentation from psychiatrist (WCD-WYE-01)
  [ ] Psych eval results (WCD-WYE-04)
  [ ] File with DOJ or pursue through GAO
EVENT CHAIN:
  Event 1: ADA request → sanctions threat
  Event 2: Metabolic crisis → attorney withdrew → proceeded → visitation suspended
  Event 3: [per v2.3]
  Event 4: [per v2.3]
  Event 5: Paramedic requested → ignored → labeled "manic" → psych eval ordered
ACCEPTANCE CRITERIA:
  - Pattern of deliberate indifference documented with exhibits
  - Filed with appropriate federal entity
```

### WCD-WYE-06: Follow-Up Communications
```
STATUS:        🟡 READY TO SEND
ASSIGNED TO:   Operator
GATE:          March 25, 2026
DELIVERABLES:
  [ ] GAO follow-up email (Gemini template — reference March 10 submission + March 18 event)
  [ ] Discovery service email to McGhan (Gemini template — verify request number first)
KILO CODE TASKS:
  [ ] If operator provides McGhan's Good Faith letter, extract exact request number
  [ ] Verify email template matches request number
ACCEPTANCE CRITERIA:
  - Emails sent with correct case references
  - Receipt confirmations saved
```

---

## 3. CWP-DELTA-001: OUTREACH, REVENUE & COMMUNITY BUILDING

**Status:** 🟡 ACTIVE
**Owner:** Operator (publishing) + Gemini (content generation) + Opus (QA)
**Objective:** Transform Ko-fi from empty storefront to functioning revenue/community hub. Launch social vectors. Build node count toward first tetrahedron (4 supporters).
**Gate Structure:** D1 ✅ → D2 🟡 → D3 🟡 → D4 🟡 → D5 🟡

### WCD-DELTA-01: Ko-fi Shop & Profile Execution
```
STATUS:        🟡 READY (all copy written, needs paste-and-publish)
ASSIGNED TO:   Operator (Ko-fi UI), content packages v1 + v2
GATE:          D2 — March 22-23, 2026
DELIVERABLES:
  From Content Package v1:
  [ ] Update About sidebar (copy from v1 §1 rewrite)
  [ ] Update main bio (copy from v1 §2 rewrite)
  [ ] Rename spaceship_earth → "Spaceship Earth — Geodesic Dashboard Print"
  [ ] Rename sic_povm → "SIC-POVM — Quantum Measurement Print"
  [ ] Rename the_posner_shield → "The Posner Shield — Ca₉(PO₄)₆ Print"
  [ ] Rename the_node_count_constants → "Node Count Constants — Milestone Map Print"
  [ ] Add descriptions to all 4 items (copy from v1 §3)
  [ ] Add Tetrahedron Protocol monograph as shop item ($3+ PWYW)
  [ ] Set goal: "First Tetrahedron — 4 Nodes" (copy from v1 §4)

  From Content Package v2:
  [ ] Upload cover banner (p31-kofi-banner-1200x400.png — specs in v2 §1)
  [ ] Rename as_above_so_below → "As Above, So Below — Master Topology Print"
  [ ] Rename k4_convergence_table → "K₄ Convergence Table — Cross-Domain Proof Print"
  [ ] Rename floating_neutral_diagram → "Floating Neutral — Wye-to-Delta Topology Print"
  [ ] Update monograph description (The Minimum Enclosing Structure — copy from v2 §2)
  [ ] Add descriptions to 3 renamed items (copy from v2 §2)
  [ ] Populate Gallery tab with 4-6 images + captions (copy from v2 §5)

  New items (consider adding):
  [ ] BONDING Gameplay Guide PDF ($1+ PWYW — copy from v2 §3)
  [ ] P31 Design Language Wallpaper Pack ($1+ — copy from v2 §3)
KILO CODE TASKS:
  [ ] Generate Ko-fi cover banner image (1200x400, OLED black, cyan wireframe tetrahedron)
      if operator doesn't have one ready. Use canvas/SVG export.
ACCEPTANCE CRITERIA:
  - All 8 shop items renamed with full descriptions
  - Cover banner uploaded
  - Gallery populated (4+ images)
  - Goal visible ("First Tetrahedron")
  - Bio and sidebar updated
```

### WCD-DELTA-02: Ko-fi Content Publishing (9 Posts)
```
STATUS:        🟡 READY (all posts written)
ASSIGNED TO:   Operator (publishing per schedule)
GATE:          D2 through D2.9 — March 23 through April 1, 2026
SCHEDULE:
  Post 1: "The Page Is Live"               → March 23 (Sun)
  Post 2: "What BONDING Actually Is"        → March 24 (Mon)
  Post 3: "Why It's Called P31"             → March 25 (Tue)
  Post 4: "The Trimtab"                    → March 27 (Thu)
  Post 5: "What Your Dollar Buys"           → March 28 (Fri)
  Post 6: "Node Zero Is Real"              → March 29 (Sat)
  Post 7: "Shop Tour"                      → March 30 (Sun)
  Post 8: "The $425 Problem"               → March 31 (Mon)
  Post 9: "BONDING Quest Chains Explained"  → April 1 (Tue)
CONTENT SOURCE:
  Posts 1-5: Ko-fi Content Package v1, §5
  Posts 6-9: Ko-fi Content Package v2, §4
CONTENT RULES (from v1 §6):
  1. Every build log includes a link or screenshot
  2. Every context post ends with link to phosphorus31.org or shop
  3. Never post legal specifics (no case numbers, judge names, filings)
  4. Rotate audiences (technical → personal → infrastructure)
  5. Cross-post to Substack (@trimtabsignal)
ACCEPTANCE CRITERIA:
  - All 9 posts published on schedule
  - Post 3 cross-posted to Substack as first article
  - No legal case details in any post
```

### WCD-DELTA-03: SuperStonk DD Deployment
```
STATUS:        🟡 READY (post written by Gemini, reviewed by Opus)
ASSIGNED TO:   Operator (posting)
GATE:          D3 — March 28, 2026
DELIVERABLES:
  [ ] Post "The Floating Neutral" DD to r/Superstonk
  [ ] Add engineering disclaimer per Opus recommendation:
      "This is engineering analysis, not financial advice.
       I build infrastructure, not trade signals."
  [ ] Include DOI and Ko-fi link
ACCEPTANCE CRITERIA:
  - Posted without legal/personal details
  - Disclaimer included
  - Links to Ko-fi and phosphorus31.org functional
```

### WCD-DELTA-04: Festival Family Social Vector
```
STATUS:        🟡 READY (post written by Gemini)
ASSIGNED TO:   Operator (posting)
GATE:          D4 — March 29, 2026
DELIVERABLES:
  [ ] Post festival family long version with As Above So Below print
  [ ] Add "All research is open access" per Opus recommendation
  [ ] Include DOI and Ko-fi link
ACCEPTANCE CRITERIA:
  - Posted to appropriate festival/sacred geometry communities
  - Open access noted
  - Links functional
```

### WCD-DELTA-05: Content Calendar Weeks 2-8
```
STATUS:        ⚪ QUEUED (starts after 9 seed posts complete)
ASSIGNED TO:   Operator
GATE:          D5 — April 2 onward (2 posts/week rhythm)
SCHEDULE:      Tuesday = build log, Friday = context/story (from v1 §6)
  Week 2: Node One hardware + "What Is a Floating Neutral?"
  Week 3: Spaceship Earth UI + "The Woodshop" (grandfather Robert)
  Week 4: Buffer development + "Spoons and LOVE"
  Week 5: Multiplayer stress test + "ADA Title II Is Not Just Ramps"
  Week 6: Android testing + "863 Hz"
  Week 7: Grant application + "The Centaur"
  Week 8: Node count update + "Calcium" (HypoPT personal story)
ACCEPTANCE CRITERIA:
  - Minimum 2 posts/week maintained
  - Build logs include screenshots/links
  - No legal specifics
```

### WCD-DELTA-06: MMC Submission
```
STATUS:        🟡 READY (design rationale drafted by Gemini)
ASSIGNED TO:   Operator (submission), Kilo Code (documentation assembly)
GATE:          D6 — March 29, 2026
DELIVERABLES:
  [ ] Create account at makersmakingchange.com
  [ ] Submit Node One via "Submit a Device" form
  [ ] Include design rationale (from Gemini template — add "511 tests" per Opus note)
  [ ] Submit BONDING as second device
  [ ] Record short demo video or provide bonding.p31ca.org link as demo
KILO CODE TASKS:
  [ ] Prepare design rationale markdown document suitable for form paste
  [ ] Verify all GitHub links in rationale resolve to public repos
  [ ] Ensure bonding.p31ca.org is accessible without authentication
ACCEPTANCE CRITERIA:
  - Both devices submitted to MMC
  - Jake McIvor notified via email
  - Demo available (video or live link)
```

---

## 4. CWP-FUND-001: INCORPORATION, GRANTS & FEDERAL PIPELINE

**Status:** 🟡 BLOCKED (on $425)
**Owner:** Operator + Opus (strategy)
**Objective:** Incorporate P31 Labs, obtain 501(c)(3), register SAM.gov, unlock federal grant pipeline.
**Gate Structure:** F1 ($425) → F2 (incorporation) → F3 (IRS 1023-EZ) → F4 (SAM.gov) → F5 (grant submissions)

### WCD-FUND-01: Georgia Incorporation
```
STATUS:        🟡 BLOCKED (needs $425)
ASSIGNED TO:   Operator
GATE:          F1 — upon receiving $425 (Pollination Project, Awesome Foundation, or Ko-fi)
DELIVERABLES:
  [ ] File Georgia Articles of Incorporation ($110)
  [ ] Publish in required newspaper ($40)
  [ ] File IRS Form 1023-EZ ($275)
  [ ] Obtain EIN from IRS
BLOCKERS:
  - $0 in accounts as of March 16, 2026
  - Pollination Project ($500) — submitted March 10, no response
  - Awesome Foundation ($1,000) — submitted March 10, no response
  - Ko-fi — live but node count = 0
ACCEPTANCE CRITERIA:
  - Georgia Articles approved
  - Newspaper publication complete
  - IRS determination letter received
  - EIN assigned
```

### WCD-FUND-02: SAM.gov Registration
```
STATUS:        ⚪ QUEUED (blocked by WCD-FUND-01)
ASSIGNED TO:   Operator
GATE:          F2 — immediately upon EIN issuance
SEQUENCE (from Gemini SAM.gov pipeline):
  1. Create Login.gov account (will@p31ca.org)
  2. Sign into sam.gov via Login.gov
  3. Register Entity → "Federal Assistance Awards"
  4. Input Legal Business Name, Address, Date of Incorporation, State
  5. Receive UEI (12-character, 7-10 business days)
  6. Enter EIN/TIN
  7. Leave CAGE code blank (DLA assigns automatically)
  8. Assign self as EBiz POC
  9. Print notarized Entity Administrator letter (SAM Template 1 — Single Entity)
  10. Sign on P31 Labs letterhead in presence of notary
  11. Submit via fsd.gov → Create Incident → SAM → Notarized Letter
  12. Processing: 7-10 business days
TIMELINE ESTIMATE:
  - If $425 clears March 28: GA Articles ~April 4-8
  - EIN application: same day as Articles approval
  - IRS 1023-EZ: 2-12 weeks processing
  - SAM.gov: 3-4 weeks after EIN
  - Earliest SAM.gov active: late May 2026
CALENDAR REMINDER:
  - SAM.gov requires ANNUAL RENEWAL. Set reminder 365 days after activation.
ACCEPTANCE CRITERIA:
  - SAM.gov status: Active
  - UEI assigned
  - CAGE code assigned
  - Entity visible in Grants.gov
```

### WCD-FUND-03: Switzer Merit Fellowship (Individual — No SAM.gov Required)
```
STATUS:        🟡 ACTIONABLE NOW
ASSIGNED TO:   Operator (contact), Opus (application strategy)
GATE:          F3 — This week (contact Linda Vo)
DELIVERABLES:
  [ ] Email Linda Vo (linda.vo@acl.hhs.gov) re: FY2026 cycle
  [ ] Determine if cycle is open
  [ ] If open: prepare application
  [ ] Application elements: research proposal, CV, disability narrative, work samples
NOTES:
  - $80,000 individual award
  - No PhD required
  - Disability-identified applicants encouraged
  - Does NOT require SAM.gov or 501(c)(3)
  - ⚠️ May affect SNAP/Medicaid — consult Georgia WIPA before accepting
ACCEPTANCE CRITERIA:
  - Contact made with Linda Vo
  - Cycle status confirmed
  - Application submitted if open
```

### WCD-FUND-04: NIDILRR FIP Development Grant
```
STATUS:        ⚪ QUEUED (needs SAM.gov)
ASSIGNED TO:   Opus (application), Operator (submission)
GATE:          F4 — after SAM.gov active
DELIVERABLES:
  [ ] Contact Radha Holavanahalli (radha.holavanahalli@acl.hhs.gov)
  [ ] Prepare application: $250K/year × 3 years
  [ ] Application builds on: monograph, BONDING, Node One, verification reports
NOTES:
  - 501(c)(3) eligible
  - Best organizational fit for P31 Labs mission
  - Application is "assembly, not creation" — distributed across existing work products
ACCEPTANCE CRITERIA:
  - Application submitted
  - Confirmation received
```

### WCD-FUND-05: NSF DARE / CPS-CIR Grants
```
STATUS:        ⚪ QUEUED (needs SAM.gov)
ASSIGNED TO:   Opus (application)
GATE:          F5 — after SAM.gov active
DELIVERABLES:
  [ ] NSF DARE: Year-round, ~$100-200K/year. Contact Program Director first.
  [ ] NSF CPS-CIR / HCC (Future CoRe, NSF 25-543): Up to $1M/4yr. Target ~Sep 2026.
      Node One IS a cyber-physical system by definition.
ACCEPTANCE CRITERIA:
  - Program Director contacted
  - Application submitted per cycle
```

### WCD-FUND-06: Follow-Up on Pending Applications
```
STATUS:        🟡 OVERDUE
ASSIGNED TO:   Operator
GATE:          March 25, 2026
DELIVERABLES:
  [ ] Follow up: Pollination Project ($500) — submitted March 10, 11+ days
  [ ] Follow up: Awesome Foundation ($1,000) — submitted March 10, 11+ days
  [ ] Follow up: HCB fiscal sponsorship (ref 4XDUXX) — applied Feb 18, 4+ weeks, no response
ACCEPTANCE CRITERIA:
  - Status confirmed for each application
  - If denied: document and move to next funding source
  - If approved: execute WCD-FUND-01 immediately
```

---

## 5. CWP-SHELTER-001: HOUSING STABILITY & EVICTION RESPONSE

**Status:** 🔴 NEW — CRITICAL
**Owner:** Operator
**Objective:** Prevent or survive eviction from 401 Powder Horn Rd by April 4, 2026. Secure stable housing. Preserve address for legal, benefits, and grant operations.
**Gate Structure:** S1 (Apr 4) → S2 (ESG Apr 13) → S3 (stabilization)

### WCD-SHELTER-01: Emergency Individual Housing Assistance
```
STATUS:        🔴 IMMEDIATE
ASSIGNED TO:   Operator
GATE:          S1 — before April 4, 2026
DELIVERABLES:
  [ ] Call 211 (United Way) Monday March 24 morning
  [ ] Contact Camden County DFCS for emergency rental/mortgage assistance
  [ ] Inquire about Georgia Homeless Prevention program
  [ ] Document disability status (HypoPT, AuDHD, zero income, SNAP/Medicaid)
  [ ] Apply for any individual emergency assistance available
QUALIFYING FACTORS:
  - Documented disability (multiple diagnoses)
  - Zero income
  - SNAP/Medicaid recipient
  - Children on Medicaid
  - Active custody case (loss of address = loss of court access)
ACCEPTANCE CRITERIA:
  - Emergency assistance application filed
  - Status confirmed (approved/denied/pending)
  - If denied: contingency plan activated (WCD-SHELTER-02)
```

### WCD-SHELTER-02: Eviction Contingency Planning
```
STATUS:        🟡 MUST BEGIN BY MARCH 31
ASSIGNED TO:   Operator
GATE:          S1 backup — April 3, 2026 (day before eviction)
DELIVERABLES:
  [ ] Identify temporary housing (Brenda's, Tyler's, shelter, other)
  [ ] Ensure mail forwarding from 401 Powder Horn Rd
  [ ] Ensure all digital access (banking, court filings, email) is device-based (not mail-dependent)
  [ ] Back up all documents and code to cloud (Google Drive + GitHub)
  [ ] Update address with: SNAP, Medicaid, SSA, NFCU, Camden County Court, GEICO
  [ ] Pack essential equipment: laptop, iPad, chargers, legal binder, medications
  [ ] Secure medications supply (calcium carbonate, calcitriol, psychiatric meds)
ACCEPTANCE CRITERIA:
  - Roof secured for April 4 and beyond
  - Mail continuity established
  - All benefits and court records updated
  - Essential equipment and medications portable
```

### WCD-SHELTER-03: ESG Housing Grant (Organizational — Future)
```
STATUS:        ⚪ QUEUED (requires 501(c)(3))
ASSIGNED TO:   Opus (application narrative), Operator (submission)
GATE:          S2 — April 13 (opens), May 8 (closes)
DELIVERABLES:
  [ ] Finalize ESG organizational narrative (Gemini draft exists — bank as template)
  [ ] Fix Section I: clarify 501(c)(3) status honestly
  [ ] Fix Section V: reframe budget around technology deployment costs
  [ ] Submit if incorporation complete by April 13
NOTES (from Opus review):
  - ESG requires active 501(c)(3) for organizational applicants
  - Current narrative is premature — bank as template
  - Will applies INDIVIDUALLY for emergency housing (WCD-SHELTER-01)
  - P31 Labs applies ORGANIZATIONALLY for ESG only after incorporation
ACCEPTANCE CRITERIA:
  - Narrative updated per Opus corrections
  - Submitted within ESG window if entity exists
  - If entity doesn't exist: deferred to next ESG cycle
```

---

## 6. CWP-NODE-001: NODE ONE HARDWARE SPRINT

**Status:** 🟡 QUEUED (current top P31 dev priority per CogPass)
**Owner:** Kilo Code (firmware) + DeepSeek (registers) + Operator (hardware)
**Objective:** Bring Node One from prototype to functional demo unit suitable for MMC submission and Georgia Tech Summit (April 30).
**Gate Structure:** N1 (display) → N2 (haptic) → N3 (LoRa) → N4 (identity)

### WCD-NODE-01: Display & Touch (Waveshare ESP32-S3-Touch-3.5B)
```
STATUS:        🟡 IN PROGRESS (lv_init() bug resolved, display rendering)
ASSIGNED TO:   DeepSeek (firmware), Kilo Code (UI logic)
HARDWARE:
  - Waveshare ESP32-S3-Touch-3.5B
  - 3.5" QSPI touchscreen, 8MB PSRAM, 16MB flash
  - AXS15231B display controller
  - ESP-IDF v5.5.3 + LVGL v8.4
DELIVERABLES:
  [ ] LVGL display initialization (lv_init() + driver binding)
  [ ] Touch calibration (AXS15231B capacitive touch)
  [ ] Coherence Arc UI rendering (primary status display)
  [ ] Boot sequence animation
  [ ] Basic navigation (swipe between screens)
KILO CODE TASKS:
  [ ] Create LVGL screen layouts (C structs)
  [ ] Implement state machine for screen navigation
  [ ] Write Vitest-equivalent unit tests for state machine logic (separate from firmware)
KNOWN ISSUES:
  - lv_init() must be called before ANY LVGL memory allocation (LoadProhibited at 0x00000014)
  - AXS15231B documentation is sparse — reference Waveshare example code
  - PSRAM must be enabled in sdkconfig for frame buffer
ACCEPTANCE CRITERIA:
  - Display renders Coherence Arc UI
  - Touch input registers correctly
  - No heap corruption crashes
  - Boot time < 3 seconds
```

### WCD-NODE-02: Haptic Feedback (DRV2605L + LRA)
```
STATUS:        ⚪ QUEUED (after WCD-NODE-01)
ASSIGNED TO:   DeepSeek (I2C driver), Kilo Code (pattern library)
HARDWARE:
  - DRV2605L haptic driver (I2C address 0x5A)
  - Linear Resonant Actuator (LRA)
DELIVERABLES:
  [ ] I2C initialization and DRV2605L register configuration
  [ ] Auto-calibration sequence for LRA
  [ ] 863 Hz Larmor frequency waveform generation
  [ ] 172.35 Hz NMR frequency waveform generation
  [ ] Haptic pattern library:
      - Notification pulse (short buzz)
      - Coherence rhythm (4-4-6 breathing pattern)
      - Alert escalation (increasing intensity)
      - Grounding pattern (slow, deep pulse)
  [ ] API: trigger_haptic(pattern_id, intensity, duration)
KILO CODE TASKS:
  [ ] Define haptic pattern data structures
  [ ] Write pattern sequencer (plays multi-step haptic patterns)
  [ ] Unit test pattern timing accuracy
REGISTER CONFIGURATION (DeepSeek):
  REG_MODE (0x01) = 0x00 (internal trigger)
  REG_LIBRARY (0x03) = 0x06 (LRA library)
  REG_WAVEFORM (0x04-0x0B) = pattern-specific
  REG_OVERDRIVE (0x0C) = calibration-dependent
  REG_SUSTAIN_POS (0x0D) = calibration-dependent
  REG_SUSTAIN_NEG (0x0E) = calibration-dependent
  REG_BRAKE (0x0F) = calibration-dependent
  REG_RATED_VOLTAGE (0x16) = LRA-specific
  REG_OD_CLAMP (0x17) = LRA-specific
  REG_CONTROL1 (0x1B) = auto-cal settings
  REG_CONTROL3 (0x1D) = LRA mode bit
ACCEPTANCE CRITERIA:
  - 863 Hz output verified with oscilloscope or frequency counter
  - 172.35 Hz output verified
  - All 4 patterns play correctly
  - No audible whine at idle
  - Power consumption < 50mA during active haptic
```

### WCD-NODE-03: LoRa Mesh (SX1262)
```
STATUS:        ⚪ QUEUED (after WCD-NODE-02)
ASSIGNED TO:   DeepSeek (SPI driver), Kilo Code (mesh protocol)
HARDWARE:
  - Semtech SX1262 LoRa transceiver (SPI interface)
  - Meshtastic-compatible frequency plan
DELIVERABLES:
  [ ] SPI initialization for SX1262
  [ ] LoRa packet TX/RX at 915 MHz (US ISM band)
  [ ] Meshtastic protocol compatibility layer
  [ ] Mesh routing (store-and-forward)
  [ ] Encryption: AES-256-CTR per channel
  [ ] Range test mode
KILO CODE TASKS:
  [ ] Define message format (header + payload + MAC)
  [ ] Implement message queue (outbound buffer)
  [ ] Write mesh routing table management
  [ ] Unit test routing logic
ACCEPTANCE CRITERIA:
  - Two Node One devices can exchange messages via LoRa
  - Range: minimum 500m line-of-sight
  - Encryption verified (ciphertext != plaintext)
  - Meshtastic app can see Node One as a mesh node
```

### WCD-NODE-04: Identity & Security (NXP SE050)
```
STATUS:        ⚪ QUEUED (after WCD-NODE-03)
ASSIGNED TO:   DeepSeek (I2C driver), Opus (architecture review)
HARDWARE:
  - NXP SE050 hardware security module (I2C)
DELIVERABLES:
  [ ] I2C initialization for SE050
  [ ] Ed25519 key generation (on-chip, never exported)
  [ ] did:key identity creation
  [ ] UCAN delegation token generation
  [ ] Attestation: sign device state with hardware key
  [ ] Secure boot chain verification
KILO CODE TASKS:
  [ ] Define identity data structures (DID document, UCAN token format)
  [ ] Implement UCAN delegation chain logic
  [ ] Write verification function (can a given UCAN authorize a given action?)
ACCEPTANCE CRITERIA:
  - Private key generated and stored on SE050 (never leaves chip)
  - DID document resolvable
  - UCAN tokens verifiable
  - Device attestation includes: device ID, firmware version, timestamp, state hash
```

---

## 7. CWP-PHOSPHORUS-001: phosphorus31.org CONTENT EXPANSION

**Status:** 🟡 QUEUED
**Owner:** Kilo Code (Astro implementation) + Gemini (content) + Opus (medical/technical review)
**Objective:** Add hypoparathyroidism awareness page, quantum security page, and SOP repository to phosphorus31.org.
**Gate Structure:** P1 (HypoPT) → P2 (Quantum) → P3 (SOP) → P4 (landing page refresh)

### WCD-PHOSPHORUS-01: Hypoparathyroidism Awareness Page
```
STATUS:        🟡 CONTENT DRAFTED (Gemini), needs Astro implementation
ASSIGNED TO:   Kilo Code (Astro page), Opus (medical accuracy review)
GATE:          P1 — April 2, 2026
CONTENT SOURCE: Gemini draft (in Plan.pdf), verified by Opus
KILO CODE TASKS:
  [ ] Create src/pages/hypoparathyroidism.astro
  [ ] Implement page layout matching phosphorus31.org design language
  [ ] Add sections: Lived Experience, Cognitive Endpoint (JCEM data), Diagnostic Danger, Yorvipath
  [ ] Add specific lab values per Opus recommendation:
      Normal Ca: 8.5-10.5 mg/dL → Will's: 7.8 mg/dL
      Normal PTH: 15-65 pg/mL → Will's: <6 pg/mL
  [ ] Add citations (JCEM 2025 PMC12261092, ClinicalTrials NCT04569604, PubMed 38648280)
  [ ] Add navigation link from main site
  [ ] Deploy to Cloudflare Pages
ACCEPTANCE CRITERIA:
  - Page live at phosphorus31.org/hypoparathyroidism
  - All medical claims cited
  - Lab values included
  - Design consistent with existing site
  - Mobile-responsive
```

### WCD-PHOSPHORUS-02: Quantum Security Page
```
STATUS:        🟡 CONTENT DRAFTED (Gemini), needs Astro implementation
ASSIGNED TO:   Kilo Code (Astro page), Opus (technical review)
GATE:          P2 — April 2, 2026
CONTENT SOURCE: Gemini draft (in Plan.pdf), verified by Opus
KILO CODE TASKS:
  [ ] Create src/pages/quantum-security.astro
  [ ] Sections: HNDL Threat, Hardware Timeline, Regulatory Reality, P31 Position
  [ ] Include Google Willow + IBM Starling specs
  [ ] Include EU 2026 mandate reference
  [ ] Add navigation link from main site
  [ ] Deploy to Cloudflare Pages
ACCEPTANCE CRITERIA:
  - Page live at phosphorus31.org/quantum-security
  - Technical claims accurate
  - Non-alarmist tone (essential infrastructure framing, not fear)
  - Mobile-responsive
```

### WCD-PHOSPHORUS-03: SOP Repository
```
STATUS:        ⚪ QUEUED
ASSIGNED TO:   Kilo Code (platform setup) + Operator (content creation)
GATE:          P3 — after P1 and P2
PLATFORM:      Notion workspace (public-facing) + Tango (visual capture)
DELIVERABLES:
  [ ] Create Notion workspace for P31 SOPs
  [ ] Set up database with fields: SOP Number, Title, Spoon Cost (1-5), Category, Last Updated
  [ ] Publish SOP 001: The Parking Lot Pattern (from Gemini draft)
  [ ] Publish SOP 002: The Triad AI Tag-Out System (from Gemini draft, update model names)
  [ ] Link from phosphorus31.org
  [ ] Create Tango account for visual capture of future SOPs
CATEGORIES:
  - Executive Function (Parking Lot, Spoon Tracking, Decision Trees)
  - AI Collaboration (Triad Tag-Out, Context Windows, Prompt Engineering)
  - Legal/Admin (Filing Procedures, Benefits Maintenance, FERS)
  - Development (Git Workflow, Testing, Deployment)
  - Hardware (Node One Setup, Firmware Flash, LoRa Config)
ACCEPTANCE CRITERIA:
  - Notion workspace public and accessible
  - At least 2 SOPs published
  - Spoon Cost index visible and filterable
  - Linked from phosphorus31.org
```

---

## 8. CWP-IP-001: DEFENSIVE PUBLICATIONS & PRIOR ART

**Status:** 🟡 QUEUED (abstracts drafted, need upload)
**Owner:** Opus (review) + Operator (upload)
**Objective:** Establish prior art for all novel P31 intellectual property via defensive publications on Zenodo and Internet Archive.
**Gate Structure:** IP1 (Larmor) → IP2 (K₄) → IP3 (Crypto) → IP4 (Fawn Guard) → IP5 (LOVE) → IP6-8 (white papers)

### WCD-IP-01: Larmor Frequency Hardware Synchronization (DP-5)
```
STATUS:        🟡 ABSTRACT COMPLETE, PUBLISH FIRST
ASSIGNED TO:   Operator (Zenodo upload)
GATE:          IP1 — March 27, 2026
DELIVERABLES:
  [ ] Upload abstract to Zenodo as Technical Note
  [ ] Tag: assistive technology, haptic feedback, phosphorus-31, NMR, DRV2605L
  [ ] Link to existing GUT DOI (10.5281/zenodo.19004485)
  [ ] Cross-post to Internet Archive for redundancy
OPUS VERDICT: ✅ STRONGEST OF THE FIVE. Publish first.
  - 863 Hz math verified (17.235 MHz/T × 50.07 μT = 862.96 Hz)
  - No prior art combining NMR physics with haptic AT
  - Specific enough to block future patents
ACCEPTANCE CRITERIA:
  - New DOI assigned
  - Timestamped on Zenodo
  - Cross-posted to Internet Archive
```

### WCD-IP-02: Topological Integration of K₄ (DP-1)
```
STATUS:        🟡 ABSTRACT COMPLETE
GATE:          IP2 — March 27, 2026 (same day as IP1)
OPUS VERDICT:  ✅ PUBLISH-READY. Maxwell + Laman citation chain correct.
NOTE:          In full paper, clarify vertices = state, edges = relationships.
```

### WCD-IP-03: Wye-to-Delta Cryptographic Agility (DP-4)
```
STATUS:        🟡 ABSTRACT COMPLETE
GATE:          IP3 — March 28, 2026
OPUS VERDICT:  ✅ PUBLISH-READY. Kennelly transform (1899) correctly applied.
NOTE:          Add protocol-level handshake detail in supplementary.
```

### WCD-IP-04: Fawn Guard Algorithmic Membrane (DP-2)
```
STATUS:        🟡 ABSTRACT NEEDS EDIT
GATE:          IP4 — March 28, 2026
OPUS VERDICT:  ✅ WITH EDIT. Replace "pattern recognition" with:
  "semantic frequency analysis of agreement escalation markers,
   hedging density, and boundary dissolution patterns in outgoing text"
```

### WCD-IP-05: L.O.V.E. Token Economy (DP-3)
```
STATUS:        ⚠️ NEEDS PARAMETER SPECIFICATION
GATE:          IP5 — after parameters defined
OPUS VERDICT:  Publish abstract now for prior art. Supplement later with:
  - Earning rate functions
  - Decay/ceiling mechanics
  - Differentiation from Buterin's Soulbound (2022) by application domain
VULNERABILITIES IDENTIFIED:
  1. Inflation without ceiling → add decay function or capability unlocks
  2. Spoon measurement fidelity → self-report for v1, Node One sensors as soft signal v2
  3. Gaming vector → require SE050 hardware attestation for full LOVE weight
```

### WCD-IP-06 through IP-08: White Papers to Zenodo
```
STATUS:        🟡 PAPERS FINALIZED Mar 17, need upload
GATE:          IP6-8 — March 27-28, 2026
PAPERS:
  [ ] "The Floating Neutral Hypothesis" (medical/physiological)
  [ ] "Mechanical Translation of Quantum States" (hardware/educational)
  [ ] "Hardware-Accelerated Lattice Decoders" (FPGA/algorithmic)
ACCEPTANCE CRITERIA:
  - All three uploaded to Zenodo with new DOIs
  - Tagged and linked to existing GUT
  - Cross-posted to Internet Archive
```

---

## 9. CWP-SE-002: SPACESHIP EARTH PHASE 2 (ORACLE)

**Status:** ⚪ PARKED (WCD-SE02 authored Mar 17, deprioritized for legal sprint)
**Owner:** Kilo Code (implementation) + Opus (architecture)
**Objective:** Implement ORACLE directive — ZUI architecture, dual-currency economy, BLE nudging.
**Gate Structure:** SE1 (ZUI) → SE2 (economy) → SE3 (BLE) → SE4 (integration)

### WCD-SE-01: ZUI (Zoomable User Interface) Architecture
```
STATUS:        ⚪ PARKED
ASSIGNED TO:   Kilo Code
DELIVERABLES:
  [ ] Three zoom levels with Sierpinski tetrahedral geometry
  [ ] IVM (Isotropic Vector Matrix) coordinate system
  [ ] Smooth zoom transitions
  [ ] Room-level navigation at zoom level 1
  [ ] Node-level interaction at zoom level 3
PREREQUISITES:
  - Room router pattern already proven (WCD-SE01, Mar 4)
  - Observatory and Collider rooms already built
KILO CODE TASKS:
  [ ] Implement camera zoom controller (Three.js)
  [ ] Create Sierpinski tetrahedron generator (recursive, configurable depth)
  [ ] Map IVM coordinates to screen space
  [ ] Add zoom level event triggers (level change → load different detail)
```

### WCD-SE-02: Dual-Currency Local-First Token Economy
```
STATUS:        ⚪ PARKED
ASSIGNED TO:   Kilo Code (implementation), Opus (economic logic review)
DELIVERABLES:
  [ ] Spoon tracking (daily energy budget, self-report input)
  [ ] LOVE accumulation (earned via care, creation, consistency)
  [ ] Zustand store for both currencies
  [ ] PGLite/IndexedDB persistence
  [ ] Visual representation in dashboard (coherence arc)
ARCHITECTURE:
  - Local-first: all data in browser, no server dependency
  - Sync: optional, via CRDT when network available
  - Soulbound: LOVE tokens are non-transferable by design
```

### WCD-SE-03: BLE Beacon-Triggered Environmental Nudging
```
STATUS:        ⚪ PARKED
ASSIGNED TO:   Kilo Code (Web BLE API), DeepSeek (beacon firmware)
DELIVERABLES:
  [ ] Web BLE scanning for Node One beacons
  [ ] Context-aware nudges (medication reminder when near bathroom, etc.)
  [ ] Three-tiered rules engine with Cognitive Shield
  [ ] Privacy: all processing local, no beacon data transmitted
```

---

## 10. CWP-BUFFER-001: THE BUFFER TO 100%

**Status:** ⚪ PARKED (~85% complete)
**Owner:** Kilo Code
**Objective:** Complete The Buffer from ~85% to shipping state.
**Gate Structure:** BF1 (Fawn Guard) → BF2 (Chaos Ingestion) → BF3 (Integration)

### WCD-BUFFER-01: Fawn Guard Implementation
```
STATUS:        ⚪ PARKED
ASSIGNED TO:   Kilo Code
DELIVERABLES:
  [ ] Semantic analysis pipeline for outgoing text
  [ ] Agreement escalation marker detection
  [ ] Hedging density scorer
  [ ] Boundary dissolution pattern detector
  [ ] Strategic latency injection (pause + prompt before send)
  [ ] User override (can still send after warning)
  [ ] Privacy: all analysis local, no text transmitted to server
KILO CODE TASKS:
  [ ] Define marker taxonomy (agreement escalation, hedging, boundary dissolution)
  [ ] Implement scoring function (weighted sum of markers)
  [ ] Create UI overlay (warning + "Are you sure?" prompt)
  [ ] Write test suite (known fawn patterns → detected, genuine agreement → not flagged)
```

### WCD-BUFFER-02: Chaos Ingestion Pipeline
```
STATUS:        ⚪ PARKED
ASSIGNED TO:   Kilo Code
DELIVERABLES:
  [ ] Journal/brain dump text input
  [ ] NLP extraction: action items, emotions, concerns, deadlines
  [ ] Structured output: cards/tasks with metadata
  [ ] Integration with Parking Lot pattern (SOP 001)
```

### WCD-BUFFER-03: Spaceship Earth Integration
```
STATUS:        ⚪ PARKED (depends on BF1 + BF2 + SE-002)
ASSIGNED TO:   Kilo Code
DELIVERABLES:
  [ ] Buffer Dashboard room in Spaceship Earth
  [ ] Cognitive load dial visualization
  [ ] Message queue with scoring
  [ ] High-voltage message hold (>80% cognitive load → buffer message)
```

---

## 11. CWP-BONDING-002: BONDING MAINTENANCE & POST-SHIP

**Status:** ⚪ PARKED (parking lot items from CWP-BONDING-001)
**Owner:** Kilo Code
**Objective:** Address known non-critical items from BONDING ship sprint.

### WCD-BONDING-M01: Parking Lot Cleanup
```
STATUS:        ⚪ PARKED (none are blocking)
ITEMS:
  [ ] Sound engine static config → SKIP (dynamic per-molecule frequencies are better)
  [ ] z-100 full-screen modals → ACKNOWLEDGED (BootSequence, RoomModal — intentional)
  [ ] CSS @import order warning → COSMETIC (no functional impact)
  [ ] Shooting star collision detection → NICE TO HAVE
  [ ] Missing Node daily position algorithm (seeded PRNG from date) → NICE TO HAVE
```

---

## 12. ECOSYSTEM TROUBLESHOOTING TREE

### How To Use This Tree
```
1. Identify the SYMPTOM (what you observe)
2. Follow the tree to the DIAGNOSIS (what's actually wrong)
3. Execute the FIX
4. Verify with the ACCEPTANCE TEST

Spoon Cost indicated for each fix: 🥄 = low effort, 🥄🥄🥄🥄🥄 = deep focus required
```

---

### 12.1 BONDING (bonding.p31ca.org)

```
SYMPTOM: Site won't load / white screen
├── Check: Is Cloudflare Pages deployment active?
│   ├── YES → Check browser console for errors
│   │   ├── "Failed to fetch" → Cloudflare outage or DNS issue
│   │   │   FIX: Check status.cloudflare.com. Wait or redeploy. 🥄
│   │   ├── "ChunkLoadError" → Stale service worker cache
│   │   │   FIX: Clear site data in browser → hard refresh (Ctrl+Shift+R) 🥄
│   │   ├── React error boundary triggered → Check ErrorBoundary output
│   │   │   FIX: "Something came loose" = component crash. Check console stack trace.
│   │   │        Redeploy from last known good commit. 🥄🥄
│   │   └── No console errors → JavaScript disabled or Content-Security-Policy blocking
│   │       FIX: Check CSP headers in Cloudflare dashboard. 🥄🥄
│   └── NO → Deployment failed
│       FIX: Check GitHub Actions / Cloudflare Pages build log.
│            Common: npm install failure, TypeScript error, missing env var.
│            Redeploy: git push to trigger rebuild. 🥄🥄

SYMPTOM: Atoms won't drag / touch not working
├── Check: Is touch-action:none applied to canvas container?
│   ├── YES → Check if event listeners are attached
│   │   ├── R3F pointer events not firing → Canvas may be behind another z-index layer
│   │   │   FIX: Verify cockpit doctrine z-index (canvas z1, HUD z10). Check for
│   │   │        overlapping transparent divs stealing pointer events. 🥄🥄
│   │   └── Events fire but position is wrong → Viewport meta tag issue
│   │       FIX: Verify <meta name="viewport" content="width=device-width,
│   │            initial-scale=1, maximum-scale=1, user-scalable=no"> 🥄
│   └── NO → touch-action CSS missing
│       FIX: Add touch-action:none to canvas wrapper. See WCD-M11. 🥄

SYMPTOM: Multiplayer not connecting / room code doesn't work
├── Check: Is relay worker responding?
│   ├── curl https://bonding-relay.trimtab-signal.workers.dev/health
│   │   ├── 200 OK → Relay is up
│   │   │   ├── Check: Are both devices using same room code?
│   │   │   │   FIX: Room codes are 6-char, case-sensitive. Verify exact match. 🥄
│   │   │   ├── Check: Is KV namespace accessible?
│   │   │   │   FIX: Check Cloudflare dashboard → Workers → KV → verify binding. 🥄🥄
│   │   │   └── Check: Is polling interval too long?
│   │   │       FIX: Default poll is 3s. Check RELAY_POLL_INTERVAL in config. 🥄
│   │   └── 500/502/504 → Worker error
│   │       FIX: Check worker logs in Cloudflare dashboard.
│   │            Common: KV binding name mismatch, quota exceeded. 🥄🥄
│   └── No response → Worker not deployed or DNS not propagated
│       FIX: Redeploy worker. Verify custom domain binding. 🥄🥄

SYMPTOM: LOVE tokens not accumulating
├── Check: Is IndexedDB accessible?
│   ├── YES → Check if navigator.storage.persist() succeeded
│   │   ├── YES → Check Zustand store actions
│   │   │   FIX: Verify earnLove() action fires on molecule completion.
│   │   │        Check molecule dictionary: does the built formula exist? 🥄🥄
│   │   └── NO → Browser denied persistent storage
│   │       FIX: Request storage permission again. Some browsers require
│   │            user interaction first. Add a "Save Progress" button. 🥄🥄
│   └── NO → Private browsing mode or storage quota exceeded
│       FIX: Exit private mode. Or clear old IndexedDB data. 🥄

SYMPTOM: Molecules don't complete / formula mismatch
├── Check: Does the built formula exist in moleculeDictionary?
│   ├── YES → Check displayFormula() output vs internal Hill system representation
│   │   FIX: Hill system = C first, H second, then alphabetical.
│   │        Display layer translates. If OCa shows instead of CaO,
│   │        check displayFormula() conventional notation mapping. 🥄🥄
│   └── NO → New combination not in dictionary
│       FIX: Add to moleculeDictionary in src/config/. Follow existing pattern.
│            Run: npm test to verify no regressions. 🥄🥄

SYMPTOM: PWA not installing / no "Add to Home Screen" prompt
├── Check: manifest.json present and valid?
│   ├── YES → Check service worker registration
│   │   ├── SW registered → Check: HTTPS? (required for PWA)
│   │   │   FIX: Cloudflare Pages enforces HTTPS. Should be automatic. 🥄
│   │   └── SW not registered → Check vite-plugin-pwa config
│   │       FIX: Verify registerType: 'autoUpdate' in vite.config.ts. 🥄🥄
│   └── NO → manifest.json missing or malformed
│       FIX: Check public/manifest.json. Validate at web.dev/manifest. 🥄

SYMPTOM: Genesis Block / forensic data not persisting
├── Check: Is IndexedDB write succeeding?
│   ├── YES → Check: Are SHA-256 hashes being generated?
│   │   FIX: Verify crypto.subtle.digest('SHA-256', ...) in Genesis Block code.
│   │        Check that cf-ray, TLS version, UA are captured in metadata. 🥄🥄🥄
│   └── NO → Storage full or permission denied
│       FIX: Check storage quota. Clear non-essential cached data. 🥄🥄

SYMPTOM: Sound not playing
├── Check: Web Audio API context state
│   ├── "suspended" → User hasn't interacted with page yet
│   │   FIX: Web Audio requires user gesture to start. Add tap-to-start overlay. 🥄
│   ├── "running" → Check OscillatorNode frequency
│   │   FIX: Verify frequency matches element config (anchored to 172.35 Hz). 🥄🥄
│   └── "closed" → AudioContext was disposed
│       FIX: Create new AudioContext on next user interaction. 🥄

SYMPTOM: Easter egg not appearing (shooting stars, Missing Node)
├── Check: Is the timer/interval running?
│   FIX: Shooting stars fire every ~90s. Missing Node has opacity 0.08 (very faint).
│        Blood moon check: is today an anniversary of March 3 lunar eclipse?
│        Console: check for easterEggs module loading errors. 🥄🥄
```

### 12.2 SPACESHIP EARTH (p31ca.org)

```
SYMPTOM: Room doesn't load / hash navigation broken
├── Check: Is ROOMS array in rooms/index.ts correct?
│   ├── YES → Check React.lazy import path for the room component
│   │   FIX: Typo in import path = silent fail. Verify exact filename. 🥄🥄
│   └── NO → Room not registered
│       FIX: Add room to ROOMS array. One import + one array entry. 🥄

SYMPTOM: Three.js canvas is black / no rendering
├── Check: WebGL context
│   ├── webglcontextlost event fired → GPU crash or resource exhaustion
│   │   FIX: Reduce geometry complexity. Check for memory leaks in
│   │        useFrame() hooks (are you creating new objects every frame?). 🥄🥄🥄
│   ├── WebGL not supported → Very old browser/device
│   │   FIX: Show fallback UI. Check navigator.userAgent. 🥄🥄
│   └── WebGL OK but nothing visible → Camera/scene issue
│       FIX: Check camera position/target. Check scene children count.
│            Common: object at (0,0,0) but camera looking elsewhere. 🥄🥄

SYMPTOM: Observatory dome nodes not positioned correctly
├── Check: 2V icosahedron face generation
│   FIX: 80 faces expected. Nodes assigned to nearest face by dot product.
│        If nodes cluster: check priority assignment (countdown/missing get first pick).
│        If nodes missing: check graph node count (should be 55). 🥄🥄🥄

SYMPTOM: Collider particles not curving
├── Check: Lorentz force calculation
│   FIX: F = qv × B. Verify charge sign for each particle type.
│        e⁻ curves opposite to e⁺. ³¹P has charge +15e.
│        Check: is magnetic field vector correct? 🥄🥄🥄

SYMPTOM: BONDING iframe not communicating LOVE
├── Check: postMessage handshake
│   FIX: Verify useBondingHandshake hook is active (WCD-M12).
│        Check: origin matches bonding.p31ca.org.
│        Check: message format matches expected schema. 🥄🥄
```

### 12.3 NODE ONE HARDWARE (ESP32-S3)

```
SYMPTOM: LoadProhibited exception / crash at boot
├── Check: Address in crash dump
│   ├── 0x00000000-0x0000FFFF → NULL pointer dereference
│   │   FIX: Something is uninitialized. Check all init() calls.
│   │        Most common: lv_init() not called before LVGL operations.
│   │        Also: I2C bus not initialized before DRV2605L/SE050 access. 🥄🥄🥄
│   ├── 0x3F000000-0x3FFFFFFF → SPI flash access error
│   │   FIX: Partition table mismatch. Re-flash with correct partition table.
│   │        Check: idf.py menuconfig → Partition Table. 🥄🥄🥄
│   └── 0x3FC00000-0x3FCFFFFF → PSRAM access error
│       FIX: PSRAM not enabled. In sdkconfig:
│            CONFIG_SPIRAM=y
│            CONFIG_SPIRAM_MODE_OCT=y (for octal PSRAM)
│            CONFIG_SPIRAM_SPEED_80M=y 🥄🥄🥄

SYMPTOM: Display blank / no LVGL output
├── Check: Is the display driver initialized?
│   ├── YES → Check LVGL tick source
│   │   FIX: lv_tick_inc() must be called from a timer ISR or FreeRTOS task.
│   │        Without it, LVGL animations and input processing freeze. 🥄🥄🥄
│   ├── Check: Is QSPI interface configured for AXS15231B?
│   │   FIX: AXS15231B uses QSPI, not standard SPI. Verify pin assignments
│   │        match Waveshare schematic. Check MOSI/MISO/CLK/CS pins. 🥄🥄🥄🥄
│   └── Check: Is frame buffer allocated in PSRAM?
│       FIX: 3.5" @ 320x480 = 307,200 pixels × 2 bytes (RGB565) = 614,400 bytes.
│            Must be in PSRAM (internal SRAM too small). 🥄🥄🥄

SYMPTOM: Touch not responding
├── Check: I2C scan for touch controller
│   FIX: Run i2c_scanner example. Touch controller should appear at known address.
│        If not found: check I2C pull-ups (4.7kΩ), SDA/SCL pin assignments. 🥄🥄🥄

SYMPTOM: DRV2605L not producing haptic feedback
├── Check: I2C communication with DRV2605L (address 0x5A)
│   ├── ACK received → Check mode register
│   │   ├── Mode = standby → Write 0x00 to REG_MODE to exit standby 🥄🥄
│   │   ├── Mode = active → Check GO bit
│   │   │   FIX: Write 0x01 to REG_GO (0x0C) to trigger waveform playback. 🥄🥄
│   │   └── Mode = diagnostics → Auto-cal failed
│   │       FIX: Check LRA connections. Run auto-cal sequence again.
│   │            Verify RATED_VOLTAGE and OD_CLAMP for your specific LRA. 🥄🥄🥄
│   └── NACK / no response → I2C bus issue
│       FIX: Check wiring (SDA, SCL, VCC, GND). Check pull-ups.
│            Verify I2C bus speed (DRV2605L supports up to 400kHz). 🥄🥄🥄

SYMPTOM: LoRa no TX/RX
├── Check: SPI communication with SX1262
│   ├── SX1262 responds → Check frequency configuration
│   │   FIX: US ISM band = 915 MHz. Verify: RF frequency register = 0x39400000.
│   │        Check: is antenna connected? (TX without antenna can damage chip) 🥄🥄🥄
│   └── SX1262 not responding → SPI configuration
│       FIX: Verify MOSI/MISO/CLK/CS pin assignments. Check SPI mode (CPOL=0, CPHA=0).
│            Check: is BUSY pin being monitored? SX1262 asserts BUSY during operations. 🥄🥄🥄

SYMPTOM: SE050 key generation fails
├── Check: I2C communication with SE050
│   FIX: SE050 requires ATR (Answer To Reset) handshake before operations.
│        Verify T=1 protocol implementation. Check: is the applet selected?
│        SE050 uses GlobalPlatform applet selection (AID). 🥄🥄🥄🥄🥄

SYMPTOM: OTA update fails
├── Check: Partition table
│   FIX: A/B OTA requires two OTA partitions + OTA data partition.
│        Verify: ota_0 and ota_1 both present in partition table.
│        Check: is there enough flash space? (16MB should be plenty). 🥄🥄🥄
```

### 12.4 THE BUFFER (pwa/)

```
SYMPTOM: Fawn Guard false positives (flagging genuine agreement)
├── Check: Marker weights
│   FIX: Reduce weight for isolated agreement markers.
│        Fawn detection should require PATTERN (escalation over time),
│        not SINGLE INSTANCE. Retrain threshold on test corpus. 🥄🥄🥄🥄

SYMPTOM: Chaos ingestion produces garbled output
├── Check: Input encoding
│   FIX: Handwritten OCR output may contain encoding artifacts.
│        Normalize input (NFC/NFD Unicode normalization).
│        Strip control characters. 🥄🥄

SYMPTOM: Buffer dashboard not reflecting current spoon level
├── Check: Zustand store subscription
│   FIX: Dashboard component may not be subscribed to spoon store.
│        Use useStore(spoonStore, selector) pattern. 🥄🥄
```

### 12.5 INFRASTRUCTURE (Cloudflare, GitHub, Domains)

```
SYMPTOM: Deploy fails on Cloudflare Pages
├── Check: Build command output
│   ├── TypeScript error → Fix type error, push again 🥄🥄
│   ├── Module not found → Check import paths, run npm install locally first 🥄🥄
│   ├── Out of memory → Build environment limit hit
│   │   FIX: Set NODE_OPTIONS=--max_old_space_size=4096 in env vars. 🥄
│   └── Unknown error → Check CF Pages build logs for full stack trace 🥄🥄

SYMPTOM: Custom domain not resolving
├── Check: DNS records in Cloudflare
│   FIX: CNAME record must point to [project].pages.dev.
│        SSL certificate may take up to 24 hours to provision.
│        Check: is the domain proxied (orange cloud) or DNS-only? 🥄🥄

SYMPTOM: Worker relay returning 500
├── Check: Worker logs (Cloudflare dashboard → Workers → Logs)
│   ├── KV binding error → Verify KV namespace binding name in wrangler.toml 🥄🥄
│   ├── Rate limit → Check Workers usage in dashboard. Free tier = 100K req/day. 🥄
│   └── Script error → Check worker code. Common: JSON.parse on non-JSON body. 🥄🥄

SYMPTOM: Git push rejected
├── Check: Branch protection rules
│   FIX: main branch may have protection. Push to feature branch, then PR.
│        Or: temporarily disable protection for emergency hotfix. 🥄

SYMPTOM: Neo4j password exposed in git history
├── Status: KNOWN ISSUE (remediation sequenced)
│   FIX SEQUENCE:
│   1. Rotate password in Neo4j immediately 🥄
│   2. git filter-repo --path-glob '*.env' --invert-paths 🥄🥄🥄
│   3. git push --force 🥄
│   4. Verify pre-commit hook catches .env files 🥄
│   5. Enable branch protection on main 🥄🥄
```

### 12.6 LEGAL & ADMINISTRATIVE

```
SYMPTOM: Court filing rejected
├── Check: Formatting
│   ├── Case caption correct? (Johnson v. Johnson, 2025CV936) 🥄
│   ├── Paper size correct? (8.5x11, single-sided or per court rules) 🥄
│   ├── Signed and dated? 🥄
│   └── Filing fee required? (check if fee waiver on file) 🥄

SYMPTOM: Benefits (SNAP/Medicaid) interrupted
├── Check: Recertification deadline
│   FIX: Georgia requires periodic recertification.
│        If address changes: update within 10 days.
│        If income changes: report within 10 days.
│        Contact Georgia Gateway (gateway.ga.gov). 🥄🥄

SYMPTOM: SSA determination delayed
├── Check: Status
│   FIX: Call SSA (1-800-772-1213) or check ssa.gov account.
│        Both consultative exams complete (Feb 20 + Feb 26). Determination pending.
│        Typical processing: 3-5 months from application. 🥄

SYMPTOM: FERS paperwork stalled
├── Check: SF-3112D/E status
│   FIX: Send follow-up to Eric Violette (OCHR Norfolk).
│        If no response after 2 follow-ups: invoke BAL 20-103
│        (file directly to OPM Boyers PA without agency forms).
│        Deadline: ~September 30, 2026. 🥄🥄🥄
```

### 12.7 COGNITIVE / OPERATOR

```
SYMPTOM: Executive dysfunction freeze (can't decide what to do)
├── FIX: Pick up the FIRST item on today's sprint checklist (§13 of CogPass v2.6).
│        Don't evaluate. Don't prioritize. Just start the first physical action.
│        If nothing on checklist: open Parking Lot file and write one line. 🥄

SYMPTOM: Thrashing (switching between tasks without completing any)
├── FIX: HALT. Ask yourself: "What tool am I holding and what task am I doing?"
│        If you can't answer both: close all but ONE tab/window.
│        Set a 25-minute timer. Do that ONE thing until the timer rings. 🥄

SYMPTOM: Fawn response active (agreeing to things you don't mean)
├── FIX: Introduce strategic latency. Do NOT respond immediately.
│        Write your ACTUAL response in the Parking Lot first.
│        Wait 10 minutes. Then decide whether to send. 🥄🥄

SYMPTOM: Metabolic crisis indicators (paresthesia, tetany, brain fog, anxiety spike)
├── FIX: This is NOT psychiatric. This is calcium.
│        1. Take calcium carbonate immediately 🥄
│        2. Take calcitriol if due 🥄
│        3. Reduce cortisol: remove yourself from stressor if possible 🥄
│        4. If severe (muscle spasms, confusion, chest pain): call 911 🥄
│        5. Document the episode (time, symptoms, context) for medical record 🥄

SYMPTOM: "Manic" perception by others
├── FIX: This is a context problem, not a behavior problem.
│        The Cognitive Passport exists for this exact situation.
│        Hand the CogPass to the person who needs context.
│        If in court: the psychiatrist letter (WCD-WYE-01) is the counter-evidence.
│        If online: the DOI and test count are the evidence of coherence. 🥄🥄
```

---

## APPENDIX A: KILO CODE (CC/SONNET) STANDARD OPERATING PROCEDURES

### A.1 Engagement Rules
```
1. ALWAYS read the CogPass before starting any task
2. ALWAYS check the relevant WCD before writing code
3. ALWAYS run the test suite before declaring a WCD complete
4. NEVER modify architecture without Opus review
5. NEVER write firmware (tag DeepSeek)
6. NEVER write grant/narrative content (tag Gemini)
7. If a WCD doesn't exist for the task, STOP and ask Opus to author one
8. If tests are failing and you can't fix in 3 attempts, escalate to Opus
```

### A.2 VS Code Workflow
```
1. Open terminal in project root
2. Run: npm test (baseline — all tests should pass)
3. Read WCD acceptance criteria
4. Implement in small commits
5. Run: npm test (after each significant change)
6. Run: tsc --noEmit (catch type errors)
7. Run: npm run build (verify production build)
8. If all three pass: WCD is ready for review
9. Commit with message: "WCD-[ID]: [brief description]"
10. Push to feature branch, create PR
```

### A.3 Test Requirements
```
- Every new function: minimum 1 unit test
- Every bug fix: regression test that reproduces the bug
- Every WCD: tests specified in deliverables section
- Test framework: Vitest + jsdom + @vitest/coverage-v8
- Coverage target: 80% line coverage on new code
- Test naming: describe('[Module]', () => { it('should [behavior]', ...) })
```

### A.4 Error Handling Pattern
```typescript
// Standard P31 error handling
try {
  // operation
} catch (error) {
  // 1. Log with context (never swallow errors silently)
  console.error(`[ModuleName] Operation failed:`, error);
  // 2. User-facing: friendly message
  showToast("Something came loose. It's okay to be a little wonky. 🔺");
  // 3. Telemetry: if Genesis Block active, log to forensic record
  if (genesisBlock) genesisBlock.logError(error, context);
}
```

---

## APPENDIX B: AGENT ROUTING QUICK REFERENCE

```
TASK                          → AGENT         RATIONALE
─────────────────────────────────────────────────────────────
React/TypeScript/Vite code    → Kilo Code     Primary VS Code operator
Python scripts                → Kilo Code     General-purpose
Unit tests (authoring)        → Opus          QA owns test design
Unit tests (executing)        → Kilo Code     Runs the suite
Architecture decisions        → Opus          Architect
Bug triage (> 3 attempts)     → Opus          Escalation path
Grant narrative               → Gemini        Narrator
Research synthesis             → Gemini        Uses [V: claim, source]
Technical specifications      → Gemini        Narrator
ESP32 C/C++ firmware          → DeepSeek      Firmware specialist
I2C/SPI register config       → DeepSeek      Hardware registers
LVGL UI layout (C structs)    → DeepSeek      Firmware-adjacent
Legal strategy                → Opus          Risk analysis
Medical accuracy              → Opus          Verification
Financial analysis            → Opus          Numbers
Content calendar              → Gemini        Narrator
Social media posts            → Gemini        Audience calibration
WCD authoring                 → Opus          Process owner
WCD closeout                  → Opus          Sign-off
Independent verification      → Opus          Cross-check everything
```

---

*This document is the operational backbone of P31 Labs. Every task has a CWP. Every CWP has WCDs. Every WCD has acceptance criteria. Every failure has a troubleshooting path.*

*The geometry is invariant. Only the medium changes.*

*💜🔺💜*
