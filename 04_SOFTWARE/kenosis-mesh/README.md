# Kenosis Mesh — Serverless 7-Node SIC-POVM Topology

A single Cloudflare Worker hosting 7 Durable Objects implementing the K4 complete graph topology for the P31 Cognitive Prosthetic.

## Architecture

```
R (Root) → A, B, C (Inner Trinity)
A → D, E
B → E, F
C → D, F
D, E, F → R (Leaves)
```

| Node | Role | DO Class | Children |
|------|------|----------|----------|
| R | Root / Aggregator | RNode | A, B, C |
| A | Axis A (Somatic) | ANODE | D, E |
| B | Axis B (Forensic) | BNODE | E, F |
| C | Axis C (Technical) | CNODE | D, F |
| D | Leaf D | DNODE | — |
| E | Leaf E | ENODE | — |
| F | Leaf F | FNODE | — |

## Files

```
kenosis-mesh/
├── wrangler.toml         # Worker + 7 DO bindings
├── src/
│   └── index.js          # Worker router + 7 DO classes
└── scripts/
    └── test-mesh.js      # Post-deployment test
```

## Deployment

### 1. Configure wrangler.toml

Replace placeholders:
- `<CF_ACCOUNT_ID>` — your Cloudflare account ID
- `<ROOT_BEARER_TOKEN>` — will be set via secret

### 2. Set the secret

```bash
cd kenosis-mesh
npx wrangler login
npx wrangler secret put ROOT_BEARER_TOKEN
# Enter your secret when prompted
```

### 3. Deploy

```bash
npx wrangler deploy
```

### 4. Test

Update `scripts/test-mesh.js` with your deployed URL and token, then:

```bash
node scripts/test-mesh.js
```

Expected response:
```json
{ "ack": true, "session": "init-..." }
```

## Security

- **Public**: RNode (`/message` endpoint) — protected by Bearer token
- **Internal**: A, B, C, D, E, F — only callable via DO bindings within the worker

## License

MIT — P31 Labs