// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// Exhibit A test suite
// ═══════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import type { EngagementEventA } from '../engine/exhibitA';

// Unmock exhibitA so we test the real module
import { vi } from 'vitest';
vi.unmock('../engine/exhibitA');

const exhibitA = await import('../engine/exhibitA');

describe('logEventA', () => {
  beforeEach(() => {
    exhibitA.clearLog();
  });

  it('creates entry with UUID and ISO timestamp', () => {
    const event: EngagementEventA = {
      type: 'atom_placed',
      element: 'H',
      atomCount: 1,
      formula: 'H',
      displayFormula: 'H',
      player: 'Will',
      mode: 'seed',
    };

    const entry = exhibitA.logEventA(event);

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(entry.event).toEqual(event);
  });

  it('appends to in-memory log', () => {
    const event1: EngagementEventA = {
      type: 'atom_placed',
      element: 'H',
      atomCount: 1,
      formula: 'H',
      displayFormula: 'H',
      player: 'Will',
      mode: 'seed',
    };
    const event2: EngagementEventA = {
      type: 'bond_formed',
      fromElement: 'H',
      toElement: 'H',
      formula: 'H\u2082',
      displayFormula: 'H\u2082',
      player: 'Will',
    };

    exhibitA.logEventA(event1);
    exhibitA.logEventA(event2);

    const log = exhibitA.getLog();
    expect(log).toHaveLength(2);
    expect(log[0]!.event).toEqual(event1);
    expect(log[1]!.event).toEqual(event2);
  });

  it('persists to localStorage', () => {
    const event: EngagementEventA = {
      type: 'atom_placed',
      element: 'H',
      atomCount: 1,
      formula: 'H',
      displayFormula: 'H',
      player: 'Will',
      mode: 'seed',
    };

    exhibitA.logEventA(event);

    const stored = localStorage.getItem('bonding_exhibit_a');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].event).toEqual(event);
  });
});

describe('getLog / filtering', () => {
  beforeEach(() => {
    exhibitA.clearLog();
  });

  it('returns all entries chronologically', () => {
    exhibitA.logEventA({
      type: 'atom_placed',
      element: 'H',
      atomCount: 1,
      formula: 'H',
      displayFormula: 'H',
      player: 'Will',
      mode: 'seed',
    });
    exhibitA.logEventA({
      type: 'bond_formed',
      fromElement: 'H',
      toElement: 'H',
      formula: 'H\u2082',
      displayFormula: 'H\u2082',
      player: 'Will',
    });

    const log = exhibitA.getLog();
    expect(log).toHaveLength(2);
    expect(log[0]!.event.type).toBe('atom_placed');
    expect(log[1]!.event.type).toBe('bond_formed');
  });

  it('getLogByType filters by event type', () => {
    exhibitA.logEventA({
      type: 'atom_placed',
      element: 'H',
      atomCount: 1,
      formula: 'H',
      displayFormula: 'H',
      player: 'Will',
      mode: 'seed',
    });
    exhibitA.logEventA({
      type: 'bond_formed',
      fromElement: 'H',
      toElement: 'H',
      formula: 'H\u2082',
      displayFormula: 'H\u2082',
      player: 'Will',
    });
    exhibitA.logEventA({
      type: 'atom_placed',
      element: 'O',
      atomCount: 2,
      formula: 'HO',
      displayFormula: 'HO',
      player: 'Bash',
      mode: 'seed',
    });

    const atomEvents = exhibitA.getLogByType('atom_placed');
    expect(atomEvents).toHaveLength(2);
  });
});

