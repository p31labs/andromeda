# `@p31/k4-agent-hub`

Cloudflare Worker hosting four K₄ agent hub Durable Objects — **FORGE** (make), **COUNSEL** (protect), **SCHOLAR** (understand), **SCRIBE** (remember). The personal tetrahedron (`andromeda/04_SOFTWARE/k4-personal`) docks here.

## Layout

```
packages/k4-agent-hub/
├── package.json
├── wrangler.toml          # 4 DO bindings + K4_AGENT_HUB KV
├── README.md              # this file
├── src/
│   ├── index.js           # Worker entry — router, dock, topology, cross-edge
│   ├── topology.js        # K₄ invariants, ADJACENCY, EDGES, SKILLS
│   ├── dock-protocol.js   # session lifecycle, response shapes
│   ├── hub-base.js        # shared DO behavior
│   └── hubs.js            # ForgeHub, CounselHub, ScholarHub, ScribeHub
└── test/
    └── topology.test.mjs  # K₄ invariant + skill registry unit tests
```

Source of truth for vertex identities, edge map, dock protocol, and skill routing: [`p31-k4-agent-hub.json`](../../p31-k4-agent-hub.json).
Operator-readable spec: [`docs/P31-K4-AGENT-HUBS.md`](../../docs/P31-K4-AGENT-HUBS.md).
Mirror parity gate: [`scripts/verify-k4-agent-hub.mjs`](../../scripts/verify-k4-agent-hub.mjs) (`npm run verify:k4-agent-hub`).
Public face: [`agents.html`](../../agents.html) → hub mirror at `andromeda/04_SOFTWARE/p31ca/public/agents.html`.

## Develop

```bash
cd packages/k4-agent-hub
npm install
npm test                   # runs the K₄ invariant suite (no Worker runtime needed)
npm run dev                # wrangler dev --local on http://127.0.0.1:8787
```

Quick smoke checks (with `npm run dev` running):

```bash
curl -s http://127.0.0.1:8787/v1/manifest | jq .schema
# "p31.k4AgentHub/1.0.0"

curl -sX POST http://127.0.0.1:8787/v1/dock -H 'content-type: application/json' \
  -d '{"clientId":"00000000-0000-4000-8000-000000000001","capabilities":["ts-worker","passport-mirror"]}'

curl -s http://127.0.0.1:8787/v1/topology | jq '.vertices | length'
# 4
```

## Deploy

Requires `CLOUDFLARE_API_TOKEN` and the operator to fill in the KV namespace id in `wrangler.toml`.

```bash
wrangler kv:namespace create K4_AGENT_HUB    # paste the printed id into wrangler.toml
npm run deploy
```

Production target (placeholder until DNS): `https://k4-agent-hub.trimtab-signal.workers.dev`. Operator may promote to `agents.p31ca.org` once the zone is configured.

## Verify

`scripts/verify-k4-agent-hub.mjs` (run via `npm run verify:k4-agent-hub` from the repo root) asserts:

- Manifest schema and version.
- 4 vertices · 6 edges · K₄ invariant `|E| = n(n-1)/2`.
- Each vertex has a skill list, a personal-dock pairing, and an anchor color.
- Edge set is the full set of `C(4,2) = 6` pairs.
- Bipartite cover names all four `personal → agent` pairs and matches `personalTetra` keys.
- The Worker package has `wrangler.toml` declaring four DO classes (one per vertex).
- `agents.html` references all four hub IDs (case-insensitive).

The verifier is part of the root `verify` bar (`npm run verify`).

## Public messaging

> **Tagline:** Four hubs. One mesh. Your tetrahedron, their anvil-shield-book-quill.
>
> **Elevator:** P31's K₄ agent tetrahedron is four cooperating workers — Forge, Counsel, Scholar, Scribe — that your personal tetrahedron docks to. Each hub speaks one verb (make, protect, understand, remember). The six K₄ edges let them brief each other so a single ask reaches the right pair without the operator having to route it.
