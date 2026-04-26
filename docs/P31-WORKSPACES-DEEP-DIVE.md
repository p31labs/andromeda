# P31 Workspaces — deep dive (imaginative + binding constraints)

**Companion to:** [`P31-WORKSPACES-SITE-PLAN.md`](P31-WORKSPACES-SITE-PLAN.md) (execution-shaped plan; this file is the **speculative / experiential** layer).  
**Status:** design fiction + engineering handrails — not all of this ships.  
**Last updated:** 2026-04-26

---

## 0. Why “Workspaces” is the wrong word (and we keep it anyway)

The commercial word *workspace* smuggles in a 1950s office: desk, clock, IN/OUT tray. P31 is not recreating a cubicle. What you are building is closer to a **field** or **enclosure**—a place where *forces* (legal, health, money, care, attention) are visible at once, and where the tools don’t pretend neutrality. The public URL can still be `workspaces.*` for discoverability, but the **internal codename** might be **Field**, **Cage** (in the Posner sense: *stability*, not confinement), or **Cockpit** (flight, not combat—operator clarity).

**Design principle:** every screen answers: *what load am I holding right now, and what is the smallest honest next action?*

---

## 1. Topology: navigate the mesh, not the tree

Classic suites assume a **hierarchy**: Org → Team → Project → File. That tree is a power structure shipped as UI.

A more imaginative (and P31-faithful) model treats navigation as a **graph**:

| Layer | What it is | UI sketch |
|-------|------------|------------|
| **Vertices** | People, legal entities, pillars (a/b/c/d if personal), *and* the four pressures (see §2) | Tap a vertex: see *edges* to commitments. |
| **Edges** | Commitments, shared files, time-bound handoffs, “this person owns the grant line” | Thickness = urgency; color = trust domain. |
| **Faces** | Projects, rooms, *surfaces* (a grant packet is a *face* of the same crystal as a repo) | A “project” is not a folder; it’s a *closure* of edges. |

**Imagination budget:** a **graph home** (force-directed, readable, reduced-motion off) is expensive to build. **MVP translation:** start with a **list + tags + strong search**, but *design tokens and copy* should say *mesh*, not *folder*. Folders in R2 are a **storage implementation**; the UI can call them *strata* or *lockers* to avoid false familiarity.

**Binding constraint:** the live graph must not invent edge weights from **prose in docs**—only from **APIs** (K4 worker, registry counts, D1) per OQE rules.

---

## 2. The four pressures (gauges that are allowed to say “I don’t know”)

Give the shell **four always-visible, low-noise channels** (not notifications—*state*):

1. **Legal** — open loops (hearing, filing, response clock). Unknown dates show **“unscheduled”**, not a fake green check.
2. **Capital** — runway / grant / donations as *bands*, not performative precision when the bank data isn’t live-linked yet.
3. **Body** — operator health (Ca band, sleep, etc.) as **opt-in** cards; never a surveillance dashboard. *No gamification; no shame graphs.*
4. **Mesh** — family + contributors as **connectivity** (last meaningful touch, not stalking).

This is how Workspaces **feels** different: **honest ambiguity** is a first-class display state. The competitor suites lie with fake certainty (green “all systems go”). P31 can win on **cognitive trust**.

---

## 3. The Larmor day (time as rhythm, not a grid of anxiety)

The calendar’s imaginative layer: a day is not 24 equal hours—it’s a **ring**. The research anchor (Larmor / ³¹P in Earth’s field) becomes **UX metaphor only**: a gentle **day ring** that marks *depth work*, *admin*, *care*, and *void* (protected empty blocks). *Not* a medical claim; not a “therapy device” label—purely a **pacing scaffold** the operator can disable.

**Wild-but-buildable feature:** *Ceremony blocks*—immutable on calendar, long enough to read a **board packet** or sign a **resolution** with the UI in **ceremony mode** (full-bleed, one task, no sidebar). Think “single-tasking with dignity.”

