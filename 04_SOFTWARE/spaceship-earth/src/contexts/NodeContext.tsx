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
import { trackEvent } from '../services/telemetry';
import { haptic } from '../services/haptic';

// ── Tier ordering for hysteresis comparison ──
const TIER_RANK: Record<ScopeTier, number> = {
  REFLEX: 0,
  PATTERN: 1,
  FULL: 2,
};

// ── Hysteresis hold duration (ms) ──
const DOWNGRADE_HOLD_MS = 30_000;

// ── Performance monitoring constants ──
const BOOT_TIMEOUT_MS = 10_000;
const STATE_UPDATE_THROTTLE_MS = 16; // ~60fps
const ERROR_RETRY_DELAY_MS = 2000;
const MAX_RETRY_ATTEMPTS = 3;

// ── Context value ──
interface NodeContextValue {
  node: NodeZero | null;
  nodeId: string | null;
  spoons: number;
  maxSpoons: number;
  tier: ScopeTier;
  voltage: number;
  booted: boolean;
  bootError: string | null;
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
  // Performance metrics
  performance: {
    bootTime: number;
    lastStateUpdate: number;
    errorCount: number;
    retryCount: number;
  };
}

const NodeContext = createContext<NodeContextValue>({
  node: null,
  nodeId: null,
  spoons: 12,
  maxSpoons: 12,
  tier: 'FULL',
  voltage: 0,
  booted: false,
  bootError: null,
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
  performance: {
    bootTime: 0,
    lastStateUpdate: 0,
    errorCount: 0,
    retryCount: 0,
  },
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
  const [bootError, setBootError] = useState<string | null>(null);
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

  // Performance metrics
  const [performance, setPerformance] = useState({
    bootTime: 0,
    lastStateUpdate: 0,
    errorCount: 0,
    retryCount: 0,
  });

  // Hysteresis state
  const [confirmedTier, setConfirmedTier] = useState<ScopeTier>('FULL');
  const pendingDowngradeRef = useRef<ScopeTier | null>(null);
  const downgradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Throttling refs for performance
  const lastStateUpdateRef = useRef(0);
  const stateUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Retry mechanism
  const retryCountRef = useRef(0);
  const bootTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            // Haptic feedback for tier downgrade
            haptic.tap();
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

  // Enhanced error handling with retry logic
  const handleBootError = useCallback((error: Error, attempt: number) => {
    const errorMessage = error.message || 'Unknown NodeZero boot error';
    setBootError(errorMessage);
    setPerformance(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
    
    console.error('[NodeContext] Boot failed (attempt', attempt + 1, '):', errorMessage);
    
    // Telemetry for boot failures
    trackEvent('node_boot_failed', {
      error: errorMessage,
      attempt,
      maxAttempts: MAX_RETRY_ATTEMPTS,
    });

    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
      retryCountRef.current++;
      setPerformance(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
      
      setTimeout(() => {
        console.log('[NodeContext] Retrying NodeZero boot...');
        bootNode(attempt + 1);
      }, ERROR_RETRY_DELAY_MS * Math.pow(2, attempt)); // Exponential backoff
    } else {
      // Max retries reached, fallback to demo mode
      console.log('[NodeContext] Max retries reached, switching to demo mode');
      setNodeId('demo');
      setBooted(true);
      setBootError('Demo mode activated due to NodeZero initialization failure');
      
      // Telemetry for fallback
      trackEvent('node_boot_fallback_demo', {
        error: errorMessage,
        retryAttempts: attempt + 1,
      });
    }
  }, []);

  // Boot NodeZero with timeout and retry logic
  const bootNode = useCallback(async (attempt = 0) => {
    const startTime = globalThis.performance.now();
    const mountedRef = { current: true }; // Track mount state for this boot attempt
    
    try {
      // Clear any existing timeout
      if (bootTimeoutRef.current) {
        clearTimeout(bootTimeoutRef.current);
      }

      // Set boot timeout
      bootTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        handleBootError(new Error('NodeZero boot timeout'), attempt);
      }, BOOT_TIMEOUT_MS);

      const node = new NodeZero();
      nodeRef.current = node;

      const identity = await node.boot();
      
      // Clear timeout on success
      if (bootTimeoutRef.current) {
        clearTimeout(bootTimeoutRef.current);
      }

      const bootTime = globalThis.performance.now() - startTime;
      setPerformance(prev => ({ ...prev, bootTime }));
      
      // Demo mode check: if no identity, treat as demo
      if (!identity || !identity.nodeId) {
        console.log('[NodeContext] Demo mode — auto-unlocking');
        setNodeId('demo');
        setBooted(true);
        setBootError('Demo mode activated');
        
        // Telemetry for demo mode
        trackEvent('node_boot_demo_mode', { bootTime });
        return;
      }
      
      const id = identity.nodeId as string;
      setNodeId(id);
      setBooted(true);
      setBootError(null);
      console.log('[NodeContext] booted:', id, `(${bootTime.toFixed(2)}ms)`);

      // Telemetry for successful boot
      trackEvent('node_boot_success', { 
        bootTime, 
        nodeId: id,
        attempt: attempt + 1 
      });

      // Initialize all subsystems
      await initializeSubsystems(node, id, mountedRef);

    } catch (error) {
      if (bootTimeoutRef.current) {
        clearTimeout(bootTimeoutRef.current);
      }
      handleBootError(error instanceof Error ? error : new Error('Unknown error'), attempt);
    }
  }, [handleBootError]);

  // Initialize all NodeZero subsystems
  const initializeSubsystems = useCallback(async (node: NodeZero, id: string, mountedRef: { current: boolean }) => {
    try {
      // B2: Create LedgerEngine and wire events
      const ledger = new LedgerEngine(id);
      ledgerRef.current = ledger;

      // Ledger → React state: update wallet on every LOVE_EARNED
      ledger.on('LOVE_EARNED', (_tx: LoveTransaction) => {
        if (!mountedRef.current) return;
        refreshLedgerState();
      });

      ledger.on('POOL_REBALANCED', () => {
        if (!mountedRef.current) return;
        refreshLedgerState();
      });

      ledger.on('LOVE_SPENT', (_spend: LoveSpend) => {
        if (!mountedRef.current) return;
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
          if (!mountedRef.current) return;
          ledger.blockPlaced(meta);
          refreshLedgerState();
        },
        challengeComplete(_challengeId, love) {
          if (!mountedRef.current) return;
          ledger.donate(love, { source: 'challenge', challengeId: _challengeId });
          refreshLedgerState();
        },
      };

      const game = new GameEngine(id, { ledger: ledgerAdapter });
      gameRef.current = game;

      // Game events → React state
      game.on('PIECE_PLACED', () => { if (!mountedRef.current) return; refreshGameState(); });
      game.on('CHALLENGE_COMPLETE', () => { if (!mountedRef.current) return; refreshGameState(); });
      game.on('LEVEL_UP', () => { if (!mountedRef.current) return; refreshGameState(); });
      game.on('TIER_PROMOTED', () => { if (!mountedRef.current) return; refreshGameState(); });
      game.on('XP_EARNED', () => { if (!mountedRef.current) return; refreshGameState(); });
      game.on('QUEST_COMPLETE', () => { if (!mountedRef.current) return; refreshGameState(); });

      // Wire bond events → game engine
      node.onBondFormed((bond) => {
        game.bondFormed(bond.peerId);
      });

      // Initial game state
      refreshGameState();

      // B4: Create VaultSync and initialize layers
      const vs = new VaultSync({ node, ledger, game });
      vaultSyncRef.current = vs;
      await vs.init();
      
      const layers = await node.vault.listLayers();
      setVaultLayerCount(layers.length);
      console.log('[NodeContext] VaultSync initialized');

    } catch (error) {
      console.error('[NodeContext] Subsystem initialization failed:', error);
      throw error;
    }
  }, [refreshLedgerState, refreshGameState]);

  // Throttled state update handler
  const throttledUpdateState = useCallback(async (axis: Axis, value: number): Promise<void> => {
    const now = globalThis.performance.now();
    
    if (now - lastStateUpdateRef.current < STATE_UPDATE_THROTTLE_MS) {
      if (stateUpdateTimeoutRef.current) {
        clearTimeout(stateUpdateTimeoutRef.current);
      }
      
      stateUpdateTimeoutRef.current = setTimeout(() => {
        lastStateUpdateRef.current = now;
        setPerformance(prev => ({ ...prev, lastStateUpdate: now }));
        
        if (nodeRef.current) {
          nodeRef.current.updateState(axis, value);
        }
      }, STATE_UPDATE_THROTTLE_MS - (now - lastStateUpdateRef.current));
      
      return;
    }

    lastStateUpdateRef.current = now;
    setPerformance(prev => ({ ...prev, lastStateUpdate: now }));
    
    if (nodeRef.current) {
      nodeRef.current.updateState(axis, value);
    }
  }, []);

  // Boot on mount with retry logic
  useEffect(() => {
    bootNode();

    return () => {
      // Cleanup
      if (downgradeTimerRef.current) {
        clearTimeout(downgradeTimerRef.current);
      }
      if (bootTimeoutRef.current) {
        clearTimeout(bootTimeoutRef.current);
      }
      if (stateUpdateTimeoutRef.current) {
        clearTimeout(stateUpdateTimeoutRef.current);
      }
      
      // B4: Write all vault layers on session end
      if (vaultSyncRef.current) {
        vaultSyncRef.current.writeAll().catch(() => {});
        vaultSyncRef.current.teardown();
        vaultSyncRef.current = null;
      }
      
      if (nodeRef.current) {
        nodeRef.current.shutdown();
        nodeRef.current = null;
      }
      ledgerRef.current = null;
      gameRef.current = null;
    };
  }, [bootNode]);

  // B1: Subscribe to local state changes for spoons/tier
  useEffect(() => {
    if (!nodeRef.current) return;

    const node = nodeRef.current;
    
    const handleStateChanged = (event: any) => {
      const { composite } = event.state;
      setSpoons(composite.spoons);
      setVoltage(composite.voltage as number);
      applyTier(composite.tier);
    };

    const handleScopeTierChanged = (event: any) => {
      setSpoons(event.spoons);
      applyTier(event.currentTier);
    };

    node.state.on('STATE_CHANGED', handleStateChanged);
    node.state.on('SCOPE_TIER_CHANGED', handleScopeTierChanged);

    return () => {
      node.state.off('STATE_CHANGED', handleStateChanged);
      node.state.off('SCOPE_TIER_CHANGED', handleScopeTierChanged);
    };
  }, [applyTier]);

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
    bootError,
    updateState: throttledUpdateState,
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
    performance,
  };

  return (
    <NodeContext.Provider value={value}>
      {children}
    </NodeContext.Provider>
  );
}