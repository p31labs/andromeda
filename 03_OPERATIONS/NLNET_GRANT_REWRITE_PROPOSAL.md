# NLnet NGI Zero Commons Grant Proposal - Rewrite for NGI Commons Alignment
**Project Title:** K4-Mesh-Core: Open Standard for Sovereign Peer-to-Peer Mesh Networks
**Revised Funding Request:** €35,000 EUR (within €5K-€50K range)
**Deadline:** June 1, 2026
**P31 Labs, Inc. | EIN 42-1888158 | ORCID: 0009-0002-2492-9079**

## Executive Summary
This proposal requests €35,000 to establish K4-Mesh-Core as an open standard for sovereign peer-to-peer mesh networks under the NGI Zero Commons framework. Rather than focusing on isolated applications, we position K4-Mesh-Core as the foundational routing protocol that enables off-grid, resilient communication networks built on open standards. This rewrite aligns the proposal with NGI Commons' mission to develop and maintain an open, free, and privacy-respecting internet by creating a verifiably open mesh networking standard that anyone can implement, audit, and extend without dependence on commercial infrastructure or proprietary technologies.

## Strategic Realignment: From Application to Open Standard

### Original Approach (Application-Focused)
- Positioned Node Zero as isolated assistive technology device
- Emphasized specific use cases (health monitoring, communication aids)
- Focused on end-user applications rather than underlying protocols
- Risk of creating another proprietary "solution" rather than open infrastructure

### Revised Approach (NGI Commons-Aligned)
- Establishes K4-Mesh-Core as open standard protocol (like TCP/IP for mesh)
- Focuses on interoperability, auditability, and permissionless innovation
- Creates foundation for diverse applications built by different teams
- Embodies NGI Commons principles: open, free, secure, privacy-respecting
- Enables true digital sovereignty through mesh networking fundamentals

## NGI Commons Alignment & k4-mesh-core Protocol Specification

### Core Principles Alignment
| NGI Commons Principle | K4-Mesh-Core Implementation | Verification Method |
|----------------------|----------------------------|---------------------|
| **Open & Free** | MIT/Apache-2 licensed protocol specification | License audit in repository |
| **Privacy-Respecting** | Zero-knowledge routing, no persistent identifiers | Protocol analysis & traffic inspection |
| **Secure by Design** | Mutual authentication, message integrity, forward secrecy | Cryptographic review & penetration testing |
| **Decentralized** | No central authorities, peer-to-peer topology | Network partition testing & fault tolerance |
| **Interoperable** | Well-defined API, multiple implementations possible | Reference implementation + conformance tests |
| **Sustainable** | Low-power operation, minimal bandwidth usage | Power profiling & efficiency measurements |
| **Transparent** | Public development, open issues, community governance | GitHub activity & meeting minutes |

### Technical Specification: k4-mesh-core Protocol
**Purpose:** Lightweight, secure mesh routing protocol for resource-constrained devices operating in intermittently connected environments.

**Layer:** Network/Transport layer (OSI Layers 3-4)

**Key Features:**
- **Addressing:** Topology-aware addressing using K4 complete graph principles
- **Routing:** Proactive link-state with hysteresis to prevent flapping
- **Security:** Mutual TLS 1.3 with pre-shared keys (PSK) for device authentication
- **Reliability:** Store-and-forward with message acknowledgments and retransmission
- **Efficiency:** Header compression (<20 bytes), payload agnostic (bytes only)
- **Discovery:** Multicast-based neighbor discovery with exponential backoff
- **Fragmentation:** Automatic fragmentation/reassembly for MTU constraints
- **QoS:** Priority queuing for latency-sensitive applications (voice, alerts)

**Protocol Stack:**
```
Application Layer (User-defined)
        ↓
k4-mesh-core (Routing, Security, Reliability)
        ↓
Adaptation Layer (LoRa, WiFi, Ethernet, Serial)
        ↓
Physical Layer (SX1262, ESP32 WiFi, UART, etc.)
```

### Milestone-Based Payment Structure (€35,000 Total)

#### Phase 1: Core System Stabilization (€14,000) - Months 1-3
**Objective:** Establish reliable, secure mesh networking foundation on target hardware.

**Technical Tasks:**
1. **QSPI Boot Sequence Stabilization**
   - Resolve CWP-046 display boot debug stage on Waveshare ESP32-S3-Touch-LCD-3.5B
   - Implement customized SPI bus initialization for AXS15231B LCD driver
   - Integrate TCA9554 I/O expander reset sequence at address 0x20
   - Handle hardware rotation (swap_xy) via software compensation in LVGL 8.4