**Binding:** anything that touches medical compliance stays out of the Workspaces *product claims*; it stays in personal notes or devices where already governed.

---

## 4. Holographic documents: one source, many lenses

A **hologram** in the physics sense: one interference pattern, many reconstructions. For P31, a **holographic doc** is:

- **One** canonical source (likely Markdown in git *or* R2+manifest, decided in ADR),
- **Many emitted surfaces**: *Grant lens* (citations emphasized), *Court lens* (caption + service blocks), *Press lens* (EIN, boilerplate, no PII), *Board lens* (where signatures go).

P31 Forge already encodes *brand* and *section builders*. The imaginative step is a **lens switcher** in the UI: not “export PDF” only—*change how the same truth presents* without duplicating the truth in Slack threads.

**Anti-pattern:** 17 copies of the “same” paragraph drifting across Drives. The lens is **compile-time + policy**, not copy-paste.

---

## 5. Slow sync (luxury) vs live sync (trap)

The big suites sell **real-time** as progress. For legal and grant work, *real-time* is often a **concentration leak**.

**Slow sync (deliberate):** nightly digests, batched R2 index builds, "tomorrow morning" file merges, optional **6-hour** co-authoring for narrative docs. *Edge queues* (Cloudflare) make this natural: write fast locally, **commit intent** to a queue, reconcile under policy.

**Live sync (when it matters):** passkey rotation, access revocation, incident banners—those *must* be near-real-time for security, not for dopamine.

Imagination: a **"quiet hours"** switch that mutes *all* in-suite pings except the four pressures’ *red* states. That’s a differentiator: **attention sovereignty**.

---

## 6. Presence without spying: co-editing the humane way

Don’t import Google’s “8 anonymous animals in your doc” as default *psychological surveillance*. More imaginative options:

- **Hand raise / intent lock:** “I’m editing section 2 for 20 minutes” without cursor tracking.
- **Witness mode (legal):** append-only *witness log* of who opened which *lens* export when—*transparent audit*, not keystroke capture.
- **Child surfaces:** *no* presence, *no* “last seen,” only *parent-approved* activity summaries.

**Binding:** COPPA and court safety rules are non-negotiable; children’s *full names* never appear in Workspaces product paths or logs (initials in UI if ever shown).

---

## 7. The anti-feed: notifications as weather, not slot machines

Replace the default notification center with a **weather report** metaphor:

- **Calm** — nothing time-critical.
- **Winds** — approaching deadlines (grant, response).
- **Storm** — legal or financial red channel (rare, loud).

**No** unread badge arms race. **No** “you’re 3 steps from inbox zero” manipulation.

---

## 8. Strata, lockers, and deep time (files as geology)

R2 is **deep storage**; the edge is **daylight** (fast lists, presigned light). The imaginative layer:

- **Shallow** — this week, hot grant, the deck you’re editing.
- **Strata** — year-ordered layers (2026Q2 / Board / evidence chain).
- **Tomb** — legal hold, immutable, *deliberately cold* (extra friction to open, color desaturated, maybe **two-person rule** in admin).

A **"dig"** action (search across strata) is both metaphor and *honest* latency: *searching the past should feel like digging*, not “instant 20 results” fakery. If it’s fast technically, the UI can still *sequence* results by **recency and trust**, not ad relevance.

---

## 9. Mesh card: the live cage without theater

The shell should show **K₄ / mesh** state as a **small honest widget**:

- Fetched from **real endpoints** (k4-cage, agreed worker contract).
- If the worker is down: display **"mesh signal unavailable"**—never a stale story.

That’s the imaginative promise: the Workspaces *doesn’t* narrate a healthy family; it *reports signal when signal exists*.

---

## 10. Dream layer (Phase Ω) — keep fiction labeled

This section is **explicitly speculative**; do not book OKRs on it.

