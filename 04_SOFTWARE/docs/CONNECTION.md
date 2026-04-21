# P31 Mesh — Connection Guide

*How to join a mesh, invite others, and manage your connection.*

---

## Joining a Mesh (For New Members)

Someone in the mesh will give you a **6-letter room code** — something like `HK4T9N`. This is your key to the mesh.

### Step 1: Open the App

Open the P31 Mesh link in your browser. Works on any phone, tablet, or computer. No download or app store needed.

### Step 2: Tap "I Have a Room Code"

On the welcome screen, you'll see two options. Tap the bottom one.

### Step 3: Enter the Code

Type the 6-letter code. It's not case-sensitive — `hk4t9n` works the same as `HK4T9N`. The code uses letters and numbers that can't be confused with each other (no O/0, no I/1/L).

### Step 4: Create Your Profile

Pick a name, a color, and a role. Your name is how others see you in the chat. Your color marks your messages. Your role is just a label — pick whatever fits.

### Step 5: You're In

You'll see the mesh chat with the spinning tetrahedron at the top. Your dot will appear on the shape. Start talking.

---

## Creating a New Mesh (For Mesh Administrators)

### Step 1: Open the App

Same as above — open the P31 Mesh link.

### Step 2: Tap "Get Started"

Create your profile first (name, color, role).

### Step 3: Create the Mesh

Give your mesh a name (e.g., "Johnson Family", "Care Team Alpha", "Study Pod").

Tap **CREATE MESH**. The app generates a 6-letter room code automatically.

### Step 4: Share the Code

Go to Settings (⚙) → find your Room Code → tap **COPY**.

Share the code with your members through any channel:
- Text message
- Phone call (the code is speakable — no confusing characters)
- Email
- Written on a sticky note
- Spoken aloud

Each person uses the code to join your mesh.

### Step 5: Configure (Optional)

In Settings, you can:
- **Set an emergency contact name** for Fortress Mode
- **Enable Fawn Guard** for communication pattern awareness
- **Set up PII scrub rules** if minors are in the mesh (see Security docs)

---

## How Authentication Works

When you enter a room code, here's what happens behind the scenes:

```
You type: HK4T9N
    ↓
App sends to p31-bouncer: POST /auth {userId, roomCode}
    ↓
Bouncer derives a signing key from the room code using PBKDF2
(100,000 iterations of SHA-256 — computationally expensive to brute-force)
    ↓
Bouncer creates a JWT (JSON Web Token) containing:
  - Your user ID
  - Your room code (scope)
  - Your name, color, role
  - Expiration time (24 hours from now)
    ↓
JWT is signed with HMAC-SHA256 and returned to your app
    ↓
App stores the JWT locally and sends it with every request
    ↓
Every worker verifies the JWT before processing your request
```

The room code never leaves your device after the initial authentication. What travels over the network is the signed token — which proves you have the code without revealing it.

### Token Expiration

Tokens expire after 24 hours. When this happens, the app automatically re-authenticates using your stored room code. You won't notice this unless your internet is down at the moment of renewal.

### What Happens If Someone Gets My Room Code?

They can join the mesh. Room codes are like house keys — don't share them with people you don't want in your mesh. If you need to revoke access, you currently need to create a new mesh with a new code. (Per-user revocation is planned but not yet implemented.)

---

## Connection Lifecycle

### Connecting

When you open the app:
1. App reads your profile and room code from local storage
2. App opens a WebSocket to `wss://k4-cage.../ws/[roomCode]?node=[yourId]`
3. The FamilyMeshRoom DO wakes up (if hibernating) and accepts the connection
4. All other connected members receive a "join" event
5. Your dot on the tetrahedron lights up

### Connected

While connected:
- Messages you send are broadcast to all other connected members instantly
- Messages from others appear in your chat in real time
- The AI assistant is available for tool calls (mesh status, energy checks, etc.)
- Your online status is visible to other members

### Disconnecting

When you close the app or lose internet:
1. The WebSocket closes
2. All other members receive a "leave" event
3. Your dot on the tetrahedron dims
4. If you were the last connected member, the DO hibernates ($0.00 cost)

### Reconnecting

If your connection drops (network change, app backgrounded):
1. The app detects the WebSocket closure
2. After 3 seconds, it automatically attempts to reconnect
3. If that fails, it retries with exponential backoff (3s → 6s → 12s → 24s → 30s max)
4. Once reconnected, you receive any messages that arrived during the gap

---

## Multiple Devices

You can be connected from multiple devices simultaneously. Each device gets its own WebSocket connection and counts as one of the 8 available slots.

For example, you could be connected from your phone and your tablet at the same time. Both devices receive all messages. Messages you send from either device are attributed to the same user ID.

---

## Leaving a Mesh

Go to Settings (⚙) → scroll to the bottom → tap **LEAVE MESH & RESET**.

This:
- Removes your profile, room code, and settings from this device
- Removes your Fawn Guard calibration data
- Disconnects you from the mesh

This does NOT:
- Delete your messages from the mesh history
- Delete your PersonalAgent data on the server (conversation history, bio data)
- Notify other members (they'll see you go offline, but won't know you left permanently)

To fully delete your server-side data, the mesh administrator would need to clear your PersonalAgent DO.

---

## Troubleshooting Connections

### "I can't connect"

1. Is your internet working? Try loading any website.
2. Is the room code correct? Codes are 4-6 characters, letters and numbers only.
3. Try refreshing the page or closing and reopening the app.
4. Check if the mesh server is running: `curl -s https://k4-cage.trimtab-signal.workers.dev/` — should return "k4-cage alive".

### "I keep getting disconnected"

1. Unstable internet (Wi-Fi to cellular transitions) causes brief disconnects. The app reconnects automatically in 3 seconds.
2. If on mobile, the browser may close the WebSocket when backgrounded. This is normal — you'll reconnect when you return to the app.
3. If the mesh is full (8/8 connections), you can't connect until someone else disconnects.

### "I see messages from people I don't recognize"

Someone else has the room code. Create a new mesh with a new code and share it only with intended members. The old mesh will still exist but you won't be in it.