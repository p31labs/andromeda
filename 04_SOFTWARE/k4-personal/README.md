# k4-personal

**Status:** 🟢 Live
**Deployed:** 2026-04-21
**CWPs:** 23 (PersonalAgent), 26 (PII scrubber), 27 (bio webhook)

## Purpose

Per-user isolated agent. Each mesh member gets their own PersonalAgent Durable Object with private SQLite storage for conversation history, energy tracking, medication reminders, and health data.

## Endpoints

All prefixed with `/agent/:userId/`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agent/:userId/health` | Agent health check |
| GET | `/agent/:userId/energy` | Current spoon level |
| POST | `/agent/:userId/bio` | Submit biometric data |

## Quick Test

```bash
curl -s https://k4-personal.trimtab-signal.workers.dev/agent/will/health
curl -s https://k4-personal.trimtab-signal.workers.dev/agent/will/energy
```

## Bio Alert Thresholds

| Type | Threshold | Severity |
|------|-----------|----------|
| calcium_serum | < 7.6 mg/dL | CRITICAL |
| calcium_serum | < 7.8 mg/dL | WARNING |

## Deploy

```bash
cd ~/andromeda/04_SOFTWARE/k4-personal && npx wrangler deploy
```

## See Also

- [API Reference](../docs/API_REFERENCE.md#3-k4-personal)
