import { describe, it, expect } from 'vitest';
import {
  createGraph,
  addEdge,
  isK4Complete,
  getK4Subgraph,
  extractDIDs,
  adjacencyMap,
  fromStore,
  toStore,
} from '../services/k4Graph';
import type { K4Edge } from '../sovereign/types';

function edge(from: string, to: string): K4Edge {
  return { from, to, timestamp: Date.now(), signature: 'test-sig' };
}

describe('K4 Graph', () => {
  describe('createGraph / addEdge', () => {
    it('starts empty', () => {
      const g = createGraph();
      expect(g.nodes.size).toBe(0);
      expect(g.edges.length).toBe(0);
    });

    it('adds nodes and edges', () => {
      let g = createGraph();
      g = addEdge(g, edge('A', 'B'));
      expect(g.nodes.size).toBe(2);
      expect(g.edges.length).toBe(1);
    });

    it('does not duplicate nodes', () => {
      let g = createGraph();
      g = addEdge(g, edge('A', 'B'));
      g = addEdge(g, edge('A', 'C'));
      expect(g.nodes.size).toBe(3);
      expect(g.edges.length).toBe(2);
    });
  });

  describe('adjacencyMap', () => {
    it('builds bidirectional adjacency', () => {
      const edges = [edge('A', 'B'), edge('B', 'C')];
      const adj = adjacencyMap(edges);
      expect(adj.get('A')?.has('B')).toBe(true);
      expect(adj.get('B')?.has('A')).toBe(true);
      expect(adj.get('B')?.has('C')).toBe(true);
      expect(adj.get('C')?.has('B')).toBe(true);
      expect(adj.get('A')?.has('C')).toBeFalsy();
    });
  });

  describe('isK4Complete', () => {
    it('returns false for empty graph', () => {
      expect(isK4Complete(createGraph())).toBe(false);
    });

    it('returns false for 3 nodes (triangle)', () => {
      let g = createGraph();
      g = addEdge(g, edge('A', 'B'));
      g = addEdge(g, edge('B', 'C'));
      g = addEdge(g, edge('A', 'C'));
      expect(isK4Complete(g)).toBe(false);
    });

    it('returns false for 4 nodes with only 5 edges', () => {
      let g = createGraph();
      g = addEdge(g, edge('A', 'B'));
      g = addEdge(g, edge('A', 'C'));
      g = addEdge(g, edge('A', 'D'));
      g = addEdge(g, edge('B', 'C'));
      g = addEdge(g, edge('B', 'D'));
      // Missing C-D
      expect(isK4Complete(g)).toBe(false);
    });

    it('returns true for complete K4 (4 nodes, 6 edges)', () => {
      let g = createGraph();
      g = addEdge(g, edge('A', 'B'));
      g = addEdge(g, edge('A', 'C'));
      g = addEdge(g, edge('A', 'D'));
      g = addEdge(g, edge('B', 'C'));
      g = addEdge(g, edge('B', 'D'));
      g = addEdge(g, edge('C', 'D'));
      expect(isK4Complete(g)).toBe(true);
    });

    it('finds K4 within a larger graph', () => {
      let g = createGraph();
      // Complete K4 among A,B,C,D
      g = addEdge(g, edge('A', 'B'));
      g = addEdge(g, edge('A', 'C'));
      g = addEdge(g, edge('A', 'D'));
      g = addEdge(g, edge('B', 'C'));
      g = addEdge(g, edge('B', 'D'));
      g = addEdge(g, edge('C', 'D'));
      // Extra node E partially connected
      g = addEdge(g, edge('A', 'E'));
      g = addEdge(g, edge('B', 'E'));
      expect(isK4Complete(g)).toBe(true);
    });
  });

  describe('getK4Subgraph', () => {
    it('returns null when no K4 exists', () => {
      let g = createGraph();
      g = addEdge(g, edge('A', 'B'));
      g = addEdge(g, edge('B', 'C'));
      expect(getK4Subgraph(g)).toBeNull();
    });

    it('returns 6 edges for a valid K4', () => {
      let g = createGraph();
      g = addEdge(g, edge('A', 'B'));
      g = addEdge(g, edge('A', 'C'));
      g = addEdge(g, edge('A', 'D'));
      g = addEdge(g, edge('B', 'C'));
      g = addEdge(g, edge('B', 'D'));
      g = addEdge(g, edge('C', 'D'));
      const sub = getK4Subgraph(g);
      expect(sub).not.toBeNull();
      expect(sub!.length).toBe(6);
    });
  });

  describe('extractDIDs', () => {
    it('returns unique DIDs', () => {
      const edges = [edge('A', 'B'), edge('B', 'C'), edge('A', 'C')];
      const dids = extractDIDs(edges);
      expect(dids.sort()).toEqual(['A', 'B', 'C']);
    });
  });

  describe('store serialization', () => {
    it('round-trips through toStore/fromStore', () => {
      let g = createGraph();
      g = addEdge(g, edge('A', 'B'));
      g = addEdge(g, edge('B', 'C'));

      const stored = toStore(g);
      expect(Array.isArray(stored.nodes)).toBe(true);
      expect(Array.isArray(stored.edges)).toBe(true);

      const restored = fromStore(stored);
      expect(restored.nodes.size).toBe(g.nodes.size);
      expect(restored.edges.length).toBe(g.edges.length);
    });
  });

  describe('Maxwell isostatic rigidity', () => {
    it('K4 satisfies E = 3V - 6 (6 = 3*4 - 6)', () => {
      const V = 4;
      const E = 6;
      expect(E).toBe(3 * V - 6);
    });
  });
});
