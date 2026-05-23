# 🐛 P31 Voice Bug Reporting System
## One-Tap Smart Diagnostics for Family Members

---

## The Problem

When something breaks, family members:
- Don't know what's technically relevant
- Can't describe errors accurately
- Feel bad "bothering Will" with vague reports
- Take screenshots of the wrong thing

**The DELTA solution:** One tap → voice walks you through → auto-captures everything Will needs.

---

## How It Works (User Experience)

### Step 1: Tap the 🐛 Bug Button
**Location:** Bottom of every screen, next to Voice button  
**Appearance:** Ladybug icon, labeled "Report Bug"  
**Size:** Big, can't miss it

### Step 2: Voice Guide Activates
**Audio:** "Hi, let's tell Will what's wrong. First, what were you trying to do?"

### Step 3: User Speaks Their Issue
User describes in their own words:  
*"I was trying to add eggs and it said something about syntax"*

### Step 4: System Asks Follow-Up
**Voice:** "Got it. Is the screen showing an error message right now?"

**If yes:** Auto-captures screenshot  
**If no:** "No problem, I have the info I need."

### Step 5: Optional Details
**Voice:** "Anything else Will should know? Say 'done' when finished."

### Step 6: Confirmation
**Voice:** "Report sent! Will will get: your description, what screen you were on, what went wrong technically, and when it happened. You'll get a text when it's fixed."

**Visual:** Green checkmark, "Report #12345 sent to Will"

---

## What Gets Captured (Automatically)

### User Provides (Voice):
- What they were trying to do
- What they expected to happen
- What actually happened
- Any error messages they saw

### System Captures (Silently):
```json
{
  "reportId": "bug-2026-05-17-a7f3",
  "timestamp": "2026-05-17T13:42:00Z",
  "user": "mama@p31.mesh",
  "app": "culinary-matria",
  "appVersion": "1.4.2",
  "currentRoute": "/recipes/lentil-soup",
  "screenState": {
    "mode": "business",
    "activeSession": true,
    "ingredientsShown": 12,
    "ingredientsChecked": 8
  },
  "databaseState": {
    "pgliteStatus": "ready",
    "lastSync": "2026-05-17T13:30:00Z",
    "syncQueueLength": 3,
    "storageMode": "opfs"
  },
  "networkState": {
    "online": false,
    "connectionType": "none",
    "lastOnline": "2026-05-17T12:15:00Z"
  },
  "consoleLogs": ["last 50 log entries"],
  "errors": ["syntax error at or near 'data'"],
  "deviceInfo": {
    "userAgent": "Mobile Safari iOS 17",
    "screenSize": "390x844",
    "deviceMemory": "4GB"
  },
  "voiceTranscript": "I was trying to add six eggs to the home pantry and it said syntax error something something",
  "screenshot": "base64-encoded-image-or-null",
  "userPainLevel": "frustrated-but-functional"
}
```

---

## The Voice Script (What Users Hear)

### Opening:
> "Bug reporter active. I'm going to ask three quick questions. Don't worry about using fancy words — just tell me what happened in your own voice."

### Question 1: Intent
> "First: What were you trying to do when things went wrong?"

*User speaks*  
*System transcribes and confirms:*  
> "Got it. You were [transcript summary]."

### Question 2: Expectation vs Reality
> "What did you expect to happen?"

*User speaks*  
> "And what actually happened?"

*User speaks*

### Question 3: Current State
> "Looking at your screen right now — do you see an error message, or does something look wrong?"

**If user says yes:**  
> "I'll capture a screenshot of what you're seeing. Just keep the screen as-is for one second."  
*[System captures screenshot]*  
> "Screenshot saved."

**If user says no:**  
> "No problem. The technical details I captured will help Will figure it out."

### Closing:
> "Last question: Is there anything else Will should know? Say 'done' or 'that's it' when you're finished."

*User speaks or says "done"*  
> "Perfect. Sending report to Will now..."  
*[Sound effect: gentle 'whoosh']*  
> "Report sent! Reference number [alphanumeric]. Will gets everything he needs and you'll hear back soon. Tap anywhere to close."

---

## UI Design

