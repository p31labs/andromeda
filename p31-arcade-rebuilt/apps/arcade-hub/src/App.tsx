/**
 * P31 Arcade Hub — Merged Family Gaming OS
 * Combines v1 (Bounties/TaskBoard) + v2 (Four-Domain Centaur) into single App
 */
import React, { useState, useEffect, useCallback } from 'react';
import { GameFrame } from '@p31/design-system';
import { GAME_CATALOG, getSpoonLevel, subscribeToSpoon } from '@p31/core';
import { checkGameAccess } from '@p31/sentinel';
import type { GameId, GameSession, PlayerId } from '@p31/core';
import { GameLauncher } from './components/GameLauncher';
import { FamilySpectate } from './components/FamilySpectate';
import { EarningsStack } from './components/EarningsStack';
import { TaskBoard } from './components/TaskBoard';
import { SENTINELBanner } from './components/SENTINELBanner';
import { PlayerIdentityCard } from './components/PlayerIdentityCard';
import './App.css';

type View = 'arcade' | 'bounties';

export default function App() {
  const [view, setView] = useState<View>('arcade');
  const [activeGame, setActiveGame] = useState<{
    gameId: GameId;
    session: GameSession;
    mode: 'solo' | 'coop' | 'spectate';
  } | null>(null);

  const [currentPlayer, setCurrentPlayer] = useState<PlayerId>('sj');
  const [sibling] = useState<PlayerId>('wj');
  const [credits, setCredits] = useState(50);
  const [spoonLevel, setSpoonLevel] = useState(getSpoonLevel());

  // Listen for spoon changes
  useEffect(() => subscribeToSpoon(setSpoonLevel), []);

  // Handle game launch
  const handleLaunch = useCallback(
    async (gameId: GameId, mode: 'solo' | 'coop' | 'spectate') => {
      const enforcement = checkGameAccess(gameId, currentPlayer);
      if (!enforcement.allowed) {
        alert(enforcement.reason);
        return;
      }
      const session: GameSession = {
        sessionId: `session-${currentPlayer}-${Date.now()}`,
        gameId,
        playerId: currentPlayer,
        startTime: Date.now(),
        durationMinutes: 0,
        mode,
        creditsEarned: 0,
      };
      setActiveGame({ gameId, session, mode });
    },
    [currentPlayer]
  );

  // Handle game close
  const handleClose = useCallback(() => {
    if (activeGame) {
      // Award credits
      const earned = Math.round(Math.random() * 5 * 100) / 100;
      setCredits((c) => c + earned);
    }
    setActiveGame(null);
  }, [activeGame]);

  // Switch player
  const switchPlayer = () => {
    setCurrentPlayer((p) => (p === 'sj' ? 'wj' : 'sj'));
  };

  // Game frame view
  if (activeGame) {
    const config = GAME_CATALOG[activeGame.gameId];
    return (
      <GameFrame
        gameName={config.name}
        onClose={handleClose}
        playerId={currentPlayer}
        sessionId={activeGame.session.sessionId}
        maxMinutes={config.maxSessionMinutes}
        externalUrl={config.url}
      >
        {/* In-process games would go here as children */}
      </GameFrame>
    );
  }

  // Main hub view
  return (
    <div className="hub" data-spoon={spoonLevel}>
      <header className="hub-header">
        <div className="header-brand">
          <h1>🎮 P31 ARCADE</h1>
          <span className="header-tagline">Four-Domain Centaur • Family-First Gaming</span>
        </div>
        <div className="header-controls">
          <nav className="header-nav">
            <button
              onClick={() => setView('arcade')}
              className={`nav-btn ${view === 'arcade' ? 'active' : ''}`}
            >
              Games
            </button>
            <button
              onClick={() => setView('bounties')}
              className={`nav-btn ${view === 'bounties' ? 'active' : ''}`}
            >
              Bounties
            </button>
          </nav>
          <button onClick={switchPlayer} className="player-switch">
            <span className="current-player">{currentPlayer.toUpperCase()}</span>
            <small>Switch</small>
          </button>
          <EarningsStack playerCredits={credits} compact />
        </div>
      </header>

      <SENTINELBanner />

      <main className="hub-main">
        {view === 'arcade' ? (
          <>
            <section className="games-section">
              <GameLauncher
                playerId={currentPlayer}
                playerCredits={credits}
                onLaunch={handleLaunch}
              />
            </section>
            <aside className="hub-sidebar">
              <FamilySpectate currentPlayer={currentPlayer} siblingPlayer={sibling} />
              <EarningsStack playerCredits={credits} />
              <PlayerIdentityCard playerId={currentPlayer} />
            </aside>
          </>
        ) : (
          <TaskBoard playerId={currentPlayer} />
        )}
      </main>

      <footer className="hub-footer">
        <div className="footer-stack">
          <span>CHUMP: $450/mo</span>
          <span>+</span>
          <span>Arcade: $30/mo</span>
          <span>=</span>
          <span className="total">$480/mo family fund</span>
        </div>
        <p>P31 Arcade • No ads • No tracking • Family-owned infrastructure</p>
      </footer>
    </div>
  );
}
