# The Delta Protocol — Standard for Autonomous Software Health

## Core Principles

1. **Health First** — No system is more important than the operator’s biological hardware. Medical metrics gate every phase.
2. **No Arbitrary Decisions** — Every action is weighed by a state-aware decision engine using spoon level, calcium, urgency, and risk.
3. **Parallel by Default** — Never choose between two valid paths; run both and reconcile at checkpoints.
4. **Gate Every Transition** — No phase advances until all metrics are verified and signed off (automated + human).
5. **Debt is Toxic** — Hardcoded colors, token redefinitions, and missing tests are eliminated, not tolerated.
6. **Autonomous but Auditable** — Bots do the work; humans review the PRs. No black boxes.
7. **Sovereign Sync** — All repos are synchronized at checkpoints; no silent drift.

## The Delta Scorecard

A system achieves **Delta** (world-record tier) when and only when all of the following gates pass:

| Metric | Target | Verification |
|--------|--------|--------------|
| Entropy | ≤ 5.0 | `grading-index.json` |
| Global fidelity | ≥ 95.0 | `quantum-polisher-report.json` |
| Hardcoded colors | 0 | Polisher layer 2 |
| Token redefinitions | 0 | Polisher layer 2 |
| Design system adoption | 100% | Polisher layer 4 |
| TypeScript strict | all tsconfig.json | `pnpm tsc --noEmit` |
| Test coverage | ≥ 80% per artifact | vitest/jest coverage |
| Depressed artifacts | 0 | `jitterbug-depressed-queue.json` |
| Jitterbug transitions/tick | < 5 for 3 consecutive ticks | `grading-index.json` `meta` |
| Medical stability | Ca ≥ 8.0, spoons ≥ 4 | `medical-log.json`, `spoon-state.json` |
| Sovereign sync | All repos same SHA | `p31 sync status` |

## The Delta Process

### Phase 0 – Preparation
- Confirm medical gate: Ca ≥ 8.0, spoons ≥ 4.
- Backup: `git tag world-record-start && p31 sync up "starting record run"`
- Disable auto-commit cron; switch to manual gate mode.
- **Gate: G0 (Medical) must pass before proceeding.**

### Phase 1 – Eliminate Token Debt (Layer 2)
- Run polisher layer 2 with remediation across all tracked projects.
- **Gate G1:** `quantum-polisher-report.json` → `hardcoded_count: 0` and `redefinition_count: 0` for every project.
- If fails: manually fix remaining instances, re-run until clean.
- **Time: 1–2h | Spoon cost: 2**

### Phase 2 – Architectural Unification (Layer 4)
- Ensure all projects have `@p31/shared` in `package.json`, import shared CSS, use `p31Preset`.
- **Gate G2:** `grep -r "p31Preset" software/*/tailwind.config.js` → every project present.
- **Time: 1h | Spoon cost: 2**

### Phase 3 – Pattern Consistency (Layer 3)
- Enable TypeScript strict in all `tsconfig.json`.
- Unify export styles (convert default exports to named exports where feasible).
- **Gate G3:** `pnpm tsc --noEmit` passes with zero errors across all projects.
- **Time: 2–4h | Spoon cost: 3**

### Phase 4 – Test Coverage Completion
- Run macrophage on all SEED and SPROUT artifacts.
- Human reviews every generated test PR — no blind merges.
- For artifacts where macrophage times out: write manual test stubs.
- **Gate G4:** `vitest --coverage` ≥ 80% per artifact.
- **Time: 1–2 days | Spoon cost: 4 (spread)**

### Phase 5 – PR Consolidation & Jitterbug Stabilization
- Review and merge all open polisher + macrophage PRs.
- Run jitterbug manually for 3 consecutive ticks.
- **Gate G5:** PR list empty.
- **Gate G6:** `transitions_this_tick < 5` for 3 consecutive ticks.
- **Time: 2h | Spoon cost: 2**

### Phase 6 – Sovereign Sync & Final Validation
- Run `p31 sync down` on all machines.
- Execute full grader + polisher + jitterbug suite.
- **Gate G7:** All repos at same SHA, entropy ≤ 5, fidelity ≥ 95.
- **Time: 30m | Spoon cost: 1**

### Phase 7 – World Record Certification
- Tag: `git tag delta-world-record-$(date +%Y%m%d) && p31 sync up "DELTA WORLD RECORD"`
- Generate certificate via `scripts/delta-certify.sh`.
- **World record achieved.**

## Checkpoints

Each checkpoint is a reversible pause point. The operator can abort at any checkpoint; the system sustains that state indefinitely.

| Checkpoint | Phase | Condition |
|------------|-------|-----------|
| CP1 | After Phase 1 | Entropy ≤ 50, Layer 2 tokens normalized across all projects, zero new depressions |
| CP2 | After Phase 2 | 100% design system adoption, architecture validation passed |
| CP3 | After Phase 3 | TypeScript strict passes, zero type errors, export style unified |
| CP4 | After Phase 4 | Test coverage ≥ 80% for every artifact, all PRs merged |
| CP5 | After Phase 6 | Entropy ≤ 5, fidelity ≥ 95, jitterbug stable, sovereign sync clean |
| CP6 | After Phase 7 | Certificate generated, tagged, world record archived |

## Blockers

| Blocker | Severity | Condition | Mitigation |
|--------|----------|-----------|------------|
| Hypocalcemia (Ca ≤ 7.8 mg/dL) | CRITICAL | Immediate medical call to Coastal Community Health (912-275-8028) | Override all actions; rest until calcium restored |
| Spoon depletion (≤ 2) | HIGH | Defer operator PR review; autonomous cycles continue | Rest; defer manual work |
| Ollama 1.5B latency | MEDIUM | Macrophage test gen hits timeout | Replace with template-generated stubs; fill in later |
| Polisher fix debt scale | MEDIUM | Many projects → many PR batches | Batch PRs by project; merge lowest-fidelity first |
| Sovereign sync conflicts | LOW | Concurrent edits during fix application | Sync only at checkpoints; `p31 sync down` before each phase |

## The Delta Toolchain

| Script | Purpose |
|--------|---------|
| `quantum-8ball.py` | Decision engine: weighs choices using spoon level, calcium, urgency, risk |
| `quantum-polisher.py` | Eliminates UI/UX debt across Layers 1–4 (auto-fix + PR creation) |
| `jitterbug-daemon.py` | Oscillates artifact maturity, tracks entropy, detects depression |
| `macrophage.py` | Generates test suites via Ollama 1.5B for depressed artifacts |
| `grade-repo.py` | Scores every artifact on CODE, TEST, DOCS, OPS, SEC |
| `p31-sync` | Sovereign sync across all registered repos |
| `delta-certify.sh` | World record certification script (this repo) |

## The Delta Manifesto

**Health gates the work. Agents do the work. Humans review the work. The system records the work.**

No step skipped. No debt tolerated. No decision arbitrary.

The standard is set. Now prove it.
