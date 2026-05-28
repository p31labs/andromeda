# GRANT APPLICATION: Robert Wood Johnson Foundation
## Pioneering Ideas: Exploring the Future to Build a Culture of Health

**Applicant:** William R. Johnson (Founder, P31 Labs)
**Project:** Fawn Guard — Local-First AI for Trauma-Informed Digital Communication
**Requested Amount:** $50,000 (Phase 1)

---

## 1. The Problem: Digital Surveillance as a Determinant of Mental Health

The "Future of Social Interaction" — the core concern of RWJF's Pioneering Ideas program — is being shaped by a fundamental tension: the platforms people use to communicate are designed to extract behavioral data, not to support human well-being.

For the 1 in 5 American adults living with a mental health condition, and for the estimated 6% of the population with complex trauma histories, this extraction is not benign. Continuous surveillance creates a measurable physiological stress response. Users self-censor, mask authentic communication, and suppress emotional expression when they know their data is being monitored, stored, and monetized by unseen third parties.

This is not theoretical. Clinical research documents that hypervigilance — a core symptom of PTSD and complex trauma — is directly exacerbated by environments of perceived surveillance. When every digital communication is potentially observed, filtered, and judged by algorithmic systems, the user's nervous system remains in a persistent state of threat assessment.

**The result:** People stop communicating authentically. They fawn. They people-please. They erase their own boundaries in digital spaces because the psychological cost of asserting them under surveillance is too high.

## 2. The Innovation: Fawn Guard

Fawn Guard is a local-first AI system embedded in PHOS OS (a zero-telemetry cognitive operating system) that detects real-time patterns of trauma-based people-pleasing in user text.

**How it works:**

1. The user types a message, email, journal entry, or any text input within PHOS OS
2. The system analyzes the text against clinically-informed linguistic markers of "fawning" — a recognized trauma response characterized by:
   - Hyper-apologetic language ("I'm sorry," "I know I shouldn't bother")
   - Boundary self-erasure ("never mind," "it doesn't matter," "whatever you think")
   - Excessive acquiescence ("you're absolutely right," "of course," "I'll try harder")
   - Suppression of personal needs to appease perceived authority
3. When 2+ markers are detected, the system provides a gentle, compassionate interruption: *"🦊 Fawn Guard: Your writing pattern shows people-pleasing signals. This is your space — be authentic, not accommodating."*
4. **All processing happens locally.** No text leaves the device. No cloud API call. No data extraction. The AI runs on the user's own hardware via an embedded local LLM switchboard.

**What makes this different from existing mental health apps:**

| Conventional Approach | Fawn Guard |
|----------------------|------------|
| Cloud-based analysis — user data sent to servers | Local-only processing — zero data leaves device |
| Extractive — analyzes users for platform benefit | Protective — analyzes users for the user's own benefit |
| Reactive — intervenes after crisis | Proactive — interrupts trauma loops before they manifest in communication |
| Requires internet connection | Works entirely offline |
| Tracks user behavior over time | No persistent profile — each analysis is ephemeral |

## 3. Technical Architecture

Fawn Guard operates within PHOS OS, a fully deployed cognitive operating system:

- **Local LLM Inference:** AI models (currently qwen2.5-coder:7b) run via embedded LiteLLM proxy on the user's own hardware. No API keys, no cloud costs, no data transmission.
- **Embedded Database (PGLite):** User data stored in WebAssembly-compiled PostgreSQL running in the browser. Full SQL capabilities, zero server dependency.
- **Zero-Telemetry Design:** The absence of cloud endpoints is not a feature — it is the architecture. There is no server to leak data because there is no server.
- **256-bit Encryption:** Local journal entries and contact logs are sealed with AES-GCM via WebCrypto, with SHA-256 hash chain anchoring for legal admissibility (FRE 902(14)).

**System Status:** Fully deployed. 155 unit tests passing. Live at phos.p31labs.com.

