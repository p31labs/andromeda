// observatoryStore.ts — Lightweight Zustand store for Observatory UI state
// Decoupled from sovereign store. Used by both the 3D builder and the DOM overlay.

import { create } from 'zustand';
import type { NodeInfo, AxisKey } from '../observatory-data';

interface ObservatoryUIState {
  selectedNode: NodeInfo | null;
  filter: AxisKey | null;
  searchQuery: string;
  stateFilters: Set<string>;
  busFilters: Set<string>;

  setSelected: (node: NodeInfo | null) => void;
  setFilter: (axis: AxisKey | null) => void;
  setSearchQuery: (q: string) => void;
  toggleStateFilter: (s: string) => void;
  toggleBusFilter: (b: string) => void;
  reset: () => void;
}

export const useObservatoryStore = create<ObservatoryUIState>((set) => ({
  selectedNode: null,
  filter: null,
  searchQuery: '',
  stateFilters: new Set(),
  busFilters: new Set(),

  setSelected: (node) => set({ selectedNode: node }),
  setFilter: (axis) => set({ filter: axis }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleStateFilter: (s) => set((state) => {
    const next = new Set(state.stateFilters);
    if (next.has(s)) next.delete(s); else next.add(s);
    return { stateFilters: next };
  }),
  toggleBusFilter: (b) => set((state) => {
    const next = new Set(state.busFilters);
    if (next.has(b)) next.delete(b); else next.add(b);
    return { busFilters: next };
  }),
  reset: () => set({
    selectedNode: null, filter: null, searchQuery: '',
    stateFilters: new Set(), busFilters: new Set(),
  }),
}));
