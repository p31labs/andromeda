// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// Element data: colors, valences, frequencies, sizes
// Frequencies from P31 canonical table:
//   H=523Hz(C5), C=262Hz(C4), N=247Hz(B3), O=330Hz(E4),
//   Na=196Hz(G3), P=172Hz(F3), Ca=147Hz(D3)
// ═══════════════════════════════════════════════════════

import type { ElementSymbol, ElementData } from '../types';

export const ELEMENTS: Record<ElementSymbol, ElementData> = {
  H: {
    symbol: 'H',
    name: 'Hydrogen',
    valence: 1,
    color: '#E8F4FD',
    emissive: '#FFFFFF',
    frequency: 523,
    note: 'C5',
    size: 0.25,
    funFact: 'You are mostly hydrogen.',
  },
  C: {
    symbol: 'C',
    name: 'Carbon',
    valence: 4,
    color: '#2D5016',
    emissive: '#66BB3A',
    frequency: 262,
    note: 'C4',
    size: 0.45,
    funFact: 'The backbone of life. Every living thing is carbon-based.',
  },
  N: {
    symbol: 'N',
    name: 'Nitrogen',
    valence: 3,
    color: '#1A4A8B',
    emissive: '#4488FF',
    frequency: 247,
    note: 'B3',
    size: 0.42,
    funFact: '78% of the air you breathe.',
  },
  O: {
    symbol: 'O',
    name: 'Oxygen',
    valence: 2,
    color: '#8B1A1A',
    emissive: '#FF3030',
    frequency: 330,
    note: 'E4',
    size: 0.40,
    funFact: 'You breathe this. It also rusts metal.',
  },
  Na: {
    symbol: 'Na',
    name: 'Sodium',
    valence: 1,
    color: '#DAA520',
    emissive: '#FFD700',
    frequency: 196,
    note: 'G3',
    size: 0.5,
    funFact: 'Makes fireworks yellow. Makes your nerves fire.',
  },
  P: {
    symbol: 'P',
    name: 'Phosphorus',
    valence: 3,
    color: '#7B2FF7',
    emissive: '#B080FF',
    frequency: 172,
    note: 'F3',
    size: 0.48,
    funFact: 'Element 15. The signal carrier in your bones and DNA.',
  },
  Ca: {
    symbol: 'Ca',
    name: 'Calcium',
    valence: 2,
    color: '#C0C0C0',
    emissive: '#FFFFFF',
    frequency: 147,
    note: 'D3',
    size: 0.65,
    funFact: 'The structure of your bones. Without it, you\'d be jelly.',
  },
  Cl: {
    symbol: 'Cl',
    name: 'Chlorine',
    valence: 1,
    color: '#1FF01F',
    emissive: '#004400',
    frequency: 185,
    note: 'Cl',
    size: 0.99,
    funFact: 'Makes table salt with sodium. Also keeps your pool clean.',
  },
  S: {
    symbol: 'S',
    name: 'Sulfur',
    valence: 2,
    color: '#FFFF30',
    emissive: '#333300',
    frequency: 220,
    note: 'S',
    size: 1.04,
    funFact: 'Rotten eggs smell like sulfur. Volcanoes are full of it.',
  },
  Fe: {
    symbol: 'Fe',
    name: 'Iron',
    valence: 3,
    color: '#A52A2A',
    emissive: '#2A0F0F',
    frequency: 110,
    note: 'Fe',
    size: 1.26,
    funFact: 'Your blood is red because of iron. Stars die to make this.',
  },
};

export const ELEMENTS_ARRAY: ElementData[] = Object.values(ELEMENTS);

/** Map of element symbols to their display names (for UI) */
export const ELEMENT_NAMES: Record<ElementSymbol, string> = {
  H: 'Hydrogen',
  C: 'Carbon',
  N: 'Nitrogen',
  O: 'Oxygen',
  Na: 'Sodium',
  P: 'Phosphorus',
  Ca: 'Calcium',
  Cl: 'Chlorine',
  S: 'Sulfur',
  Fe: 'Iron',
};
