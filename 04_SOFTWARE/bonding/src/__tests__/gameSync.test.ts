// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// gameSync test suite
//
// Tests the localStorage mock relay path:
//   - create/join room round-trip
//   - pushState debouncing (2s window)
//   - pushState immediate flush on completion
//   - sendPing stores ping in room
//   - polling reads from localStorage
//   - leaveRoom clears state
//   - ping dedup via callback
// ═══════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Room, SyncEvent } from '../lib/gameSync';

// We test the REAL module, not the mock from setup.ts.
// Unmock it so we get the actual localStorage-backed implementation.
vi.unmock('../lib/gameSync');

// Must import AFTER unmock
const gameSync = await import('../lib/gameSync');

describe('gameSync — localStorage mock relay', () => {
  beforeEach(() => {
    localStorage.clear();
    gameSync._resetForTest();
    vi.useFakeTimers();
  });

  afterEach(() => {
    gameSync._resetForTest();
    vi.useRealTimers();
  });

  // ── Room lifecycle ──

  it('createRoom returns code, room, and playerId', async () => {
    const result = await gameSync.createRoom('Will', '#22c55e', 'seed');
    expect(result.code).toHaveLength(6);
    expect(result.playerId).toBe('p_0');
    expect(result.room.players).toHaveLength(1);
    expect(result.room.players[0]!.name).toBe('Will');
    expect(result.room.status).toBe('waiting');
  });

  it('joinRoom adds a second player', async () => {
    const created = await gameSync.createRoom('Will', '#22c55e', 'seed');
    // Simulate join from another "tab"
    gameSync._resetForTest();
    const joined = await gameSync.joinRoom(created.code, 'Bash', '#06b6d4', 'seed');
    expect(joined.playerId).toBe('p_1');
    expect(joined.room.players).toHaveLength(2);
    expect(joined.room.players[1]!.name).toBe('Bash');
    expect(joined.room.status).toBe('active');
  });

  it('joinRoom throws on invalid code', async () => {
    await expect(
      gameSync.joinRoom('ZZZZZZ', 'Bash', '#06b6d4', 'seed'),
    ).rejects.toThrow('Room not found');
  });

  it('leaveRoom clears module state', async () => {
    await gameSync.createRoom('Will', '#22c55e', 'seed');
    expect(gameSync.getCurrentRoom()).not.toBeNull();
    gameSync.leaveRoom();
    expect(gameSync.getCurrentRoom()).toBeNull();
    expect(gameSync.getMyPlayerId()).toBeNull();
  });

  // ── State push debouncing ──

  it('pushState debounces calls within 2s window', async () => {
    const created = await gameSync.createRoom('Will', '#22c55e', 'seed');
    const baseState = {
      formula: 'H\u2082',
      displayFormula: 'H\u2082',
      atoms: 2,
      love: 5,
      stability: 0.5,
      completed: false,
      achievements: [] as string[],
      updatedAt: new Date().toISOString(),
    };

    // Three rapid calls
    void gameSync.pushState({ ...baseState, atoms: 1 });
    void gameSync.pushState({ ...baseState, atoms: 2 });
    void gameSync.pushState({ ...baseState, atoms: 3 });

    // Before timer fires, state should still be initial
    const rawBefore = localStorage.getItem(`bonding_room_${created.code}`);
    const roomBefore = JSON.parse(rawBefore ?? '{}') as Room;
    expect(roomBefore.players[0]!.state.atoms).toBe(0);

    // After 2s, the last state should be flushed
    await vi.advanceTimersByTimeAsync(2100);
    const rawAfter = localStorage.getItem(`bonding_room_${created.code}`);
    const roomAfter = JSON.parse(rawAfter ?? '{}') as Room;
    expect(roomAfter.players[0]!.state.atoms).toBe(3);
  });

  it('pushState flushes immediately on completion', async () => {
    const created = await gameSync.createRoom('Will', '#22c55e', 'seed');
    const completedState = {
      formula: 'H\u2082O',
      displayFormula: 'H\u2082O',
      atoms: 3,
      love: 20,
      stability: 1.0,
      completed: true,
      achievements: [] as string[],
      updatedAt: new Date().toISOString(),
    };

    void gameSync.pushState(completedState);

    // Should be flushed immediately (no need to wait 2s)
    // Give microtasks a chance to resolve
    await vi.advanceTimersByTimeAsync(10);
    const raw = localStorage.getItem(`bonding_room_${created.code}`);
    const room = JSON.parse(raw ?? '{}') as Room;
    expect(room.players[0]!.state.completed).toBe(true);
    expect(room.players[0]!.state.atoms).toBe(3);
  });

  // ── Ping ──

  it('sendPing stores ping in room', async () => {
    const created = await gameSync.createRoom('Will', '#22c55e', 'seed');
    // Simulate a second player exists
    gameSync._resetForTest();
    await gameSync.joinRoom(created.code, 'Bash', '#06b6d4', 'seed');

    await gameSync.sendPing('p_0', '\u{1F49A}');

    const raw = localStorage.getItem(`bonding_room_${created.code}`);
    const room = JSON.parse(raw ?? '{}') as Room;
    expect(room.pings).toHaveLength(1);
    expect(room.pings[0]!.from).toBe('p_1');
    expect(room.pings[0]!.to).toBe('p_0');
    expect(room.pings[0]!.reaction).toBe('\u{1F49A}');
  });

  // ── Polling ──

  it('startPolling calls callback with room data', async () => {
    const created = await gameSync.createRoom('Will', '#22c55e', 'seed');
    const updates: Room[] = [];

    gameSync.startPolling((room) => updates.push(room));

    // Initial poll fires synchronously-ish
    await vi.advanceTimersByTimeAsync(100);
    expect(updates.length).toBeGreaterThanOrEqual(1);
    expect(updates[0]!.code).toBe(created.code);

    gameSync.stopPolling();
  });

  it('stopPolling prevents further callbacks', async () => {
    await gameSync.createRoom('Will', '#22c55e', 'seed');
    const updates: Room[] = [];

    gameSync.startPolling((room) => updates.push(room));
    await vi.advanceTimersByTimeAsync(100);
    const countAfterStart = updates.length;

    gameSync.stopPolling();
    await vi.advanceTimersByTimeAsync(10000);
    expect(updates.length).toBe(countAfterStart);
  });

  // ── Getters ──

  it('isConnected returns true after createRoom', async () => {
    expect(gameSync.isConnected()).toBe(false);
    await gameSync.createRoom('Will', '#22c55e', 'seed');
    expect(gameSync.isConnected()).toBe(true);
  });

  it('getMyPlayerId returns correct id', async () => {
    expect(gameSync.getMyPlayerId()).toBeNull();
    await gameSync.createRoom('Will', '#22c55e', 'seed');
    expect(gameSync.getMyPlayerId()).toBe('p_0');
  });

  // ── Event system ──

  it('onSyncEvent fires roomUpdated on poll', async () => {
    await gameSync.createRoom('Will', '#22c55e', 'seed');
    const events: SyncEvent[] = [];
    const unsub = gameSync.onSyncEvent((e) => events.push(e));

    gameSync.startPolling(() => {});
    await vi.advanceTimersByTimeAsync(100);

    expect(events.some((e) => e.type === 'roomUpdated')).toBe(true);

    unsub();
    gameSync.stopPolling();
  });

  it('onSyncEvent unsubscribe works', async () => {
    await gameSync.createRoom('Will', '#22c55e', 'seed');
    const events: SyncEvent[] = [];
    const unsub = gameSync.onSyncEvent((e) => events.push(e));
    unsub();

    gameSync.startPolling(() => {});
    await vi.advanceTimersByTimeAsync(100);

    expect(events).toHaveLength(0);
    gameSync.stopPolling();
  });
});
