# CogPass v4.0 → v4.1 Corrections
## Verified April 13, 2026

### 1. Test Count (Section 4, BONDING entry)
- **OLD:** "659+ automated tests" / "558 tests"
- **NEW:** "413 automated tests / 30 suites"
- **Source:** `npm run test` output verified by Sonnet against repo, cross-checked with MEMORY.md (WCD-03 Step-01, 2026-03-30)

### 2. Grant Pipeline (wherever referenced)
- **KILL:** ESG housing grant — org-only (requires 501(c)(3) + EIN + housing services provider status)
- **KILL:** Microsoft AI for Accessibility $75K — applications closed, no active cycle, portal offline
- **KILL:** Pollination $500 — rejected
- **KILL:** NDEP — Illinois only
- **KILL:** Mission.Earth — closed
- **KEEP:** Awesome Foundation $1K (April deliberation — only active grant)
- **KEEP:** NIDILRR Switzer $80K (inquiry sent, no response)
- **KEEP:** NIDILRR FIP $250K/yr (inquiry sent, no response)
- **KEEP:** Stimpunks $3K (paused until June 1)

### 3. Node Zero FDA Classification (Section 4, Node Zero entry)
- **OLD:** "Classified as an FDA Class II exempt assistive communication device under 21 CFR §890.3710"
- **NEW:** "Hardware prototype stage. No FDA classification claimed."
- **Source:** 21 CFR §890.3710 is powered exercise equipment. Wrong classification entirely.

### 4. SE050 Post-Quantum (if mentioned anywhere)
- **OLD:** "SE050 supports CRYSTALS-Kyber/Dilithium"
- **NEW:** "SE050 does not support PQC. 50KB user flash insufficient (needs 50-160KB). Future migration: Infineon TEGRION."
- **Source:** NXP SE050 datasheet Rev 3.8 + P31 validation report April 13

### 5. Relay Architecture (if mentioned)
- **OLD:** "Durable Objects" / "WebSocket relay"
- **NEW:** "Cloudflare KV polling relay"
- **Source:** Verified against deployed wrangler.toml

### 6. CogPass Version
- **OLD:** v3.0 (if any reference remains)
- **NEW:** v4.0 (current), updating to v4.1 with these corrections
