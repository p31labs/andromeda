# Worker Cleanup Runbook — CWP-2026-014 R07
**Date:** 2026-04-04
**Authority:** R04 Worker Inventory + R07 Disposition

Run these commands once per group. Each group is independent — order doesn't matter.

---

## Group A — Delete Stale Local Worker

### p31-social-broadcast (STALE)
Superseded by `p31-social-worker`. Mock APIs only. Routes to `mesh.p31ca.org`.

```bash
# 1. Remove from Cloudflare (deletes the deployed worker, not the code)
npx wrangler delete p31-social-broadcast

# 2. Verify gone
npx wrangler list | grep social-broadcast   # should return nothing

# 3. (Optional) Remove legacy domain route from dashboard:
#    Cloudflare Dashboard → p31ca.org → Workers Routes → delete mesh.p31ca.org/*
```

**Local code:** `04_SOFTWARE/cloudflare-worker/` — keep for audit trail, already marked DEPRECATED in wrangler.toml.

---

## Group B — Delete Dashboard-Only Workers (0 requests)

These workers exist only in the Cloudflare dashboard. No local code. Safe to delete outright.

```bash
# p31-kofi-telemetry (0 req — superseded by p31-kofi-webhook at 388 req)
npx wrangler delete p31-kofi-telemetry

# p31-donation-relay (0 req — superseded by donate-api at 19 req)
npx wrangler delete p31-donation-relay

# stripe-donate (0 req, 31 days inactive — superseded by donate-api)
npx wrangler delete stripe-donate
```

**Note:** `p31-zenodo-publisher` — do NOT delete. It may be referenced by zenodo_upload.py.
Verify first:
```bash
grep -r 'zenodo-publisher\|zenodo_publisher' /home/p31/andromeda --include="*.py" --include="*.js" --include="*.ts"
```
If no references found, then:
```bash
npx wrangler delete p31-zenodo-publisher
```

---

## Group C — Verify Consolidation Complete

After deletions, confirm the active fleet is exactly these 9 Workers:

| Worker | Domain | Purpose |
|--------|--------|---------|
| bonding-relay | trimtab-signal.workers.dev | BONDING multiplayer |
| spaceship-relay | trimtab-signal.workers.dev | Spaceship Earth telemetry |
| genesis-gate | genesis.p31ca.org | Central event bus (new) |
| p31-state | state.p31ca.org | Shared spoon state (new) |
| p31-cortex | trimtab-signal.workers.dev | AI multi-agent cortex |
| kenosis-mesh | trimtab-signal.workers.dev | K4 7-node mesh |
| p31-telemetry | p31ca.org (telemetry) | Performance telemetry |
| p31-kofi-webhook | kofi.p31ca.org | Ko-fi payments |
| p31-social-worker | social.p31ca.org | Social automation |
| donate-api | donate-api.phosphorus31.org | Stripe checkout |

```bash
npx wrangler list
```

Expected: 10 workers (9 original + genesis-gate, or 10 once both new workers are deployed).

---

## Group D — New Workers to Provision and Deploy

### genesis-gate
```bash
# 1. Create KV namespace
npx wrangler kv namespace create EVENTS_KV
# → Copy the id from output

# 2. Update wrangler.toml
#    04_SOFTWARE/genesis-gate/wrangler.toml
#    Replace "REPLACE_WITH_KV_NAMESPACE_ID" with the id above

# 3. Set secret
npx wrangler secret put ADMIN_TOKEN --config 04_SOFTWARE/genesis-gate/wrangler.toml
# → Enter a strong random token (use: openssl rand -hex 32)

# 4. (Optional) Discord governance alerts
npx wrangler secret put DISCORD_WEBHOOK_URL --config 04_SOFTWARE/genesis-gate/wrangler.toml

# 5. Deploy
cd 04_SOFTWARE/genesis-gate
npx wrangler deploy

# 6. Set custom domain
#    Cloudflare Dashboard → Workers & Pages → genesis-gate → Custom Domains → genesis.p31ca.org
```

### p31-state
```bash
# 1. Create KV namespace
npx wrangler kv namespace create P31_USER_STATE
# → Copy the id from output

# 2. Update wrangler.toml
#    04_SOFTWARE/p31-state/wrangler.toml
#    Replace "REPLACE_WITH_KV_NAMESPACE_ID" with the id above

# 3. Deploy
cd 04_SOFTWARE/p31-state
npx wrangler deploy

# 4. Set custom domain
#    Cloudflare Dashboard → Workers & Pages → p31-state → Custom Domains → state.p31ca.org
```

---

## Completion Checklist

- [ ] p31-social-broadcast deleted from dashboard
- [ ] p31-kofi-telemetry deleted
- [ ] p31-donation-relay deleted
- [ ] stripe-donate deleted
- [ ] p31-zenodo-publisher: verified/deleted
- [ ] genesis-gate deployed at genesis.p31ca.org
- [ ] p31-state deployed at state.p31ca.org
- [ ] `npx wrangler list` shows exactly the 10-worker fleet above
- [ ] `scripts/health-check.sh` passes all checks

**R07 Status:** Runbook complete. Execution requires `wrangler auth` in terminal.
