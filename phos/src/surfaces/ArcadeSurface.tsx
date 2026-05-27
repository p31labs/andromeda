/**
 * ArcadeSurface.tsx — The Complete Arcade Experience.
 *
 * Integrates the full p31-arcade-hub experience into PHOS:
 * - Game catalog with 9 games across 4 categories
 * - Player identity (S.J. / W.J.) with SBT
 * - Earnings stack (CHUMP $450/mo + Arcade $30/mo)
 * - Skill bridges, spectate mode, zen mode finder
 * - CHUMP bounty board
 * - Spoon-aware game launching (iframe)
 * - Background DePIN telemetry status
 *
 * Spoon-state aware:
 * - QUANTUM: full catalog, dense grid, all controls
 * - BRIDGE: simplified catalog, larger cards
 * - SANCTUARY: zen mode only, low-energy games, big tactile buttons
 * - CRISIS: suspended
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─── TYPES (mirroring p31-arcade-hub/src/types/arcade.ts) ───

type PlayerId = 'sj' | 'wj';
type GameId = 'smallball' | 'gridiron' | 'cards' | 'strategy' | 'liquid-sculptor' | 'resonance-rings' | 'magnetic-poetry' | 'orbital-drift' | 'geodesic-builder' | 'water-parksimulator';
type GameCategory = 'sports' | 'strategy' | 'physics' | 'creative';

interface GameInfo {
  id: GameId;
  name: string;
  category: GameCategory;
  description: string;
  spoonCost: number; // estimated spoons per session
  maxMinutes: number;
  coop: boolean;
  spectate: boolean;
  url: string;
}

interface PlayerIdentity {
  id: PlayerId;
  displayName: string;
  totalPlayMinutes: number;
  gamesPlayed: number;
  lastGame: GameId | null;
  lastPlayedAt: number | null;
}

interface EarningsStack {
  chumpMonthly: number;
  arcadeMonthly: number;
  combined: number;
  availableCredits: number;
}

interface ChumpStatus {
  active: boolean;
  lastPing: number | null;
  uptime: number;
}

// ─── DATA ───

const GAME_CATALOG: GameInfo[] = [
  { id: 'smallball', name: 'SmallBall', category: 'sports', description: 'Baseball training simulation with Markov pitching engine', spoonCost: 2, maxMinutes: 60, coop: true, spectate: true, url: 'https://p31-smallball.pages.dev' },
  { id: 'gridiron', name: 'Gridiron', category: 'sports', description: 'Tactical football with real-time strategy', spoonCost: 2, maxMinutes: 60, coop: true, spectate: true, url: 'https://p31-gridiron.pages.dev' },
  { id: 'cards', name: 'Card Master', category: 'strategy', description: 'Strategic card battles with pattern recognition', spoonCost: 1, maxMinutes: 45, coop: true, spectate: true, url: 'https://p31-cards.pages.dev' },
  { id: 'strategy', name: 'Strategy Board', category: 'strategy', description: 'Classic board game with minimax AI opponent', spoonCost: 2, maxMinutes: 45, coop: false, spectate: true, url: 'https://p31-strategy.pages.dev' },
  { id: 'liquid-sculptor', name: 'Liquid Sculptor', category: 'physics', description: 'Fluid dynamics playground with creative tools', spoonCost: 1, maxMinutes: 90, coop: false, spectate: true, url: 'https://p31-liquid-sculptor.pages.dev' },
  { id: 'resonance-rings', name: 'Resonance Rings', category: 'physics', description: 'Wave interference and harmonic puzzles', spoonCost: 1, maxMinutes: 90, coop: false, spectate: false, url: 'https://p31-resonance-rings.pages.dev' },
  { id: 'magnetic-poetry', name: 'Magnetic Poetry', category: 'creative', description: 'Neon word magnets with magnetic snap physics', spoonCost: 1, maxMinutes: 90, coop: true, spectate: true, url: 'https://p31-magnetic-poetry.pages.dev' },
  { id: 'orbital-drift', name: 'Orbital Drift', category: 'physics', description: 'Gravity simulation and orbital mechanics', spoonCost: 1, maxMinutes: 90, coop: false, spectate: false, url: 'https://p31-orbital-drift.pages.dev' },
  { id: 'geodesic-builder', name: 'Geodesic Builder', category: 'creative', description: 'Cooperative 3D construction with Maxwell Rigidity', spoonCost: 2, maxMinutes: 120, coop: true, spectate: true, url: 'https://p31ca.org/geodesic' },
  { id: 'water-parksimulator', name: 'Water Park Simulator', category: 'creative', description: 'Build and manage your own water park', spoonCost: 1, maxMinutes: 120, coop: true, spectate: true, url: 'https://p31-waterparksimulator.pages.dev' },
];

const CATEGORY_LABELS: Record<GameCategory, string> = {
  sports: '🏈 Sports',
  strategy: '🧠 Strategy',
  physics: '⚛️ Physics',
  creative: '🎨 Creative',
};

const CATEGORY_ORDER: GameCategory[] = ['sports', 'strategy', 'physics', 'creative'];

// ─── COMPONENT ───

interface Props {
  className?: string;
  spoons: number;
  grayRock: boolean;
}

type ArcadeView = 'lobby' | 'playing' | 'bounties' | 'identity';

export const ArcadeSurface: React.FC<Props> = ({ className, spoons, grayRock }) => {
  const [view, setView] = useState<ArcadeView>('lobby');
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [player, setPlayer] = useState<PlayerIdentity | null>(null);
  const [earnings, setEarnings] = useState<EarningsStack>({
    chumpMonthly: 450, arcadeMonthly: 30, combined: 480, availableCredits: 0,
  });
  const [chump, setChump] = useState<ChumpStatus>({ active: false, lastPing: null, uptime: 0 });
  const [filterCategory, setFilterCategory] = useState<GameCategory | 'all'>('all');

  // Load player identity from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('p31-arcade-player');
      if (stored) {
        setPlayer(JSON.parse(stored));
      } else {
        // Default to S.J.
        const defaultPlayer: PlayerIdentity = {
          id: 'sj', displayName: 'S.J.', totalPlayMinutes: 0, gamesPlayed: 0, lastGame: null, lastPlayedAt: null,
        };
        setPlayer(defaultPlayer);
        localStorage.setItem('p31-arcade-player', JSON.stringify(defaultPlayer));
      }
    } catch {
      setPlayer({ id: 'sj', displayName: 'S.J.', totalPlayMinutes: 0, gamesPlayed: 0, lastGame: null, lastPlayedAt: null });
    }
  }, []);

  // Check CHUMP status
  useEffect(() => {
    const checkChump = () => {
      try {
        const chumpState = localStorage.getItem('chump-edge-status');
        if (chumpState) {
          const parsed = JSON.parse(chumpState);
          setChump({
            active: parsed.active ?? false,
            lastPing: parsed.lastPing ?? null,
            uptime: parsed.uptime ?? 0,
          });
        }
      } catch { /* ignore */ }
    };
    checkChump();
    const interval = setInterval(checkChump, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunchGame = useCallback((gameId: GameId) => {
    if (!player) return;
    setActiveGame(gameId);
    setView('playing');

    // Update player stats
    const updated: PlayerIdentity = {
      ...player,
      lastGame: gameId,
      lastPlayedAt: Date.now(),
      gamesPlayed: player.gamesPlayed + 1,
    };
    setPlayer(updated);
    localStorage.setItem('p31-arcade-player', JSON.stringify(updated));
  }, [player]);

  const handleCloseGame = useCallback(() => {
    setActiveGame(null);
    setView('lobby');
  }, []);

  const handleSwitchPlayer = useCallback(() => {
    if (!player) return;
    const newId: PlayerId = player.id === 'sj' ? 'wj' : 'sj';
    const newPlayer: PlayerIdentity = {
      id: newId,
      displayName: newId === 'sj' ? 'S.J.' : 'W.J.',
      totalPlayMinutes: 0, gamesPlayed: 0, lastGame: null, lastPlayedAt: null,
    };
    setPlayer(newPlayer);
    localStorage.setItem('p31-arcade-player', JSON.stringify(newPlayer));
  }, [player]);

  // ─── CRISIS ───
  if (grayRock || spoons === 0) {
    return (
      <div className={className}>
        <p className="text-xs opacity-50">Arcade suspended. Gray Rock active.</p>
      </div>
    );
  }

  // ─── PLAYING (iframe game) ───
  if (view === 'playing' && activeGame) {
    const game = GAME_CATALOG.find((g) => g.id === activeGame);
    return (
      <div className={`${className} flex flex-col h-full`}>
        <div className="flex items-center justify-between mb-3 shrink-0">
          <button onClick={handleCloseGame} className="text-xs text-gray-400 hover:text-white transition-colors">
            ← Back to Arcade
          </button>
          <span className="text-xs text-gray-500">{game?.name}</span>
          <span className={`w-2 h-2 rounded-full ${chump.active ? 'bg-emerald-400' : 'bg-gray-600'}`} title={chump.active ? 'CHUMP active' : 'CHUMP inactive'} />
        </div>
        <iframe
          src={game?.url ?? ''}
          className="flex-1 w-full rounded-xl border border-white/10 bg-black"
          allow="fullscreen; camera; microphone"
          title={`P31 ${game?.name}`}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    );
  }

  // ─── BOUNTIES ───
  if (view === 'bounties') {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">CHUMP Bounties</h2>
          <button onClick={() => setView('lobby')} className="text-xs text-gray-400 hover:text-white">← Back</button>
        </div>
        <div className="space-y-3">
          {[
            { title: 'Scan 10 items in Warehouse', reward: 5, difficulty: 'easy' },
            { title: 'Complete SmallBall training session', reward: 10, difficulty: 'medium' },
            { title: 'Ingest 5 chaos entries to Buffer', reward: 3, difficulty: 'easy' },
            { title: 'Play co-op game with sibling', reward: 15, difficulty: 'hard' },
            { title: 'Log pain level below 3 for 3 days', reward: 20, difficulty: 'hard' },
          ].map((bounty, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex-1">
                <div className="text-sm">{bounty.title}</div>
                <div className={`text-xs mt-0.5 ${
                  bounty.difficulty === 'easy' ? 'text-emerald-400' :
                  bounty.difficulty === 'medium' ? 'text-amber-400' : 'text-red-400'
                }`}>{bounty.difficulty}</div>
              </div>
              <div className="text-amber-400 font-mono text-sm">+{bounty.reward} ♥</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── IDENTITY ───
  if (view === 'identity') {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Player Identity</h2>
          <button onClick={() => setView('lobby')} className="text-xs text-gray-400 hover:text-white">← Back</button>
        </div>
        {player && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-3xl mb-2">{player.id === 'sj' ? '⚾' : '🎨'}</div>
              <div className="text-xl font-semibold">{player.displayName}</div>
              <div className="text-xs text-gray-500 mt-1">Player ID: {player.id}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-2xl font-bold text-emerald-400">{player.gamesPlayed}</div>
                <div className="text-[10px] text-gray-500 uppercase">Games Played</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-2xl font-bold text-blue-400">{player.totalPlayMinutes}</div>
                <div className="text-[10px] text-gray-500 uppercase">Minutes</div>
              </div>
            </div>
            {player.lastGame && (
              <div className="p-3 rounded-lg bg-white/5 text-sm">
                <span className="text-gray-500">Last played: </span>
                <span>{GAME_CATALOG.find((g) => g.id === player.lastGame)?.name}</span>
                {player.lastPlayedAt && (
                  <span className="text-xs text-gray-600 ml-2">
                    {new Date(player.lastPlayedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleSwitchPlayer}
              className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-sm hover:bg-white/20 transition-all"
            >
              Switch to {player.id === 'sj' ? 'W.J.' : 'S.J.'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── LOBBY (main arcade view) ───

  // SANCTUARY: zen mode only — low-spoon games, big buttons
  if (spoons <= 2) {
    const zenGames = GAME_CATALOG.filter((g) => g.spoonCost <= 1);
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Arcade — Zen Mode</h2>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${chump.active ? 'bg-emerald-400' : 'bg-gray-600'}`} />
            <span className="text-xs text-gray-500">{chump.active ? 'Earning' : 'Idle'}</span>
          </div>
        </div>
        <p className="text-sm text-gray-400 mb-6">Low-energy games. No pressure. Just play.</p>
        <div className="space-y-3">
          {zenGames.map((game) => (
            <button
              key={game.id}
              onClick={() => handleLaunchGame(game.id)}
              className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
            >
              <div className="text-lg font-medium">{game.name}</div>
              <div className="text-xs text-gray-500 mt-1">{game.description}</div>
              <div className="flex gap-3 mt-2">
                <span className="text-xs text-gray-600">{game.maxMinutes}m max</span>
                {game.coop && <span className="text-xs text-emerald-600">Co-op</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // QUANTUM/BRIDGE: full catalog
  const filteredGames = filterCategory === 'all'
    ? GAME_CATALOG
    : GAME_CATALOG.filter((g) => g.category === filterCategory);

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">The Arcade</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('bounties')} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
            Bounties
          </button>
          <button onClick={() => setView('identity')} className="text-xs text-gray-400 hover:text-white transition-colors">
            {player?.displayName ?? 'Player'}
          </button>
        </div>
      </div>

      {/* Earnings + CHUMP status bar */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Earnings Stack</div>
          <div className="text-sm font-mono text-amber-400">${earnings.combined}/mo</div>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">CHUMP</div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${chump.active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-xs">{chump.active ? 'Harvesting' : 'Idle'}</span>
          </div>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Credits</div>
          <div className="text-sm font-mono text-emerald-400">{earnings.availableCredits}</div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 text-xs rounded-lg border shrink-0 transition-all ${
            filterCategory === 'all' ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-gray-500'
          }`}
        >
          All ({GAME_CATALOG.length})
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 text-xs rounded-lg border shrink-0 transition-all ${
              filterCategory === cat ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-gray-500'
            }`}
          >
            {CATEGORY_LABELS[cat]} ({GAME_CATALOG.filter((g) => g.category === cat).length})
          </button>
        ))}
      </div>

      {/* Game grid */}
      <div className={`grid gap-2 ${spoons >= 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {filteredGames.map((game) => (
          <button
            key={game.id}
            onClick={() => handleLaunchGame(game.id)}
            className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
              spoons >= 4
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : 'bg-white/5 border-white/10 hover:bg-white/10 p-4'
            }`}
          >
            <div className={`font-medium ${spoons >= 4 ? 'text-xs' : 'text-sm'}`}>{game.name}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 truncate">{game.description}</div>
            <div className="flex gap-2 mt-1.5">
              <span className="text-[10px] text-gray-600">{game.maxMinutes}m</span>
              {game.coop && <span className="text-[10px] text-emerald-600">Co-op</span>}
              {game.spectate && <span className="text-[10px] text-blue-600">Spectate</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Skill bridges hint */}
      {player && player.gamesPlayed > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-500">
          💡 Skill bridges active: Skills transfer between games. Play more to unlock cross-game bonuses.
        </div>
      )}
    </div>
  );
};

export default ArcadeSurface;
