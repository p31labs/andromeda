# P31 Workspaces — full-site plan (architecture & roadmap)

**Status:** planning artifact — not a committed build order until a CWP/revision is opened.  
**Last updated:** 2026-04-26

**Companion (experiential + speculative):** [`P31-WORKSPACES-DEEP-DIVE.md`](P31-WORKSPACES-DEEP-DIVE.md) — graph navigation, “four pressures,” holographic documents, Larmor day, slow sync, ceremony mode, anti-feed, mesh honesty, aesthetic stance, Phase Ω (labeled fiction), vignettes, tension list.

---

## 1. North star

Deliver a **unified, sovereign productivity surface** for P31 Labs and aligned contributors: identity, files, time, comms, and documents—**without** locking the org into a proprietary US‑big‑tech productivity suite. The experience should feel “workspace-grade” (single sign-on, one home, one search entry point) while remaining **open-source first**, **edge-deployed**, and **legally controllable** (data export, DPA, audit trail).

**Tagline (draft):** *One cockpit for the mesh — your files, your keys, your edge.*

**Non-goals (initial):**
- Parity with every Google Workspace or Microsoft 365 feature on day one.
- Enterprise MS Exchange / Google Vault–class ediscovery (without dedicated budget and counsel).
- Replacing the **public** technical hub (p31ca.org) or the **institutional** site (phosphorus31.org) — they stay parallel brands; Workspaces is **operator and contributor** infrastructure.

---

## 2. Positioning in the P31 map

| Surface | Role | Relationship to Workspaces |
|---------|------|----------------------------|
| **p31ca.org** | Technical hub, product graph, static apps | Workspaces **links** here for tools; may embed an iframe or handoff only where safe. No merge into one deploy unless a later CWP says so. |
| **phosphorus31.org** | Programs, public narrative | Out of scope; Workspaces is **not** a marketing site. |
| **Open Doc Suite** (`docs/corporate/`) + **P31 Forge** | Print HTML, .docx, brand | **Docs pillar** of Workspaces **consumes** these; Forge remains the `docx` engine. |
| **Command Center / Cloud Hub** (Workers) | Fleet health, CF API | **Admin / ops** view inside Workspaces or deep-link. |
| **K₄ / mesh** (k4-cage, connect.html) | Family/collaboration graph | **People & org chart** and **room** metaphors can align with K₄; identity graph is product truth, not prose. |
| **Passkey worker** (stub) | WebAuthn | **Auth pillar** should land here as production. |

**Domains (proposal):** `workspaces.p31ca.org` (primary) or `ws.p31ca.org` (short); separate Cloudflare Pages or Worker+bundle project so routing and WAF are isolated from the public hub.

---

## 3. Personas

1. **Operator (Will)** — full admin, banking/grant PII, legal handoffs, all rooms.
2. **Core contributor** — repo write, some R2 folders, no finance keys.
3. **Volunteer / reviewer** — read-mostly, time-boxed project folder, optional Discord-linked identity.
4. **Family mesh vertex (S.J., W.J., etc.)** — child-safe surfaces only; no adult legal or finance; **initials only** in UI copy per policy.
5. **Auditor / fiscal sponsor (future)** — read-only grant attachments + immutable logs.

---

## 4. Product pillars (full vision)

Each pillar can ship incrementally. Everything listed should be **plausible** on Cloudflare + open backends without inventing a second hyperscaler unless a phase explicitly funds it.

### 4.1 Home & shell

- **Dashboard:** upcoming events, open tasks, recent files, mesh health (from real APIs where available), “continue in…” links to in-suite apps.
- **Global search (phase 2+):** index metadata across R2, D1, and linked Git; no claim of Google-scale relevance day one.
- **Notification center (phase 2+):** in-app toasts + optional email/Discord webhooks; user-controlled.

### 4.2 Identity & access

- **Primary auth:** passkeys (WebAuthn) with Worker + D1 + KV (existing stub in `p31ca/workers/passkey` → promote to production, bind to Workspaces project).
- **Optional “Sign in with Google” (Workspace @yourdomain):** OpenID `openid email profile` + **HD** (hosted domain) check; can pair with [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/integrations/google/) for zero-trust edges. **API access** to Calendar/Drive/Gmail is separate OAuth — see [`docs/integrations/GOOGLE-WORKSPACE.md`](../integrations/GOOGLE-WORKSPACE.md).
- **Session model:** short-lived JWT or sealed cookie; rotate; optional **Cloudflare Access** in front for staff-only paths during beta.
- **Roles (RBAC):** `owner`, `admin`, `editor`, `viewer`, `child` (feature-flagged). Stored in D1, enforced in every Worker.
- **Org/tenant model:** single-tenant (P31 Labs) first; **multi-tenant** only with a later ADR and data isolation design.

### 4.3 Mail & identity (lightweight, not a mail server)