### The Bug Button
```
┌─────────────────────────┐
│  [🎤]  [🐛]  [?]  [⚙️]  │
│  Voice  Bug  Help  Settings│
└─────────────────────────┘
```

- **Icon:** Ladybug (friendly, non-threatening)
- **Label:** "Report Bug" (not "Error Report" or "Support Ticket")
- **Color:** Soft red when idle, pulsing orange when active
- **Size:** 60x60dp (big thumb target)

### Active Reporting Screen
```
┌─────────────────────────┐
│                         │
│   🎙️  Listening...     │
│                         │
│   "What were you        │
│    trying to do?"       │
│                         │
│   [Visual waveform]     │
│                         │
│   Tap to stop speaking  │
│   when done             │
│                         │
│   [Cancel]              │
└─────────────────────────┘
```

### Success Screen
```
┌─────────────────────────┐
│                         │
│        ✅               │
│                         │
│   Report Sent!          │
│                         │
│   Ref: #bug-a7f3        │
│                         │
│   Will received:        │
│   • What you said       │
│   • Screenshot          │
│   • Technical details   │
│   • Full context        │
│                         │
│   You'll hear back soon │
│                         │
│   [Tap to close]        │
└─────────────────────────┘
```

---

## Technical Implementation

### Component: `VoiceBugReporter.tsx`

```typescript
interface BugReport {
  id: string;
  timestamp: number;
  userId: string;
  userTranscript: string[];
  autoContext: AutoDiagnosticContext;
  screenshot?: string;
  severity: 'minor' | 'frustrating' | 'blocking';
  sentiment: 'calm' | 'frustrated' | 'urgent';
}

interface AutoDiagnosticContext {
  app: string;
  version: string;
  route: string;
  screenState: object;
  dbStatus: PGLiteStatus;
  networkStatus: NetworkState;
  recentLogs: string[];
  recentErrors: string[];
  deviceInfo: DeviceInfo;
}
```

### Auto-Capture Functions

```typescript
// Captures everything without user input
async function captureAutoContext(): Promise<AutoDiagnosticContext> {
  return {
    app: APP_ID,
    version: APP_VERSION,
    route: window.location.pathname,
    screenState: captureCurrentScreenState(),
    dbStatus: await getPGLiteStatus(),
    networkStatus: getNetworkState(),
    recentLogs: getLastNLogs(50),
    recentErrors: getCapturedErrors(),
    deviceInfo: getDeviceInfo()
  };
}

// Grabs screenshot if user approves
async function captureScreenshot(): Promise<string | null> {
  try {
    const canvas = await html2canvas(document.body);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
}
```

### Voice Flow State Machine

```
[INIT] → "Opening message"
  ↓
[ASK_INTENT] → "What were you trying to do?"
  ↓ (user speaks)
[CAPTURE_INTENT] → Parse transcript
  ↓
[ASK_EXPECTATION] → "What did you expect?"
  ↓ (user speaks)
[CAPTURE_EXPECTATION] → Parse transcript
  ↓
[ASK_REALITY] → "What actually happened?"
  ↓ (user speaks)
[CAPTURE_REALITY] → Parse transcript
  ↓
[ASK_SCREEN_STATE] → "See an error now?"
  ↓ (yes/no)
[CAPTURE_SCREENSHOT] or [SKIP_SCREENSHOT]
  ↓
[ASK_MORE] → "Anything else?"
  ↓ (user speaks or 'done')
[CONFIRM_SEND] → Summarize
  ↓
[SENDING] → Upload
  ↓
[SUCCESS] → "Report sent"
  ↓
[COMPLETE] → Close
```

---

## Backend: Bug Report Ingestion

### Destination: `bug-reports` KV Store

```typescript
// Cloudflare Worker endpoint
POST /api/bug-report

// Stores:
- Bug report JSON (auto-context + transcript)
- Screenshot (R2 if present)
- Metadata (user, timestamp, app)

// Triggers:
// - SMS to Will: "Bug #a7f3 from Mama/Culinary — [summary]"
// - Dashboard update: New bug indicator
// - Auto-classification: Attempt to categorize
```

### Notification to Will

**SMS:**
```
🐛 P31 Bug Report #a7f3
From: Mama (Culinary Matria)
Severity: frustrating
"syntax error adding eggs"
Auto-context: offline mode, last sync 1hr ago
Screenshot: included
Dashboard: https://ops.p31ca.org/bugs#a7f3
```

