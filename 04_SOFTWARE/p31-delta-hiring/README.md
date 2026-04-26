# p31-delta-hiring

Shippable **next-gen hiring surface** for P31: canonical **role packets** (outcomes, constraints, evaluation weights), **bounded work samples** (WCD) with **rubrics** that sum to 100%, and a browser-side **portable proof** format (`p31.proofRecord/1.0.0`) candidates can export as JSON.

## Run

From `andromeda/04_SOFTWARE` (with pnpm installed):

```bash
pnpm install
pnpm --filter p31-delta-hiring dev
```

Open the URL Vite prints (default port **3150**).

- **Home** — value prop + equity tier summary  
- **Open roles** — all roles from `src/data/role-packets.json`  
- **Role detail** — full packet + linked WCD + rubric  
- **My proofs** — local drafts; **Export** downloads JSON  
- **Governance** — legal/ops caveats (not a cloud ATS)

## Build

```bash
pnpm --filter p31-delta-hiring build
```

Static output: `p31-delta-hiring/dist/` — host on any static server or copy into a hub `public/` path.

## Verify data

```bash
pnpm --filter p31-delta-hiring run verify
```

Checks every role’s `workSample.wcdId` exists in `work-samples.json` and rubric weights ≈ 1.0 per sample.

## Data & schema

| File | Role |
|------|------|
| `src/data/role-packets.json` | `p31.rolePackets/1.0.0` — org + 8 roles |
| `src/data/work-samples.json` | `p31.workSamples/1.0.0` — WCD text + rubric lines |
| `schemas/proof-record.schema.json` | Portable export shape |

## Related docs (Andromeda)

- `andromeda/docs/social/DELTA_JOB_BOARD.md` — list-oriented job board
- `andromeda/docs/social/DELTA_HIRING_SYSTEM_ARCHITECTURE.md` — system narrative

This package is the **working UI + contracts** for that direction.
