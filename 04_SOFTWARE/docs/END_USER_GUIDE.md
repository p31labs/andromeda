# P31 Mesh — User Guide

*For everyone in the mesh, from kids to quantum physicists.*

---

## Quick Start (2 Minutes)

### Step 1: Open the App

Open the P31 Mesh link on your phone, tablet, or computer. It works in any web browser — no app store download needed.

### Step 2: Pick Your Name and Color

The first time you open it, you'll see a welcome screen. Tap **GET STARTED**, then:

- Type your name (this is how others see you)
- Pick a color (tap any color circle)
- Pick your role (family, support, friend — pick whatever feels right)
- Tap **CONTINUE**

### Step 3: Create or Join a Mesh

**Creating a new mesh:** Give it a name (like "Our Family" or "Care Team"), then tap **CREATE MESH**. The app will generate a 6-letter room code — something like `HK4T9N`. Share this code with the people you want in your mesh.

**Joining an existing mesh:** Someone will give you a 6-letter code. Tap **I HAVE A ROOM CODE** on the welcome screen and type it in.

### Step 4: Start Talking

Type a message and tap **SEND**. Your message goes to everyone in the mesh. The AI assistant reads your messages and can help with things like checking who's online or looking up information.

That's it. You're connected.

---

## What Can I Say to the Mesh?

The mesh has an AI assistant built in. You can talk to it naturally — just type what you need. Here are some things that work:

**Checking the mesh:**
- "Who's online?"
- "Show me the mesh status"
- "How many people are connected?"

**Checking on people:**
- "Check Will's energy level"
- "Are there any bio alerts?"
- "What reminders are pending?"

**Sending messages:**
- Just type normally — your message goes to everyone
- The assistant will respond if it has something helpful to add

**Health tracking:**
- The mesh can track medication, energy levels (spoons), and health data
- This is set up by the mesh administrator — ask them if you need it

---

## The Shape at the Top (What's the Spinning Thing?)

That's a tetrahedron — a 3D triangle with four corners. Each corner represents a person in the mesh. The lines between corners are connections.

- **Glowing dots** = people who are online right now
- **Dim dots** = people who are offline
- **Solid lines** = active connections between online people
- **Dashed lines** = connections that aren't active yet

Tap the tetrahedron to expand the mesh panel, which shows everyone's name and status.

The shape slowly rotates so you can see all the connections from different angles. It's not just decoration — it represents how the mesh works. In a tetrahedron, every point connects directly to every other point. There's no single center that everything depends on. If one connection breaks, you can still reach everyone through the other paths.

---

## Fortress Mode (When You Need Space)

Sometimes you need the world to stop for a minute. Fortress Mode does that.

### How to Activate It

Tap the 🏰 icon in the top-right corner of the chat.

### What Happens

- The screen goes completely black
- All incoming messages are **held** — not deleted, just paused
- You see one big button: **SIGNAL [YOUR SUPPORT PERSON]**
- You see a smaller button: **EXIT FORTRESS**

### When to Use It

- When you're overwhelmed and need to stop the information flow
- When you're having a hard moment and don't want to read anything new
- When you need someone specific to know you need help

### Exiting Fortress Mode

When you tap **EXIT FORTRESS**, all the messages that arrived while you were in Fortress Mode appear in your chat. Nothing was lost — just held until you were ready.

### Setting Up Your Emergency Contact

Go to Settings (⚙ icon) → **Fortress Mode — Emergency Contact** → type the name of the person you want the big red button to signal. This is usually a parent, partner, caregiver, or trusted friend.

---

## Fawn Guard (Pattern Awareness)

### What Is Fawning?

Sometimes when we're stressed or trying to keep the peace, we over-apologize, agree too quickly, or say things we don't really mean to avoid conflict. Psychologists call this the "fawn response." It can happen to anyone, but it's especially common for neurodivergent people.

### What Fawn Guard Does

If you turn it on, Fawn Guard quietly watches your outgoing messages for patterns like:

- Excessive apologizing ("sorry sorry, I know this is annoying")
- Too many hedges ("just maybe perhaps possibly")
- Agreeing too fast without thinking it through
- Asking permission for things you don't need permission for

It does NOT read your messages for content. It counts linguistic patterns — like a word-frequency meter, not a mind reader.

### How It Works

**Calibration phase (first 50 messages):** Fawn Guard learns YOUR normal patterns. Everyone writes differently — some people say "just" a lot naturally, and that's fine. The system learns what's normal *for you*.

You'll see a small progress bar at the bottom: `FG 12/50` means 12 out of 50 calibration messages collected.

**After calibration:** Fawn Guard compares each message against your personal baseline. If a message scores more than 1.5 standard deviations above your normal, a small amber alert appears:

```
FAWN GUARD
Elevated accommodation pattern · 1.8σ
```

This is private — only you see it. Nobody else in the mesh knows your fawn score.

**If triggered:** The alert includes a 🏰 button to enter Fortress Mode immediately. You don't have to — it's just there if you want it.

### Turning It On/Off

Settings (⚙) → **Communication Pattern Awareness** → toggle on/off. It's off by default. Your data stays on your device.

---

## Settings

Tap the ⚙ icon in the top-right of the chat screen.

**Your Node** — Shows your name, color, and role. To change these, you'll need to reset and re-create your profile.

**Room Code** — The 6-letter code for your mesh. Tap **COPY** to share it with someone new.

**Communication Pattern Awareness (Fawn Guard)** — Toggle on/off. See above for details.

**Fortress Mode — Emergency Contact** — The name that appears on the big red button in Fortress Mode.

