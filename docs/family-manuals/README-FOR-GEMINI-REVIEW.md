# 📚 P31 Family Documentation Suite
## Gemini Review Package
### For: Computer-Illiterate WYE Adults Transitioning to the DELTA

---

## What This Is

A complete documentation suite for the Johnson Family's transition from the **WYE** (old, dependent, scattered) to the **DELTA** (new, sovereign, resilient) — written specifically for adults who identify as "computer illiterate."

These are not typical technical manuals. They are:
- Written for tired eyes and frustrated users
- Assume zero prior tech knowledge
- Include encouragement and emotional support
- Acknowledge physical limitations (arthritis, hand pain)
- Emphasize offline-first capability (rural Georgia connectivity)

---

## The Family Context

### Who These Manuals Are For:

| Name | Role | App | Physical Consideration |
|------|------|-----|----------------------|
| **Mama** | Kitchen Matriarch | 🍳 Culinary Matria | Tired eyes, prefers voice |
| **AJ** | Warehouse Boss | 📦 Warehouse AJ | Needs zero-typing (QR scanning) |
| **Carrie** | Master Cleaner | 🧹 Maid Manager | Arthritis, joint pain |
| **Christyn** | Color Expert | 💇 Cheomatica | Hand cramps from typing |
| **Will** | Network Operator | All apps | Maintainer, support contact |
| **SJ/Bash** | 3D Kid | 🎮 Geodesic Game | Tech-native but needs poetry |

### The Tech Context:
- **Platform:** Cloudflare Pages (edge-deployed)
- **Architecture:** PGLite (WASM PostgreSQL) for offline-first
- **Connectivity:** Rural Georgia, spotty cell service
- **Philosophy:** Works offline, syncs when possible
- **Identity:** Soulbound Tokens (SBTs) — no passwords on device

---

## Document Inventory

### 0. Bug Reporter System Design (NEW)
**File:** `97-BUG-REPORT-SYSTEM.md`  
**Location:** `shared-components/bug-reporter/`

**Purpose:** One-tap voice-guided bug reporting system for non-technical users.

**Key Features:**
- Voice walks user through 3-question flow
- Auto-captures app state, DB status, network, errors
- Optional screenshot (user-approved)
- Sends SMS to Will with full context

**Integration:**
- Added to `99-TROUBLESHOOTING.md` — Smart Bug Button section
- Added to `98-VOICE-CHEATSHEET.md` — Bug reporter commands

---

### 1. WYE → DELTA Transition Guide (Master Document)
**File:** `00-WYE-TO-DELTA-TRANSITION-GUIDE.md`

**Purpose:** The starting point. Explains the philosophy, phases of learning, and universal concepts.

**Key Sections:**
- What is the DELTA? (vs WYE)
- Three phases of learning (Survival → Functional → Mastery)
- Universal troubleshooting (emergency fixes)
- Voice command basics
- Glossary (tech words translated)
- Weekly checklist

**Tone:** Encouraging, firm but kind, revolutionary (this is a "digital sovereignty" document)

---

### 2. Culinary Matria Manual
**File:** `01-CULINARY-MATRIA-MANUAL.md`

**Purpose:** For Mama — recipe scaling, meal prep, dual pantry (home/shop)

**Key Features:**
- Home vs Business mode (critical distinction)
- Recipe cards with one-tap scaling
- Session-based cooking (checklist approach)
- Voice commands for hands-in-dough moments
- Shopping list integration

**Accessibility:** Large buttons, voice-first, works in kitchen without internet

---

### 3. Warehouse AJ Manual
**File:** `02-WAREHOUSE-AJ-MANUAL.md`

**Purpose:** For AJ — furniture inventory via QR codes

**Key Features:**
- Zero-typing workflow (scan only)
- Zone-based tracking (1-9 zones)
- Three actions: Receive, Move, Sell
- Swipe gestures (like Tinder for furniture)
- Dashboard for business overview

**Accessibility:** Scan-based, thermal printer integration, works in concrete warehouse with no cell service

---

### 4. Maid Manager Manual
**File:** `03-MAID-MANAGER-MANUAL.md`

**Purpose:** For Carrie — job scheduling with joint protection

**Key Features:**
- Pacing limits (self-configured daily caps)
- Color-coded warnings (green/yellow/red)
- Pain logging after each job
- Weekly review with insights
- Drive time calculations

**Accessibility:** Voice-first (protects hands), pain-aware scheduling, enforces rest

**Critical Note:** This app was specifically designed because Carrie pushes herself too hard and pays for it later.

---

### 5. Cheomatica Manual
**File:** `04-CHEOMATICA-MANUAL.md`

**Purpose:** For Christyn — hair color formula vault

**Key Features:**
- Voice-first formula recording
- Color wheel picker (big buttons, no typing)
- Client history with photos
- Allergy/alert system
- Processing time timer

**Accessibility:** Voice-dominant, designed for hands that hurt from working all day

---

### 6. Troubleshooting Guide
**File:** `99-TROUBLESHOOTING.md`

**Purpose:** Universal problem-solving for all apps

**Key Sections:**
- Universal fixes (refresh, restart)
- Problem-specific solutions
- Error message translation table
- "Nuclear option" (last resort)
- When to call Will (liberally)

**Tone:** Reassuring, "don't panic," practical

---

### 7. Voice Command Cheat Sheet
**File:** `98-VOICE-CHEATSHEET.md`

