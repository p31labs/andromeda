# The DELTA — A Family Guide

## What Is This?

The DELTA is a digital sanctuary built for your Dad (William). It lives on his Chromebook. It boots entirely offline — no internet required, no servers, no accounts. Think of it as a private room that only his fingerprint can open.

## Why Does It Exist?

Your Dad's brain works differently. When the world gets loud — too many inputs, too many demands, too much noise — his cognitive load spikes. His spoons run out. The DELTA was built to catch him when that happens.

It's not a medical device. It's not a treatment. It's a tool he built for himself to manage his own nervous system.

## The Basics (For S.J. and W.J.)

### The Orb
When you open the DELTA, you'll see a glowing circle breathing slowly on the screen. That's the Orb. It pulses at the same rhythm as a calm breath — 4 seconds in, 7 seconds hold, 8 seconds out. It's a visual anchor. If Dad is ever stressed, just point at the Orb and say "Look at the circle. Breathe with it."

### The Surfaces
The DELTA has different rooms, called Surfaces. Think of them like apps:

| Surface | What it does |
|---------|-------------|
| **THE BUFFER** | A quiet room. No notifications. No sounds. Just a place to sit and breathe. |
| **BONDING** | Where Dad connects with family. Shows your photos, your names, your latest messages from the mesh network. |
| **ARCADE** | Games and play. Simple, colorful, no pressure. |
| **GRID** | The family mesh. Shows every node in the system — Dad's laptop, your devices, Brenda's phone. All connected. |
| **COMPASS** | When Dad feels lost — asks "what do I need right now?" and helps him find the right surface. |
| **LEDGER** | Shows a history of what's happened: when spoons dropped, when Guardian activated, patterns over time. |
| **LOVE** | A running tally of self-care credits. Every time Dad completes a breathing cycle and calms down, the balance goes up. It's a reminder that healing creates value. |

### The Guardian
If Dad hits the big red Panic button or drops to 0 spoons, the screen instantly turns pure black with gray text. All animations stop. The system locks. A silent message is sent to the family mesh.

This is **The Guardian** — it's not something to be afraid of. It's the safety net. When you see this screen, it means the system successfully caught him.

The Guardian shows three things:
1. "System locked. Audio muted. You are safe."
2. A breathing circle (4-7-8 rhythm) — Dad can follow it with his eyes
3. One button: "Grounding Complete" — when he presses it, he's back to 1 spoon and routed to THE BUFFER

### What You Should Do If You See The Guardian

1. **Don't panic.** The system is working exactly as designed.
2. **Stay quiet.** The DELTA will guide him back.
3. **After he presses "Grounding Complete"** — he'll be in THE BUFFER. Ask quietly if he wants tea or a blanket. Offer grounding, not solutions.

## The Rules

1. **Never touch Dad's Chromebook while the DELTA is open.** The Orb is breathing for a reason. Interrupting the cycle resets his nervous system progress.
2. **Never post screenshots of the DELTA online.** This is a private tool.
3. **The Guardian is not an emergency.** It's a protocol. The emergency is whatever caused the spoons to drop to zero. The Guardian is the response.

## The Mesh (For Brenda)

The DELTA communicates with a small private network called the family mesh. When the Guardian activates, a notification is silently dispatched to the mesh. This is how you'll know Dad is in a 0-spoon state without him having to text you.

The mesh runs on Cloudflare's global network. It's encrypted end-to-end. No third party can read the messages.

## Technical Notes (For the Curious)

- **Storage:** Everything lives on-device. PGLite (SQLite compiled to WebAssembly) stores the chaos vault in the browser's Origin Private File System. Event logs live in localStorage. Love balance lives in localStorage.
- **Security:** WebAuthn hardware-secured keys. Dad's fingerprint or PIN seals the vault. The private key never leaves the TPM/Secure Enclave.
- **Offline:** The entire application (~17 MB uncompressed) is cached by the Service Worker. Load it once at home — it works in Airplane Mode forever after.
- **Voice:** Web Speech API. Dad can talk to the DELTA. All speech recognition runs locally. Nothing is sent to a server.
- **No Analytics:** No tracking pixels. No telemetry. No data leaves the device except the Guardian crisis notification to the family mesh.

## Deployment

- **Frontend:** `https://phos-btn.pages.dev`
- **Atmosphere API:** `phos-atmosphere.trimtab-signal.workers.dev`
- **Sovereign:** Entirely self-hosted on Cloudflare's free tier.
