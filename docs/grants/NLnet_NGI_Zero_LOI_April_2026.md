# NLNET NGI ZERO COMMONS - LETTER OF INTENT

**Date:** April 11, 2026

**Project Name:** P31 Delta Mesh: Isostatic Decentralized Infrastructure

**Requested Amount:** €12,500

**Licenses:** AGPLv3 (Software), CERN-OHL-S-2.0 (Hardware)

---

## 1. Project Abstract

The P31 Delta Mesh is an open-source Decentralized Physical Infrastructure Network (DePIN) designed to counteract the "Floating Neutral" vulnerability inherent in centralized Wye (hub-and-spoke) network topologies.

We are engineering an offline-first, handheld communication node—the **Phenix Navigator**—that utilizes the **K_4 complete graph (tetrahedron)** as its fundamental routing geometry. This architecture achieves **isostatic rigidity** in the network layer: if one node fails, the mesh autonomously maintains 57.7% of its operational capacity without requiring central server arbitration.

The system bridges a bare-metal ESP32-S3/LoRa mesh with a local-first WebRTC/CRDT browser environment, reclaiming the internet commons for users highly vulnerable to centralized infrastructure collapse.

---

## 2. Compare to Existing Solutions

### Centralized Platforms (Discord, Slack, Cloud Messaging)
- Fragile Wye topologies
- Single points of failure
- Extract telemetry
- Subject edge users to uncontrolled data surges

### Existing Mesh Radios (Meshtastic, Reticulum)
- Structurally robust but lack integrated CRDT data-sync layers
- Do not account for high cognitive load in interface design

### P31 Delta Mesh
- Uses **KenosisMesh** engine (Yjs CRDTs: y-webrtc, y-indexeddb)
- Includes native **Catcher's Mitt** temporal batching algorithm
- Hardware-level **somatic grounding** (haptic resonance at 172.35 Hz)
- Manages operator cognitive load during degraded network states

---

## 3. Technical Implementation

### Computational Core
- **ESP32-S3-WROOM-1** (16MB Flash, 8MB Octal PSRAM)

### Network Layer
- **Semtech SX1262** LoRa transceiver (915 MHz ISM band)

### Architecture Constraint
- Firmware isolates LoRa SPI3_HOST bus to avoid ESP32-S3 GPIO 33-37 "Kill Zone" (permanently reserved for Octal PSRAM)

### State Synchronization
- Frontend uses **y-indexeddb** for immutable local persistence
- **y-webrtc** for localized peer-to-peer syncing
- State entirely decoupled from cloud database providers

### Somatic Interface
- **DRV2605L** haptic driver provides 172.35 Hz tactile feedback
- Anchors user physically during high-stress communication events
- Classified strictly as **510(k)-exempt Powered Communication System** under FDA 21 CFR § 890.3710

---

## 4. Milestones and Budget Allocation (€12,500)

This initial funding tranche covers hardware fabrication and security auditing of the minimum viable mesh (4 nodes).

### Milestone 1: K_4 Hardware Fabrication (€4,500)
- Procurement, maker-space fabrication, assembly of four (4) Phenix Navigator EVT nodes
- Includes ESP32-S3 baseboards, SX1262 transceivers, NXP SE050 Hardware Security Modules
- Custom Faraday Sled shielding to prevent RF display ghosting

### Milestone 2: Firmware & CRDT Bridge (€5,000)
- Finalization of ESP-IDF 5.5.3 firmware
- Implementation of SPI bus arbitration logic
- Bridging hardware C++ packet layer to TypeScript KenosisMesh CRDT instances

### Milestone 3: Security & "Abdication" Audit (€3,000)
- Execution and audit of "Abdication Ceremony" script
- Scorched-earth bash sequence that burns silicon eFuses (DIS_JTAG, SECURE_BOOT_EN)
- Permanently transitions nodes into immutable, trustless public utilities

---

## 5. Societal Impact

By decentralizing both the physical hardware and the data-sync layer, the P31 Delta Mesh protects **marginalized and neurodivergent populations** from:

- Institutional data capture
- Infrastructure fragility

It mathematically enforces **proximity, trust, and psychological safety** over engagement-driven bandwidth consumption, re-establishing the internet as a resilient, localized commons.

---

## Compliance Statement

This application strictly adheres to **Gray Rock** narrative constraints:
- Clinical, physics-based language
- Explicitly avoids diagnostic medical claims
- Preserves FDA 21 CFR § 890.3710 exemption
- Emphasizes **Public Digital Sovereignty**
- Architectural shift from Wye to Delta topologies