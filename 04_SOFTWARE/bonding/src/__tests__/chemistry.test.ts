// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// BONDING â P31 Labs
// Chemistry engine test suite
//
// Tests pure functions: generateFormula, calculateStability,
// isMoleculeComplete, canBond, getAvailableBondSites,
// countUniqueElements, MOLECULE_NAMES integrity.
//
// These are the foundation. If formula generation is wrong,
// achievements don't fire, checkpoints don't match, and
// the game silently breaks.
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateFormula,
  calculateStability,
  isMoleculeComplete,
  canBond,
  getAvailableBondSites,
  countUniqueElements,
  MOLECULE_NAMES,
} from '../engine/chemistry';
import { KNOWN_MOLECULES } from '../data/achievements';
import { atomBag, buildStar, buildChain, makeAtom, resetAtomIds } from './helpers';

beforeEach(() => {
  resetAtomIds();
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// generateFormula
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('generateFormula', () => {
  it('returns empty string for empty array', () => {
    expect(generateFormula([])).toBe('');
  });

  it('returns element symbol without subscript for single atom', () => {
    expect(generateFormula(atomBag(['H']))).toBe('H');
    expect(generateFormula(atomBag(['Ca']))).toBe('Ca');
  });

  // ââ Simple molecules ââ

  it('generates Hâ (hydrogen gas)', () => {
    expect(generateFormula(atomBag(['H', 'H']))).toBe('H\u2082');
  });

  it('generates HâO (water)', () => {
    expect(generateFormula(atomBag(['H', 'H', 'O']))).toBe('H\u2082O');
  });

  it('generates HâO regardless of placement order', () => {
    // O first, then H â the greedy builder path
    expect(generateFormula(atomBag(['O', 'H', 'H']))).toBe('H\u2082O');
  });

  it('generates HâOâ (hydrogen peroxide)', () => {
    expect(generateFormula(atomBag(['H', 'H', 'O', 'O']))).toBe('H\u2082O\u2082');
  });

  it('generates COâ (carbon dioxide)', () => {
    expect(generateFormula(atomBag(['C', 'O', 'O']))).toBe('CO\u2082');
  });

  it('generates CHâ (methane)', () => {
    expect(generateFormula(atomBag(['C', 'H', 'H', 'H', 'H']))).toBe('CH\u2084');
  });

  it('generates CaO (quicklime) â Hill system produces "OCa"', () => {
    // Hill system: O (index 3) before Ca (index 7) â "OCa"
    // â ï¸ BUG IMPLICATION: achievement trigger uses "CaO" but generateFormula
    //    produces "OCa". Achievement will never fire. See achievements.test.ts.
    expect(generateFormula(atomBag(['Ca', 'O']))).toBe('OCa');
  });

  it('generates NaOH â Hill system produces "HONa"', () => {
    // Hill system (no carbon): H (index 1), O (index 3), Na (index 6) â "HONa"
    // Conventional chemistry writes "NaOH" but generateFormula follows Hill.
    expect(generateFormula(atomBag(['Na', 'O', 'H']))).toBe('HONa');
  });

  // ââ Hill system ordering ââ

  it('puts C first in organic molecules', () => {
    const formula = generateFormula(atomBag(['H', 'O', 'C']));
    expect(formula.startsWith('C')).toBe(true);
  });

  it('puts H second after C', () => {
    const formula = generateFormula(atomBag(['O', 'H', 'C', 'H']));
    expect(formula).toBe('CH\u2082O');
  });

  it('orders remaining elements alphabetically after C, H', () => {
    // C, H, then Ca, Na, O, P by the order array
    const formula = generateFormula(atomBag(['P', 'Ca', 'O', 'C', 'H', 'Na']));
    // Expected order: C H O P Na Ca (following the hardcoded order array)
    expect(formula).toBe('CHOPNaCa');
  });

  // ââ Subscript encoding ââ

  it('uses Unicode subscripts for counts > 1', () => {
    const formula = generateFormula(atomBag(['H', 'H', 'H']));
    expect(formula).toBe('H\u2083'); // Hâ
  });

  it('handles double-digit subscripts', () => {
    // 12 hydrogens
    const atoms = atomBag(Array(12).fill('H') as 'H'[]);
    const formula = generateFormula(atoms);
    expect(formula).toBe('H\u2081\u2082'); // Hââ
  });

  // ââ Complex molecules ââ

  it('generates glucose formula (CâHââOâ)', () => {
    const elements = [
      ...Array(6).fill('C') as 'C'[],
      ...Array(12).fill('H') as 'H'[],
      ...Array(6).fill('O') as 'O'[],
    ];
    expect(generateFormula(atomBag(elements))).toBe('C\u2086H\u2081\u2082O\u2086');
  });

  it('generates Posner molecule formula (CaâPâOââ)', () => {
    const elements = [
      ...Array(9).fill('Ca') as 'Ca'[],
      ...Array(6).fill('P') as 'P'[],
      ...Array(24).fill('O') as 'O'[],
    ];
    expect(generateFormula(atomBag(elements))).toBe(
      'O\u2082\u2084P\u2086Ca\u2089',
    );
    // Note: Hill system without C puts elements in order array order.
    // O comes before P comes before Ca. This might not match the
    // 'CaâPâOââ' string in KNOWN_MOLECULES. See data integrity tests.
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// calculateStability
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('calculateStability', () => {
  it('returns 0 for empty array', () => {
    expect(calculateStability([])).toBe(0);
  });

  it('returns 0 for single unbonded atom', () => {
    expect(calculateStability(atomBag(['H']))).toBe(0);
  });

  it('returns 1.0 for complete Hâ', () => {
    const atoms = buildChain(['H', 'H']);
    expect(calculateStability(atoms)).toBe(1.0);
  });

  it('returns 1.0 for complete water', () => {
    const atoms = buildStar('O', ['H', 'H']);
    expect(calculateStability(atoms)).toBe(1.0);
  });

  it('returns partial stability for incomplete molecule', () => {
    // O with 1 H bonded: 2 bonds filled out of 4 total valence (O=2, H=1, H_unbonded=1)
    // Actually: O has valence 2, H has valence 1. One bond formed.
    // filledBonds = 2 (one from O's side, one from H's side)
    // totalValence = 2 + 1 = 3
    // Wait â buildStar with 1 arm:
    const atoms = buildStar('O', ['H']);
    // O: bondSites=2, bondedTo=[2] â 1 filled
    // H: bondSites=1, bondedTo=[1] â 1 filled
    // total valence = 3, filled = 2
    expect(calculateStability(atoms)).toBeCloseTo(2 / 3);
  });

  it('returns correct stability for methane', () => {
    const atoms = buildStar('C', ['H', 'H', 'H', 'H']);
    // C: 4 bonds filled, HÃ4: 1 bond each filled
    // totalValence = 4 + 4 = 8, filledBonds = 8
    expect(calculateStability(atoms)).toBe(1.0);
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// isMoleculeComplete
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('isMoleculeComplete', () => {
  it('returns false for empty array', () => {
    expect(isMoleculeComplete([])).toBe(false);
  });

  it('returns false for single unbonded H', () => {
    expect(isMoleculeComplete(atomBag(['H']))).toBe(false);
  });

  it('returns true for Hâ', () => {
    expect(isMoleculeComplete(buildChain(['H', 'H']))).toBe(true);
  });

  it('returns true for complete water', () => {
    expect(isMoleculeComplete(buildStar('O', ['H', 'H']))).toBe(true);
  });

  it('returns false when any atom has open bond sites', () => {
    // O with only 1 H â O still has 1 open site
    expect(isMoleculeComplete(buildStar('O', ['H']))).toBe(false);
  });

  it('returns true for complete methane', () => {
    expect(isMoleculeComplete(buildStar('C', ['H', 'H', 'H', 'H']))).toBe(true);
  });

  it('returns false for incomplete methane (3 of 4 H)', () => {
    expect(isMoleculeComplete(buildStar('C', ['H', 'H', 'H']))).toBe(false);
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// canBond / getAvailableBondSites
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('canBond', () => {
  it('H with no bonds can bond', () => {
    expect(canBond(makeAtom('H'))).toBe(true);
  });

  it('H with 1 bond cannot bond (valence = 1)', () => {
    expect(canBond(makeAtom('H', { bondedTo: [99] }))).toBe(false);
  });

  it('O with 1 bond can still bond (valence = 2)', () => {
    expect(canBond(makeAtom('O', { bondedTo: [99] }))).toBe(true);
  });

  it('C with 4 bonds cannot bond', () => {
    expect(canBond(makeAtom('C', { bondedTo: [1, 2, 3, 4] }))).toBe(false);
  });
});

describe('getAvailableBondSites', () => {
  it('fresh H has 1 site', () => {
    expect(getAvailableBondSites(makeAtom('H'))).toBe(1);
  });

  it('fresh C has 4 sites', () => {
    expect(getAvailableBondSites(makeAtom('C'))).toBe(4);
  });

  it('O with 1 bond has 1 remaining site', () => {
    expect(getAvailableBondSites(makeAtom('O', { bondedTo: [99] }))).toBe(1);
  });

  it('P with 3 bonds has 0 remaining sites', () => {
    expect(getAvailableBondSites(makeAtom('P', { bondedTo: [1, 2, 3] }))).toBe(0);
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// countUniqueElements
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('countUniqueElements', () => {
  it('returns 0 for empty array', () => {
    expect(countUniqueElements([])).toBe(0);
  });

  it('returns 1 for Hâ', () => {
    expect(countUniqueElements(atomBag(['H', 'H']))).toBe(1);
  });

  it('returns 2 for HâO', () => {
    expect(countUniqueElements(atomBag(['H', 'H', 'O']))).toBe(2);
  });

  it('returns 3 for NaOH', () => {
    expect(countUniqueElements(atomBag(['Na', 'O', 'H']))).toBe(3);
  });

  it('returns 6 when all palette elements used', () => {
    expect(countUniqueElements(atomBag(['H', 'C', 'O', 'Na', 'P', 'Ca']))).toBe(6);
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// MOLECULE_NAMES Ã KNOWN_MOLECULES integrity
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('MOLECULE_NAMES â KNOWN_MOLECULES data integrity', () => {
  it('every KNOWN_MOLECULE has a display name', () => {
    const missing: string[] = [];
    for (const formula of KNOWN_MOLECULES) {
      if (!(formula in MOLECULE_NAMES)) {
        missing.push(formula);
      }
    }
    // Log missing ones for debugging, then assert
    if (missing.length > 0) {
      console.warn('KNOWN_MOLECULES without display names:', missing);
    }
    expect(missing).toEqual([]);
  });

  it('MOLECULE_NAMES keys are all non-empty strings', () => {
    for (const [key, value] of Object.entries(MOLECULE_NAMES)) {
      expect(key.length).toBeGreaterThan(0);
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