- **Offline valise** — an encrypted local vault that *syncs* to R2 when you open the laptop at a library (think *briefcase* mesh, not “sync everything always”).
- **Somatic handoff** — Node-class hardware nudging *without* the Workspaces claiming a medical outcome: *device integration* lives in hardware repos, not here.
- **Federation of small orgs** — two nonprofits, separate tenants, *shared read-only* grant template lens—**multi-tenant** is an ADR-sized revolution; treat as fiction until funded.

**Rule:** every Phase Ω line ships with a **"minimum physics"** footnote: *one Worker, one D1 table, or it stays in this doc*.

---

## 11. Aesthetic: phosphorescent, not “purple SaaS #7”

| Axis | Generic suite | P31 Workspaces (intent) |
|------|-----------------|-------------------------|
| Color | Periwinkle + white | **Coral** (signal), **teal** (ground), **warm paper** (text), **void** (void) — per `brand-tokens` |
| Motion | Bouncy, celebratory | **Sparing**; respect `prefers-reduced-motion` |
| Typography | Inter everywhere | **Georgia** (narrative), **JetBrains** (code, audit) — match Forge |
| Copy | "Great job!" for empty state | **Direct**: "Nothing due today" / "We can’t read the mesh right now" |

**Micro-joy:** a *clean finish* animation when a **ceremony block** ends—not confetti, maybe a *single* line drawn on the Larmor ring (subtle, optional, off by default for sensory sensitivity).

---

## 12. Three vignettes (second person, to stress-test the imagination)

1. **6:10 AM, operator** — You open the Field. The four pressures are *amber* in Legal, *calm* elsewhere. You don’t get a feed; you get **one** suggested *next*—finish the witness list export. The UI doesn’t shame you for yesterday’s void block; it *preserves* it for tonight.

2. **First hour, contributor** — You passkey in. You see **no** org chart of children’s names—only *roles* and *project faces*. You open the grant lens on a document; the citations *light up*; the court lens is *disabled* (you don’t have keys). *That* is trust shown, not a banner about “zero trust.”

3. **Board night** — Ceremony mode. Sidebar gone. The resolution is one column. *Sign / witness* timestamps to D1. The PDF leaves Forge *and* the audit row records *lens* + *hash*. Later, a fiscal sponsor can see *read-only* without Google’s “suggested edits” clownery.

---

## 13. What the giants cannot sell (even if they wanted to)

- **Key custody in your org’s story** (passkeys, exportable policies).
- **Absence of ad logic** in “productivity” (no “smart compose” that trains on your trauma).
- **Redaction as a first-class pipeline**, not a panic button after a leak.
- **Honest empty states** when telemetry is down.

---

## 14. Tension list (imagination vs shipping)

| Imaginative pull | What stops it from becoming vapor |
|------------------|------------------------------------|
| Graph home | Shipped as **list + tags** first; graph is Phase 2+ *or* static snapshot |
| Larmor day ring | Shipped as **optional** calendar skin; off by default |
| Holographic lenses | Shipped as **Forge presets** + JSON lens ids before in-browser WYSIWYG |
| Strata / Tomb | R2 prefix naming + D1 *classification column*; no new physics |
| Mesh widget | **Single** GET, hard timeout, *explicit failure* UI |

---

## 15. Closing: the product is a *stance*

P31 Workspaces, fully imagined, is not *better Google*. It is an assertion that **productivity** can be **somatically honest** (spoons, void, care), **legally legible** (lenses, audit), and **topologically true** to a mesh (graph, pressures, live cage) without turning humans into *metrics*.

The implementation plan in [`P31-WORKSPACES-SITE-PLAN.md`](P31-WORKSPACES-SITE-PLAN.md) is the *scaffolding*. **This** document is the *why it should feel like coming home, not like clocking in*.

When you build, steal from here **one metaphor at a time**—and write the CWP for each that touches **data classification** or **children**.

---

*Ca₉(PO₄)₆ — the cage is stability; the field is where you work without pretending the storm isn’t there.*
