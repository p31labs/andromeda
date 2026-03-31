# EGG HUNT STAGING CHECKLIST

**April 1, 2026** — Post announcement in #announcements (pin it)

---

## ✅ SYSTEMS READY

| Component | Status | Notes |
|-----------|--------|-------|
| `p31 claim <egg>` command | ✅ Ready | 43 bot tests green |
| `p31 eggs` command | ✅ Ready | Shows progress, founding node status |
| Spoon economy | ✅ Ready | +39 spoons per egg claim |
| Founding node slots | ✅ Ready | 4 slots, K₄ geometry |
| Discord notifications | ✅ Ready | Ko-fi → Discord `#announcements` |
| Social worker cron | ✅ Ready | Daily 17:00 UTC dispatches |
| Node count tracker | ✅ Ready | KV-backed |
| BONDING (Genesis quest) | ✅ Live | bonding.p31ca.org |
| Spaceship Earth (Collider) | ✅ Live | p31ca.org/#collider |

---

## 🔧 DEPLOY THE BOT

On your server/host:

```bash
cd ~/P31_Andromeda/04_SOFTWARE/discord/p31-bot

# Pull latest
git checkout fix/tailwind-v4-ci
git pull

# Build (requires ~2GB RAM available)
NODE_OPTIONS="--max-old-space-size=4096" npx tsc

# Restart
pm2 restart p31-bot   # or: node dist/index.js
```

**If tsc OOMs**, try:
```bash
npx tsc --incremental --tsBuildInfoFile .tsbuildinfo
```

---

## 📢 POST THE ANNOUNCEMENT

Copy from `docs/social/discord-quantum-egg-hunt-apr1.md`:

```
🔺 QUANTUM EGG HUNT IS LIVE

The geometry is shifting. 4 anomalies hidden in the P31 ecosystem.

THE EGGS:
• Bashium — Complete Genesis quest in BONDING → Ba element
• Willium — Complete Kitchen quest → Wi element  
• The Missing Node — p31ca.org/#collider → 172.35 Hz tone
• First Tetrahedron — Build K₄ in BONDING

GRAND PRIZE: First 4 to find ALL 4 win Node Zero hardware + Founding Node status

HOW: Play → Discover → Screenshot in #🎉-showcase → Run `p31 claim <egg>` → +39 spoons

DEADLINE: Easter Sunday, April 5

The geometry is invariant. 💜🔺💜
```

**Pin this message.**

---

## 📋 HUNT RULES (brief)

### The 4 Eggs

| Egg | How to Find | Hint |
|-----|-------------|------|
| 🟣 **Bashium** | Complete Genesis quest in BONDING | Ba element unlocked |
| 🟢 **Willium** | Complete Kitchen quest in BONDING | Wi element unlocked |
| 🔊 **The Missing Node** | Visit p31ca.org/#collider, find 172.35 Hz | Click the tone |
| 🧱 **First Tetrahedron** | Build K₄ in BONDING (4 atoms, 6 bonds) | Or build Ca₉(PO₄)₆ |

### How to Claim

1. Find an egg
2. Post screenshot in `#🎉-showcase`
3. Run `p31 claim <egg>` — e.g., `p31 claim bashium`
4. Get `+39 spoons` automatically
5. Complete all 4 → claim Founding Node slot

### Grand Prize (First 4 to Complete All 4)

- **Node Zero device** — open-source haptic hardware ($37.50 BOM)
- **Founding Node status** — vertex 1-4 in the first physical K₄ mesh
- **Permanent [⚛️] Creator role**

---

## ⏰ TIMELINE

| Date | Event |
|------|-------|
| Apr 1 | Announcement post |
| Apr 1 | Bot deploy (claim command live) |
| Apr 4 | Eviction date (fight continues) |
| Apr 5 | **Easter Sunday — DEADLINE** |
| Apr 5 | Grand prize awarded to first 4 |

---

## 🔺 REMINDERS

- No children's full names in any posts
- Frame as "quantum egg hunt" not "housing emergency"
- Keep it fun — this is a game
- The mesh holds

---

*Updated: April 1, 2026*