## 4. Alignment with RWJF Mission

RWJF's Pioneering Ideas program seeks projects that "challenge assumptions, alter cultural practices, or apply ideas from other fields to explore how emerging trends will shape the future of health."

Fawn Guard challenges the fundamental assumption that AI must be extractive to be effective. It applies cryptography and local-first computing — fields traditionally associated with security engineering — to the problem of psychological safety in digital communication.

The project directly addresses RWJF's focus on "the Future of Social Interaction" by asking: *What if the AI embedded in our communication tools was designed to protect us from ourselves — not from external threats, but from our own trauma responses?*

## 5. Use of Funds ($50,000 — Phase 1)

| Line Item | Amount | Justification |
|-----------|--------|---------------|
| Clinical validation study | $20,000 | Partner with 2-3 trauma therapists to validate Fawn Guard's detection accuracy against clinical assessment of fawning behavior |
| Open-source publication | $8,000 | Publish the complete heuristic framework, enabling researchers and developers to build upon the work |
| User testing (neurodivergent participants) | $7,000 | Paid testing sessions with 15-20 neurodivergent individuals across ADHD, autism, and PTSD diagnoses |
| Fawn Guard detection refinement | $5,000 | Iterative improvement of linguistic markers based on clinical feedback |
| Legal review (HIPAA/data architecture) | $5,000 | Expert verification that the local-only architecture meets healthcare-adjacent privacy standards |
| 6-month infrastructure costs | $5,000 | Cloudflare Workers, domain costs, and incident response for the production system |

## 6. Measurable Outcomes

Within 12 months of funding:

1. **Published heuristic framework** — open-sourced detection patterns for fawning in digital text, available for researchers and developers
2. **Clinical validation report** — sensitivity/specificity analysis of Fawn Guard detection against therapist assessment
3. **500+ active users** — based on current PHOS OS adoption trajectory
4. **Zero data breaches** — mathematically guaranteed by the absence of cloud data storage
5. **Replicable blueprint** — the architecture can be forked by any developer to add trauma-informed safeguards to their own applications

## 7. Qualifications

William R. Johnson is a 16-year DoD civilian electrical engineering veteran (GS-0802-12, TRIREFFAC Kings Bay) with expertise in safety-critical systems, fault tolerance, and SUBSAFE-derived quality principles. After a late diagnosis of AuDHD (age 39) and lifelong hypoparathyroidism (ICD-10 E20.9; PTH 1-6 pg/mL; serum calcium 7.8 mg/dL in crisis), Johnson founded P31 Labs to build the assistive technology he needed but couldn't find.

**Technical track record:**
- PHOS OS: 155 tests, 10 surfaces, deployed to production (2025-2026)
- BONDING: 488 tests, live multiplayer game, generates court-admissible parental engagement logs (deployed March 10, 2026)
- 10 Cloudflare Edge Workers deployed and operational
- 5 white papers / defensive publications (Zenodo DOI: 10.5281/zenodo.18627420; Internet Archive, Feb 25, 2026)
- Active Discord community with Oracle bot (Classic Willy#1581) serving 32 slash commands

## 8. Conclusion

The future of social interaction demands technology that protects rather than extracts. Fawn Guard represents a paradigm shift: AI that sits on your device, knows your patterns, and gently reminds you that your boundaries matter — without ever sending your thoughts to a server.

This is not speculative. It is deployed, tested, and operational. We request $50,000 to clinically validate the Fawn Guard framework and open-source it as a public good.

---

**Contact:**
William R. Johnson | will@p31ca.org | (912) 227-4980
Project URL: https://phos.p31labs.com
Source Code: https://github.com/p31labs (MIT License)
Publications: Zenodo DOI 10.5281/zenodo.18627420
Clinical context: Serum calcium 7.8 mg/dL (crisis); PTH 1-6 pg/mL; AuDHD diagnosed age 39
