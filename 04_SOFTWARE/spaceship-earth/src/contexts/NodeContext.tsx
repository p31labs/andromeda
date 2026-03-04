// spaceship-earth/src/contexts/NodeContext.tsx
// React context for the NodeZero protocol layer.
// B1: Boots identity, subscribes to state engine, exposes spoons/tier/voltage.
// B2: Adds LedgerEngine, wires node-zero events → love-ledger.
// B3: Adds GameEngine with LedgerAdapter bridge to love-ledger.
// B4: Adds VaultSync for encrypted storage + court-ready export.
// Hysteresis: 30s hold on tier downgrades, instant upgrades.

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { NodeZero } from '@p31/node-zero';
import type { Axis, ScopeTier } from '@p31/node-zero';
import { LedgerEngine } from '@p31/love-ledger';
import type { LoveWallet, LoveTransaction, LoveSpend, SpendType } from '@p31/love-ledger';
import type { VestingStatus } from '@p31/love-ledger';
import { GameEngine } from '@p31/game-engine';
import type { LedgerAdapter, Structure, PlayerProgress, Challenge } from '@p31/game-engine';
import { VaultSync } from '../services/vaultSync';

// ── Tier ordering for hysteresis comparison ──
const TIER_RANK: Record<ScopeTier, number> = {
  REFLEX: 0,
  PATTERN: 1,
  FULL: 2,
};

// ── Hysteresis hold duration (ms) ──
const DOWNGRADE_HOLD_MS = 30_000;

// ── Context value ──
interface NodeContextValue {
  node: NodeZero | null;
  nodeId: string | null;
  spoons: number;
  maxSpoons: number;
  tier: ScopeTier;
  voltage: number;
  booted: boolean;
  updateState: (axis: Axis, value: number) => Promise<void>;
  // B2: Protocol economy
  ledger: LedgerEngine | null;
  protocolWallet: LoveWallet | null;
  vesting: readonly VestingStatus[];
  protocolTxCount: number;
  spendLove: (type: SpendType, amount: number, meta?: Record<string, unknown>) => LoveSpend | null;
  // B3: Game engine
  game: GameEngine | null;
  player: PlayerProgress | null;
  structures: readonly Structure[];
  activeChallenge: Challenge | null;
  availableChallenges: readonly Challenge[];
  // B4: Vault
  vaultSync: VaultSync | null;
  exportVaultBundle: () => Promise<Record<string, unknown> | null>;
  vaultLayerCount: number;
}

const NodeContext = createContext<NodeContextValue>({
  node: null,
  nodeId: null,
  spoons: 12,
  maxSpoons: 12,
  tier: 'FULL',
  voltage: 0,
  booted: false,
  updateState: async () => {},
  ledger: null,
  protocolWallet: null,
  vesting: [],
  protocolTxCount: 0,
  spendLove: () => null,
  game: null,
  player: null,
  structures: [],
  activeChallenge: null,
  availableChallenges: [],
  vaultSync: null,
  exportVaultBundle: async () => null,
  vaultLayerCount: 0,
});

export function useNode(): NodeContextValue {
  return useContext(NodeContext);
}

interface NodeProviderProps {
  children: ReactNode;
}

