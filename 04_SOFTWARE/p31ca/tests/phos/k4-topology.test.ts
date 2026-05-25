import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => {
  const mockScene = { add: vi.fn(), background: null };
  const mockCamera = { position: { set: vi.fn() }, lookAt: vi.fn() };
  const mockRenderer = { setPixelRatio: vi.fn(), setSize: vi.fn(), render: vi.fn(), dispose: vi.fn(), forceContextLoss: vi.fn() };
  const mockMesh = { geometry: { dispose: vi.fn() }, material: { dispose: vi.fn() } };
  const mockLine = { geometry: null, material: null };
  const mockMaterial = { dispose: vi.fn() };
  const mockClock = { getElapsedTime: vi.fn(() => 0) };

  return {
    Scene: vi.fn(() => mockScene),
    PerspectiveCamera: vi.fn(() => mockCamera),
    WebGLRenderer: vi.fn(() => mockRenderer),
    SphereGeometry: vi.fn(),
    MeshStandardMaterial: vi.fn(() => mockMaterial),
    InstancedMesh: vi.fn(() => mockMesh),
    InstancedBufferAttribute: vi.fn(),
    LineBasicMaterial: vi.fn(() => mockMaterial),
    Line: vi.fn(() => mockLine),
    BufferGeometry: vi.fn(() => ({ setFromPoints: vi.fn() })),
    AmbientLight: vi.fn(),
    PointLight: vi.fn(),
    GridHelper: vi.fn(),
    Color: vi.fn(),
    Vector3: vi.fn(),
    Object3D: vi.fn(),
    Clock: vi.fn(() => mockClock),
    DynamicDrawUsage: 'dynamic',
  };
});

import { RouterPhase } from '../../src/phos-v2/phase3-router/RouterPhase';
import type { MeshTopology, Vertex } from '../../src/phos-v2/phase3-router/RouterPhase';

const K4_VERTEX_IDS = ['wj', 'sj', 'cj', 'wij'];
const K4_EDGE_COUNT = 6;

function getVertexPairs(ids: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push([ids[i], ids[j]]);
    }
  }
  return pairs;
}

