# NLnet NGI Zero Commons Fund — Submission

**Proposal Name:** PHOS OS — Zero-Telemetry Local-First Cognitive Operating System

**Requested Amount:** €25,000

**Abstract:**
PHOS OS is a deployed, tested, operational zero-telemetry cognitive operating system for neurodivergent individuals. It runs entirely on the user's device — no cloud dependencies, no telemetry, no data exfiltration. The system runs local AI inference via an embedded LiteLLM switchboard connecting to local models (qwen2.5-coder:7b), stores all data in an embedded WebAssembly PostgreSQL database (PGLite) that never leaves the browser, and processes crisis alerts through Cloudflare Edge workers achieving sub-100ms global response times. All code is MIT-licensed at github.com/p31labs/andromeda.

**Technical Excellence (30%):**
- Embedded WASM PostgreSQL (PGLite): full SQL database compiled to WebAssembly running in-browser. No backend database exists.
- Local LLM inference: embedded LiteLLM proxy routes to local Ollama models. RAG pipeline embeds documents locally via nomic-embed-text, stores vectors in PGLite, performs cosine similarity search — no third-party AI API calls.
- Zero-telemetry architecture: mathematically enforced by the absence of cloud endpoints for sensitive data.
- 155 unit tests across 10 test suites, 56 TypeScript source files, ~9,400 lines of application code.
- Fawn Guard: real-time detection of people-pleasing patterns in user text, providing gentle interruption of trauma loops before they manifest in digital communication.

**Relevance/Impact (40%):**
PHOS OS addresses a critical gap: the impossibility of psychological safety in surveillance-based computing. For neurodivergent individuals (AuDHD, autism, anxiety disorders), continuous data extraction creates a measurable psychological tax. Users self-censor and suppress authentic communication when they know their data is being harvested.

The system creates a "cognitive sanctuary" where:
1. No data leaves the device — mathematically enforced
2. AI serves the user, not the platform — local inference on user's hardware
3. Trauma-informed safeguards — Fawn Guard detects boundary-collapse patterns
4. Legal-grade documentation — family contact logs are timestamped, hashed, and exportable as court-admissible evidence under FRE 902(14)

**Cost Effectiveness (30%):**

| Line Item | Amount | Justification |
|-----------|--------|---------------|
| Security audit | €8,000 | Third-party cryptographic review |
| Accessibility compliance (WCAG 2.1 AA) | €5,000 | Professional audit and remediation |
| Documentation & developer onboarding | €4,000 | Comprehensive docs for community forking |
| 6-month operating costs | €3,000 | Cloudflare, domains, infrastructure |
| Legal review | €3,000 | GDPR/CCPA compliance verification |
| Neurodivergent UX research | €2,000 | Paid user testing with 10 participants |

**Track Record:**
1. BONDING — molecular chemistry multiplayer game. 488 tests, live March 10, generates legal-grade parental engagement documentation
2. PHOS OS — complete cognitive operating system. 155 tests, 10 surfaces, deployed to production
3. Publish system — multi-platform content engine (Zenodo, GitHub, Dev.to, Hashnode, Bluesky, Discors)
4. 5+ peer-reviewed publications — white papers on Zenodo (DOI: 10.5281/zenodo.18627420)
5. Discord Oracle Bot — 21 slash commands, Ed25519 signature verification, treasury management

**Website:** https://phos.p31ca.org
**GitHub:** https://github.com/p31labs/andromeda
**Organization:** P31 Labs, Inc.
**Country:** United States (Georgia)
**EIN:** 42-1888158
**Contact:** William R. Johnson | will@p31ca.org | (904) 684-9491