export function NodeProvider({ children }: NodeProviderProps) {
  const nodeRef = useRef<NodeZero | null>(null);
  const ledgerRef = useRef<LedgerEngine | null>(null);
  const [booted, setBooted] = useState(false);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [spoons, setSpoons] = useState(12);
  const [voltage, setVoltage] = useState(0);

  // B2: Protocol economy state
  const [protocolWallet, setProtocolWallet] = useState<LoveWallet | null>(null);
  const [vesting, setVesting] = useState<readonly VestingStatus[]>([]);
  const [protocolTxCount, setProtocolTxCount] = useState(0);

  // B3: Game engine state
  const gameRef = useRef<GameEngine | null>(null);
  const [player, setPlayer] = useState<PlayerProgress | null>(null);
  const [structures, setStructures] = useState<readonly Structure[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [availableChallenges, setAvailableChallenges] = useState<readonly Challenge[]>([]);

  // B4: Vault sync state
  const vaultSyncRef = useRef<VaultSync | null>(null);
  const [vaultLayerCount, setVaultLayerCount] = useState(0);

  // Hysteresis state
  const [confirmedTier, setConfirmedTier] = useState<ScopeTier>('FULL');
  const pendingDowngradeRef = useRef<ScopeTier | null>(null);
  const downgradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply a raw tier from the state engine, with hysteresis
  const applyTier = useCallback((rawTier: ScopeTier) => {
    setConfirmedTier(prev => {
      const rawRank = TIER_RANK[rawTier];
      const prevRank = TIER_RANK[prev];

      // Upgrade: instant
      if (rawRank > prevRank) {
        if (downgradeTimerRef.current) {
          clearTimeout(downgradeTimerRef.current);
          downgradeTimerRef.current = null;
        }
        pendingDowngradeRef.current = null;
        return rawTier;
      }

      // Same tier: no change, cancel pending downgrade
      if (rawRank === prevRank) {
        if (downgradeTimerRef.current) {
          clearTimeout(downgradeTimerRef.current);
          downgradeTimerRef.current = null;
        }
        pendingDowngradeRef.current = null;
        return prev;
      }

      // Downgrade: start 30s hold (if not already pending for this tier)
      if (pendingDowngradeRef.current !== rawTier) {
        pendingDowngradeRef.current = rawTier;
        if (downgradeTimerRef.current) {
          clearTimeout(downgradeTimerRef.current);
        }
        downgradeTimerRef.current = setTimeout(() => {
          if (pendingDowngradeRef.current === rawTier) {
            setConfirmedTier(rawTier);
            pendingDowngradeRef.current = null;
            downgradeTimerRef.current = null;
          }
        }, DOWNGRADE_HOLD_MS);
      }

      return prev;
    });
  }, []);

  // Refresh wallet/vesting from ledger
  const refreshLedgerState = useCallback(() => {
    const ledger = ledgerRef.current;
    if (!ledger) return;
    setProtocolWallet(ledger.wallet);
    setVesting(ledger.vesting);
    setProtocolTxCount(ledger.transactions.length);
  }, []);

  // B3: Refresh game state from engine
  const refreshGameState = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    setPlayer(game.player);
    setStructures(game.structures);
    setActiveChallenge(game.activeChallenge);
    setAvailableChallenges(game.availableChallenges);
  }, []);

  // Boot NodeZero + LedgerEngine on mount
  useEffect(() => {
    const node = new NodeZero();
    nodeRef.current = node;

    let mounted = true;

    node.boot().then((identity) => {
      if (!mounted) return;
      const id = identity.nodeId as string;
      setNodeId(id);
      setBooted(true);
      console.log('[NodeContext] booted:', id);

      // B2: Create LedgerEngine and wire events
      const ledger = new LedgerEngine(id);
      ledgerRef.current = ledger;

      // Ledger → React state: update wallet on every LOVE_EARNED
      ledger.on('LOVE_EARNED', (_tx: LoveTransaction) => {
        if (!mounted) return;
        refreshLedgerState();
      });

      ledger.on('POOL_REBALANCED', () => {
        if (!mounted) return;
        refreshLedgerState();
      });

      ledger.on('LOVE_SPENT', (_spend: LoveSpend) => {
        if (!mounted) return;
        refreshLedgerState();
      });

      // Wire node-zero state events → ledger.ingest()
      node.state.on('STATE_CHANGED', (event) => {
        const s = event.state;
        ledger.ingest('STATE_CHANGED', {
          state: {
            urgency: s.vector.urgency,
            valence: s.vector.valence,
            cognitive: s.vector.cognitiveLoad,
            coherence: s.coherence.value,
          },
        });
      });

      node.state.on('COHERENCE_CHANGED', (event) => {
        ledger.ingest('COHERENCE_CHANGED', {
          qValue: event.qValue,
          beaconActive: event.beaconActive,
        });
      });

      // Wire node-zero bond/discovery callbacks → ledger.ingest()
      node.onBondFormed((bond) => {
        ledger.ingest('BOND_FORMED', {
          peerId: bond.peerId,
          bond: { peerId: bond.peerId },
        });
      });

      node.onPeerDiscovered((peer) => {
        ledger.ingest('PEER_DISCOVERED', {
          peerId: peer.nodeId ?? 'unknown',
          peer,
        });
      });

      // Initial wallet state
      refreshLedgerState();

      // B3: Create GameEngine with LedgerAdapter bridge
      const ledgerAdapter: LedgerAdapter = {
        blockPlaced(meta) {
          ledger.blockPlaced(meta);
          if (mounted) refreshLedgerState();
        },
        challengeComplete(_challengeId, love) {
          ledger.donate(love, { source: 'challenge', challengeId: _challengeId });
          if (mounted) refreshLedgerState();
        },
      };

      const game = new GameEngine(id, { ledger: ledgerAdapter });
      gameRef.current = game;

      // Game events → React state
      game.on('PIECE_PLACED', () => { if (mounted) refreshGameState(); });
      game.on('CHALLENGE_COMPLETE', () => { if (mounted) refreshGameState(); });
      game.on('LEVEL_UP', () => { if (mounted) refreshGameState(); });
      game.on('TIER_PROMOTED', () => { if (mounted) refreshGameState(); });
      game.on('XP_EARNED', () => { if (mounted) refreshGameState(); });
      game.on('QUEST_COMPLETE', () => { if (mounted) refreshGameState(); });

      // Wire bond events → game engine
      node.onBondFormed((bond) => {
        game.bondFormed(bond.peerId);
      });

      // Initial game state
      refreshGameState();

      // B4: Create VaultSync and initialize layers
      const vs = new VaultSync({ node, ledger, game });
      vaultSyncRef.current = vs;
      vs.init().then(() => {
        if (!mounted) return;
        node.vault.listLayers().then(layers => {
          if (mounted) setVaultLayerCount(layers.length);
        });
        console.log('[NodeContext] VaultSync initialized');
      }).catch(err => {
        console.error('[NodeContext] VaultSync init failed:', err);
      });
    }).catch((err) => {
      console.error('[NodeContext] boot failed:', err);
    });

    // B1: Subscribe to local state changes for spoons/tier
    node.state.on('STATE_CHANGED', (event) => {
      if (!mounted) return;
      const { composite } = event.state;
      setSpoons(composite.spoons);
      setVoltage(composite.voltage as number);
      applyTier(composite.tier);
    });

    node.state.on('SCOPE_TIER_CHANGED', (event) => {
      if (!mounted) return;
      setSpoons(event.spoons);
      applyTier(event.currentTier);
    });

    return () => {
      mounted = false;
      if (downgradeTimerRef.current) {
        clearTimeout(downgradeTimerRef.current);
      }
      // B4: Write all vault layers on session end
      if (vaultSyncRef.current) {
        vaultSyncRef.current.writeAll().catch(() => {});
        vaultSyncRef.current.teardown();
        vaultSyncRef.current = null;
      }
      node.shutdown();
      nodeRef.current = null;
      ledgerRef.current = null;
      gameRef.current = null;
    };
  }, [applyTier, refreshLedgerState, refreshGameState]);

  const updateState = useCallback(async (axis: Axis, value: number) => {
    if (nodeRef.current) {
      await nodeRef.current.updateState(axis, value);
    }
  }, []);

  // B4: Export vault bundle for court disclosure
  const exportVaultBundle = useCallback(async (): Promise<Record<string, unknown> | null> => {
    const vs = vaultSyncRef.current;
    if (!vs) return null;
    await vs.writeAll();
    return vs.exportBundle();
  }, []);

  const spendLove = useCallback((type: SpendType, amount: number, meta?: Record<string, unknown>): LoveSpend | null => {
    const ledger = ledgerRef.current;
    if (!ledger) return null;
    return ledger.spend(type, amount, meta);
  }, []);

  const value: NodeContextValue = {
    node: nodeRef.current,
    nodeId,
    spoons,
    maxSpoons: 12,
    tier: confirmedTier,
    voltage,
    booted,
    updateState,
    ledger: ledgerRef.current,
    protocolWallet,
    vesting,
    protocolTxCount,
    spendLove,
    game: gameRef.current,
    player,
    structures,
    activeChallenge,
    availableChallenges,
    vaultSync: vaultSyncRef.current,
    exportVaultBundle,
    vaultLayerCount,
  };

  return (
    <NodeContext.Provider value={value}>
      {children}
    </NodeContext.Provider>
  );
}
