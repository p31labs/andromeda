import { useState, useEffect } from 'react';
import { UnifiedIdentityManager, GlobalSpoonManager, SkillBridgeManager } from '@p31/unified';
import type { UnifiedPlayer, GameId } from '@p31/unified';

import { GlobalSpoonDisplay } from './components/GlobalSpoonDisplay';
import { PlayerIdentityCard } from './components/PlayerIdentityCard';
import { GameLauncher } from './components/GameLauncher';
import { RecentActivityFeed } from './components/RecentActivityFeed';
import { SkillBridgePanel } from './components/SkillBridgePanel';
import { ZenModeFinder } from './components/ZenModeFinder';
import TaskBoard from './components/TaskBoard';

import './App.css';

type View = 'arcade' | 'bounties';

function App() {
  const [player, setPlayer] = useState<UnifiedPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [view, setView] = useState<View>('arcade');

  const identityManager = new UnifiedIdentityManager();
  const spoonManager = new GlobalSpoonManager();
  const bridgeManager = new SkillBridgeManager();

  useEffect(() => {
    const init = async () => {
      const loadedPlayer = await identityManager.loadPlayer();
      spoonManager.loadState();

      if (loadedPlayer) {
        bridgeManager.setPlayer(loadedPlayer);
        setPlayer(loadedPlayer);
      }

      setLoading(false);
    };

    init();
  }, []);

  const handleGameLaunch = (gameId: GameId) => {
    setSelectedGame(gameId);

    // Track session start
    identityManager.startGameSession(gameId);
  };

  const handleGameClose = () => {
    if (selectedGame) {
      identityManager.endGameSession(selectedGame, 'draw');
    }
    setSelectedGame(null);

    // Refresh player data
    const updated = identityManager.getPlayer();
    setPlayer(updated);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">🎮</div>
        <p>Loading P31 Arcade...</p>
      </div>
    );
  }

  // If a game is selected, show the game iframe
  if (selectedGame) {
    return (
      <div className="game-container">
        <div className="game-header">
          <button onClick={handleGameClose} className="back-button">
            ← Back to Arcade
          </button>
          <GlobalSpoonDisplay compact />
        </div>
        <iframe
          src={getGameUrl(selectedGame)}
          className="game-iframe"
          allow="fullscreen"
          title={`P31 ${selectedGame}`}
        />
      </div>
    );
  }

  return (
    <div className="arcade-hub">
      <header className="hub-header">
        <h1>🎮 P31 ARCADE</h1>
        <div className="hub-controls">
          <button
            onClick={() => setView('arcade')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'arcade' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Games
          </button>
          <button
            onClick={() => setView('bounties')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'bounties' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Bounties
          </button>
          <GlobalSpoonDisplay />
        </div>
      </header>

      {view === 'bounties' ? (
        <TaskBoard />
      ) : (
        <main className="hub-main">
          {player && (
            <>
              <PlayerIdentityCard player={player} />

              <div className="hub-grid">
                <section className="games-section">
                  <h2>Choose Your Game</h2>
                  <GameLauncher
                    player={player}
                    spoonManager={spoonManager}
                    onLaunch={handleGameLaunch}
                  />
                </section>

                <aside className="hub-sidebar">
                  <ZenModeFinder spoonManager={spoonManager} onLaunch={handleGameLaunch} />
                  <SkillBridgePanel player={player} bridgeManager={bridgeManager} />
                  <RecentActivityFeed player={player} />
                </aside>
              </div>
            </>
          )}
        </main>
      )}

      <footer className="hub-footer">
        <p>P31 Arcade — Cross-Game Identity • Spoon Theory • Skill Bridges • CHUMP Bounties</p>
      </footer>
    </div>
  );
}

function getGameUrl(gameId: GameId): string {
  const urls: Record<GameId, string> = {
    smallball: 'https://p31-smallball.pages.dev',
    gridiron: 'https://p31-gridiron.pages.dev',
    cards: 'https://p31-cards.pages.dev',
    strategy: 'https://p31-strategy.pages.dev',
    'liquid-sculptor': 'https://p31-liquid-sculptor.pages.dev',
    'resonance-rings': 'https://p31-resonance-rings.pages.dev',
    'magnetic-poetry': 'https://p31-magnetic-poetry.pages.dev',
    'orbital-drift': 'https://p31-orbital-drift.pages.dev',
    'water-parksimulator': 'https://p31-waterparksimulator.pages.dev',
  };
  return urls[gameId];
}

export default App;
