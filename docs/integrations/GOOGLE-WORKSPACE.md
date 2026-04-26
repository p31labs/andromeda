# Google Workspace hookups for P31

**Goal:** use **P31** (Command Center, future Workspaces, Workers, or local scripts) with **Google Workspace** the org already pays for: identity, email, calendar, and files—without making Google the system of record for *everything*.

**Principles:** least-privilege OAuth scopes, secrets only in `wrangler secret` / 1Password / `.dev.vars` (gitignored), never ship client secrets in a public Pages bundle.

---

## 1. Pick your hookup pattern

| Pattern | When | What you get |
|--------|------|----------------|
| **A. User OAuth 2.0 (per operator)** | Workers or Node scripts act *as you* (read calendar, post event, list Drive) | Refresh token stored in **D1/KV** (encrypted at rest; rotate). |
| **B. Service account + domain-wide delegation** | Server automation *as* any user in `@yourdomain` (e.g. ingest a shared Drive folder) | Requires **Workspace super-admin** to authorize the SA client ID + **OAuth scopes** once. No user pop-up. |
| **C. Service account (no delegation)** | Access **shared drives** or resources shared explicitly with the SA email | Simpler; no admin-wide consent; share folders to `sa@project.iam.gserviceaccount.com`. |
| **D. OpenID Connect (SSO into Cloudflare / app)** | “Sign in with Google” using Workspace accounts to protect **p31** apps | **Google** as IdP; separate from Calendar/Drive API. |
| **E. Gmail-only via Workspace + routing** | No API—use **Email Routing** (Cloudflare) + MX on Google | Already compatible; API optional for “send as” from a Worker. |

Most teams start with **A** for a single admin account, then add **B** or **C** for automation. **D** is for **access gating** (e.g. Cloudflare Access) rather than “read my email.”

---

## 2. Google Cloud project (one for “P31 integrations”)

