// spaceship-earth/src/services/vaultSync.ts
// B4: Auto-backup telemetry, LOVE ledger, and bond records to node-zero vault.
// Encrypted at rest (AES-256-GCM). Exportable for court disclosure.

import type { NodeZero } from '@p31/node-zero';
import type { VaultStore } from '@p31/node-zero';
import type { LedgerEngine } from '@p31/love-ledger';
import type { GameEngine } from '@p31/game-engine';
import { telemetryGetBuffer, telemetryGetSessionId } from '@p31/shared';

// ── Layer schemas ──

const TELEMETRY_SCHEMA = { events: 'array', sessionId: 'string', capturedAt: 'string' };
const LEDGER_SCHEMA = { snapshot: 'object', capturedAt: 'string' };
const BONDS_SCHEMA = { records: 'array', capturedAt: 'string' };
const GAME_SCHEMA = { snapshot: 'object', capturedAt: 'string' };

// ── Vault layer names ──

const LAYER_TELEMETRY = 'telemetry';
const LAYER_LEDGER = 'love-ledger';
const LAYER_BONDS = 'bonds';
const LAYER_GAME = 'game-state';

// ── VaultSync service ──

export interface VaultSyncConfig {
  node: NodeZero;
  ledger: LedgerEngine;
  game?: GameEngine;
}

export class VaultSync {
  private _vault: VaultStore;
  private _ledger: LedgerEngine;
  private _game: GameEngine | null;
  private _node: NodeZero;
  private _initialized = false;
  private _bondRecords: Array<{ peerId: string; formedAt: string }> = [];
  private _syncEvents: Array<{ type: string; did: string; serverHash: string; direction: string; timestamp: string }> = [];
  private _teardownFns: Array<() => void> = [];

  constructor(config: VaultSyncConfig) {
    this._vault = config.node.vault;
    this._ledger = config.ledger;
    this._game = config.game ?? null;
    this._node = config.node;
  }

  async init(): Promise<void> {
    if (this._initialized) return;

    // Create vault layers (idempotent — catch LAYER_EXISTS)
    await this._ensureLayer(LAYER_TELEMETRY, TELEMETRY_SCHEMA);
    await this._ensureLayer(LAYER_LEDGER, LEDGER_SCHEMA);
    await this._ensureLayer(LAYER_BONDS, BONDS_SCHEMA);
    await this._ensureLayer(LAYER_GAME, GAME_SCHEMA);

    // Wire bond formation → vault write (court evidence)
    this._node.onBondFormed((bond) => {
      this._bondRecords.push({
        peerId: bond.peerId,
        formedAt: new Date().toISOString(),
      });
      this._writeBonds().catch(err =>
        console.error('[VaultSync] bond write failed:', err)
      );
    });

    // Wire LOVE milestones → ledger snapshot
    this._ledger.on('LOVE_EARNED', () => {
      const wallet = this._ledger.wallet;
      // Snapshot on every 10 LOVE earned (milestone)
      if (wallet.totalEarned > 0 && wallet.totalEarned % 10 < 1) {
        this._writeLedger().catch(err =>
          console.error('[VaultSync] ledger write failed:', err)
        );
      }
    });

    this._initialized = true;
    console.log('[VaultSync] initialized — 4 vault layers ready');
  }

  // Write current telemetry buffer to vault (includes sync events)
  async writeTelemetry(): Promise<void> {
    const events = telemetryGetBuffer();
    const sessionId = telemetryGetSessionId();
    await this._vault.write(LAYER_TELEMETRY, {
      events,
      syncEvents: this._syncEvents.length > 0 ? [...this._syncEvents] : undefined,
      sessionId: sessionId ?? 'unknown',
      capturedAt: new Date().toISOString(),
    });
  }

  // Write current ledger snapshot to vault
  async writeLedger(): Promise<void> {
    return this._writeLedger();
  }

  // Write game state snapshot to vault
  async writeGame(): Promise<void> {
    if (!this._game) return;
    const snapshot = this._game.export();
    await this._vault.write(LAYER_GAME, {
      snapshot,
      capturedAt: new Date().toISOString(),
    });
  }

  // Log a Genesis Sync event for Daubert chain-of-custody
  logSyncEvent(direction: 'push' | 'pull', did: string, serverHash: string): void {
    this._syncEvents.push({
      type: direction === 'push' ? 'GENESIS_SYNC_PUSH' : 'GENESIS_SYNC_PULL',
      did,
      serverHash,
      direction,
      timestamp: new Date().toISOString(),
    });
    // Append to telemetry layer immediately
    this.writeTelemetry().catch(err =>
      console.error('[VaultSync] sync event write failed:', err)
    );
  }

  // Write all layers (call on session end)
  async writeAll(): Promise<void> {
    await Promise.all([
      this.writeTelemetry(),
      this._writeLedger(),
      this._writeBonds(),
      this.writeGame(),
    ]);
  }

  // Export all vault data as a JSON bundle for court disclosure
  async exportBundle(): Promise<Record<string, unknown>> {
    const layers = await this._vault.listLayers();
    const bundle: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      layerCount: layers.length,
      layers: {} as Record<string, unknown>,
    };

    for (const meta of layers) {
      try {
        const data = await this._vault.readAsOwner(meta.id as string);
        (bundle.layers as Record<string, unknown>)[meta.id as string] = {
          metadata: meta,
          data,
        };
      } catch {
        (bundle.layers as Record<string, unknown>)[meta.id as string] = {
          metadata: meta,
          data: null,
          error: 'decryption failed or no data',
        };
      }
    }

    // Include storage usage
    const usage = await this._vault.getStorageUsage();
    bundle.storageUsage = usage;

    return bundle;
  }

  // Public accessor for sync events (used by VaultRoom telemetry log)
  get syncEvents(): ReadonlyArray<{ type: string; did: string; serverHash: string; direction: string; timestamp: string }> {
    return this._syncEvents;
  }

  teardown(): void {
    for (const fn of this._teardownFns) fn();
    this._teardownFns = [];
  }

  // ── Internals ──

  private async _ensureLayer(name: string, schema: Record<string, unknown>): Promise<void> {
    try {
      await this._vault.createLayer(name, schema);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'LAYER_EXISTS') {
        return; // Already created, fine
      }
      throw err;
    }
  }

  private async _writeLedger(): Promise<void> {
    const snapshot = this._ledger.export();
    await this._vault.write(LAYER_LEDGER, {
      snapshot,
      capturedAt: new Date().toISOString(),
    });
  }

  private async _writeBonds(): Promise<void> {
    if (this._bondRecords.length === 0) return;
    await this._vault.write(LAYER_BONDS, {
      records: [...this._bondRecords],
      capturedAt: new Date().toISOString(),
    });
  }
}
