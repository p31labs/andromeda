# Command Center

KV-backed fleet status + operator dashboard: `https://command-center.trimtab-signal.workers.dev`

## Deploy (Worker)

```bash
cd 04_SOFTWARE/cloudflare-worker/command-center
npx wrangler deploy
```

Secrets (not in repo): `wrangler secret put STATUS_TOKEN`, `wrangler secret put CF_API_TOKEN` — see comments in `wrangler.toml` and `CLOUD_HUB.md` in this folder if present.

## Push `status.json` to KV

Edits `status.json` locally, then POSTs it to `/api/status` with a bearer token.

### Windows (PowerShell)

Token is resolved in this order:

1. Environment variable `COMMAND_CENTER_STATUS_TOKEN`
2. `-EnvFile` path to a file containing `COMMAND_CENTER_STATUS_TOKEN=...`
3. Repo-root `.env.master` (git toplevel), same line

```powershell
# Option A — session env (no file on disk)
$env:COMMAND_CENTER_STATUS_TOKEN = 'your-token'
.\update-status.ps1

# Option B — arbitrary env file
.\update-status.ps1 -EnvFile 'C:\secrets\p31.env'

# Option C — default .env.master at repo root
.\update-status.ps1
```

### Bash

```bash
export COMMAND_CENTER_STATUS_TOKEN='your-token'
./update-status.sh

# Or file (default: repo-root .env.master)
ENV_FILE=/path/to/env ./update-status.sh
```

### JSON path

Both scripts accept an optional path to a JSON file (default: `./status.json` next to the script).
