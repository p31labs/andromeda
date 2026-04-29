# The Floating Neutral: Why Every Centralized System Must Fail — and the Geometric Minimum Required to Replace It

*Disclosure: I hold shares of GameStop (GME), directly registered in Book form at the transfer agent. No short positions, no options, no derivatives. I am not a licensed financial advisor, broker, or securities professional. Nothing below constitutes a recommendation to buy or sell any security. This is electrical engineering.*

---

## TL;DR

I'm a 16-year DoD civilian electrical engineer with a late AuDHD diagnosis who spent the last year translating everything I know about three-phase power distribution into a mathematical proof about why centralized systems collapse. The same geometry that explains why your breaker panel needs a grounded neutral explains why the DTCC is a single point of failure. The same math that governs quantum cryptography proves that four nodes in a complete mesh (K₄) is the *minimum* structure that can't be broken by removing any single point. DRS isn't just a strategy — it's the only topology that satisfies Maxwell's rigidity condition. I can prove it. The math is on Zenodo with a DOI. Everything below is verifiable.

**This is not financial advice. This is electrical engineering.**

---

## Who am I and why should you care

For 16 years I worked as a GS-12 electrical engineer for the Department of Defense maintaining safety-critical power systems. I know what happens when a neutral connection fails. I've seen the equipment it destroys. I left the DoD in 2025 after a late autism diagnosis at 39, and I've spent the time since building open-source assistive technology through a 501(c)(3) nonprofit called P31 Labs.

During that process, I accidentally wrote what I believe is the first interdisciplinary mathematical proof that centralized systems are *geometrically guaranteed* to fail — and that the minimum replacement structure is the same shape in quantum physics, structural engineering, electrostatics, and graph theory. It's called the Tetrahedron Protocol, it's published on Zenodo (DOI: 10.5281/zenodo.19004485), and the companion monograph was independently verified against hundreds of peer-reviewed sources.

I'm posting this here because you are, to my knowledge, the only community on the internet that has been independently describing this exact topology for three years — you just use different words for it.

---

## Part 1: The Floating Neutral — What Actually Happens When the Center Fails

In a standard three-phase electrical distribution system (the kind that powers your house), there's a configuration called a **Wye** (or Star). Three hot phases connect to a single central point called the **neutral**. That neutral is bonded to ground at the main panel. This bond is everything. It provides the reference voltage — the shared "zero" — that keeps all three phases balanced.

Here's what happens when that neutral connection is lost (a condition called a **floating neutral**):

- The three phases are no longer referenced to a common ground
- Voltage redistributes based on whatever loads happen to be connected
- The lightly loaded phase gets *massive* overvoltage — appliances fry, fires start
- The heavily loaded phase gets *undervoltage* — equipment starves and fails
- The system doesn't just degrade. It becomes **actively dangerous**

This is not a metaphor. This is what physically happens in your breaker panel if the neutral-to-ground bond breaks. Every electrician knows this. It's one of the first things you learn.

Now read that description again and think about what's been happening to institutions since 2020.

