/**
 * K₄ agent worker tetrahedron — topology constants.
 *
 * Mirrors p31-k4-agent-hub.json (schema p31.k4AgentHub/1.0.0). The manifest is
 * the source of truth; this file is the runtime view. Keep in sync via
 * scripts/verify-k4-agent-hub.mjs.
 */

export const SCHEMA = "p31.k4AgentHub/1.1.0";
export const FEDERATION_SCHEMA = "p31.k4AgentHubFederation/1.0.0";
export const FAMILY_CAGE_SCHEMA = "p31.familyCage/1.0.0";
export const VERTEX_IDS = ["forge", "counsel", "scholar", "scribe"];
export const PERSONAL_DOCK_FOR = {
  forge: "structure",
  counsel: "connection",
  scholar: "rhythm",
  scribe: "creation",
};
export const ANCHOR_FOR = {
  forge: "teal",
  counsel: "coral",
  scholar: "phosphorus",
  scribe: "lavender",
};
export const VERB_FOR = {
  forge: "make",
  counsel: "protect",
  scholar: "understand",
  scribe: "remember",
};

/** All six K₄ edges (unordered pairs, canonicalized as `{from < to}`). */
export const EDGES = [
  { from: "forge",   to: "counsel", label: "safe to ship",            verb: "make·protect" },
  { from: "forge",   to: "scholar", label: "design from research",    verb: "make·understand" },
  { from: "forge",   to: "scribe",  label: "write what you build",    verb: "make·remember" },
  { from: "counsel", to: "scholar", label: "brief the brief",          verb: "protect·understand" },
  { from: "counsel", to: "scribe",  label: "file the protect",         verb: "protect·remember" },
  { from: "scholar", to: "scribe",  label: "publish the understanding", verb: "understand·remember" },
];

/** Adjacency map (every vertex has 3 K₄ neighbors). */
export const ADJACENCY = (() => {
  const map = Object.fromEntries(VERTEX_IDS.map((v) => [v, []]));
  for (const e of EDGES) {
    map[e.from].push(e.to);
    map[e.to].push(e.from);
  }
  return map;
})();

/** Skill registry — frozen v1.0.0 set; new skills require a manifest update. */
export const SKILLS = {
  forge: [
    { id: "ts-worker",   label: "TypeScript / Workers / Pages / D1",  ollamaPersona: "p31-mechanic", simplexLane: "FORGE",   gate: null },
    { id: "esp-firmware",label: "ESP-IDF / Node Zero firmware",        ollamaPersona: "p31-firmware", simplexLane: null,      gate: null },
    { id: "one-liner",   label: "Commit messages and one-liners",      ollamaPersona: "p31-quick",    simplexLane: null,      gate: null },
  ],
  counsel: [
    { id: "pro-se-georgia",label: "Pro se Georgia drafting",            ollamaPersona: "p31-counsel", simplexLane: "COUNSEL", gate: null },
    { id: "voltage-triage",label: "Hostile-mail voltage classification",ollamaPersona: "p31-triage",  simplexLane: "HERALD",  gate: null },
    { id: "post-incident", label: "Post-incident debrief",              ollamaPersona: "p31-debrief", simplexLane: null,      gate: null },
  ],
  scholar: [
    { id: "grants-synthesis", label: "Grants and research synthesis",   ollamaPersona: "p31-narrator", simplexLane: "SCHOLAR", gate: null },
    { id: "q-factor-patterns",label: "Q-factor / trimtab pattern detection", ollamaPersona: "p31-oracle", simplexLane: "ORACLE", gate: null },
  ],
  scribe: [
    { id: "passport-mirror",label: "Cognitive Passport assembly",        ollamaPersona: "p31-scribe", simplexLane: "SCRIBE",  gate: null },
    { id: "phos-companion", label: "Phos children companion-as-memory",  ollamaPersona: "p31-phos",   simplexLane: null,      gate: "child-mesh-unlock" },
  ],
};

/** Canonical bipartite cover (personal → agent). */
export const BIPARTITE_COVER = [
  { personal: "structure",  agent: "forge",   edge: "you build · forge tools" },
  { personal: "connection", agent: "counsel", edge: "you reach · counsel keeps" },
  { personal: "rhythm",     agent: "scholar", edge: "you pace · scholar charts" },
  { personal: "creation",   agent: "scribe",  edge: "you make · scribe records" },
];

/** Family K₄ cage vertices — see CLAUDE.md / .cursorrules; initials only. */
export const FAMILY_VERTICES = [
  { id: "will",     role: "operator",  personalDock: "structure",  guardianAgent: "forge",   ageBand: "adult", displayInitial: "W" },
  { id: "sj",       role: "child",     personalDock: "rhythm",     guardianAgent: "scholar", ageBand: "minor", displayInitial: "S.J.", gate: "child-mesh-unlock" },
  { id: "wj",       role: "child",     personalDock: "creation",   guardianAgent: "scribe",  ageBand: "minor", displayInitial: "W.J.", gate: "child-mesh-unlock" },
  { id: "christyn", role: "co-parent", personalDock: "connection", guardianAgent: "counsel", ageBand: "adult", displayInitial: "C" },
];

/** K₄,₄,₄ triadic cover (family → personal → agent). */
export const TRIADIC_COVER = FAMILY_VERTICES.map((f) => ({
  family: f.id,
  personal: f.personalDock,
  agent: f.guardianAgent,
  ageBand: f.ageBand,
  gate: f.gate ?? null,
}));

/** Sanity invariants — also enforced by scripts/verify-k4-agent-hub.mjs. */
export function validateTopology() {
  const n = VERTEX_IDS.length;
  const expectedEdges = (n * (n - 1)) / 2;
  if (EDGES.length !== expectedEdges) {
    throw new Error(`K4 invariant violated: |E|=${EDGES.length} expected ${expectedEdges}`);
  }
  for (const v of VERTEX_IDS) {
    if (ADJACENCY[v].length !== n - 1) {
      throw new Error(`K4 invariant violated: vertex ${v} has ${ADJACENCY[v].length} neighbors, expected ${n - 1}`);
    }
    if (!SKILLS[v] || SKILLS[v].length === 0) {
      throw new Error(`Vertex ${v} has no skills registered.`);
    }
    if (!PERSONAL_DOCK_FOR[v]) {
      throw new Error(`Vertex ${v} has no personal-tetra dock pairing.`);
    }
  }
  // K₄,₄,₄ — every family vertex must pair with one personal dock and one agent.
  if (FAMILY_VERTICES.length !== 4) {
    throw new Error(`Family cage must have 4 vertices (got ${FAMILY_VERTICES.length})`);
  }
  const expectedDocks = ["structure", "connection", "rhythm", "creation"];
  const docks = new Set(FAMILY_VERTICES.map((f) => f.personalDock));
  for (const d of expectedDocks) {
    if (!docks.has(d)) throw new Error(`Family cage missing personal dock ${d}`);
  }
  for (const f of FAMILY_VERTICES) {
    if (!VERTEX_IDS.includes(f.guardianAgent)) {
      throw new Error(`Family vertex ${f.id} has unknown guardianAgent ${f.guardianAgent}`);
    }
  }
}