2. **Waveform Library Integration**
   - Port and optimize DRV2605L haptic waveform library for ESP-IDF 5.5.x
   - Create haptic feedback API for vagal tone generation (0.1 Hz pulse)
   - Implement precise scheduling via FreeRTOS high-priority tasks
   - Integrate with touch input for multimodal feedback

**Verifiable Deliverables for Payment:**
- Public Git repository with tagged release "v1.0-core-stable"
- Video demonstrating stable QSPI boot sequence to functional UI
- API documentation for haptic feedback module
- Automated test suite for display initialization and haptic control
- Compilation success report: zero warnings, clean idf.py build

#### Phase 2: Mesh Networking & UX Testing (€11,000) - Months 4-6
**Objective:** Verify peer-to-peer mesh networking functionality and validate assistive user experience with target demographic.

**Technical Tasks:**
1. **Peer-to-Peer Protocol Verification**
   - Implement SX1262 LoRa transceiver driver on GPIO 46
   - Establish bidirectional LoRa communication between two nodes
   - Implement mesh routing protocol with topology discovery
   - Add message acknowledgment, retransmission, and duplicate suppression
   - Implement power-saving modes with wake-on-radio capability

2. **Assistive User Interface Testing**
   - Develop neurodivergent-centered UI using LVGL 8.4
   - Implement sensory-friendly interaction patterns (predictable, consistent)
   - Create customizable input methods (touch, switch, voice)
   - Design low-cognitive-load navigation and feedback systems

**Verifiable Deliverables for Payment:**
- Video telemetry showing SX1262 LoRa packet transmission between nodes
- Network topology visualization demonstrating mesh formation and healing
- Published UX testing report from 15 neurodivergent beta testers (anonymized)
- Accessibility audit report covering WCAG 2.1 AA compliance for neurodivergent users
- Mesh network stress test results (node churn, message loss, latency)

#### Phase 3: Open Hardware Documentation (€10,000) - Months 7-9
**Objective:** Enable permissionless innovation through complete open documentation and standards alignment.

**Technical Tasks:**
1. **Schematic & BOM Finalization**
   - Create production-ready KiCad schematics for Node Zero reference design
   - Generate Gerber fabrication files and assembly drawings
   - Document Bill of Materials with multiple sourcing options
   - Include PCB layout guidelines for PSRAM clearance (GPIO 26-37 avoidance)

2. **Open Standards Replication**
   - Create comprehensive replication guide for K4-Mesh-Core protocol
   - Document API surface, message formats, and extension points
   - Provide implementation checklist for alternative hardware platforms
   - Prepare submission for Open Source Hardware Association (OSHWA) certification

**Verifiable Deliverables for Payment:**
- Public release of KiCad project files (schematics, layouts, BOM)
- Complete Gerber file set for manufacturing
- Open Source Hardware Certification application submitted to OSHWA
- Replication guide: "Building K4-Mesh-Core Compatible Nodes from Scratch"
- Package manager release (PlatformIO, ESP-IDF component registry)
- Integration examples for Arduino, PlatformIO, and bare-metal ESP-IDF

## Technical Validation & Quality Assurance

### Testing Methodology
- **Unit Testing:** Catch2 framework for C++ components, unity for C
- **Integration Testing:** Hardware-in-the-loop with actual SX1262 and display modules
- **Network Testing:** Mesh formation, partitioning, healing under realistic conditions
- **Fuzz Testing:** Protocol-level fuzzing with AFL++ for security hardening
- **Interoperability Testing:** Multiple implementations communicating via protocol
- **Power Profiling:** Current consumption analysis across all operational states
- **Environmental Testing:** Temperature (-20°C to +60°C), humidity (5%-95% RH)

### Success Metrics
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Packet Delivery Ratio | ≥95% in mesh of 5+ nodes | Sequence number analysis |
| Route Convergence Time | <5s for topology changes | Time-stamped routing updates |
| Message Latency | <100ms for 3-hop mesh | Timestamp difference analysis |
| Deep Sleep Current | ≤30μA (stretch: ≤7μA) | Digital multimeter measurement |
| Protocol Overhead | <20% bandwidth usage | Payload vs. total transmitted bytes |
| Code Size | <150KB flash, ≤32KB RAM | size -A output from ESP-IDF toolchain |
| Battery Life | ≥8 hours continuous operation | Runtime test with 18650 LiPo battery |
| UI Responsiveness | <100ms touch-to-visual-feedback | High-speed camera + touch simulator |

## Risk Mitigation Strategy

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Display driver instability (CWP-046) | High | High | Custom QSPI initialization sequence, software rotation compensation |
| PSRAM memory corruption | Medium | Critical | Strict GPIO 26-37 avoidance, runtime memory protection checks |
| LoRa antenna detuning | Medium | Medium | Impedance matching network, VSWR < 2:1 validation |
| Protocol deadlock under load | Low | High | Timeout mechanisms, watchdog resets, formal verification of key states |
| User rejection due to complexity | Medium | High | Progressive disclosure, sensory-friendly defaults, caregiver configuration mode |
| Regulatory non-compliance (RF emissions) | Low | High | Pre-compliance testing, FCC/CE certified module selection, duty cycle limiting |