1. [Google Cloud Console](https://console.cloud.google.com/) → **Create project** (e.g. `p31-integrations`).
2. **APIs & Services → Enable APIs and Services** — enable only what you need (see §5).
3. **OAuth consent screen**  
   - **Internal** = only your Workspace domain (fastest, no Google verification for restricted scopes in many cases).  
   - **External** = if you use `@gmail.com` testers or the public; **sensitive** scopes (Gmail) may need verification.  
4. **Credentials → Create credentials**  
   - **OAuth client ID** → Application type: **Web application** (or **Desktop** for CLI smoke tests).  
   - **Authorized redirect URIs** (examples):  
     - `https://<your-worker>.workers.dev/oauth/callback`  
     - `https://integrations.p31ca.org/oauth/callback`  
     - `http://127.0.0.1:8787/oauth/callback` (Wrangler dev)  
5. Download **Client ID** / **Client secret**; put in env / `wrangler secret` — **never** in git (see [env.google.example](env.google.example)).

---

## 3. OAuth scopes (start small)

Request **only** what the feature needs. Google lists [Workspace OAuth scopes](https://developers.google.com/workspace/guides/configure-oauth-consent#scopes).

| Feature | Example scope | Notes |
|---------|----------------|-------|
| Sign-in + profile | `openid` `email` `profile` | OIDC; often enough for “who are you.” |
| Calendar (read) | `https://www.googleapis.com/auth/calendar.readonly` | List events, free/busy. |
| Calendar (write) | `https://www.googleapis.com/auth/calendar.events` | Create/update events. |
| Drive (pick / read) | `https://www.googleapis.com/auth/drive.readonly` or `drive.file` | `drive.file` = files opened or created by the app. |
| Gmail (read) | `https://www.googleapis.com/auth/gmail.readonly` | Sensitive; avoid unless product requires it. |
| Gmail (send) | `https://www.googleapis.com/auth/gmail.send` | Send *only* (narrower than full Gmail). |
| Admin Directory | `https://www.googleapis.com/auth/admin.directory.user.readonly` | **Service account + delegation**; admin approval. |

**Grant fatigue:** add scopes in **phases**; changing scopes re-prompts users.

---

## 4. Domain-wide delegation (service account) — the “automation” hook

Used when a **Worker** or cron must call Gmail/Calendar **as** `ops@p31ca.org` without a browser.

1. **IAM** → create **Service account** → note **Client ID** (numeric) and create **JSON key** (download once; store in 1Password; **delete local file** after `wrangler secret` upload).  
2. **Admin console** (Workspace): **Security → Access and data control → API controls → Domain-wide delegation**  
   - **Add new** → enter **Client ID** from the service account.  
   - **OAuth Scopes (comma‑separated)** = exact strings you need (e.g. `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/drive.readonly`).  
3. In code, use the official client libraries’ **“impersonation”** / **subject** field: `subject: 'ops@p31ca.org'`.

**Caution:** delegation is **powerful**—treat the JSON key like a **root cert**; rotate, narrow scopes, and audit in Cloud Logging if enabled.

---

## 5. APIs to enable (typical P31 set)

In **APIs & Services → Library**, enable as needed:

- **Google Calendar API** — events, ICS, webhooks (push) for sync.  
- **Google Drive API** — file metadata, export, shared drives.  
- **Gmail API** — only if you automate mail (otherwise prefer routing + IMAP in a mail client).  
- **Admin SDK API** — directory (users/groups) with delegation.  
- **People API** — contacts (often redundant with `email` if you only need sign-in).  
- **Google Tasks API** — optional, if you want task sync later.

**Push notifications:** Calendar and Drive can **watch** resources and POST to a **public HTTPS** endpoint (your Worker with verification token). Add **Pub/Sub** in GCP if you use the recommended channel type for some APIs (Calendar v3 can use [HTTP webhook](https://developers.google.com/calendar/api/guides/push) with care).

---

## 6. Wiring to Cloudflare Workers

1. **Store secrets:**  
   - `npx wrangler secret put GOOGLE_CLIENT_ID` (and `GOOGLE_CLIENT_SECRET` if used server-side).  
   - For **refresh tokens** (user OAuth A): encrypt or at minimum restrict by user id in D1; consider **Cloudflare Hyperdrive** only if you later add Postgres to mirror tokens.
2. **Redirect handler:** a route `GET /oauth/google` → build auth URL; `GET /oauth/callback` → `code` exchange → store refresh token.
3. **Token refresh** `POST https://oauth2.googleapis.com/token` with `refresh_token` + `client_id` + `client_secret` (or JWT for service accounts).
4. **CORS:** only your Workspaces or hub origin; never `*` for OAuth callback paths that carry `code=`.
5. **CSP / cookies:** if you set session cookies after Google login, `HttpOnly` `Secure` `SameSite=Lax` minimum.

**Anti-pattern:** pasting a **Client secret** in a Vite/ Astro **public** env — scripts are visible; use **Worker-only** for secret exchange, or use **PKCE**-only public clients for mobile; for a server Worker, keep secret on server.

---

## 7. “Sign in with Google” (SSO) without Calendar/Drive

If the only need is **Workspace accounts on your domain** for **Cloudflare Access** or a **P31** app:

- **Google** → **OpenID Connect** in Cloudflare [Access identity providers](https://developers.cloudflare.com/cloudflare-one/integrations/google/).  
- Or use the same OAuth app with scopes `openid email profile` and validate **HD** (hosted domain) claim = `p31ca.org` (or your domain) in the Worker to **reject** consumer Gmail if policy requires.

This is **not** the same as *Calendar API*—you can have SSO **without** any Google data API.

---

## 8. Email: API vs routing

- **No API needed:** set **Google Workspace** as the mailbox; use **Gmail** in the browser; P31 just documents **signatures** ([Open Doc Suite](../corporate/suite/)).  
- **API send:** Worker with **Gmail API** + `gmail.send` to send from `noreply@` or **domain alias**—ensure **SPF/DKIM/DMARC** on the domain.  
- **Ingest:** **Pub/Sub** + Gmail push to Worker is **heavy**; prefer **label + periodic sync** for low volume.

---

## 9. Calendar: bidirectional with P31

- **Export** Google → **ICS** URL (Workspace calendar **secret address**) — P31 can **subscribe** in **read-only** without OAuth (if URL is in env).  
- **Write** (create event when grant deadline saved): use **Calendar API** with OAuth A or B.  
- **Conflict policy:** P31 is **not** the source of truth for “all of life”—store **P31-sourced** events in a dedicated calendar (e.g. `P31 Ops`) to avoid mashing up personal and org.

---

## 10. Drive: attachments and “source of truth”

- **Link-out:** Workspaces shows **“Open in Drive”** for a `drive.google.com` file ID; no copy in R2.  
- **Ingest to R2:** on explicit user action, Worker calls **Drive `files.get` with `alt=media`** and uploads to R2 (watch Quota + copyright).  
- **Shared Drive:** service account must be a **member** of the shared drive; prefer **C** pattern (share to SA) before delegation.

---

## 11. Compliance and audit

- **Google Workspace** admin audit logs (who authorized domain-wide delegation, OAuth grants).  
- P31: log **Client ID, scope, time** in D1 when a user or admin connects—no message bodies in logs.  
- **COPPA / legal:** if minors’ data could touch Google, align with your counsel; Workspaces for Education vs standard Workspace differs.

---

## 12. Verification checklist (OQE-friendly)

- [ ] OAuth app **Internal** (or External with verification if needed).  
- [ ] **Redirect URI** exact match in Cloud Console.  
- [ ] Scopes are **minimal**; documented in this repo and in Google consent screen.  
- [ ] `GOOGLE_CLIENT_SECRET` only in Worker secrets / private env.  
- [ ] Service account JSON **not** in `git` (scan with `git-secrets` / `gitleaks`).  
- [ ] `HD` or email domain check for Workspace-only policy (if required).  
- [ ] Token storage strategy documented (rotate + revoke runbook).  

---

## 13. Related P31 docs

- [`P31-WORKSPACES-SITE-PLAN.md`](../P31-WORKSPACES-SITE-PLAN.md) — where Calendar/Drive/“mail” fit in the sovereign shell.  
- [`docs/EDGE-SECURITY.md`](../EDGE-SECURITY.md) — trust boundary for Workers.  
- [`Open Doc Suite`](../corporate/) — org-facing docs and signatures.  

When you add a real Worker, create **`CWP-P31-GOOGLE-2026-01`** (or similar) and link it here with **exact** scopes and production redirect URIs.

---

## 15. In-repo implementation: `p31-google-bridge`

A Cloudflare Worker lives at **`04_SOFTWARE/p31-google-bridge`**:

- **`GET /auth`** — Web login: **OAuth** + **manual token** form (refresh token preferred, access token short-lived; e.g. from [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) with your own client).
- **`GET /oauth/google/start?return=`** — Optional return URL after login (allowlisted via **`OAUTH_RETURN_ALLOWLIST`** in `wrangler.toml`). **`POST /api/tokens/submit`** — same session cookie as OAuth.
- **p31ca.org** — [`/auth.html`](https://p31ca.org/auth.html) links to the bridge with `?return=<current page>` so users land back on the hub after either flow.

The placeholder KV id in `wrangler.toml` must be replaced with your `wrangler kv namespace create` output before deploy. **CORS** is configurable; session cookies are **host-only** (bridge origin). For **cross-origin** fetches to `/api/*` with credentials, add your Pages origin to `CORS_ALLOW_ORIGIN`; the cookie still belongs to the **bridge** host.

**Automation:** `npm run preflight` and `npm run print:redirect` in `p31-google-bridge`; `GET /setup` and `GET /api/google/ready` on the deployed Worker; CI workflow `p31-google-bridge.yml`.

---

## 16. Quick reference links

- [Using OAuth 2.0 to access Google APIs](https://developers.google.com/identity/protocols/oauth2)  
- [Workspace OAuth: configure consent](https://developers.google.com/workspace/guides/configure-oauth-consent)  
- [Domain-wide delegation (service account)](https://support.google.com/a/answer/162106) (Admin Help)  
- [Calendar API: Node quickstart](https://developers.google.com/calendar/api/quickstart/nodejs) (adapt to Workers: `fetch` + token refresh)
