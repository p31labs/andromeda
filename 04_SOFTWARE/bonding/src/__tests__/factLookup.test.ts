// src/__tests__/factLookup.test.ts
// Tests for displayFormula expansion + tier-based fact lookup.

import { describe, it, expect } from 'vitest';
import { displayFormula } from '../engine/chemistry';
import { getElementFact, getMoleculeFact } from '../engine/factLookup';

// ── displayFormula conversions ──

describe('displayFormula', () => {
  it('passes through formulas with no mapping', () => {
    expect(displayFormula('H\u2082')).toBe('H\u2082');
    expect(displayFormula('H\u2082O')).toBe('H\u2082O');
    expect(displayFormula('CO\u2082')).toBe('CO\u2082');
    expect(displayFormula('HCl')).toBe('HCl');
    expect(displayFormula('NaCl')).toBe('NaCl');
    expect(displayFormula('CH\u2084')).toBe('CH\u2084');
  });

  it('converts existing mappings', () => {
    expect(displayFormula('OCa')).toBe('CaO');
    expect(displayFormula('HONa')).toBe('NaOH');
    expect(displayFormula('H\u2083N')).toBe('NH\u2083');
    expect(displayFormula('O\u2082S')).toBe('SO\u2082');
    expect(displayFormula('SFe')).toBe('FeS');
    expect(displayFormula('OFe')).toBe('FeO');
    expect(displayFormula('O\u2083Fe\u2082')).toBe('Fe\u2082O\u2083');
    expect(displayFormula('ONa\u2082')).toBe('Na\u2082O');
  });

  it('converts new acid mappings', () => {
    expect(displayFormula('H\u2082O\u2084S')).toBe('H\u2082SO\u2084');
    expect(displayFormula('H\u2083O\u2084P')).toBe('H\u2083PO\u2084');
    expect(displayFormula('CH\u2082O\u2083')).toBe('H\u2082CO\u2083');
    expect(displayFormula('H\u2082O\u2083S')).toBe('H\u2082SO\u2083');
    expect(displayFormula('HO\u2084PCa')).toBe('CaHPO\u2084');
  });

  it('converts new salt/base mappings', () => {
    expect(displayFormula('CO\u2083Na\u2082')).toBe('Na\u2082CO\u2083');
    expect(displayFormula('CHO\u2083Na')).toBe('NaHCO\u2083');
    expect(displayFormula('SNa\u2082')).toBe('Na\u2082S');
    expect(displayFormula('ONaCl')).toBe('NaClO');
    expect(displayFormula('O\u2084SNa\u2082')).toBe('Na\u2082SO\u2084');
  });

  it('converts new metal compound mappings', () => {
    expect(displayFormula('O\u2084SFe')).toBe('FeSO\u2084');
    expect(displayFormula('O\u2084SCa')).toBe('CaSO\u2084');
    expect(displayFormula('O\u2084Fe\u2083')).toBe('Fe\u2083O\u2084');
    expect(displayFormula('Cl\u2082Fe')).toBe('FeCl\u2082');
    expect(displayFormula('Cl\u2083Fe')).toBe('FeCl\u2083');
    expect(displayFormula('HNa')).toBe('NaH');
    expect(displayFormula('H\u2082Ca')).toBe('CaH\u2082');
  });

  it('converts new gas/small molecule mappings', () => {
    expect(displayFormula('H\u2083P')).toBe('PH\u2083');
    expect(displayFormula('O\u2083S')).toBe('SO\u2083');
    expect(displayFormula('CHN')).toBe('HCN');
  });

  it('converts new organic mappings', () => {
    expect(displayFormula('C\u2086H\u2086O')).toBe('C\u2086H\u2085OH');
    expect(displayFormula('CH\u2084N\u2082O')).toBe('CO(NH\u2082)\u2082');
  });
});

// ── Element fact tiers ──

describe('getElementFact', () => {
  it('returns simple tier for seed mode', () => {
    const fact = getElementFact('H', 'seed');
    expect(fact).toBeTruthy();
    expect(fact!.length).toBeLessThan(80);
  });

  it('returns intermediate tier for sprout mode', () => {
    const fact = getElementFact('C', 'sprout');
    expect(fact).toBeTruthy();
    expect(fact).not.toBe(getElementFact('C', 'seed'));
  });

  it('returns scientific tier for sapling mode', () => {
    const fact = getElementFact('O', 'sapling');
    expect(fact).toBeTruthy();
    expect(fact).not.toBe(getElementFact('O', 'seed'));
    expect(fact).not.toBe(getElementFact('O', 'sprout'));
  });

  it('returns null for unknown element', () => {
    expect(getElementFact('Xx', 'seed')).toBeNull();
  });

  it('all 10 game elements have facts at all tiers', () => {
    const elements = ['H', 'C', 'N', 'O', 'P', 'Na', 'Ca', 'Cl', 'S', 'Fe'];
    const modes = ['seed', 'sprout', 'sapling'] as const;
    for (const el of elements) {
      for (const mode of modes) {
        expect(getElementFact(el, mode)).toBeTruthy();
      }
    }
  });
});

// ── Molecule fact tiers ──

describe('getMoleculeFact', () => {
  it('returns fact for water (H\u2082O)', () => {
    const result = getMoleculeFact('H\u2082O', 'seed');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Water');
    expect(result!.fact.length).toBeGreaterThan(0);
  });

  it('returns different tiers for same molecule', () => {
    const seed = getMoleculeFact('H\u2082O', 'seed');
    const sprout = getMoleculeFact('H\u2082O', 'sprout');
    const sapling = getMoleculeFact('H\u2082O', 'sapling');
    expect(seed!.fact).not.toBe(sprout!.fact);
    expect(sprout!.fact).not.toBe(sapling!.fact);
  });

  it('handles Hill → display formula conversion for NH\u2083', () => {
    // generateFormula produces H₃N, which maps to NH₃ via displayFormula
    const result = getMoleculeFact('H\u2083N', 'sprout');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Ammonia');
  });

  it('handles Hill → display formula conversion for SO\u2082', () => {
    const result = getMoleculeFact('O\u2082S', 'seed');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Sulfur Dioxide');
  });

  it('handles Hill → display formula conversion for CaO', () => {
    const result = getMoleculeFact('OCa', 'sprout');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Quicklime');
  });

  it('returns null for unknown formula', () => {
    expect(getMoleculeFact('XxYy', 'seed')).toBeNull();
  });
});
