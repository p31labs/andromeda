import { create } from 'zustand';

interface Vertex {
  id: string;
  name: string;
  role: 'admin' | 'member' | 'guest';
  online: boolean;
  bioState?: {
    spoons?: number;
    calcium?: number;
    status: 'green' | 'yellow' | 'red' | 'critical' | 'unknown';
  };
  lastSeen: number;
}

interface Edge {
  from: string;
  to: string;
  weight: number;
  loveBalance: number;
  lastInteraction: number;
}

interface MeshState {
  connected: boolean;
  connecting: boolean;
  vertices: Vertex[];
  edges: Edge[];
  
  // Actions
  checkConnection: () => Promise<void>;
  updateVertex: (id: string, updates: Partial<Vertex>) => void;
  recordLove: (from: string, to: string, amount: number) => void;
  
  // Computed
  getOnlineCount: () => number;
  getTotalLove: () => number;
  getImbalancedEdges: () => Edge[];
}

export const useMeshStore = create<MeshState>((set, get) => ({
  connected: false,
  connecting: false,
  vertices: [
    { id: 'will', name: 'Will', role: 'admin', online: true, lastSeen: Date.now(), bioState: { spoons: 0.72, calcium: 8.4, status: 'green' } },
    { id: 'sj', name: 'S.J.', role: 'member', online: false, lastSeen: Date.now() - 3600000, bioState: { status: 'unknown' } },
    { id: 'wj', name: 'W.J.', role: 'member', online: true, lastSeen: Date.now(), bioState: { spoons: 0.45, calcium: 8.2, status: 'yellow' } },
    { id: 'christyn', name: 'Christyn', role: 'member', online: false, lastSeen: Date.now() - 7200000, bioState: { status: 'unknown' } }
  ],
  edges: [
    { from: 'will', to: 'sj', weight: 0.8, loveBalance: 45, lastInteraction: Date.now() },
    { from: 'will', to: 'wj', weight: 0.9, loveBalance: 67, lastInteraction: Date.now() },
    { from: 'will', to: 'christyn', weight: 0.7, loveBalance: 23, lastInteraction: Date.now() - 86400000 },
    { from: 'sj', to: 'wj', weight: 0.6, loveBalance: -12, lastInteraction: Date.now() },
    { from: 'sj', to: 'christyn', weight: 0.75, loveBalance: 34, lastInteraction: Date.now() },
    { from: 'wj', to: 'christyn', weight: 0.65, loveBalance: 15, lastInteraction: Date.now() - 172800000 }
  ],

  checkConnection: async () => {
    set({ connecting: true });
    try {
      // Simulate API call
      await new Promise(r => setTimeout(r, 500));
      set({ connected: true, connecting: false });
    } catch {
      set({ connected: false, connecting: false });
    }
  },

  updateVertex: (id, updates) => {
    set(state => ({
      vertices: state.vertices.map(v => 
        v.id === id ? { ...v, ...updates, lastSeen: Date.now() } : v
      )
    }));
  },

  recordLove: (from, to, amount) => {
    set(state => ({
      edges: state.edges.map(e => {
        if ((e.from === from && e.to === to) || (e.from === to && e.to === from)) {
          return { ...e, loveBalance: e.loveBalance + amount, lastInteraction: Date.now() };
        }
        return e;
      })
    }));
  },

  getOnlineCount: () => get().vertices.filter(v => v.online).length,
  getTotalLove: () => get().edges.reduce((sum, e) => sum + e.loveBalance, 0),
  getImbalancedEdges: () => get().edges.filter(e => Math.abs(e.loveBalance) > 50)
}));
