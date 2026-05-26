/**
 * K4 agent worker tetrahedron — topology unit tests.
 * Run: node --test --test-reporter=spec test/topology.test.mjs
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  ADJACENCY, BIPARTITE_COVER, EDGES, FAMILY_VERTICES, PERSONAL_DOCK_FOR,
  SCHEMA, SKILLS, TRIADIC_COVER, VERTEX_IDS, validateTopology,
} from "../src/topology.js";

describe("K₄ topology invariants", () => {
  it("has exactly 4 vertices", () => {
    assert.equal(VERTEX_IDS.length, 4);
  });

  it("has exactly 6 edges (K₄ formula n*(n-1)/2)", () => {
    assert.equal(EDGES.length, 6);
  });

  it("every vertex has 3 K₄ neighbors", () => {
    for (const v of VERTEX_IDS) {
      assert.equal(ADJACENCY[v].length, 3, `${v} should have 3 neighbors`);
    }
  });

  it("edges are unique pairs", () => {
    const seen = new Set();
    for (const e of EDGES) {
      const key = [e.from, e.to].sort().join("|");
      assert.ok(!seen.has(key), `duplicate edge ${key}`);
      seen.add(key);
    }
  });

  it("validateTopology() does not throw", () => {
    validateTopology();
  });
});

describe("Personal-tetra bipartite cover", () => {
  it("each agent vertex pairs with one personal-tetra dock", () => {
    const docks = new Set(["structure", "connection", "rhythm", "creation"]);
    for (const v of VERTEX_IDS) {
      assert.ok(docks.has(PERSONAL_DOCK_FOR[v]), `${v} missing personal dock`);
    }
  });

  it("BIPARTITE_COVER lists all 4 pairs", () => {
    assert.equal(BIPARTITE_COVER.length, 4);
    const agentSet = new Set(BIPARTITE_COVER.map((p) => p.agent));
    const personalSet = new Set(BIPARTITE_COVER.map((p) => p.personal));
    for (const v of VERTEX_IDS) assert.ok(agentSet.has(v));
    assert.equal(personalSet.size, 4);
  });
});

describe("Skill registry", () => {
  it("every vertex has at least one skill", () => {
    for (const v of VERTEX_IDS) {
      assert.ok(SKILLS[v].length >= 1, `${v} has no skills`);
    }
  });

  it("skill ids are unique across the whole hub", () => {
    const seen = new Set();
    for (const v of VERTEX_IDS) {
      for (const s of SKILLS[v]) {
        assert.ok(!seen.has(s.id), `duplicate skill id ${s.id}`);
        seen.add(s.id);
      }
    }
  });

  it("phos-companion is gated on child-mesh-unlock", () => {
    const phos = SKILLS.scribe.find((s) => s.id === "phos-companion");
    assert.equal(phos?.gate, "child-mesh-unlock");
  });
});

describe("Schema + family triadic cover (v1.1.0)", () => {
  it("SCHEMA is p31.k4AgentHub/1.1.0", () => {
    assert.equal(SCHEMA, "p31.k4AgentHub/1.1.0");
  });

  it("family cage has exactly 4 vertices", () => {
    assert.equal(FAMILY_VERTICES.length, 4);
  });

  it("every family vertex pairs with one personal dock and one agent guardian", () => {
    const docks = new Set(["structure", "connection", "rhythm", "creation"]);
    for (const f of FAMILY_VERTICES) {
      assert.ok(docks.has(f.personalDock), `family ${f.id} bad dock`);
      assert.ok(VERTEX_IDS.includes(f.guardianAgent), `family ${f.id} bad agent`);
    }
  });

  it("TRIADIC_COVER lists 4 family→personal→agent rows", () => {
    assert.equal(TRIADIC_COVER.length, 4);
    const ids = new Set(TRIADIC_COVER.map((t) => t.family));
    assert.equal(ids.size, 4);
  });

  it("S.J. and W.J. carry the child-mesh-unlock gate", () => {
    const sj = FAMILY_VERTICES.find((f) => f.id === "sj");
    const wj = FAMILY_VERTICES.find((f) => f.id === "wj");
    assert.equal(sj.gate, "child-mesh-unlock");
    assert.equal(wj.gate, "child-mesh-unlock");
  });
});
