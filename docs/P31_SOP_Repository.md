# P31 Labs — SOP Repository
## "Helped me. Might help you too."

*Indexed by Spoon Cost (🥄). 1 Spoon = executable while mostly frozen. 5 Spoons = requires deep hyperfocus.*

---

## SOP-001: The Parking Lot Pattern
**Spoon Cost:** 🥄 (1/5 — Crisis-level executable)
**Category:** Executive Function | Impulse Management
**Author:** William R. Johnson, P31 Labs

### The Problem
You are working on a high-priority task. Your brain detects a low-priority error — a CSS alignment issue, a typo in a legal brief, a misfiled email. The neurodivergent impulse fires: fix it now.

### The Risk
Context-switching to fix the error will break your working memory cache. You will lose the hyperfocus on the main task. Recovering that state costs 20-45 minutes (the "attention residue" penalty from Mark et al., 2008).

### The Protocol
1. Keep a single, persistent raw text file open at all times. This is your **Parking Lot.**
2. When the impulse hits, write **ONE line** capturing the task. Do not prioritize it. Do not format it. Do not categorize it. Just capture the string.
3. Return to the primary task immediately.

### Why This Works
The brain's neurodivergent loop is trying to prevent you from forgetting the error. It will keep firing the impulse until it believes the information is safe. Once the system "knows where something lives in the build plan," the brain releases the chemical urge to fix it immediately. The Parking Lot is a write-only buffer. It accepts input and provides cognitive relief without requiring any processing.

### The Triage
Clear the Parking Lot only during designated phase gates — for example, the 8:00 PM "Evening Review" block. At that point, each item gets one of three dispositions:
- **Do** (schedule it)
- **Delegate** (assign it to the right agent/person)
- **Delete** (it wasn't important — and now you have proof)

### What NOT to Do
- Do not use the Parking Lot as a to-do list. It is a capture buffer, not a task manager.
- Do not review it mid-task. That defeats the purpose.
- Do not put it in a fancy app. A plain text file works. Complexity is the enemy of execution.

---

## SOP-002: The Triad (AI Tag-Out System)
**Spoon Cost:** 🥄🥄🥄 (3/5 — Requires initial setup, dramatically lowers daily cognitive load)
**Category:** Human-AI Collaboration | Centaur Protocol
**Author:** William R. Johnson, P31 Labs

### The Problem
When building complex systems, no single AI model can hold the entire architecture without dropping packets. Each model has a different failure mode: one hallucinates confidently, another over-narrates before executing, another can't hold long context. If you treat them as interchangeable, you get unreliable output.

### The Protocol: Lane Discipline

| Agent | Role | Tag IN For | Tag OUT For |
|-------|------|-----------|-------------|
| **Architect** (Claude Opus) | QA, verification, architecture, test suites, grant strategy | Deep research, independent verification, risk audits | Minor coding tasks |
| **Mechanic** (Claude Sonnet / Claude Code) | UI execution, debugging, WCD completion | React, TypeScript, Python, rapid iteration | Architecture decisions, firmware |
| **Narrator** (Gemini) | Grants, narrative, technical specs, research synthesis | Long-form writing, audience translation, medical/legal framing | Code execution (uses [V: claim, source] verification markers) |
| **Firmware** (DeepSeek) | ESP32 C/C++, hardware registers, low-level drivers | I2C, SPI, ESP-IDF, LVGL | UI, architecture, narrative |

### The Routing Rules
1. **You are the API router.** No agent talks to another agent directly. You pass context between them via shift reports and context documents.
2. **Each agent verifies the others.** Opus independently checks Gemini's research claims. Sonnet finds bugs beyond what Opus's test suite scoped. This is a feature, not redundancy.
3. **Failure modes are known and documented:**
   - Gemini: "The Chaplain" — over-narrates, writes documentation instead of executable artifacts
   - Opus: Over-intervention — tries to architect when it should just verify
   - Sonnet: Hallucination under low context — mitigated by always providing pre-patched code
   - DeepSeek: Scope creep into UI territory — keep strictly in firmware lane
4. **The shift report format:** When handing off between agents, include: system state, artifacts generated, specific directives for the receiving agent, and what NOT to touch.

### Why This Works
The chess centaur (human + machine) consistently outperforms either human or machine alone. The Triad extends this by specializing each machine for its optimal task. The human provides intent, routing, and quality judgment. The machines provide execution speed, pattern matching, and tireless iteration.

The resulting system — what P31 Labs calls "Homo syntheticus" — produces output that no single node could generate independently.

---

*More SOPs will be added as the repository grows. Each one was built because the operator needed it to survive. If it helped us, it might help you too.*

*P31 Labs | phosphorus31.org | github.com/p31labs*