**Purpose:** Laminate and post near phone

**Key Features:**
- Per-person command lists
- How-to-use instructions
- Troubleshooting voice failures
- Emergency backup (button locations)

**Format:** Designed to be printed, cut, and laminated

---

## Design Philosophy

### 1. The "Spoon Theory" Respect
Every family member has limited energy. Documentation must:
- Get to the point immediately
- Not waste words
- Allow jumping to relevant sections
- Include emotional validation

### 2. WYE → DELTA Framing
Every document reinforces:
- **WYE:** Old way = dependent, scattered, fragile
- **DELTA:** New way = sovereign, resilient, owned

This isn't just software. It's family infrastructure.

### 3. Physical Accessibility
- Large touch targets mentioned
- Voice-first options
- No shame in using buttons instead of voice
- Acknowledgment of pain/fatigue

### 4. Offline-First Emphasis
Repeatedly states: **This works without internet.**
Because:
- Rural Georgia has spotty connectivity
- The warehouse is a concrete box
- Kitchens have thick walls
- This is a feature, not a bug

---

## For Gemini Review: Key Questions

### Content Quality:
1. Are instructions clear enough for someone who's never used an app?
2. Is the tone appropriate (encouraging, not condescending)?
3. Do voice commands have the right specificity?
4. Is troubleshooting comprehensive enough?

### Accessibility:
1. Are we acknowledging physical limitations appropriately?
2. Is the "computer illiterate" framing respectful?
3. Do we provide alternatives when voice fails?

### Completeness:
1. What's missing from the WYE→DELTA narrative?
2. Are there gaps in the per-app manuals?
3. Is the troubleshooting guide too technical in places?

### Family-Specific:
1. Are the personalization touches appropriate (calling Will, family mesh references)?
2. Is the revolutionary tone too much, or just right?
3. Do we need more/less emotional support language?

---

## Suggested Gemini Review Process

### Phase 1: Master Document Review
Start with `00-WYE-TO-DELTA-TRANSITION-GUIDE.md`
- Check tone, philosophy, universal concepts
- Ensure framing is right

### Phase 2: Per-App Review
Review each manual with these questions:
- Are the workflows accurate?
- Are voice commands realistic?
- Is the physical accommodation appropriate?

### Phase 3: Troubleshooting Review
Review `99-TROUBLESHOOTING.md`
- Are fixes actually fixable by non-technical users?
- Are we asking them to do impossible things?
- Is the "call Will" threshold appropriate?

### Phase 4: Integration Review
- Does the cheat sheet match the manuals?
- Are URLs correct and consistent?
- Do all documents reference each other properly?

---

## For Review: Known Gaps (Intentional)

### Not Included (Yet):
- Manuals for remaining 11 apps (Fence Pro, Geodesic, etc.)
- Video script outlines
- Quick-start one-pagers (per person)
- "Mama's first 10 minutes" walkthrough
- Bug reporter integrated into apps (component ready, needs deployment)

### Why:
- Focus on the 4 primary deployed apps
- Remaining apps can use these as templates
- Family should validate these first before expanding

---

## How to Provide Feedback

Preferred format:
```
File: [filename]
Section: [section name or line range]
Issue: [what's wrong or missing]
Suggestion: [specific fix]
Priority: [Nice to have / Should fix / Must fix]
```

Example:
```
File: 03-MAID-MANAGER-MANUAL.md
Section: "Voice Commands"
Issue: "Log pain level three" — what does "three" mean? Scale unclear.
Suggestion: Add pain scale reference (1-10, with descriptions)
Priority: Should fix
```

---

## The Goal

**By end of review:**
- ✅ 4 complete, validated per-app manuals
- ✅ 1 comprehensive troubleshooting guide
- ✅ 1 laminated voice cheat sheet
- ✅ 1 master transition guide
- ✅ Family-ready to print and distribute

**Success metric:** Mama can open Culinary Matria, scale a recipe, and not call Will in a panic.

---

## Files in This Package

```
docs/family-manuals/
├── README-FOR-GEMINI-REVIEW.md      (this file)
├── 00-WYE-TO-DELTA-TRANSITION-GUIDE.md
├── 01-CULINARY-MATRIA-MANUAL.md
├── 02-WAREHOUSE-AJ-MANUAL.md
├── 03-MAID-MANAGER-MANUAL.md
├── 04-CHEOMATICA-MANUAL.md
├── 97-BUG-REPORT-SYSTEM.md          (NEW: Voice bug reporter design)
├── 98-VOICE-CHEATSHEET.md
└── 99-TROUBLESHOOTING.md

shared-components/bug-reporter/
├── README.md                        (Quick overview)
├── VoiceBugReporter.tsx             (React component)
├── bug-report-worker.ts             (Cloudflare Worker)
└── INTEGRATION-GUIDE.md             (Per-app setup)
```

---

## For Will (Operator Context)

These manuals assume:
- Apps are deployed to Cloudflare Pages
- PGLite is configured for offline-first
- Voice endpoint is live at voice.phosphorus31.org
- SBT authentication is working
- The Ark (Node Zero) is backing up data

If any of these are false, the manuals need adjustment.

---

**Ready for Gemini Review**  
**Package Version:** 1.0  
**Created:** May 17, 2026  
**Author:** P31 Network Operator  
**For:** The Johnson Family WYE→DELTA Transition