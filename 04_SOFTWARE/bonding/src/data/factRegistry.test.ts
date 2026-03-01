// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// Tests for WCD-29: Fact Registry
// ═══════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  ElementRegistry,
  MoleculeRegistry,
  getFactForProfile,
  type FactTier,
} from './factRegistry';

const TIERS: (keyof FactTier)[] = ['willow', 'bash', 'teen', 'researcher'];

// ── Element Registry ──

describe('ElementRegistry', () => {
  const EXPECTED_ELEMENTS = ['H', 'C', 'O', 'Fe', 'N', 'S', 'P', 'Na', 'Cl', 'Ca'];

  it('contains all 10 game elements', () => {
    for (const sym of EXPECTED_ELEMENTS) {
      expect(ElementRegistry[sym]).toBeDefined();
    }
    expect(Object.keys(ElementRegistry)).toHaveLength(10);
  });

  it('each element has symbol, name, discovery, and cosmicOrigin', () => {
    for (const el of Object.values(ElementRegistry)) {
      expect(el.symbol).toBeTruthy();
      expect(el.name).toBeTruthy();
      expect(el.discovery).toBeDefined();
      expect(el.cosmicOrigin).toBeDefined();
    }
  });

  it('every tier string in discovery is non-empty', () => {
    for (const el of Object.values(ElementRegistry)) {
      for (const tier of TIERS) {
        expect(el.discovery[tier].length).toBeGreaterThan(0);
      }
    }
  });

  it('every tier string in cosmicOrigin is non-empty', () => {
    for (const el of Object.values(ElementRegistry)) {
      for (const tier of TIERS) {
        expect(el.cosmicOrigin[tier].length).toBeGreaterThan(0);
      }
    }
  });

  it('willow tier facts are kid-friendly (no complex jargon)', () => {
    for (const el of Object.values(ElementRegistry)) {
      // Willow facts should not contain advanced chemistry terms
      const willow = el.discovery.willow + el.cosmicOrigin.willow;
      expect(willow).not.toMatch(/nucleosynthesis|asymptotic|paramagnetic/i);
    }
  });

  it('researcher tier facts contain specific detail', () => {
    // Spot checks for precision
    expect(ElementRegistry.H!.discovery.researcher).toContain('1766');
    expect(ElementRegistry.O!.discovery.researcher).toContain('Scheele');
    expect(ElementRegistry.Fe!.cosmicOrigin.researcher).toContain('Fe-56');
    expect(ElementRegistry.Ca!.discovery.researcher).toContain('1808');
  });

  it('element symbols match their keys', () => {
    for (const [key, el] of Object.entries(ElementRegistry)) {
      expect(el.symbol).toBe(key);
    }
  });
});

// ── Molecule Registry ──

describe('MoleculeRegistry', () => {
  it('contains buildable game molecules (H2O, CO2, CH4, NaCl, Fe2O3, HCl)', () => {
    const required = ['H2O', 'CO2', 'CH4', 'NaCl', 'Fe2O3', 'HCl'];
    for (const f of required) {
      expect(MoleculeRegistry[f]).toBeDefined();
    }
  });

  it('each molecule has formula, name, category, and facts', () => {
    for (const mol of Object.values(MoleculeRegistry)) {
      expect(mol.formula).toBeTruthy();
      expect(mol.name).toBeTruthy();
      expect(mol.category).toBeTruthy();
      expect(mol.facts).toBeDefined();
    }
  });

  it('every tier string in facts is non-empty', () => {
    for (const mol of Object.values(MoleculeRegistry)) {
      for (const tier of TIERS) {
        expect(mol.facts[tier].length).toBeGreaterThan(0);
      }
    }
  });

  it('categories are valid enum values', () => {
    const validCategories = new Set(['basic', 'mineral', 'biological', 'gas', 'synthetic', 'volatile']);
    for (const mol of Object.values(MoleculeRegistry)) {
      expect(validCategories.has(mol.category)).toBe(true);
    }
  });

  it('formula keys match formula fields', () => {
    for (const [key, mol] of Object.entries(MoleculeRegistry)) {
      expect(mol.formula).toBe(key);
    }
  });

  it('contains at least 20 molecules', () => {
    expect(Object.keys(MoleculeRegistry).length).toBeGreaterThanOrEqual(20);
  });

  it('water facts progress in complexity across tiers', () => {
    const water = MoleculeRegistry['H2O']!;
    // Willow is simpler (shorter) than researcher
    expect(water.facts.willow.length).toBeLessThan(water.facts.researcher.length);
  });

  it('categorizes minerals correctly', () => {
    expect(MoleculeRegistry['FeS']!.category).toBe('mineral');
    expect(MoleculeRegistry['Fe2O3']!.category).toBe('mineral');
    expect(MoleculeRegistry['SiO2']!.category).toBe('mineral');
  });

  it('categorizes biologicals correctly', () => {
    expect(MoleculeRegistry['C6H12O6']!.category).toBe('biological');
    expect(MoleculeRegistry['C8H11NO2']!.category).toBe('biological');
  });
});

