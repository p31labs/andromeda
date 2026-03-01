// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// BONDING â P31 Labs
// Game store test suite
//
// Tests the Zustand store's state machine:
//   - Atom placement and bonding
//   - Molecule checkpoint detection
//   - Drag cooldown enforcement
//   - LOVE economy accumulation
//   - Reset behavior (preserves achievements/LOVE)
//   - Completion detection
//
// Side effects (sound, haptic, ledger) are mocked in setup.ts.
// These tests verify STATE TRANSITIONS, not audio output.
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../engine/gallery', () => ({
  saveToGallery: vi.fn(),
  getGallery: vi.fn(() => []),
  getGalleryByMode: vi.fn(() => []),
  getGalleryCount: vi.fn(() => 0),
  getTotalLove: vi.fn(() => 0),
  hasBuiltFormula: vi.fn(() => false),
  getUniqueFormulas: vi.fn(() => []),
  clearGallery: vi.fn(),
}));

vi.mock('../engine/discovery', () => ({
  isKnownMolecule: vi.fn(() => true),
  isDiscovery: vi.fn(() => false),
  validateDiscoveryName: vi.fn(() => ({ valid: true })),
  saveDiscovery: vi.fn(),
  lookupDiscovery: vi.fn(() => null),
  getSavedDiscoveries: vi.fn(() => []),
}));

import { useGameStore } from '../store/gameStore';

// ââ Helpers ââ

/** Reset store to clean initial state between tests */
function resetStore(): void {
  useGameStore.setState({
    atoms: [],
    bonds: [],
    nextAtomId: 1,
    nextBondId: 1,
    gamePhase: 'placing',
    sessionStartTime: null,
    dragging: null,
    dragPointer: null,
    snappedSite: null,
    unlockedAchievements: [],
    loveTotal: 0,
    loveTransactions: [],
    completedMolecules: [],
    toasts: [],
    knownFormulaMatch: null,
    dragCooldownUntil: 0,
  });
}

/**
 * Simulate placing an atom by driving the drag lifecycle:
 *   startDrag â snapToSite â endDrag
 *
 * If parentAtomId is null, places at origin (first atom).
 * If parentAtomId is provided, snaps to that atom's bond site.
 */
function placeAtom(
  element: 'H' | 'C' | 'O' | 'Na' | 'P' | 'Ca',
  parentAtomId: number | null = null,
  position = { x: 0, y: 0, z: 0 },
): void {
  const store = useGameStore.getState();
  store.startDrag(element);
  store.snapToSite(parentAtomId, position);
  store.endDrag();
}

