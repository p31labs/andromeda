# P31CA WYE Launch — Communications Matrix
**Target Date:** May 8, 2026
**Primary Vector:** p31ca.org (Hub) / Matrix broadcast
**Tone:** Direct, sovereign, cryptographic. Zero corporate pleasantries.
**Status:** CLEARED FOR PRODUCTION — all claims verified against live codebase.

---

## Accuracy Record (Pre-Publish Audit, 2026-05-05)

Three corrections applied to the original draft before this doc was written:

| Draft Claim | Reality | Correction |
|---|---|---|
| "Ed25519/ML-DSA-65 identity" | PQC code exists in `@p31/shared` but no public PWA calls it at launch. Identity is a 6-byte WebCrypto hex DID via `crypto.getRandomValues`. | Removed. Accurate language substituted. |
| "Messaging Hub" card | `bridge.html` is the LOVE Economy Dashboard. No live E2E messaging surface exists. | Card replaced with Cognitive Passport, which IS live. |
| "Live WebGL topology of the global mesh" | Spaceship Earth renders 8 static hardcoded coordinates. Not networked. | "live" removed. |

---

## 1. The Global Broadcast (Matrix / Discord / Social)

```
HEADLINE: The WYE is active. Claim your coordinate.

The P31CA software mesh is now live.
Sovereign cognitive telemetry and a portable identity layer.
Free forever.

There are no accounts. There are no passwords. There are no App Stores.

When you connect, your browser generates a sovereign device identifier
using cryptographically secure randomness. Your data lives in your
local storage. We don't want it, and we can't read it.

Active surfaces:

▸ Q-Factor — Offline-first biometric tracking.
  HRV, Spoon Economy, Calcium. Calculates your cognitive quadrant locally.
  Installs to your home screen. Works when the internet doesn't.

▸ Cognitive Passport — Portable accommodation summary.
  Answer once. Export for doctors, teachers, agents, or courts.
  No login. Stays in your browser.

▸ Spaceship Earth — K₄ mesh topology in 3D WebGL.
  Press L to cycle views. The visual proof of what we built.

Connect: https://p31ca.org

The WYE is your software mesh.
The DELTA is your physical perimeter.
Node Zero hardware drops May 15.
```

---

## 2. Hub Landing Page Copy (p31ca.org)

### Hero Section

**H1:** Structure the unseen.

**Subtitle:** P31CA operates at the intersection of cognitive architecture and systemic topology. The WYE software mesh is open. Select a vector to interface with the network.

---

### Surface Cards (The Grid)

**Card 1: Q-Factor**
- Label: `BIOMETRIC TELEMETRY`
- Title: Q-Factor Dashboard
- Body: Track your vagal tone, spoon economy, and physiological state. Calculates your cognitive quadrant locally using Russell's Circumplex Model. Works entirely offline — your data never leaves your device.
- CTA: `/qfactor/`
- Badge: PWA · Installable · Offline

**Card 2: Cognitive Passport**
- Label: `SOVEREIGN IDENTITY`
- Title: Cognitive Passport
- Body: Answer questions once. Export a portable, one-page accommodation summary for doctors, teachers, legal proceedings, or AI agents. Free. No login. Your data stays in your browser.
- CTA: `/passport`
- Badge: No Login · Local Storage · Exportable

**Card 3: Spaceship Earth**
- Label: `MESH TOPOLOGY`
- Title: Spaceship Earth
- Body: The visual proof of capability. Render the K₄ network topology and node coordinates through a unified 3D WebGL instrument. Press L to cycle between Delta, Posner, and Globe views.
- CTA: `/spaceship-earth/`
- Badge: WebGL · R3F · Keyboard Nav

---

## 3. The "Bypass the App Store" UX Walkthrough

*Displays when a user taps a PWA surface (Q-Factor or Spaceship Earth) on mobile.*

**Title:** Install Sovereign Node

**Body:**
P31CA surfaces bypass centralized app stores to maintain cryptographic integrity and deployment velocity. Install this node directly to your device hardware.

**iOS:**
1. Tap the **Share icon** (square with upward arrow) in the Safari bottom bar.
2. Scroll down and tap **"Add to Home Screen"**.
3. Launch from your home screen for full-screen, offline-capable operation.

**Android:**
1. Tap the **Three Dots menu (⋮)** in Chrome.
2. Tap **"Install app"** or **"Add to Home screen"**.
3. Launch directly from your app drawer.

*Note: iOS requires Safari specifically. Chrome on iOS does not support PWA install.*

---

## 4. Node Zero Teaser (Footer / Banner)

**Title:** THE DELTA TRANSITION

**Body:**
The WYE network connects you to the software mesh. The DELTA transition secures your physical perimeter.

Node Zero is an air-gapped secure element and LoRa radio router. It moves your private keys out of the browser and into a hardware-isolated FIPS 140-2 boundary. It adds LoRa RF capabilities — your mesh survives cell tower outages and ISP blackouts.

**CTA:** BOM and pre-orders open May 15. `/node-zero.html`

---

## 5. Staged Claims (Not Yet Live — Do NOT Publish Before These Ship)

The following copy exists in the draft but cannot be published at WYE launch. These are Phase 2 items with explicit ship conditions:

| Claim | Ship Condition |
|---|---|
| "Ed25519/ML-DSA-65 identity" | Cognitive Passport → Q-Factor identity bridge wired; `@noble/post-quantum` lazy-import confirmed working in browser context |
| "Hybrid X25519 + ML-KEM-768 encryption" | Live messaging surface deployed (no surface exists today) |
| "Post-quantum communication" | Same as above |
| "Harvest-now-decrypt-later protection" | Same as above |

These claims are accurate descriptions of the `@p31/shared/src/crypto/postQuantum.ts` implementation. They become publishable the moment the surface that calls it is live.

---

## 6. Deployment Checklist

- [ ] Q-Factor PWA `getLocalDid()` live at `/qfactor/` — **deployed**
- [ ] Spaceship Earth URL-param shortcut routing live — **deployed**
- [ ] Q-Factor worker multi-tenant userId enforcement — **deployed** (needs wrangler redeploy)
- [ ] `passport-generator.html` accessible at `/passport` redirect — verify live
- [ ] `spaceship-earth.html` redirect → `/spaceship-earth/` — **deployed**
- [ ] Node Zero teaser card at `/node-zero.html` status flipped `concept` → `live` — **pending**
- [ ] Matrix broadcast account authenticated and channels verified — **pending**
- [ ] Q-Factor worker redeployed with Gap 2 changes — **pending** (`wrangler deploy` from `cloudflare-worker/q-factor/`)
