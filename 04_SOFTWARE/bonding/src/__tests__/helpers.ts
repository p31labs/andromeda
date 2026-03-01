// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// BONDING â Test Helpers
// Atom factory + molecule builders
//
// These construct PlacedAtom objects for testing pure
// chemistry functions without touching Three.js or the store.
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

import { ELEMENTS } from '../data/elements';
import type { PlacedAtom, ElementSymbol } from '../types';

const ORIGIN = { x: 0, y: 0, z: 0 };
let _nextId = 1;

/** Reset the auto-incrementing ID counter between tests */
export function resetAtomIds(): void {
  _nextId = 1;
}

/**
 * Create a single PlacedAtom with sensible defaults.
 * bondSites defaults to the element's valence.
 */
export function makeAtom(
  element: ElementSymbol,
  overrides: Partial<PlacedAtom> = {},
): PlacedAtom {
  const id = overrides.id ?? _nextId++;
  return {
    id,
    element,
    position: overrides.position ?? { ...ORIGIN },
    bondSites: overrides.bondSites ?? ELEMENTS[element].valence,
    bondedTo: overrides.bondedTo ?? [],
    placedBy: overrides.placedBy ?? 0,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Build a molecule from an element sequence.
 * Each atom bonds to the previous one (linear chain).
 * Returns fully cross-linked atom array.
 *
 * Example: buildChain(['O', 'H', 'H']) â 3 atoms, O bonded to Hâ and Hâ
 *
 * For branching molecules, use makeAtom() directly.
 */
export function buildChain(elements: ElementSymbol[]): PlacedAtom[] {
  resetAtomIds();
  const atoms: PlacedAtom[] = [];

  for (let i = 0; i < elements.length; i++) {
    const atom = makeAtom(elements[i]!, {
      id: i + 1,
      position: { x: i * 0.8, y: 0, z: 0 },
    });

    if (i > 0) {
      // Bond to previous atom
      const prevId = atoms[i - 1]!.id;
      atom.bondedTo = [prevId];
      atoms[i - 1]!.bondedTo = [...atoms[i - 1]!.bondedTo, atom.id];
    }

    atoms.push(atom);
  }

  return atoms;
}

/**
 * Build a star molecule: first element at center, rest bonded to it.
 * Useful for testing tetrahedral/bent/trigonal geometries.
 *
 * Example: buildStar('O', ['H', 'H']) â water (O center, 2 H arms)
 */
export function buildStar(
  center: ElementSymbol,
  arms: ElementSymbol[],
): PlacedAtom[] {
  resetAtomIds();
  const centerAtom = makeAtom(center, {
    id: 1,
    position: { ...ORIGIN },
  });

  const armAtoms = arms.map((el, i) => {
    const angle = (2 * Math.PI * i) / arms.length;
    const atom = makeAtom(el, {
      id: i + 2,
      position: { x: Math.cos(angle) * 0.8, y: Math.sin(angle) * 0.8, z: 0 },
      bondedTo: [1],
    });
    return atom;
  });

  centerAtom.bondedTo = armAtoms.map((a) => a.id);
  return [centerAtom, ...armAtoms];
}

/**
 * Create an array of unbonded atoms (for formula testing only).
 * No bonds â just a bag of elements for generateFormula().
 */
export function atomBag(elements: ElementSymbol[]): PlacedAtom[] {
  resetAtomIds();
  return elements.map((el, i) =>
    makeAtom(el, { id: i + 1 }),
  );
}
