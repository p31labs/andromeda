# K₄ TETRAHEDRON MIGRATION GUIDE

## Phase 3: Legacy Data Migration

The `PersonalAgent` Durable Object data remains intact in Cloudflare storage. No rollback is required.

### Migration Script

A complete migration script is available at:
```
/home/p31/andromeda/scripts/migrate-personal-agent.ts
```

The script performs three phases:

1.  **EXTRACTION**: Connects to the Cloudflare API and reads all state from the old `PersonalAgent` Durable Object namespace
2.  **TRANSFORMATION**: Maps the flat key-value structure into the four specialized vertex schemas
3.  **SEEDING**: POSTs/PUTs the transformed data into the new vertex endpoints

### Migration Execution

```bash
# Set your Cloudflare credentials
export CLOUDFLARE_API_TOKEN=your_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id

# Run the migration
cd /home/p31/andromeda
npx tsx scripts/migrate-personal-agent.ts
```

### Data Mapping

| Old PersonalAgent Key | New Vertex Location |
|-----------------------|---------------------|
| `spoons`              | Vertex A → `energy` |
| `bioReadings`         | Vertex A → `bio` |
| `reminders`           | Vertex A → `medication` |
| `cognitiveLoad`       | Vertex A → `cognitiveLoad` |
| `messageQueue`        | Vertex B → `messageQueue` |
| `fawnScore`           | Vertex B → `fawnBaseline` |
| `contacts`            | Vertex B → `contactRegistry` |
| `drafts`              | Vertex B → `draftBuffer` |
| `timeline`            | Vertex C → `timeline` |
| `deadlines`           | Vertex C → `deadlines` |
| `meshState`           | Vertex C → `meshTopology` |
| `alignmentDocument`   | Vertex C → `alignment` |
| `arbitraryState`      | Vertex C → `arbitraryState` |
| `chatHistory`         | Vertex D → `conversationHistory` |
| `lastSynthesis`       | Vertex D → `synthesis` |
| `shieldConfig`        | Vertex D → `shieldFilter` |
| `cachedToolResults`   | Vertex D → `toolResults` |

### Rollback Safety

- The old `PersonalAgent` state is never modified during migration
- All writes are idempotent and can be safely re-run
- If migration fails, simply re-run the script
- No data is deleted from the old namespace

### Verification

After migration completes, verify all vertices are populated:

```bash
# Check Vertex A
curl https://k4-personal.trimtab-signal.workers.dev/agent/will/energy

# Check Vertex B
curl https://k4-personal.trimtab-signal.workers.dev/agent/will/queue

# Check Vertex C  
curl https://k4-personal.trimtab-signal.workers.dev/agent/will/timeline

# Check Vertex D
curl https://k4-personal.trimtab-signal.workers.dev/agent/will/synthesis
```

The migration is non-destructive, idempotent, and safe to run at any time. No downtime required.