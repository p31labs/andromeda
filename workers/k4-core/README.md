# k4-core — K₄ Settlement Core Worker

**Version:** 3.0.0-justice
**Purpose:** Unified API for K₄ Settlement (Identity, Economy, Justice, Governance)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ k4-core                                                     │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                 │
│ │ /care     │ │ /love     │ │/governance│                 │
│ │ (LOVE     │ │ (LOVE     │ │ (DAO)     │                 │
│ │ Circuit)  │ │ Ledger)   │ │           │                 │
│ └───────────┘ └───────────┘ └───────────┘                 │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                 │
│ │ /passport │ │ /mesh     │ │ /dispute  │                 │
│ │ (Identity)│ │ (K₄)      │ │ (Justice) │                 │
│ └───────────┘ └───────────┘ └───────────┘                 │
│ ┌───────────┐                                               │
│ │/settlement│                                               │
│ └───────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

## Endpoints

| Path | Purpose | Status |
|------|---------|--------|
| `/health` | Health check | ✅ Live |
| `/care/*` | LOVE Circuit (spoon sync) | ✅ Live |
| `/love/*` | LOVE Ledger (balance/mint/spend) | ✅ Live |
| `/governance/*` | DAO proposals/voting | ✅ Live |
| `/passport/*` | Identity (stub) | 🔜 Pending |
| `/mesh/*` | K₄ topology (stub) | 🔜 Pending |
| `/dispute/*` | Dispute resolution | ✅ Live |
| `/settlement/*` | Settlement management | ✅ Live |

## Testing

```bash
# Unit + integration tests
pnpm test

# Smoke tests (live production)
./scripts/smoke-test.sh

# E2E flows
./scripts/e2e-onboarding.sh
./scripts/e2e-governance.sh
./scripts/e2e-dispute.sh
```

## Deployment

```bash
# Standard deployment
pnpm deploy

# Gradual deployment (10% canary)
./scripts/gradual-deploy.sh 10

# Rollback
./scripts/rollback.sh --version-id <VERSION_ID>
```

## Bindings

- **D1:** capital-db, governance-db, love-ledger
- **KV:** CAPITAL_KV, GOVERNANCE_KV, LOVE_KV
- **Durable Objects:** GovernanceEngineDO, LoveTransactionDO
- **Queue:** p31-events