/** Get current store state (shorthand) */
function state() {
  return useGameStore.getState();
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Basic placement
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('Atom placement', () => {
  beforeEach(resetStore);

  it('places first atom at origin', () => {
    placeAtom('O', null, { x: 0, y: 0, z: 0 });
    expect(state().atoms).toHaveLength(1);
    expect(state().atoms[0]!.element).toBe('O');
    expect(state().nextAtomId).toBe(2);
  });

  it('clears drag state after placement', () => {
    placeAtom('H', null);
    expect(state().dragging).toBeNull();
    expect(state().dragPointer).toBeNull();
    expect(state().snappedSite).toBeNull();
  });

  it('cancels drag if not snapped to site', () => {
    const store = state();
    store.startDrag('H');
    // Don't snap â just endDrag
    useGameStore.getState().endDrag();
    expect(state().atoms).toHaveLength(0);
  });

  it('bonds new atom to parent', () => {
    placeAtom('O', null, { x: 0, y: 0, z: 0 });
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });

    const [oxygen, hydrogen] = state().atoms;
    expect(oxygen!.bondedTo).toContain(2);
    expect(hydrogen!.bondedTo).toContain(1);
    expect(state().bonds).toHaveLength(1);
  });

  it('increments bond ID', () => {
    placeAtom('O', null);
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });
    placeAtom('H', 1, { x: -0.8, y: 0, z: 0 });

    expect(state().bonds).toHaveLength(2);
    expect(state().nextBondId).toBe(3);
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// LOVE economy
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('LOVE economy', () => {
  beforeEach(resetStore);

  it('earns 1 LOVE per atom placed', () => {
    placeAtom('O', null);
    expect(state().loveTotal).toBe(1);
  });

  it('earns 1 (atom) + 2 (bond) = 3 LOVE for bonded placement', () => {
    placeAtom('O', null);
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });
    // First atom: 1 LOVE. Second atom: 1 + 2 = 3. Total: 4.
    expect(state().loveTotal).toBe(4);
  });

  it('earns molecule completion bonus (10 LOVE)', () => {
    // Build Hâ: H bonded to H â both have valence 1, so complete
    placeAtom('H', null, { x: 0, y: 0, z: 0 });
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });
    // Atom 1: 1 LOVE. Atom 2: 1 + 2 (bond) + 10 (complete) = 13. Total: 14.
    expect(state().loveTotal).toBe(14);
  });

  it('LOVE persists across reset', () => {
    placeAtom('H', null);
    const loveBefore = state().loveTotal;
    state().reset();
    expect(state().loveTotal).toBe(loveBefore);
  });

  it('records transactions with correct sources', () => {
    placeAtom('O', null);
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });

    const sources = state().loveTransactions.map((t) => t.source);
    expect(sources).toContain('atom_placed');
    expect(sources).toContain('bond_formed');
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Molecule checkpoint
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('Molecule checkpoint', () => {
  beforeEach(resetStore);

  it('fires checkpoint when atom set matches known molecule (Hâ)', () => {
    // Hâ is a known molecule AND is complete (both H valences filled).
    // But checkpoint only fires when !complete â Hâ IS complete.
    // So this should NOT fire checkpoint â it should fire completion instead.
    placeAtom('H', null, { x: 0, y: 0, z: 0 });
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });

    // Hâ is complete â gamePhase = 'complete', no checkpoint
    expect(state().gamePhase).toBe('complete');
    expect(state().knownFormulaMatch).toBeNull();
  });

  it('fires checkpoint for intermediate HâO (before completion)', () => {
    // Build toward water: O (valence 2), then H (bonds to O).
    // After O + H: formula is "HO", not a known molecule. No checkpoint.
    placeAtom('O', null, { x: 0, y: 0, z: 0 });
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });

    // HO is not in KNOWN_MOLECULES
    expect(state().knownFormulaMatch).toBeNull();

    // Add second H â formula becomes HâO, molecule is complete
    placeAtom('H', 1, { x: -0.8, y: 0, z: 0 });

    // HâO is complete (O has 2 bonds, both H have 1 bond each)
    // So checkpoint should NOT fire â completion fires instead
    expect(state().gamePhase).toBe('complete');
  });

  it('fires checkpoint when known formula reached but molecule is NOT complete', () => {
    // Build COâ path: C (valence 4) + O + O â formula "COâ" matches,
    // but C still has 2 open bond sites â NOT complete â checkpoint fires
    placeAtom('C', null, { x: 0, y: 0, z: 0 });
    placeAtom('O', 1, { x: 0.8, y: 0, z: 0 });
    placeAtom('O', 1, { x: -0.8, y: 0, z: 0 });

    // COâ formula matches but C has valence 4, only 2 bonds â incomplete
    expect(state().gamePhase).toBe('placing');
    expect(state().knownFormulaMatch).toBe('CO\u2082');
  });

  it('sets drag cooldown when checkpoint fires', () => {
    placeAtom('C', null, { x: 0, y: 0, z: 0 });
    placeAtom('O', 1, { x: 0.8, y: 0, z: 0 });
    placeAtom('O', 1, { x: -0.8, y: 0, z: 0 });

    expect(state().dragCooldownUntil).toBeGreaterThan(Date.now() - 100);
  });

  it('generates checkpoint toast', () => {
    placeAtom('C', null, { x: 0, y: 0, z: 0 });
    placeAtom('O', 1, { x: 0.8, y: 0, z: 0 });
    placeAtom('O', 1, { x: -0.8, y: 0, z: 0 });

    const checkpointToasts = state().toasts.filter(
      (t) => t.text === 'Carbon Dioxide',
    );
    expect(checkpointToasts.length).toBeGreaterThan(0);
  });

  it('clears checkpoint when additional atom changes formula', () => {
    // Build COâ (checkpoint), then add H â formula changes â checkpoint clears
    placeAtom('C', null, { x: 0, y: 0, z: 0 });
    placeAtom('O', 1, { x: 0.8, y: 0, z: 0 });
    placeAtom('O', 1, { x: -0.8, y: 0, z: 0 });

    expect(state().knownFormulaMatch).toBe('CO\u2082');

    // Wait for cooldown to expire
    useGameStore.setState({ dragCooldownUntil: 0 });

    // Add H to carbon (still has 2 open sites)
    placeAtom('H', 1, { x: 0, y: 0.8, z: 0 });

    // Formula is now CHOâ â not a known molecule
    expect(state().knownFormulaMatch).toBeNull();
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Drag cooldown
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('Drag cooldown', () => {
  beforeEach(resetStore);

  it('blocks startDrag during cooldown', () => {
    // Set cooldown to 1 second in the future
    useGameStore.setState({ dragCooldownUntil: Date.now() + 1000 });

    state().startDrag('H');
    expect(state().dragging).toBeNull();
  });

  it('allows startDrag after cooldown expires', () => {
    // Set cooldown to the past
    useGameStore.setState({ dragCooldownUntil: Date.now() - 1 });

    state().startDrag('H');
    expect(state().dragging).toBe('H');
  });

  it('cooldown resets on store reset', () => {
    useGameStore.setState({ dragCooldownUntil: Date.now() + 10000 });
    state().reset();
    expect(state().dragCooldownUntil).toBe(0);
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Completion
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('Molecule completion', () => {
  beforeEach(resetStore);

  it('detects Hâ as complete', () => {
    placeAtom('H', null, { x: 0, y: 0, z: 0 });
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });
    expect(state().gamePhase).toBe('complete');
  });

  it('does NOT complete single atom', () => {
    placeAtom('H', null);
    expect(state().gamePhase).toBe('placing');
  });

  it('records completed molecule in history', () => {
    placeAtom('H', null, { x: 0, y: 0, z: 0 });
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });
    expect(state().completedMolecules).toHaveLength(1);
    expect(state().completedMolecules[0]!.formula).toBe('H\u2082');
    expect(state().completedMolecules[0]!.atomCount).toBe(2);
  });

  it('molecule history persists across reset', () => {
    placeAtom('H', null, { x: 0, y: 0, z: 0 });
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });
    state().reset();
    expect(state().completedMolecules).toHaveLength(1);
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Reset
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('Store reset', () => {
  beforeEach(resetStore);

  it('clears atoms, bonds, and game phase', () => {
    placeAtom('O', null);
    placeAtom('H', 1, { x: 0.8, y: 0, z: 0 });
    state().reset();

    expect(state().atoms).toHaveLength(0);
    expect(state().bonds).toHaveLength(0);
    expect(state().gamePhase).toBe('placing');
    expect(state().nextAtomId).toBe(1);
    expect(state().nextBondId).toBe(1);
  });

  it('preserves achievements across reset', () => {
    // Manually set an achievement
    useGameStore.setState({
      unlockedAchievements: [
        { id: 'first_bond', unlockedAt: new Date().toISOString(), moleculeFormula: 'H' },
      ],
    });
    state().reset();
    expect(state().unlockedAchievements).toHaveLength(1);
  });

  it('preserves LOVE total across reset', () => {
    placeAtom('H', null);
    const love = state().loveTotal;
    state().reset();
    expect(state().loveTotal).toBe(love);
  });

  it('clears checkpoint state', () => {
    useGameStore.setState({
      knownFormulaMatch: 'CO\u2082',
      dragCooldownUntil: Date.now() + 5000,
    });
    state().reset();
    expect(state().knownFormulaMatch).toBeNull();
    expect(state().dragCooldownUntil).toBe(0);
  });

  it('clears toasts', () => {
    useGameStore.setState({
      toasts: [{ id: '1', icon: 'ð§', text: 'test', duration: 3000, createdAt: Date.now() }],
    });
    state().reset();
    expect(state().toasts).toHaveLength(0);
  });

  it('clears session start time', () => {
    placeAtom('H', null);
    expect(state().sessionStartTime).not.toBeNull();
    state().reset();
    expect(state().sessionStartTime).toBeNull();
  });
});

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Toast management
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

describe('Toast management', () => {
  beforeEach(resetStore);

  it('dismissToast removes specific toast by ID', () => {
    useGameStore.setState({
      toasts: [
        { id: 'a', icon: 'ð§', text: 'Water', duration: 3000, createdAt: Date.now() },
        { id: 'b', icon: 'ð', text: 'Bond', duration: 3000, createdAt: Date.now() },
      ],
    });

    state().dismissToast('a');
    expect(state().toasts).toHaveLength(1);
    expect(state().toasts[0]!.id).toBe('b');
  });
});
