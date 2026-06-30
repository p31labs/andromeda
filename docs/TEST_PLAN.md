# P31 Labs — Test & Inspection Plan (TICWP-001)

**Version:** 1.0
**Date:** July 1, 2026
**Status:** Active

## Test Pyramid

```
      ┌─────────────┐
      │  E2E Tests  │  ← User journeys (5%)
      ├─────────────┤
      │ Integration │  ← Worker + D1 + KV + DO (20%)
      ├─────────────┤
      │   Unit      │  ← Individual functions (75%)
      └─────────────┘
```

## Phase 1: Unit & Integration Tests (CI)

- **Framework:** Vitest + `@cloudflare/vitest-pool-workers`
- **Runtime:** workerd (same as production)
- **Isolation:** Per-test-file storage
- **Coverage Target:** 70%

**Key test files:**
- `workers/k4-core/src/__tests__/handlers.test.ts`
- `workers/k4-core/src/__tests__/integration.test.ts`

**Run locally:** `pnpm test`
**Run in CI:** `.github/workflows/test-k4-core.yml`

## Phase 2: Smoke Tests (Post-Deploy)

- **Tools:** Bash + `curl` + `jq`
- **Frequency:** After every deployment
- **Timeout:** 15 seconds per endpoint

**Test suite:**
- Core health checks (4 endpoints)
- k4-core endpoint validation (4 endpoints)
- Mesh status
- Governance endpoints
- LOVE ledger

**Run:** `./scripts/smoke-test.sh`

## Phase 3: E2E Tests

**Flows:**
1. **Onboarding:** Passport → Settlement → LOVE mint
2. **Governance:** Create proposal → Vote → Execute
3. **Dispute:** Create dispute → List → Resolve

**Run:** `./scripts/e2e-*.sh`

## Phase 4: Gradual Deployments

- **Tool:** `wrangler versions upload` + `wrangler versions deploy`
- **Canary percentage:** 10% → 25% → 50% → 100%
- **Rollback:** `wrangler rollback`
- **Smoke test gate:** Tests must pass before progressing

**Script:** `./scripts/gradual-deploy.sh`

## Observability

- **Dashboard:** Cloudflare Workers Observability tab
- **Tracing:** OpenTelemetry-compliant traces
- **Logs:** `wrangler tail k4-core --format=pretty`

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Unit test coverage | >70% | Vitest coverage |
| Integration tests | 100% pass | CI pipeline |
| Smoke tests | 100% pass | Post-deploy script |
| `/health` response | <50ms | Observability |
| Error rate | <1% | Cloudflare metrics |
| Rollback time | <2 min | `wrangler rollback` |
