/**
 * K4 Graph — Maxwell Isostatic Rigidity Check (WCD-M21)
 *
 * A complete graph K4 (4 nodes, 6 edges) satisfies Maxwell's criterion
 * for 3D isostatic rigidity: E = 3V - 6 → 6 = 3(4) - 6.
 */

import type { K4Edge } from '../sovereign/types';

export interface K4Graph {
  nodes: Set<string>;
  edges: K4Edge[];
}

/** Create an empty graph. */
export function createGraph(): K4Graph {
  return { nodes: new Set(), edges: [] };
}

/** Build a graph from a store-serializable shape. */
export function fromStore(data: { nodes: string[]; edges: K4Edge[] }): K4Graph {
  return { nodes: new Set(data.nodes), edges: [...data.edges] };
}

/** Serialize graph for store persistence. */
export function toStore(graph: K4Graph): { nodes: string[]; edges: K4Edge[] } {
  return { nodes: Array.from(graph.nodes), edges: graph.edges };
}

/** Add an edge. Returns a new graph (immutable). */
export function addEdge(graph: K4Graph, edge: K4Edge): K4Graph {
  const nodes = new Set(graph.nodes);
  nodes.add(edge.from);
  nodes.add(edge.to);
  return { nodes, edges: [...graph.edges, edge] };
}

/** Build adjacency map from edges. */
export function adjacencyMap(edges: K4Edge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    if (!adj.has(e.to)) adj.set(e.to, new Set());
    adj.get(e.from)!.add(e.to);
    adj.get(e.to)!.add(e.from);
  }
  return adj;
}

/** Check if any 4-node subgraph forms a complete K4. */
export function isK4Complete(graph: K4Graph): boolean {
  return getK4Subgraph(graph) !== null;
}

/**
 * Find a K4 subgraph (4 mutually connected nodes).
 * Returns the 6 edges if found, null otherwise.
 * Brute-force C(n,4) — fine for expected graph sizes (4-8 nodes).
 */
export function getK4Subgraph(graph: K4Graph): K4Edge[] | null {
  const nodeArr = Array.from(graph.nodes);
  if (nodeArr.length < 4 || graph.edges.length < 6) return null;

  const adj = adjacencyMap(graph.edges);

  // Check all combinations of 4 nodes
  for (let i = 0; i < nodeArr.length; i++) {
    for (let j = i + 1; j < nodeArr.length; j++) {
      for (let k = j + 1; k < nodeArr.length; k++) {
        for (let l = k + 1; l < nodeArr.length; l++) {
          const quad = [nodeArr[i], nodeArr[j], nodeArr[k], nodeArr[l]];

          // Check all 6 pairs are connected
          let complete = true;
          for (let a = 0; a < 4 && complete; a++) {
            for (let b = a + 1; b < 4 && complete; b++) {
              if (!adj.get(quad[a])?.has(quad[b])) {
                complete = false;
              }
            }
          }

          if (complete) {
            // Collect the 6 edges
            const k4Edges: K4Edge[] = [];
            for (let a = 0; a < 4; a++) {
              for (let b = a + 1; b < 4; b++) {
                const edge = graph.edges.find(
                  (e) =>
                    (e.from === quad[a] && e.to === quad[b]) ||
                    (e.from === quad[b] && e.to === quad[a])
                );
                if (edge) k4Edges.push(edge);
              }
            }
            return k4Edges;
          }
        }
      }
    }
  }

  return null;
}

/** Extract all unique DIDs from a set of K4 edges. */
export function extractDIDs(edges: K4Edge[]): string[] {
  const dids = new Set<string>();
  for (const e of edges) {
    dids.add(e.from);
    dids.add(e.to);
  }
  return Array.from(dids);
}