describe('getSessionStats', () => {
  beforeEach(() => {
    exhibitA.clearLog();
  });

  it('counts events by type correctly', () => {
    const events: EngagementEventA[] = [
      { type: 'atom_placed', element: 'H', atomCount: 1, formula: 'H', displayFormula: 'H', player: 'Will', mode: 'seed' },
      { type: 'bond_formed', fromElement: 'H', toElement: 'H', formula: 'H\u2082', displayFormula: 'H\u2082', player: 'Will' },
      { type: 'molecule_completed', formula: 'H\u2082', displayFormula: 'H\u2082', moleculeName: 'Hydrogen', atomCount: 2, love: 74, player: 'Will', mode: 'seed' },
      { type: 'achievement_unlocked', achievementId: 'first_bond', achievementName: 'First Bond', love: 10, player: 'Will' },
      { type: 'ping_sent', from: 'Will', to: 'Bash', reaction: '\u{1F49A}' },
      { type: 'ping_received', from: 'Bash', to: 'Will', reaction: '\u{1F49A}' },
      { type: 'quest_step_completed', questId: 'genesis', questName: 'Genesis', stepIndex: 0, stepTarget: 'H\u2082', player: 'Will' },
      { type: 'quest_completed', questId: 'genesis', questName: 'Genesis', love: 50, player: 'Will' },
    ];

    events.forEach(event => exhibitA.logEventA(event));

    const stats = exhibitA.getSessionStats();
    expect(stats.totalEvents).toBe(8);
    expect(stats.totalAtoms).toBe(1);
    expect(stats.totalBonds).toBe(1);
    expect(stats.totalMolecules).toBe(1);
    expect(stats.totalAchievements).toBe(1);
    expect(stats.totalPingsSent).toBe(1);
    expect(stats.totalPingsReceived).toBe(1);
    expect(stats.totalQuestSteps).toBe(1);
    expect(stats.questsCompleted).toBe(1);
  });

  it('sums LOVE across molecule + achievement events', () => {
    exhibitA.logEventA({ type: 'molecule_completed', formula: 'H\u2082', displayFormula: 'H\u2082', moleculeName: 'Hydrogen', atomCount: 2, love: 74, player: 'Will', mode: 'seed' });
    exhibitA.logEventA({ type: 'achievement_unlocked', achievementId: 'first_bond', achievementName: 'First Bond', love: 10, player: 'Will' });
    exhibitA.logEventA({ type: 'molecule_completed', formula: 'H\u2082O', displayFormula: 'H\u2082O', moleculeName: 'Water', atomCount: 3, love: 116, player: 'Bash', mode: 'seed' });

    const stats = exhibitA.getSessionStats();
    expect(stats.totalLove).toBe(74 + 10 + 116);
  });

  it('lists unique players', () => {
    exhibitA.logEventA({ type: 'atom_placed', element: 'H', atomCount: 1, formula: 'H', displayFormula: 'H', player: 'Will', mode: 'seed' });
    exhibitA.logEventA({ type: 'atom_placed', element: 'O', atomCount: 1, formula: 'O', displayFormula: 'O', player: 'Bash', mode: 'seed' });
    exhibitA.logEventA({ type: 'atom_placed', element: 'H', atomCount: 2, formula: 'H\u2082', displayFormula: 'H\u2082', player: 'Will', mode: 'seed' });

    const stats = exhibitA.getSessionStats();
    expect(stats.players).toHaveLength(2);
    expect(stats.players).toContain('Will');
    expect(stats.players).toContain('Bash');
  });

  it('returns zeros for empty log', () => {
    const stats = exhibitA.getSessionStats();
    expect(stats.totalEvents).toBe(0);
    expect(stats.totalAtoms).toBe(0);
    expect(stats.totalLove).toBe(0);
    expect(stats.players).toHaveLength(0);
    expect(stats.firstEvent).toBeNull();
    expect(stats.durationSeconds).toBe(0);
  });
});

describe('exportAsJSON', () => {
  beforeEach(() => {
    exhibitA.clearLog();
  });

  it('returns valid JSON string', () => {
    exhibitA.logEventA({
      type: 'atom_placed',
      element: 'H',
      atomCount: 1,
      formula: 'H',
      displayFormula: 'H',
      player: 'Will',
      mode: 'seed',
    });

    const json = exhibitA.exportAsJSON();
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
  });
});

describe('exportAsSummary', () => {
  beforeEach(() => {
    exhibitA.clearLog();
  });

  it('includes player names from session event', () => {
    exhibitA.logEventA({
      type: 'session_started',
      mode: 'seed',
      roomCode: 'ABC123',
      players: ['Will', 'Bash'],
    });

    const summary = exhibitA.exportAsSummary();
    expect(summary).toContain('Players: Will, Bash');
  });

  it('lists molecules with builder names', () => {
    exhibitA.logEventA({
      type: 'molecule_completed',
      formula: 'H\u2082',
      displayFormula: 'H\u2082',
      moleculeName: 'Hydrogen',
      atomCount: 2,
      love: 74,
      player: 'Will',
      mode: 'seed',
    });

    const summary = exhibitA.exportAsSummary();
    expect(summary).toContain('Molecules Built:');
    expect(summary).toContain('Will built H\u2082 (Hydrogen)');
  });

  it('lists achievements', () => {
    exhibitA.logEventA({
      type: 'achievement_unlocked',
      achievementId: 'first_bond',
      achievementName: 'First Bond',
      love: 10,
      player: 'Will',
    });

    const summary = exhibitA.exportAsSummary();
    expect(summary).toContain('Achievements:');
    expect(summary).toContain('Will: First Bond');
  });
});

describe('clearLog', () => {
  beforeEach(() => {
    exhibitA.clearLog();
  });

  it('empties in-memory and localStorage', () => {
    exhibitA.logEventA({
      type: 'atom_placed',
      element: 'H',
      atomCount: 1,
      formula: 'H',
      displayFormula: 'H',
      player: 'Will',
      mode: 'seed',
    });
    expect(exhibitA.getLog()).toHaveLength(1);

    exhibitA.clearLog();
    expect(exhibitA.getLog()).toHaveLength(0);

    const stored = localStorage.getItem('bonding_exhibit_a');
    expect(stored).toBeNull();
  });
});