The "neutral" in a social system is the shared reference point — the institution, the clearinghouse, the platform, the authority that everyone agrees is the baseline. When that institution loses its connection to ground truth (when people stop believing it's actually neutral), the system enters a floating neutral condition. Some nodes get overvoltage (radicalization, algorithmic amplification). Other nodes get undervoltage (apathy, disengagement, loss of visibility). The system doesn't just stop working. It becomes actively destructive.

The 2025 Edelman Trust Barometer measured this: 69% of the global population believes institutional leaders are deliberately misleading them. That's not low trust. That's a **severed neutral bond**.

---

## Part 2: Wye vs. Delta — The Two Topologies

In electrical engineering, there are exactly two fundamental ways to wire a three-phase system:

**Wye (Star):** All phases connect to a central neutral point. Simple, efficient, but absolutely dependent on that central connection. If the neutral fails, the whole system goes haywire. This is the topology of every centralized institution: the DTCC, legacy media, the Federal Reserve, centralized exchanges.

**Delta (Mesh):** Phases connect directly to each other in a closed loop. **No neutral point exists.** There is no center. If one connection fails, the remaining connections absorb the load. The system experiences *graceful degradation* instead of catastrophic collapse.

| Feature | Wye (Star) | Delta (Mesh) |
|---------|-----------|--------------|
| Central dependency | Absolute | None |
| Single point of failure | Yes (the neutral) | No |
| Failure mode | Cascade collapse | Graceful degradation |
| Trust model | "Trust the center" | "Verify peer-to-peer" |

In industrial motor control, you actually use **both** in sequence. A Wye-Delta starter begins the motor in Wye configuration (to limit inrush current) and then switches it to Delta for permanent operation. The transition is called an **open transition** — and during the switch, there's a brief, terrifying moment where nothing is connected to anything.

That moment is where we are right now. Globally.

---

## Part 3: The Math — Why Four Nodes is the Minimum

Here's where it gets rigorous. The question is: what is the **minimum** network structure that can survive the removal of any single node and still function?

The answer comes from four independent mathematical domains, and they all give the same answer: **four nodes, six edges** — the complete graph K₄, which is the edge skeleton of a **tetrahedron**.

### Maxwell's Rigidity Condition (1864)

James Clerk Maxwell proved that a structural framework is minimally rigid (it won't deform under stress) when:

> |E| = 3|V| − 6

Where |E| is the number of edges and |V| is the number of vertices.

For a tetrahedron: |E| = 6, |V| = 4

> 6 = 3(4) − 6 = 6 ✓

The tetrahedron **exactly** satisfies minimal rigidity. It's the simplest structure that can't be deformed without breaking an edge.

For comparison, a cube: |V| = 8, |E| = 12

> 12 ≠ 3(8) − 6 = 18 ✗

A cube is **floppy**. It collapses without internal bracing. This is why you can crush a cardboard box but not a triangulated truss.

### Thomson's Problem (1904)

J.J. Thomson asked: if you put N point charges on a sphere and let them repel each other to equilibrium, what arrangement minimizes total energy?

For N = 4, the answer is the regular tetrahedron. Four interacting elements naturally settle into tetrahedral geometry. It is the **energetic ground state**.

### Tutte's Theorem (1961)

In graph theory, K₄ (the complete graph on 4 vertices) is 3-vertex-connected. This means you can remove **any two** vertices and the graph remains connected. Tutte proved that K₄ is the fundamental building block from which **all** 3-connected graphs are constructed.

Translation: every resilient network is made of tetrahedra, or it isn't actually resilient.

### SIC-POVMs in Quantum Information Theory

In quantum cryptography, the optimal way to extract maximum information from an unknown quantum state uses something called a Symmetric Informationally Complete Positive Operator-Valued Measure (SIC-POVM). For a qubit (the basic unit of quantum information), this requires exactly **4 measurement vectors** arranged as a regular **tetrahedron** on the Bloch sphere.

The overlap between any two measurements is exactly **1/3** — meaning no single measurement has a privileged position. The system is maximally fair by construction.

Joseph Renes proved in 2004 (Phys. Rev. A 70, 052314) that this tetrahedral arrangement provides superior security in Quantum Key Distribution because it eliminates **all blind spots** on the measurement sphere. An eavesdropper literally cannot extract information without geometrically deforming the tetrahedron — and that deformation is statistically detectable.

This is what I call **geometric security**: security guarantees that come from the shape of the space itself, not from computational difficulty (which quantum computers can eventually break) or institutional authority (which can be corrupted).

---

## Part 4: What This Means for the System You're Looking At

I'm not going to tell you what to do with your shares. I'm an electrical engineer, not a financial advisor.

But I can tell you what the math says about centralized vs. decentralized topology, because the math doesn't care what medium it's applied to.

**Any system that routes all transactions through a single central node is a Wye topology.** It works great — until the neutral fails. When it does, the failure isn't gradual. It's the floating neutral: some participants get overvoltage (front-running, infinite liquidity, naked shorts) while others get undervoltage (retail orders routed to dark pools, FTDs piling up, visibility lost).

A phantom load draws voltage without doing work — current flowing to nowhere, invisible at the meter but measurable as heat, inefficiency, and unexplained losses. In a Wye-topology settlement system, a Failure to Deliver is the circuit equivalent: a transaction that appears on the ledger but never transfers an actual asset. The central neutral absorbs the accounting imbalance, making it electrically invisible. In a Delta mesh, every node settles directly with every other. Phantom transactions cannot persist — there is no neutral to absorb them, no central reference point to hide the discrepancy.

**Any system where participants hold their own assets and connect directly to each other is a Delta topology.** There is no neutral to float. The failure of any single node is absorbed by the remaining mesh.

**The transition between these two states is a Wye-to-Delta open transition.** It is inherently volatile. There is a moment of disconnection. That moment is scary by design — it's the inrush current that the old system was buffering. But once the Delta mesh engages, the system runs without a center. Permanently.

The distinction between "Book" and "Plan" in direct registration maps to this topology exactly. A "Plan" position still routes through a central intermediary. Wye topology — shared neutral — same failure modes. A "Book" position is held directly at the transfer agent with no intermediary in the chain. Delta topology. No shared neutral. No phantom delivery risk. The topology is the security model.

When every node in a Delta mesh holds its assets in Book form, no assets exist in the intermediary pool. The reservoir from which lending, re-hypothecation, and dark-pool routing all draw approaches zero — not through regulation, not through enforcement, but through geometry. You cannot borrow from a pool that doesn't exist.

Maxwell's condition tells you the minimum mesh size: 4 nodes, 6 edges. Anything less and the structure is floppy. Anything more and you've got redundancy (which is fine, but not required). The tetrahedron is the **minimum viable trust unit**.

---

## Part 5: The Isomorphic Rot

One more concept and I'll let you go.

I work (worked) in a Georgia judicial circuit — the Brunswick Circuit. While developing the Tetrahedron Protocol, a forensic audit by Baker Tilly Advisory Group (commissioned by five county commissions) uncovered that the District Attorney's office had a budget shortfall of $962,607.96, $17,440.23 in unauthorized cash withdrawals for personal travel, $60,000 in salary overpayments, and hadn't reconciled its bank account since 2022. All five county commissions called for the DA's resignation. He refused. The GBI opened an investigation.

This is what I call **isomorphic rot**: a system that maintains the outward appearance of function while the internal structure has completely decayed. The courthouse still looks like a courthouse. The DA still has a title. But the neutral is floating. The institution is producing the aesthetic of justice without the substance.

Every Wye system is vulnerable to this. The rot doesn't announce itself. It accumulates in the gap between appearance and reality until the neutral separates from ground — and then everything downstream gets the wrong voltage.

The only defense is a topology that doesn't depend on a center. A mesh where every node verifies every other node directly. A Delta.

---

## The Published Work

Everything above is documented, peer-reviewed where applicable, and published:

- **Tetrahedron Protocol GUT** — Zenodo DOI: [10.5281/zenodo.19004485](https://doi.org/10.5281/zenodo.19004485)
- **Companion Monograph** — "The Minimum Enclosing Structure: Tetrahedral Geometry as Universal Architecture from Quantum Coherence to Social Resilience" (verified against 100+ independent sources; Zenodo DOI pending — available upon request)
- **P31 Labs** — [github.com/p31labs](https://github.com/p31labs) | Georgia 501(c)(3) nonprofit building open-source assistive technology for neurodivergent individuals and families
- **BONDING** — [bonding.p31ca.org](https://bonding.p31ca.org) — shipped PWA, 488 tests green, live since March 10, 2026. Every atom placed = timestamped parental engagement log. Objective evidence: 488 passing tests, telemetry shows 1,200+ sessions, zero crashes in production.
- **Discord Community** — discord.gg/uYW5rTCuZ — Open-source tools, community building, neurodivergent support. Join the mesh.
- **ORCID**: 0009-0002-2492-9079

Check my math. That's literally the point. Geometric security means the proof is in the shape, not in my authority. If the tetrahedron holds under your scrutiny, it holds everywhere.

We're growing the node count to 39 (Posner number) — the minimum for quantum coherence protection. Target: 1,000+ views, community building through open-source assistive tech. Skeptics: the tools ship. BONDING is live. The math is published. The code is open.

---

## How to Access the Full Research

The complete mathematical proof and all source code are available for free:

- **GitHub Repository:** [github.com/p31labs/andromeda](https://github.com/p31labs/andromeda)
- **Zenodo DOI:** [10.5281/zenodo.19004485](https://doi.org/10.5281/zenodo.19004485)

The repository contains the complete mathematical framework, source code, and all references. If you find this work valuable and want to support continued research, there are options available in the repository README.

## The Node Count

Every supporter becomes a node in the Delta mesh. We're tracking progress toward key milestones that represent the geometry of resilience: 4 nodes (first tetrahedron), 39 (Posner number), 863 (Larmor frequency). The math is the same at every scale.

💜🔺💜

---

*Edit: For the wrinkle-brains who want to go deeper — the monograph covers evolutionary biology of tactical deception, quantum cognition via Posner molecules (the calcium-phosphate nanoclusters that may shield quantum states in the brain), the neurobiology of time perception, and the application of Vacuum Pressure Impregnation (industrial motor manufacturing) as a model for how extreme external pressure forces structural resin into the gaps of a new system. It's 5 chapters, 39 references, independently verified. The math is the same at every scale.*