describe('K4 mesh topology', () => {
  let router: RouterPhase;

  beforeEach(() => {
    router = new RouterPhase();
  });

  describe('discoverMesh', () => {
    it('returns topology with exactly 4 vertices', () => {
      const topology = router.discoverMesh();
      expect(topology.vertices).toHaveLength(4);
    });

    it('returns topology with exactly 6 edges', () => {
      const topology = router.discoverMesh();
      expect(topology.edges).toHaveLength(K4_EDGE_COUNT);
    });

    it('vertices have correct IDs: wj, sj, cj, wij', () => {
      const topology = router.discoverMesh();
      const vertexIds = topology.vertices.map((v) => v.id).sort();
      expect(vertexIds).toEqual([...K4_VERTEX_IDS].sort());
    });

    it('every vertex has capabilities array', () => {
      const topology = router.discoverMesh();
      for (const vertex of topology.vertices) {
        expect(Array.isArray(vertex.capabilities)).toBe(true);
        expect(vertex.capabilities.length).toBeGreaterThan(0);
      }
    });

    it('every vertex has a non-empty capabilities array', () => {
      const topology = router.discoverMesh();
      for (const vertex of topology.vertices) {
        expect(vertex.capabilities.length).toBeGreaterThan(0);
      }
    });

    it('complete graph: every pair of vertices has an edge', () => {
      const topology = router.discoverMesh();
      const pairs = getVertexPairs(K4_VERTEX_IDS);

      for (const [a, b] of pairs) {
        const edge = topology.edges.find(
          (e) => (e.from === a && e.to === b) || (e.from === b && e.to === a)
        );
        expect(edge).toBeDefined();
      }
    });

    it('every edge connects two valid vertex IDs', () => {
      const topology = router.discoverMesh();
      for (const edge of topology.edges) {
        expect(K4_VERTEX_IDS).toContain(edge.from);
        expect(K4_VERTEX_IDS).toContain(edge.to);
        expect(edge.from).not.toBe(edge.to);
      }
    });

    it('every edge has weight and latency', () => {
      const topology = router.discoverMesh();
      for (const edge of topology.edges) {
        expect(edge).toHaveProperty('weight');
        expect(edge).toHaveProperty('latency');
        expect(typeof edge.weight).toBe('number');
        expect(typeof edge.latency).toBe('number');
      }
    });

    it('topology has lastUpdated timestamp', () => {
      const topology = router.discoverMesh();
      expect(topology).toHaveProperty('lastUpdated');
      expect(typeof topology.lastUpdated).toBe('number');
      expect(topology.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe('getVertex', () => {
    it('returns correct vertex by ID for each K4 member', () => {
      router.discoverMesh();

      const wj = router.getVertex('wj');
      expect(wj).toBeDefined();
      expect(wj!.id).toBe('wj');
      expect(wj!.name).toBe('W.J.');

      const sj = router.getVertex('sj');
      expect(sj).toBeDefined();
      expect(sj!.id).toBe('sj');
      expect(sj!.name).toBe('S.J.');

      const cj = router.getVertex('cj');
      expect(cj).toBeDefined();
      expect(cj!.id).toBe('cj');
      expect(cj!.name).toBe('C.J.');

      const wij = router.getVertex('wij');
      expect(wij).toBeDefined();
      expect(wij!.id).toBe('wij');
      expect(wij!.name).toBe('Wi.J.');
    });

    it('returns undefined for unknown vertex ID', () => {
      router.discoverMesh();
      expect(router.getVertex('unknown')).toBeUndefined();
    });
  });

  describe('getAllVertices', () => {
    it('returns all 4 vertices', () => {
      router.discoverMesh();
      const all = router.getAllVertices();
      expect(all).toHaveLength(4);
    });

    it('returned vertices match the discovered topology', () => {
      const topology = router.discoverMesh();
      const all = router.getAllVertices();
      const allIds = all.map((v) => v.id).sort();
      const topoIds = topology.vertices.map((v) => v.id).sort();
      expect(allIds).toEqual(topoIds);
    });
  });

  describe('updateVertexStatus', () => {
    it('changes vertex status', () => {
      router.discoverMesh();

      const before = router.getVertex('wj');
      expect(before!.status).toBe('online');

      router.updateVertexStatus('wj', 'away');

      const after = router.getVertex('wj');
      expect(after!.status).toBe('away');
    });

    it('updates lastSeen timestamp on status change', () => {
      router.discoverMesh();

      const before = router.getVertex('sj');
      const beforeSeen = before!.lastSeen;

      const delay = 10;
      const start = Date.now();
      while (Date.now() - start < delay) {}

      router.updateVertexStatus('sj', 'busy');

      const after = router.getVertex('sj');
      expect(after!.lastSeen).toBeGreaterThanOrEqual(beforeSeen);
    });

    it('handles all valid status transitions', () => {
      router.discoverMesh();

      const statuses: Array<'online' | 'away' | 'offline' | 'busy'> = ['online', 'away', 'offline', 'busy'];

      for (const status of statuses) {
        router.updateVertexStatus('wj', status);
        const vertex = router.getVertex('wj');
        expect(vertex!.status).toBe(status);
      }
    });

    it('does not throw for unknown vertex ID', () => {
      router.discoverMesh();
      expect(() => router.updateVertexStatus('nonexistent', 'online')).not.toThrow();
    });
  });

  describe('vertex properties', () => {
    it('every vertex has required fields: id, name, status, persona, lastSeen, capabilities', () => {
      const topology = router.discoverMesh();

      for (const vertex of topology.vertices) {
        expect(vertex).toHaveProperty('id');
        expect(vertex).toHaveProperty('name');
        expect(vertex).toHaveProperty('status');
        expect(vertex).toHaveProperty('persona');
        expect(vertex).toHaveProperty('lastSeen');
        expect(vertex).toHaveProperty('capabilities');
      }
    });

    it('vertex personas match their IDs', () => {
      const topology = router.discoverMesh();

      for (const vertex of topology.vertices) {
        expect(vertex.persona).toBe(vertex.id);
      }
    });

    it('all vertices start as online', () => {
      const topology = router.discoverMesh();

      for (const vertex of topology.vertices) {
        expect(vertex.status).toBe('online');
      }
    });
  });

  describe('K4 edge completeness', () => {
    it('has exactly the 6 expected K4 edges', () => {
      const topology = router.discoverMesh();
      const pairs = getVertexPairs(K4_VERTEX_IDS);
      expect(pairs.length).toBe(6);
      expect(topology.edges.length).toBe(6);
    });

    it('no duplicate edges exist', () => {
      const topology = router.discoverMesh();
      const edgeKeys = topology.edges.map((e) => {
        const sorted = [e.from, e.to].sort();
        return `${sorted[0]}->${sorted[1]}`;
      });
      const uniqueKeys = new Set(edgeKeys);
      expect(edgeKeys.length).toBe(uniqueKeys.size);
    });

    it('no self-loop edges exist', () => {
      const topology = router.discoverMesh();
      for (const edge of topology.edges) {
        expect(edge.from).not.toBe(edge.to);
      }
    });
  });
});