- **Not** self-hosting SMTP at MVP (deliverability, abuse, time sink).
- **MVP:** curated **email signature** asset sync (HTML + text from Open Doc Suite), **mailto templates**, **routing table** of role aliases (who answers press@, grants@) — as **documentation + DNS checklist**, not a mailbox product.
- **Google Workspace hookups (when you need them):** OAuth, Gmail send scope, service-account delegation — [`docs/integrations/GOOGLE-WORKSPACE.md`](../integrations/GOOGLE-WORKSPACE.md). Keep inboxes in Google until P31’s **Worker + consent** model is ready.
- **Phase 2+ (optional):** bring-your-own **forwarding** (Cloudflare Email Routing already on zone) with documented rules; still no full “Gmail in Workspaces.”

### 4.4 Calendar & time

- **MVP:** org **ICS** feeds (e.g. public deadlines + private D1-stored events) and export; subscribe in any CalDAV client.
- **Google Calendar:** use **ICS secret URL** (read) without OAuth, or **Calendar API** (create/update) per [`docs/integrations/GOOGLE-WORKSPACE.md`](../integrations/GOOGLE-WORKSPACE.md) — use a dedicated `P31 Ops` sub-calendar to avoid entangling personal events.
- **Phase 2:** small **web calendar** (month grid) with CRUD, permissions, and **Kids / court / grant** color channels.

### 4.5 Drive (files)

- **Store:** R2 per tenant/prefix; presigned upload/download via Worker; **virus scanning** optional (bucket egress to scanner Worker or future integration).
- **Google Drive link-out or ingest:** open `drive.google.com` by file ID, or use **Drive API** to pull a file into R2 on user action—[`docs/integrations/GOOGLE-WORKSPACE.md`](../integrations/GOOGLE-WORKSPACE.md) (shared drive + service account pattern).
- **Metadata:** D1: path, size, ETag, who uploaded, label (grant / legal / public).
- **Versioning (phase 2):** R2 object versioning or explicit version chain in D1.
- **PII / legal holds:** `Legal_Inventory` tags; no sync of sealed discovery to R2 in automated paths without explicit runbook (manual upload only).

### 4.6 Docs (authoring & PDF)

- **In-suite:** list Forge jobs, last compile, link to `docs/corporate` print pack; “open in new tab” to static HTML under `p31ca` or a dedicated `workspaces` static pack.
- **Editor (phase 2+):** Markdown in browser with version history in Git or in R2+manifest — choose one in implementation ADR; avoid duplicating Confluence.
- **Export:** `forge.js compile` from CI or a **restricted** Worker action with secrets vault.

### 4.7 Sheets (tabular)

- **MVP:** template gallery pointing at Open Doc Suite `grant-budget-template.csv` + in-browser **CSV editor** (no server formula engine at first) or **link-out** to LibreOffice / Excel with download from R2.
- **Phase 2:** simple shared tables in D1 with **audit column** and export CSV (still not a full Airtable).

### 4.8 Chat & presence (optional / late)

- **MVP:** **Discord** as the real-time bus (existing community); Workspaces shows **link-out** and **webhook** status only.
- **Phase 2+:** if needed, **Matrix** or **Mattermost** self-host ADR; avoid building chat from scratch.

### 4.9 Forms & intake

- **Grant inquiry, press, volunteer:** Turnstile + Worker + D1 + optional R2 upload; **export CSV**; spam scores.

### 4.10 Admin & compliance

- **User list, role edits, session revoke, audit log (D1).**
- **Export all my data (GDPR-style)** — zip of R2 prefix + D1 row dump.
- **Backup story:** R2 replication rule + periodic D1 export to R2; documented restore drill.

### 4.11 Mesh & K₄ tie-in (differentiator)

- **Surface live cage state** (where Worker exists) on a **Mesh** card: health, last event — **only** from service bindings, not static numbers in README.
- **Optional:** assign default **room** and **file ACL** to graph edges (out of scope for MVP; design in ADR).

---

## 5. Information architecture (site map)

```
/ (dashboard)
├── /inbox        (forms + notification feed; phase 2)
├── /calendar
├── /files        (R2 browser)
├── /docs         (Forge + open doc pack portal)
├── /sheets       (CSV tools; phase 1 = templates)
├── /settings     (profile, passkeys, sessions, exports)
├── /mesh         (K₄ / connect handoff, embedded or deep link)
└── /admin        (owner only — users, R2 policies, webhooks, audit)
```

**Public marketing page:** single `/about` for **what is P31 Workspaces** (1 screen) + link to p31ca.org; **no** public catalog of PII.

---

## 6. Technical architecture (proposed)