---

## Integration with Family Manuals

### Add to Troubleshooting Guide:

**New Section: "The Smart Bug Button"**

> **When something is broken and you don't know why:**
> 
> 1. Tap the 🐛 button (next to 🎤)
> 2. Talk to it — describe what went wrong
> 3. It captures everything Will needs automatically
> 4. Done
> 
> **What it captures:**
> - What you said
> - Screenshot (if you want)
> - Technical details (what app, what screen, what errors)
> - When it happened
> 
> **You don't need to know what's wrong. Just describe what you see.**

### Voice Cheat Sheet Addition:

```
🐛 BUG REPORTER

Tap the ladybug button, then say:
- "I was trying to... [what you were doing]"
- "I expected... [what should happen]"
- "But instead... [what went wrong]"
- "Done"

That's it. Will gets everything.
```

---

## Privacy Considerations

### What We Capture:
- ✅ App state and errors
- ✅ Screenshot (only if user confirms)
- ✅ Voice transcript
- ✅ Technical diagnostics

### What We DON'T Capture:
- ❌ Other apps
- ❌ Personal data outside the app
- ❌ Audio beyond the bug report
- ❌ Location (unless user includes in description)

### User Control:
- Screenshot is optional (user confirms)
- Voice can be skipped (type instead)
- Report can be canceled anytime
- "Delete my voice recording" option after sending

---

## Success Metrics

### Quality Indicators:
- Bug reports with auto-context resolve 50% faster
- Voice transcript reduces back-and-forth by 70%
- Screenshots included in 80% of reports
- Family members use it without prompting

### Usage Targets:
- 1 bug report per user per month (indicates engagement)
- < 2 min average report time
- 90% of reports have actionable auto-context
- Will resolves 80% within 24 hours

---

## Rollout Plan

### Phase 1: Culinary Matria (Mama)
- Pilot with Mama (most vocal about tech frustration)
- Refine voice prompts based on her feedback
- Ensure auto-context captures recipe-specific issues

### Phase 2: Warehouse AJ (AJ)
- Test offline-mode reporting (warehouse has no signal)
- Ensure QR scanning context is captured
- Test thermal printer state reporting

### Phase 3: Maid Manager (Carrie)
- Joint-pain accessible design (big buttons)
- Voice-only workflow option (no typing)
- Pain-level correlation with bug severity

### Phase 4: All Apps
- Deploy to remaining 12 apps
- Standardize bug report format
- Build Will's dashboard for triage

---

## Implementation Checklist

### UI Components:
- [ ] Bug button component (all apps)
- [ ] Voice walkthrough screen
- [ ] Recording visualization
- [ ] Success confirmation
- [ ] Simplified text fallback (if voice fails)

### Voice System:
- [ ] Script prompts (recorded or TTS)
- [ ] Transcription integration
- [ ] Intent parsing (what were they doing?)
- [ ] Confirmation repeats ("Got it, you were...")

### Auto-Capture:
- [ ] Screen state capture
- [ ] PGLite status check
- [ ] Network state detection
- [ ] Console log capture
- [ ] Screenshot capture (optional)
- [ ] Device info gathering

### Backend:
- [ ] Bug report ingestion Worker
- [ ] KV storage for reports
- [ ] R2 storage for screenshots
- [ ] SMS notification to Will
- [ ] Dashboard for bug triage
- [ ] Classification/tagging system

### Documentation:
- [ ] Add to Troubleshooting Guide
- [ ] Add to Voice Cheat Sheet
- [ ] Per-app manual updates
- [ ] Will's operator guide

---

## The Promise to Family Members

**Old way (WYE):**
> "When something breaks, try to figure out what's wrong, take a screenshot of the right thing, write a detailed description, find the support email, send it, wait days for a response, answer follow-up questions, still not fixed."

**New way (DELTA):**
> "Tap the bug. Tell it what went wrong in your own words. Done. Will knows everything he needs and fixes it."

**One tap. Your voice. We handle the rest.**

---

*Document Version: 1.0*  
*System: P31 Voice Bug Reporter*  
*Created: May 17, 2026*  
*For: All P31 Family Apps*