# CHUMP for CHANGE — MVP Architecture & Completion Report

**Status:** ✅ Active | **Tier:** S Critical Infrastructure | **Last Updated:** May 2026

## Executive Summary

CHUMP (Comprehensive Heuristic Uptime & Micro-task Protocol) for CHANGE is a decentralized edge-to-cloud aggregation system designed to capture, track, and liquidate "internet couch change." It combines passive DePIN (Decentralized Physical Infrastructure Networks) bandwidth sharing, AI tokenomics, and active micro-tasking into a unified ledger.

---

## System Architecture

```
                    ┌─────────────────────────┐
                    │   Global Dashboard      │
                    │  chump.p31ca.org        │
                    │  chump-dashboard        │
                    └──────────┬──────────────┘
                               │ reads KV
                    ┌──────────▼──────────────┐
                    │   chump-edge Worker     │
                    │  Cloudflare + KV        │
                    │  /api/report /stats     │
                    └──────────┬──────────────┘
                               │ POST /api/report (every 15 min)
    ┌──────────────────────────▼──────────────────────────┐
    │              CashPilot Worker (Local Node)          │
    │  :8081 — Express + polling + liquidator + scraper   │
    │                                                     │
    │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
    │  │DePIN Poll│  │Liquidator│  │ Task Scraper     │   │
    │  │Honeygain │  │Grass     │  │ MTurk → filtered │   │
    │  │EarnApp   │  │Nodepay   │  │ UHRS  → curated  │   │
    │  │Pawns     │  │          │  │ $12/hr floor     │   │
    │  │PacketStr │  │          │  └────────┬─────────┘   │
    │  └──────────┘  └──────────┘           │             │
    └───────────────────────────────────────┼─────────────┘
                    │                       │
         ┌──────────▼──────────┐  ┌─────────▼──────────┐
         │ Chrome Extension    │  │  Arcade Hub        │
         │ popup.html          │  │  hub.p31ca.org     │
         │ background.js       │  │  TaskBoard.jsx     │
         │ idle detection      │  │  Accept Bounty UI  │
         │ $0.01/15min reward  │  │  GET /api/tasks    │
         └─────────────────────┘  └────────────────────┘
```

---

## Component Breakdown

### 1. The Local Edge (Docker & Browser)

**CashPilot Node (Port 8081/8082):** The secure local heart of the operation. By keeping API keys and session tokens on the local filesystem (`data/integrations.json`), we eliminate the risk of exposing DePIN credentials to the public cloud.

- **DePIN Polling Engine:** Background loop fetching native USD balances from Honeygain, EarnApp, Pawns, and PacketStream.
- **Tokenomic Liquidator:** Real-time conversion engine for AI data rollups. Currently converts Grass points ($0.0015/pt) and Nodepay points ($0.0008/pt) into standardized USD metrics.
- **Micro-task Scraper:** Connects to MTurk and UHRS feeds, filtering out low-value garbage tasks. Enforces a strict $12.00/hr and $0.50 minimum raw payout floor.

**Chrome Extension:** A Manifest V3 Proof-of-Uptime node. Uses `chrome.idle` to ensure the user is actively at the machine, securely POSTing a heartbeat to CashPilot every 15 minutes to earn $0.01.

### 2. The Cloud Layer (Cloudflare)

- **CHUMP Edge Worker (`chump-edge`):** The global sync point. Accepts batched ledger updates from the local CashPilot node and writes them to a Cloudflare KV namespace (`CHUMP_LEDGER`).
- **Arcade Hub (`hub.p31ca.org`):** The gamified front-end for active tasks. Fetches the curated high-value feed from the local CashPilot node, allowing the user to click "Accept Bounty" and jump straight to the work.
- **Global Dashboard (`chump.p31ca.org`):** Tier S monitoring station displaying the aggregated global metrics, active node count, and monthly MRR estimates.

---

## File Index

| File | Purpose |
|------|---------|
| `02_Client_or_Misc/cashpilot/docker-compose.yml` | Docker stack definition (UI:8082, Worker:8081) |
| `02_Client_or_Misc/cashpilot/worker/server.js` | Express server — all API routes, polling loop, edge sync |
| `02_Client_or_Misc/cashpilot/worker/liquidator.js` | Grass/Nodepay token → USD conversion |
| `02_Client_or_Misc/cashpilot/worker/task-scraper.js` | MTurk/UHRS feed with $12/hr filter |
| `02_Client_or_Misc/cashpilot/ui/src/App.jsx` | React dashboard — Dashboard + API Integrations tabs |
| `02_Client_or_Misc/chump-extension/` | Chrome MV3 extension — 4 files |
| `04_SOFTWARE/cloudflare-worker/chump-edge/index.js` | Edge worker — Cloudflare Workers + KV |
| `04_SOFTWARE/chump-dashboard/index.html` | Static global dashboard deployed to Pages |
| `p31-arcade-hub/src/components/TaskBoard.jsx` | React bounty board — fetches CashPilot /api/tasks |
| `04_SOFTWARE/scripts/hardware-audit.sh` | DePIN host evaluation script |

---

## Operations & Maintenance

- **Token Rotation:** If Grass or Nodepay sessions expire, use the CashPilot UI (`localhost:8082` → API Integrations) to paste the new Bearer token.
- **Hardware Expansion:** If host disk space falls below 95% usage or a dedicated CUDA GPU is acquired, consult the Hardware Audit Script (`04_SOFTWARE/scripts/hardware-audit.sh`) to evaluate adding Storj or Render nodes.
- **Forcing Syncs:** The system auto-syncs every 15 minutes. To force an immediate cycle, hit `POST http://localhost:8081/api/sync` with your Master Key.

---

## Phase 4 Expansion Targets (Future)

- **Hardware-Intensive DePIN:** Re-evaluate Storj (Storage) and Render (GPU Compute) if dedicated hardware is provisioned.
- **DEX Aggregator Integration:** Connect the Liquidator module to a live Oracle/DEX (like Jupiter) for real-time Grass/Nodepay tokenomic pricing instead of static estimates.
- **Automated Task Acceptance:** Implement Selenium/Puppeteer scripts within the CashPilot worker to automatically reserve high-value MTurk tasks the moment the scraper detects them, holding them in queue for manual completion.
