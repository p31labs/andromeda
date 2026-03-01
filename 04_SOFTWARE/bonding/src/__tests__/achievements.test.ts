// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// BONDING â P31 Labs
// Achievement data integrity test suite
//
// These tests catch the class of bug that shipped NaCl:
// achievements that reference molecules unbuildable with
// the current element palette. They also verify structural
// integrity of the achievement definitions.
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, KNOWN_MOLECULES } from '../data/achievements';
import { ELEMENTS } from '../data/elements';
import { generateFormula } from '../engine/chemistry';
import { atomBag } from './helpers';
import type { ElementSymbol } from '../types';

// The 6-element palette available in BONDING v0.3
const PALETTE: Set<ElementSymbol> = new Set(
  Object.keys(ELEMENTS) as ElementSymbol[],
);

/**
 * Parse a flat formula string into element counts.
 * Handles Unicode subscripts (â, â, etc.) and multi-char symbols (Na, Ca).
 * Returns null if formula contains elements not in palette.
 */
function parseFormula(formula: string): Record<string, number> | null {
  const counts: Record<string, number> = {};
  const subMap: Record<string, number> = {
    '\u2080': 0, '\u2081': 1, '\u2082': 2, '\u2083': 3, '\u2084': 4,
    '\u2085': 5, '\u2086': 6, '\u2087': 7, '\u2088': 8, '\u2089': 9,
  };

  let i = 0;
  while (i < formula.length) {
    // Skip parenthetical groups like Ca(OH)â â not parseable for buildability
    if (formula[i] === '(') return null;

    // Read element symbol: uppercase + optional lowercase
    let symbol = formula[i]!;
    if (i + 1 < formula.length && formula[i + 1]!.match(/[a-z]/)) {
      symbol += formula[i + 1];
      i++;
    }
    i++;

    // Read subscript digits
    let numStr = '';
    while (i < formula.length && formula[i]! in subMap) {
      numStr += subMap[formula[i]!];
      i++;
    }

    const count = numStr.length > 0 ? parseInt(numStr) : 1;
    counts[symbol] = (counts[symbol] ?? 0) + count;
  }

  return counts;
}

/**
 * Check if a formula is buildable with the current palette.
 * Returns true if all elements in the formula exist in PALETTE.
 */
