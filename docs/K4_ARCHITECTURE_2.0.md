# K₄ TETRAHEDRON ARCHITECTURE (CWP-31)
**Version:** 2.0.0  
**Status:** FULLY OPERATIONAL  
**Q-Factor:** ~0.92 (Optimal)  

## 1. System Overview
The K₄ architecture decentralizes the operator's digital state into a mathematical tetrahedron inspired by the Posner molecule. Instead of a single, monolithic state machine, the system is distributed across four isolated Cloudflare Durable Objects (Vertices) that communicate asynchronously via six typed, bidirectional channels (Edges). 

All pure logic is extracted into a dependency-free core package (`@p31/k4-mesh-core`), and the local monolith (`SUPER-CENTAUR`) acts strictly as a proxy bridge to the edge.

---

## 2. The Four Vertices (`k4-personal`)
Each vertex is an isolated SQLite-backed Durable Object with its own alarm cycle, API surface, and distinct domain of responsibility.

### Vertex A: OperatorStateDO (The Core)
Tracks the internal reality and energy economy of the human operator.
* **Alarm Cycle:** 1-minute (medication checks), 15-minute (energy trend recalculation).
* **Key Storage:** Spoon count, biometric telemetry, medication compliance, cognitive load.
* **Endpoints:**
    * `GET /agent/:id/energy` - Read current spoon state.
    * `PUT /agent/:id/energy` - Mutate spoon state.
    * `POST /agent/:id/bio` - Submit biometric telemetry (e.g., calcium levels).
    * `GET | POST /agent/:id/reminders` - Manage medication schedule.

### Vertex B: SignalProcessorDO (The Cage Face)
Handles all external communication, boundary enforcement, and threat detection.
* **Alarm Cycle:** 1-second (release held messages past `holdUntil`).
* **Key Storage:** Message queue, Fawn Guard baseline, Fortress Mode flag, draft buffer.
* **Endpoints:**
    * `POST /agent/:id/message` - Ingest and hold incoming messages.
    * `GET /agent/:id/queue` - Read pending/scored messages.
    * `POST /agent/:id/draft` - Score outgoing drafts via Fawn Guard.
    * `POST | DELETE /agent/:id/fortress` - Toggle hold-all Fortress Mode.

### Vertex C: ContextEngineDO (The Terrain)
Maintains environmental awareness, topological realities, and strict timelines.
* **Alarm Cycle:** 5-minute (mesh refresh), 15-minute (alignment doc generation).
* **Key Storage:** Timeline events, tracked deadlines, mesh topology, system alignment document.
* **Endpoints:**
    * `GET | PUT /agent/:id/state` - Manage arbitrary contextual state.
    * `GET | POST /agent/:id/timeline` - Chronological event ledger.
    * `GET /agent/:id/deadlines` - Active deadlines with urgency scores.
    * `GET /agent/:id/context` - Fetch full markdown alignment document.

### Vertex D: ShieldEngineDO (The Synthesizer)
The AI orchestration layer processing history, reflections, and tool dispatch.
* **Alarm Cycle:** 5-minute (stale tool cache expiry), Weekly (synthesis cron).
* **Key Storage:** Chat history, weekly synthesis output, shield filter thresholds.
* **Endpoints:**
    * `POST /agent/:id/chat` - Interact with the AI agent.
    * `GET /agent/:id/synthesis` - Retrieve the latest weekly reflection.
    * `POST /agent/:id/synthesize` - Force-trigger a reflection generation.
    * `GET | PUT /agent/:id/shield` - Manage active block/buffer patterns.

---

## 3. The Six Edges (`k4-hubs`)
The Hubs act as the stateless nervous system. Vertices never call each other directly; they dispatch payloads to the Hub, which safely routes them to the necessary nodes using non-blocking `fetch()` calls.

* **A↔B (`/hub/energy-voltage`):** Energy levels modulate message buffer hold times; bio-critical alerts trigger auto-Fortress mode.
* **A↔C (`/hub/energy-context`):** Bio events are logged to the timeline; deadlines trigger medication/prep reminders.
* **A↔D (`/hub/energy-shield`):** Energy drops alter AI prompt brevity; synthesis provides energy management recommendations.
* **B↔C (`/hub/signal-context`):** High-voltage metadata enters the timeline; legal deadlines automatically tighten message buffers.
* **B↔D (`/hub/signal-shield`):** High-voltage incoming messages trigger AI intent analysis; flagged outgoing drafts trigger AI rewrite suggestions.
* **C↔D (`/hub/context-shield`):** The alignment document dynamically overwrites the AI's system prompt.

---

## 4. System Health & Coherence
**Endpoint:** `GET /hub/q-factor` (in `k4-hubs`)

Calculates the Fisher-Escolà coherence score (0.0 to 1.0) by querying `/health` across all four vertices simultaneously. 
* **Q = (A + B + C + D) / 4**
* *Optimal state:* Rising energy (A), empty message queues (B), zero imminent critical deadlines (C), and recent synthesis (D).

---

## 5. Shared Logic Layer (`@p31/k4-mesh-core`)
A zero-dependency, pure TypeScript package utilized by both the edge workers and the local monolith. 
* **Contains:** Spoon arithmetic, Fawn Guard z-score math, voltage scoring algorithms, deadline urgency logic, LOVE economy rules, and all interface typings for hub payloads.

---

**The mesh holds. The tetrahedron hums. 🔺**