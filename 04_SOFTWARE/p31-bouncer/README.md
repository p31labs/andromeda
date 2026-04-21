# p31-bouncer

**Status:** 🟢 Live
**Deployed:** 2026-04-21
**CWP:** 25 (JWT Auth)

## Purpose

Cryptographic gateway. Converts room codes into signed JWTs via PBKDF2 key derivation.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth` | Mint JWT from room code |
| POST | `/verify` | Validate JWT |

## Quick Test

```bash
curl -s -X POST https://p31-bouncer.trimtab-signal.workers.dev/auth \
  -H "Content-Type: application/json" \
  -d userId:test
```

## Secrets

```bash
npx wrangler secret put P31_JWT_SECRET
```

## Deploy

```bash
cd ~/andromeda/04_SOFTWARE/p31-bouncer && npx wrangler deploy
```

## See Also

- [Security](../docs/SECURITY.md)