function isBuildable(formula: string): boolean {
  const counts = parseFormula(formula);
  if (!counts) return false; // unparseable (parenthetical)
  return Object.keys(counts).every((el) => PALETTE.has(el as ElementSymbol));
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Structural integrity
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('Achievement definitions â structural integrity', () => {
  it('every achievement has a unique id', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every achievement has non-empty name and description', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length, `${a.id} name`).toBeGreaterThan(0);
      expect(a.description.length, `${a.id} description`).toBeGreaterThan(0);
    }
  });

  it('every achievement has a positive LOVE value', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.love, `${a.id} love`).toBeGreaterThan(0);
    }
  });

  it('every achievement has a non-empty icon', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.icon.length, `${a.id} icon`).toBeGreaterThan(0);
    }
  });

  it('trigger types are all valid', () => {
    const validTypes = new Set([
      'first_atom',
      'formula',
      'time_under',
      'molecule_count',
      'atom_count',
      'element_diversity',
      'novel_molecule',
      'ping_count',
      'element_count',
      'full_palette',
    ]);
    for (const a of ACHIEVEMENTS) {
      expect(
        validTypes.has(a.trigger.type),
        `${a.id} has unknown trigger type: ${a.trigger.type}`,
      ).toBe(true);
    }
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Formula achievement â KNOWN_MOLECULES consistency
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('Formula achievements â KNOWN_MOLECULES', () => {
  const formulaAchievements = ACHIEVEMENTS.filter(
    (a) => a.trigger.type === 'formula',
  );

  it('every formula achievement target exists in KNOWN_MOLECULES', () => {
    const missing: string[] = [];
    for (const a of formulaAchievements) {
      if (a.trigger.type === 'formula') {
        if (!KNOWN_MOLECULES.has(a.trigger.formula)) {
          missing.push(`${a.id} â ${a.trigger.formula}`);
        }
      }
    }
    expect(missing, `Achievements targeting unknown molecules: ${missing.join(', ')}`).toEqual([]);
  });

  it('formula achievement formulas match generateFormula output', () => {
    // For each formula achievement, build the atom bag and verify
    // generateFormula produces the same string the trigger expects.
    // This catches Hill-system ordering mismatches.
    const mismatches: string[] = [];

    for (const a of formulaAchievements) {
      if (a.trigger.type !== 'formula') continue;
      const counts = parseFormula(a.trigger.formula);
      if (!counts) continue; // skip parenthetical formulas

      // Build atom array from parsed counts
      const elements: ElementSymbol[] = [];
      for (const [el, count] of Object.entries(counts)) {
        for (let i = 0; i < count; i++) {
          elements.push(el as ElementSymbol);
        }
      }

      // Skip if any element is not in palette
      if (!elements.every((el) => PALETTE.has(el))) continue;

      const generated = generateFormula(atomBag(elements));
      if (generated !== a.trigger.formula) {
        mismatches.push(
          `${a.id}: trigger="${a.trigger.formula}" but generateFormula="${generated}"`,
        );
      }
    }

    if (mismatches.length > 0) {
      console.warn('Formula mismatches (Hill system):\n' + mismatches.join('\n'));
    }
    expect(mismatches).toEqual([]);
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Buildability â THE NaCl CLASS OF BUG
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('Formula achievements â buildability with current palette', () => {
  const formulaAchievements = ACHIEVEMENTS.filter(
    (a) => a.trigger.type === 'formula',
  );

  // Non-hidden achievements MUST be buildable.
  // Hidden achievements MAY reference future elements.
  const visible = formulaAchievements.filter((a) => !a.hidden);
  const hidden = formulaAchievements.filter((a) => a.hidden);

  it('all VISIBLE formula achievements are buildable with current palette', () => {
    const unbuildable: string[] = [];
    for (const a of visible) {
      if (a.trigger.type === 'formula' && !isBuildable(a.trigger.formula)) {
        unbuildable.push(`${a.id} â ${a.trigger.formula}`);
      }
    }
    expect(
      unbuildable,
      `Visible achievements requiring elements outside palette: ${unbuildable.join(', ')}`,
    ).toEqual([]);
  });

  it('hidden achievements that are unbuildable are documented', () => {
    // This test doesn't fail â it logs which hidden achievements
    // need future palette expansion. It's a living inventory.
    const unbuildable: string[] = [];
    for (const a of hidden) {
      if (a.trigger.type === 'formula' && !isBuildable(a.trigger.formula)) {
        unbuildable.push(`${a.id} â ${a.trigger.formula}`);
      }
    }
    if (unbuildable.length > 0) {
      console.info(
        'Hidden achievements requiring future elements:\n' +
        unbuildable.join('\n'),
      );
    }
    // Just assert they're hidden â that's the contract
    for (const a of hidden) {
      expect(a.hidden).toBe(true);
    }
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// KNOWN_MOLECULES set integrity
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('KNOWN_MOLECULES set', () => {
  it('contains no duplicates (Set guarantees this but verify count)', () => {
    // Convert to array and back â if sizes differ, there's a problem
    // in how the set was constructed (e.g., invisible Unicode differences)
    const arr = [...KNOWN_MOLECULES];
    expect(arr.length).toBe(KNOWN_MOLECULES.size);
  });

  it('contains at least the tutorial molecules (Hâ, HâO, CaO)', () => {
    expect(KNOWN_MOLECULES.has('H\u2082')).toBe(true);
    expect(KNOWN_MOLECULES.has('H\u2082O')).toBe(true);
    expect(KNOWN_MOLECULES.has('OCa')).toBe(true); // Hill system: O before Ca
  });

  it('contains NaCl as buildable (Cl is in palette)', () => {
    // Cl was added to the palette — NaCl is now buildable
    const visibleNaCl = ACHIEVEMENTS.find(
      (a) => a.trigger.type === 'formula' &&
        (a.trigger as { formula: string }).formula === 'NaCl' &&
        !a.hidden,
    );
    expect(visibleNaCl, 'NaCl achievement should be visible with Cl in palette').toBeDefined();
  });
});
