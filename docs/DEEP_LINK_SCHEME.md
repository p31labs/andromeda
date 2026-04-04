# Deep Link URL Scheme — CWP-2026-014 R11
**Date:** 2026-04-04

## URL Pattern

```
p31ca.org/<app>?from=<source>&session=<id>
```

| Parameter | Description | Example |
|-----------|-------------|---------|
| `from` | Source app or page initiating the link | `hub`, `ede`, `bonding`, `larmor` |
| `session` | Session ID for cross-app journey tracing | UUID from `p31-telemetry.js` |

## Defined Links

### EDE → Larmor (fawn guard trigger)
```
p31ca.org/larmor?from=ede&mode=breathing&session=<id>
```
When EDE's Fawn Guard fires, opens Larmor in 4-4-6 breathing mode.

### EDE → BONDING (test a molecule)
```
bonding.p31ca.org?from=ede&formula=<encoded>&session=<id>
```
"Test this molecule" button passes the formula as a pre-loaded challenge.

### Larmor → EDE (return to work)
```
p31ca.org/ede?from=larmor&session=<id>
```
"Return to work" button from Layer 0 / breathing complete.

### BONDING → Ko-fi (achievement unlock)
```
phosphorus31.org/donate?from=bonding&achievement=<name>&session=<id>
```
On achievement unlock, suggests Ko-fi support with context.

### Hub → any app
All hub cards use:
```
p31ca.org/<app>?from=hub
```

### phosphorus31.org → p31ca.org
```
p31ca.org?from=phosphorus31
```

## Health + Telemetry cross-links (R10/R06)
- `p31ca.org/health.html` → `p31ca.org/telemetry.html` ✅
- `p31ca.org/telemetry.html` → `p31ca.org/health.html` ✅
- Both → `p31ca.org/` (Hub) ✅

## Implementation Status

| Link | Status |
|------|--------|
| hub → health dashboard | ✅ Live (`/health.html`) |
| hub → telemetry dashboard | ✅ Live (`/telemetry.html`) |
| health ↔ telemetry cross-link | ✅ Live |
| hub → EDE | ✅ Wired (`/ede.html?from=hub`) |
| hub → BONDING | ✅ Wired (`bonding.p31ca.org?from=hub`) |
| hub → Spaceship Earth | ✅ Wired (`spaceship-earth.pages.dev?from=hub`) |
| EDE → Larmor (fawn guard) | ⚡ Partial — console emit live; Larmor not yet deployed (CWP-2026-006) |
| EDE → BONDING | ⏳ Awaiting BONDING "Test this molecule" button |
| Larmor → EDE | ⏳ Awaiting Larmor (CWP-2026-006) |
| BONDING → Ko-fi | ⏳ Add to bonding/src when ready |

## Session Continuity via p31-state

The anonymous session ID from `p31-telemetry.js` (`window.p31.sessionId`) should be
appended to all deep links as `session=<id>`. The receiving app reads this parameter
and passes it to `p31-state` Worker writes so that journey traces are linkable
in the telemetry dashboard (R10 user journey trace).

## p31-state Integration Points

When apps are built, they should:

```javascript
// On load — read existing state
const userId = localStorage.getItem('p31-user-id') ?? crypto.randomUUID();
localStorage.setItem('p31-user-id', userId);
const res = await fetch(`https://state.p31ca.org/state/${userId}`);
const { state } = await res.json();
// → use state.spoons, state.tier, state.activeApp

// On spoon change — write new state
await fetch(`https://state.p31ca.org/state/${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ spoons: newCount, activeApp: 'ede' }),
});
```