**Leave Mesh & Reset** — Removes all your data from this device and disconnects you. This cannot be undone. Your messages that were already sent to the mesh remain in the mesh history.

---

## Troubleshooting

### "The mesh says 0 connections"

This means nobody is actively connected right now — including you, if you just opened the app. The WebSocket connection takes 1-2 seconds to establish. Wait a moment and the count should update.

If it stays at 0 after 10 seconds:
1. Check your internet connection
2. Try closing and reopening the app
3. The mesh server might be sleeping — send any message to wake it up

### "Agent not responding" or "Agent offline"

The AI assistant runs on Cloudflare's Workers AI service. Occasionally this service has brief outages. Your messages still reach other people in the mesh — only the AI assistant is affected.

Wait 60 seconds and try again. If it persists for more than 5 minutes, the issue is on Cloudflare's end, not yours.

### "My messages aren't appearing"

1. Check the connection dot in the header (green = connected, yellow = connecting, gray = disconnected)
2. If gray: your internet connection may have dropped. The app will automatically reconnect within 3 seconds
3. If you changed networks (e.g., Wi-Fi to cellular), the WebSocket needs to reconnect — this happens automatically

### "I accidentally entered Fortress Mode"

Tap **EXIT FORTRESS** at the bottom. All held messages will appear in your chat. Nothing was deleted.

### "Fawn Guard keeps triggering on normal messages"

The baseline may need more data. If it's been fewer than 50 messages since you turned it on, it's still calibrating. After 50+ messages, if it's still triggering too often, turn it off and back on to reset the baseline.

### "Someone new wants to join"

Go to Settings → copy the Room Code → share it with them (text, email, tell them in person — any way works). They open the app, tap "I Have a Room Code," enter it, and they're in.

---

## Privacy

**What's stored on your device:**
- Your profile (name, color, role)
- Your room code
- Fawn Guard calibration data (if enabled)
- Your settings

**What's stored on the mesh server:**
- Chat messages (in the room's temporary buffer and the telemetry database)
- Your online/offline status
- Health data you manually enter (if you use the bio tracking feature)

**What the AI assistant can see:**
- Your messages in the current session (last ~16 messages for context)
- Mesh status (who's online, connection counts)
- Your energy level and reminders (if you've set them up)

**What the AI assistant cannot see:**
- Other people's private messages or conversation history
- Your Fawn Guard scores (those stay on your device)
- Anything outside your mesh's room code scope

**What's NOT collected:**
- Your location
- Your contacts
- Your browsing history
- Anything from other apps on your device

---

## For the Deeply Curious: How the Mesh Actually Works

### Why a Tetrahedron?

In 1864, James Clerk Maxwell proved that a structure is "isostatically rigid" — perfectly stable without internal stress — when it has exactly as many constraints as degrees of freedom. For four points in 3D space, that's 6 edges. A tetrahedron has exactly 4 vertices and 6 edges. It's the simplest possible stable 3D structure.

The P31 Mesh uses this as more than a metaphor. The network topology is literally a K₄ complete graph: every node connects to every other node. There is no central server that everything depends on. If one connection fails, information can route through the remaining paths. Whitney's theorem guarantees that K₄ is 3-connected — you need to remove 3 edges to disconnect any pair of nodes.

### Why "P31"?

Phosphorus-31 (³¹P) is the only stable isotope of phosphorus. In quantum biology, ³¹P nuclear spins are hypothesized to function as "neural qubits" in the brain, protected from environmental noise by Posner molecules (Ca₉(PO₄)₆) — naturally occurring calcium cages. The Larmor frequency of ³¹P in Earth's magnetic field is approximately 863 Hz.

P31 Mesh applies this metaphor structurally: the mesh acts as a digital Posner molecule, protecting the cognitive signal of its members from the noise of the outside world. The calcium cage is the network. The phosphorus is you.

### The Cloudflare Edge

The mesh runs entirely on Cloudflare Workers — serverless JavaScript functions that execute at the nearest data center to the user. There are 300+ data centers worldwide. Your messages are processed within milliseconds at the geographically closest point, never passing through a centralized server farm.

Durable Objects provide stateful compute: each chat room, each personal agent, and each conversation session is a uniquely addressable JavaScript object with its own embedded SQLite database. When idle, these objects hibernate — their code is evicted from memory while their WebSocket connections are held by the network itself. Cost during hibernation: $0.00.

### The Fawn Guard Algorithm

Fawn Guard extracts linguistic features from each outgoing message:

- **Hedge density** — frequency of softening words per sentence
- **Apology density** — frequency of apology patterns per sentence
- **Permission seeking** — count of permission-request phrases
- **Self-blame markers** — phrases that preemptively take fault
- **Exclamation density** — forced enthusiasm markers per sentence

These features are weighted (apology and self-blame at 2×, hedges and permissions at 1.5×, exclamations at 0.5×) into a composite score. The score is compared against a rolling personal baseline using z-scores. A trigger fires at >1.5σ above the individual's own mean — not a population norm.

This means someone who naturally writes with many hedges won't trigger false alarms. The system adapts to you, not the other way around.

### SIC-POVM and Geometric Security

The K₄ topology maps to a SIC-POVM (Symmetric Informationally Complete Positive Operator-Valued Measure) — a set of four measurement vectors on the Bloch sphere that extract maximum information from an unknown quantum state. The defining property is that the overlap between any two vectors is exactly 1/3. No measurement axis is privileged. This mathematical invariant means the trust protocol is provably fair by construction and reference-frame-independent.