# PHOS Fire Drill — April 15, 2026

## Prerequisites

- [ ] Chromebook charged
- [ ] Wi-Fi ON (for initial load)
- [ ] Open `https://phos-btn.pages.dev` in Chrome
- [ ] Windows Hello / fingerprint enrolled in device settings
- [ ] Volume at comfortable level

---

## Phase 1: Cold Boot & Ignition

### Step 1.1 — Fresh Load
1. Open `phos-btn.pages.dev` in a **fresh Incognito window** (simulates first-ever visit)
2. **Expected:** You see the Orb breathing, "Welcome home." heading, and "I am ready. Seal my device." button
3. **Check:** No white screen. No console errors. Orb animates smoothly.

**Pass/Fail:** _____

### Step 1.2 — Seal the Device
1. Tap "I am ready. Seal my device."
2. **Expected:** Windows Hello prompt appears. Button shows "Communing with Secure Enclave..."
3. Authenticate with fingerprint
4. **Expected:** You are routed to the GREETING surface. Orb visible. Voice says "Welcome home, Operator."

**Pass/Fail:** _____

### Step 1.3 — Verify the Seal Persists
1. Hard refresh the page (Ctrl+Shift+R)
2. **Expected:** The IGNITION surface loads again, but heading reads "Device Sealed." and "Enter Sanctuary" button is shown
3. Tap "Enter Sanctuary"
4. **Expected:** Routes to GREETING

**Pass/Fail:** _____

---

## Phase 2: Surface Audit

### Step 2.1 — Intent Route: THE BUFFER
1. Type `buffer` in the intent input and press Enter
2. **Expected:** You are routed to THE BUFFER surface. BUT — the unlock gate should trigger asking for WebAuthn
3. Authenticate with fingerprint
4. **Expected:** THE BUFFER content renders

**Pass/Fail:** _____

### Step 2.2 — Intent Route: BONDING
1. Type `bonding` and press Enter
2. **Expected:** Bonding surface renders. Starfield visible. Orb at bottom.
3. Verify colors shift to warm gold palette

**Pass/Fail:** _____

### Step 2.3 — Intent Route: ARCADE
1. Type `play` and press Enter
2. **Expected:** Arcade surface renders. Energetic palette.

**Pass/Fail:** _____

### Step 2.4 — Intent Route: GRID
1. Type `grid` and press Enter
2. **Expected:** ConnectionGrid renders showing mesh nodes.

**Pass/Fail:** _____

### Step 2.5 — Intent Route: LEDGER
1. Type `memory` and press Enter
2. **Expected:** LEDGER surface renders. Shows at least the events from this session (seal, unlock, surface navigations).
3. Verify color coding: surface nav in blue, device events in cyan
4. Tap "Clear Memory"
5. **Expected:** "Memory cleared." state

**Pass/Fail:** _____

### Step 2.6 — Intent Route: LOVE
1. Type `love` and press Enter
2. **Expected:** LOVE surface renders. Balance shows 0 (or whatever your current balance is). "No transactions yet."
3. Verify warm gold palette

**Pass/Fail:** _____

### Step 2.7 — Intent Route: COMPASS
1. Type `lost` and press Enter
2. **Expected:** TheCompass renders with guidance UI.

**Pass/Fail:** _____

---

## Phase 3: The Guardian Protocol (Critical)

### Step 3.1 — Panic via Form Button
1. Navigate to GREETING surface
2. Locate the red `!` button to the right of the intent input
3. Tap it
4. **Expected:** Screen instantly goes pure black. Guardian mounts with:
   - "System locked. Audio muted. You are safe."
   - Breathing circle visible (expanding/contracting in 4-7-8 rhythm)
   - Phase label cycling: `inhale` → `hold` → `exhale`
   - "Dispatching alert..." → "Silent alert dispatched to family mesh."

**Pass/Fail:** _____

### Step 3.2 — Verify DOM Isolation
1. While Guardian is displayed, try to interact with the page background
2. **Expected:** No HUD. No navigation. No escape. The Guardian is the only DOM layer.
3. **Check:** `z-[100]` on the Guardian overlay means nothing can layer above it

