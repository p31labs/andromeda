# p31-foundry-worker

Cloudflare Worker for **P31 Document Foundry** **v1.3**: **R2** artifacts + job JSON, **Queues** (`p31-foundry-jobs`) with a **push consumer** (stub completion), **`GET /v1/jobs`** (R2 list), optional **bearer** auth, and **per-isolate** mutation **rate limit** (`FOUNDRY_RL_PER_MINUTE`).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health + capability JSON (no auth). |
| GET | `/v1/jobs?limit=&cursor=` | List **`jobs/job_*.json`** keys (metadata only); paginate with **`cursor`**. |
| PUT | `/v1/artifacts/by-sha/:sha256/source` | Store bytes at R2 key `artifacts/<sha256>/source.bin`. |
| HEAD, GET | same | Check existence / download. |
| POST | `/v1/jobs` | JSON body → R2 `jobs/job_<uuid>.json` (**`queued`**), message to queue → **202**. |
| GET | `/v1/jobs/:id` | Read job descriptor JSON (poll until **`completed`**). |
| OPTIONS | `/v1/*` | CORS preflight. |

When **`FOUNDRY_AUTH_SECRET`** is set (secret or `.dev.vars`), all **`/v1/*`** routes require:

`Authorization: Bearer <FOUNDRY_AUTH_SECRET>`

**`GET /`** stays open for uptime checks.

## One-time setup

```bash
# R2 bucket (once per account)
npx wrangler r2 bucket create p31-foundry-artifacts

# Queue (name must match wrangler.toml)
npx wrangler queues create p31-foundry-jobs
```

If you rename either resource, edit **`wrangler.toml`**.

Optional local auth:

```bash
cp .dev.vars.example .dev.vars
# edit FOUNDRY_AUTH_SECRET=...
```

Production auth:

```bash
npx wrangler secret put FOUNDRY_AUTH_SECRET
```

## Dev

```bash
cd packages/p31-foundry/worker
npm install
npm run dev
```

Validate config:

```bash
npm run check   # wrangler deploy --dry-run
```

## Deploy

```bash
npx wrangler login
npm run deploy
```

## Python CLI (from repo root)

After `npm run office:install`:

```bash
npm run foundry -- push --url https://<your-worker>.workers.dev --file ./README.md --dry-run
npm run foundry -- push --url https://<your-worker>.workers.dev --file ./README.md --bearer '<secret>'
npm run foundry -- job create --url https://<your-worker>.workers.dev --json '{"type":"demo"}' --bearer '<secret>'
npm run foundry -- job get --url https://<your-worker>.workers.dev --id job_<uuid> --bearer '<secret>'
npm run foundry -- job list --url https://<your-worker>.workers.dev --limit 20 --bearer '<secret>'
```

## Notes

- Consumer is a **stub** (no PDF extract, no D1); extend **`queue()`** in `src/index.js` for real work.
- **`GET /v1/jobs`** returns at most **`limit`** R2 objects under **`jobs/`** (then filtered to **`job_*.json`**); if you store other keys under that prefix, filter client-side.
- **Threat model:** do not deploy with auth off on the public internet if the bucket can hold sensitive data.