| Layer | Choice | Notes |
|-------|--------|--------|
| **Frontend** | Astro or Vite+React, SSR optional via Workers; match p31ca stack skills | Shared design tokens from `brand-tokens.json` + Forge. |
| **API** | Cloudflare Workers (REST + optional WebSocket for notifications) | Same account as existing fleet. |
| **Auth** | D1 + passkeys; secrets in `wrangler secret` | Harden CORS, CSRF, rate limits. |
| **Data** | D1 (users, files metadata, events, audit), R2 (blobs) | R2 no listing from browser without Worker. |
| **Queues** | Queues for async (virus scan, PDF gen, index rebuild) if needed | Phase 2. |
| **Search** | Start with D1 `LIKE` + tags; add **upstash/Typesense/Meilisearch** only if load demands | ADR if added. |
| **Observability** | Logpush + Sentry (free tier) for Worker errors | No PII in client logs. |

**Repo layout (proposal when implemented):** `04_SOFTWARE/p31-workspaces/` (Astro app + `workers/api/` + `wrangler.toml`); or split **Pages (UI)** + **Worker (API)** projects like other apps.

---

## 7. Security & policy

- **Default deny** on R2; signed URLs; content-type allowlist; max upload size per role.
- **CSP** strict; **Turnstile** on public forms.
- **Key custody:** passkey-only for admin; TOTP optional for recovery after ADR.
- **Court / discovery:** do not store sealed discovery in Workspaces R2; link to process on **local** or counsel-approved storage only.
- **Children:** `child` role = no DMs to external, no PII on export without guardian flow.

---

## 8. Phased roadmap (execution order)

| Phase | Timebox (indicative) | Deliverables |
|-------|----------------------|-------------|
| **0 — Foundation** | 1–2 sprints | ADR, domain, empty Pages+Worker, health route, D1 schema v0, `owner` only, no user signup (manual SQL seed). |
| **1 — Identity & shell** | 2–3 sprints | Passkey E2E, session, settings, dashboard with static cards, link to p31ca + open-doc-suite, audit log for login. |
| **2 — Files (R2)** | 2–3 sprints | Upload/download, folders as prefix convention, D1 index, `editor` / `viewer` roles. |
| **3 — Calendar + forms** | 2 sprints | ICS in/out, grant inquiry form, Turnstile. |
| **4 — Docs portal** | 1–2 sprints | Forge “compile this pack” from UI (guarded) or list jobs from CI; print pack deep links. |
| **5 — Mesh + admin hardening** | ongoing | K₄ read-only card, R2 backup policy, data export, session revoke at scale. |

**Explicit deferrals:** self-hosted IMAP, native mobile apps, real-time co-editing of docs, “AI assistant” in every field.

---

## 9. Open-source / sovereign mapping (the “not Google” matrix)

| Big-suite pattern | P31 Workspaces direction |
|-------------------|-------------------------|
| Gmail | Zone email routing + external client; in-suite: signatures & opsRunbook. |
| Drive | R2 + Worker + D1 metadata. |
| Calendar | ICS + D1; optional later CalDAV bridge. |
| Docs | Open Doc Suite + P31 Forge + MD editor. |
| Sheets | CSV + D1-tables (lite). |
| Meet | Jitsi link-out or Daily.co (ADR) — not custom WebRTC in MVP. |
| Admin console | D1 + audit + R2 policy UI. |
| Chat | Discord / Matrix (link-out). |

---

## 10. Cost & operations

- **CF bill:** R2, Workers, D1, KV — monitor; set billing alerts; **$0 dev** on free tiers for prototype if usage minimal.
- **Time tax:** self-hosted productivity always costs **operator hours**; phase gates should include “Will can run restore alone in <1h” before calling it production.

---

## 11. Success metrics (first year)

- **SLO:** API p95 &lt; 500ms for file list; passkey sign-in &lt; 2s p95.
- **Adoption:** 5+ non-operator accounts with real file activity (when contributors exist).
- **Security:** 0 PII in public repo incidents; 100% audit on role changes.
- **Continuity:** one documented R2/D1 restore drill per quarter (even if “dry”).

---

## 12. Decisions to lock in an ADR (before build)

1. **Single-tenant** vs eventual multi-tenant.  
2. **Where Markdown canonical lives** (Git only vs D1 + R2).  
3. **Search** technology or defer until 200+ files.  
4. **Mesh card:** read-only from which Worker (k4-cage only vs aggregator).  
5. **Custom domain** and **separate** CF project (recommended yes).

---

## 13. Related docs to keep synchronized

- `docs/corporate/P31-DOC-SUITE.md` — will gain a “Workspaces integration” paragraph when phase 4 starts.  
- `docs/EDGE-SECURITY.md` — extend with Workspaces R2 and auth scope.  
- `04_SOFTWARE/p31ca/ground-truth/p31.ground-truth.json` — **do not** overload; add a `workspaces` route only when a real public path ships.  
- New CWP: **`CWP-P31-WS-2026-01`** (or similar) when implementation begins.

---

*End of plan — implementation starts only after CWP/ADR and operator sign-off on scope and domain.*