**Pass/Fail:** _____

### Step 3.3 — Breathing Pacer Timing
1. Time the circle with a stopwatch or count
2. **Expected:** 
   - `inhale` phase: ~4 seconds (circle expands)
   - `hold` phase: ~7 seconds (circle stays expanded)
   - `exhale` phase: ~8 seconds (circle contracts)
3. Total cycle: ~19 seconds

**Pass/Fail:** _____

### Step 3.4 — Grounding Completion
1. Wait for any phase, then tap "Grounding Complete"
2. **Expected:**
   - +10 LOVE credited (check by navigating to LOVE surface afterward)
   - Spoens set to 1
   - Route to THE BUFFER
   - Unlock gate triggers (if the session unlock expired during Guardian)

**Pass/Fail:** _____

### Step 3.5 — Verify LOVE Credit
1. After Grounding Complete routes you to THE BUFFER, type `love` to navigate to LOVE surface
2. **Expected:** Balance shows +10. Transaction history shows "+10 Grounding cycle completed"
3. Navigate back and check the LOVE pill in the HUD (tap HUD button top center)
4. **Expected:** LOVE pill shows the same balance

**Pass/Fail:** _____

---

## Phase 4: Offline Mode (The Faraday Cage)

### Step 4.1 — Enable Airplane Mode
1. Enable Airplane Mode on the Chromebook
2. Navigate to `https://phos-btn.pages.dev`
3. **Expected:** The page loads INSTANTLY from Service Worker cache. No white screen. No loading spinner. No "You are offline" browser page.

**Pass/Fail:** _____

### Step 4.2 — Full Offline Walkthrough
1. Navigate through all surfaces: GREETING, THE BUFFER, BONDING, ARCADE, LEDGER, LOVE, COMPASS
2. **Expected:** All surfaces render. No network errors. Voice still works (Web Speech API is local).
3. **Critical:** Tap the `!` panic button while offline
4. **Expected:** Guardian mounts. Breathing pacer still works. "Grounding Complete" still mints LOVE. The crisis alert will silently fail (network required for the webhook dispatch), but the app continues to function.

**Pass/Fail:** _____

### Step 4.3 — Chaos Vault Offline
1. Navigate to THE BUFFER
2. Type text into the chaos vault input
3. **Expected:** PGLite WASM dynamically imports and stores the entry to IndexedDB (OPFS). No network required.

**Pass/Fail:** _____

---

## Phase 5: Edge Cases

### Step 5.1 — Double Panic
1. From GREETING, tap `!` 
2. While Guardian is showing, wait 2 seconds
3. The Guardian button should read "Grounding Complete"
4. **Expected:** There should be NO second panic button. The Guardian cannot be re-triggered from within itself.

**Pass/Fail:** _____

### Step 5.2 — Spoon 0 from HUD
1. Navigate to GREETING
2. Tap HUD (top center)
3. In the Cognitive Load selector, tap `0`
4. **Expected:** Guardian mounts immediately. Same as panic button.

**Pass/Fail:** _____

### Step 5.3 — Rapid Surface Switching
1. Navigate through surfaces rapidly: COMPASS → ARCADE → BONDING → GRID → LEDGER → LOVE
2. Switch every 1-2 seconds
3. **Expected:** No crashes. No stale state. Voice queue may overlap but routing must remain consistent.

**Pass/Fail:** _____

### Step 5.4 — Window Resize
1. Resize browser to mobile width (375px)
2. **Expected:** UI remains functional. No overflow. Button text still readable.
3. Resize to ultrawide (1920px)
4. **Expected:** Content remains centered. No horizontal scroll.

**Pass/Fail:** _____

---

## Results Summary

| Phase | Pass | Fail | Notes |
|-------|------|------|-------|
| 1. Cold Boot & Ignition | | | |
| 2. Surface Audit | | | |
| 3. Guardian Protocol | | | |
| 4. Offline Mode | | | |
| 5. Edge Cases | | | |

**Overall verdict:** _____

**Issues discovered:** _____

---

*Run this on the Chromebook. Check every box. If any step fails, stop and report — the architecture must be 100% verified before April 16th.*