## Alignment with NGI Zero Commons Objectives

### Primary Contributions to NGI Commons
1. **Open Routing Protocol Standard:** K4-Mesh-Core as MIT-licensed alternative to proprietary mesh solutions
2. **Privacy-Preserving by Design:** Zero-knowledge routing that prevents traffic analysis and metadata leakage
3. **Resilient Infrastructure Foundation:** Enables communication networks that survive internet outages and censorship
4. **Permissionless Innovation Platform:** Any developer can build compliant implementations without approval
5. **Sustainable Technology:** Ultra-low-power operation suitable for renewable energy powered deployments
6. **Auditability & Transparency:** Full public development history, enabling independent security verification

### Specific NGI Zero Commons Alignment Points
- **Open Technology Development:** Protocol specification developed in public GitHub repository
- **Decentralization Architecture:** True peer-to-peer mesh with no central points of control or failure
- **Privacy Enhancing Technologies:** Minimal metadata exposure, optional end-to-end encryption layers
- **Open Source Hardware/Software:** Complete open stack from RF front-end to application layer
- **Community Governance:** Public issue tracking, transparent decision-making process
- **Sustainability Focus:** Energy-efficient design enabling battery and renewable operation

## Budget Justification (€35,000 Total)

| Budget Category | Amount (EUR) | Percentage | Justification |
|-----------------|--------------|------------|---------------|
| Personnel | €21,000 | 60% | Core protocol implementation, testing, documentation |
| Hardware Prototyping | €5,250 | 15% | Reference devices, test equipment, component validation |
| Open Documentation | €3,500 | 10% | Professional technical writing, diagram creation, translation |
| Certification & Compliance | €2,800 | 8% | OSHWA application, pre-compliance testing, documentation |
| Community Engagement | €2,100 | 6% | Beta tester stipends, accessibility consultant, workshop materials |
| Travel & Field Validation | €0 | 0% | Covered by P31 Labs operational budget (local testing) |
| Indirect Costs (HCB Fee) | €2,450 | 7% | Flat 7% fiscal sponsorship fee for legal compliance |
| **Total** | **€35,000** | **100%** | **Complete funding for open standard establishment** |

## Sustainability Beyond Grant Period

### Path to Self-Sustaining Open Standard
1. **Reference Implementations:** Multiple hardware ports (ESP32, RP2040, STM32) demonstrating viability
2. **Commercial Friendly Licensing:** MIT/Apache-2.0 allowing proprietary and open-source use
3. **Standards Body Liaison:** Engagement with IETF, IEEE, W3C for potential standardization paths
4. **Ecosystem Incentives:** Bounties for implementations on novel platforms (satellite, underwater, etc.)
5. **Educational Resources:** Tutorials, workshops, and academic paper submissions
6. **Conservation Covenant:** Legally binding commitment to maintain specification openness

### Long-Term Vision
K4-Mesh-Core evolves from a specific implementation to a family of interoperable protocols sharing:
- Common message format and extension mechanisms
- Security suite (authentication, encryption, integrity)
- Reliability framework (acknowledgments, retransmission, flow control)
- Discovery and neighborhood maintenance protocols
While allowing adaptation to specific transports (LoRa, WiFi, Ethernet, cellular, satellite, etc.) and application requirements through well-defined adaptation layers.

## Conclusion
This rewritten proposal transforms the original application-focused concept into a true NGI Zero Commons project by establishing K4-Mesh-Core as an open, privacy-respecting, decentralized communication standard. By focusing on the protocol layer rather than isolated applications, we create the foundational infrastructure that enables permissionless innovation in resilient, sovereign mesh networks.

The €35,000 request represents a strategic investment in digital commons infrastructure that will yield returns far beyond the initial funding through:
- Reduced duplication of effort across mesh networking projects
- Increased security through public audit and community review
- Enhanced resilience through diverse, interoperable implementations
- Greater accessibility through radically lowered barriers to entry
- Stronger alignment with fundamental human rights to communicate and associate freely

This work directly advances the NGI Zero Commons mission to build an internet that works for people, not profit—or in our case, a mesh network that works for communities, not corporations.

**Prepared by:** P31 Labs Architect Agent (Opus lane)
**Date:** May 25, 2026
**Version:** 1.0
**Status:** Ready for submission to NLnet NGI Zero Commons Fund (June 1, 2026 deadline)

---
*This document supersedes any previous NLnet grant application. All future references should use this revised budget, technical focus, and NGI Commons alignment.*