// ── getFactForProfile utility ──

describe('getFactForProfile', () => {
  it('returns molecule facts for the correct tier', () => {
    const water = MoleculeRegistry['H2O']!;
    expect(getFactForProfile(water, 'willow')).toBe(water.facts.willow);
    expect(getFactForProfile(water, 'bash')).toBe(water.facts.bash);
    expect(getFactForProfile(water, 'teen')).toBe(water.facts.teen);
    expect(getFactForProfile(water, 'researcher')).toBe(water.facts.researcher);
  });

  it('returns element discovery facts by default context', () => {
    const hydrogen = ElementRegistry['H']!;
    // Default context for elements isn't 'facts', it should use the provided context
    expect(getFactForProfile(hydrogen, 'bash', 'discovery')).toBe(hydrogen.discovery.bash);
  });

  it('returns element cosmicOrigin facts when requested', () => {
    const iron = ElementRegistry['Fe']!;
    expect(getFactForProfile(iron, 'teen', 'cosmicOrigin')).toBe(iron.cosmicOrigin.teen);
  });

  it('returns correct tier for all elements in discovery context', () => {
    for (const el of Object.values(ElementRegistry)) {
      for (const tier of TIERS) {
        expect(getFactForProfile(el, tier, 'discovery')).toBe(el.discovery[tier]);
      }
    }
  });

  it('returns correct tier for all elements in cosmicOrigin context', () => {
    for (const el of Object.values(ElementRegistry)) {
      for (const tier of TIERS) {
        expect(getFactForProfile(el, tier, 'cosmicOrigin')).toBe(el.cosmicOrigin[tier]);
      }
    }
  });

  it('returns correct tier for all molecules', () => {
    for (const mol of Object.values(MoleculeRegistry)) {
      for (const tier of TIERS) {
        expect(getFactForProfile(mol, tier)).toBe(mol.facts[tier]);
      }
    }
  });
});

// ── Content quality checks ──

describe('content quality', () => {
  it('no duplicate fact text across tiers for any element', () => {
    for (const el of Object.values(ElementRegistry)) {
      const discoveryTexts = TIERS.map((t) => el.discovery[t]);
      expect(new Set(discoveryTexts).size).toBe(4);

      const originTexts = TIERS.map((t) => el.cosmicOrigin[t]);
      expect(new Set(originTexts).size).toBe(4);
    }
  });

  it('no duplicate fact text across tiers for any molecule', () => {
    for (const mol of Object.values(MoleculeRegistry)) {
      const texts = TIERS.map((t) => mol.facts[t]);
      expect(new Set(texts).size).toBe(4);
    }
  });

  it('bash tier mentions at least one action/excitement word for elements', () => {
    // Bash tier should be exciting — spot check a few
    const bashTexts = Object.values(ElementRegistry).map((el) => el.discovery.bash);
    const exciting = bashTexts.filter((t) =>
      /explo|fire|weapon|zeppelin|magnif|electricity|urine|metal|toxic|Colosseum/i.test(t)
    );
    expect(exciting.length).toBeGreaterThanOrEqual(5);
  });

  it('molecule names are unique', () => {
    const names = Object.values(MoleculeRegistry).map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('element names are unique', () => {
    const names = Object.values(ElementRegistry).map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
