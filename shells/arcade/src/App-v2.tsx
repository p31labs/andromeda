/**
 * P31 Arcade Hub v2 - Four-Domain Centaur Architecture
 * Industry + Arcade + CHUMP + Love Economy synthesis
 */

import { useState, useEffect, useCallback } from 'react';
import type { GameId, PlayerId, GameSession, SpectateSession } from './types/arcade';
import { GAME_CATALOG, ArcadeSDKv2 } from './sdk/arcade-sdk-v2';

import { GameLauncherV2 } from './components/GameLauncherV2';
import { FamilySpectate } from './components/FamilySpectate';
import { EarningsStackDisplay } from './components/EarningsStack';
import { MagneticPoetryContainer } from './components/game-containers/MagneticPoetryContainer';
import { GeodesicBuilderContainer } from './components/game-containers/GeodesicBuilderContainer';
import './App-v2.css';

// Four-Domain Mode Detection
function detectMode(input: string): { domains: string[]; isHybrid: boolean } {
  const triggers = {
    industry: /\b(CPI|ARPDAU|LTV|gacha|monetize|revenue|whale|market)\b/i,
    arcade: /\b(game|play|S\.?J\.?|W\.?J\.?|sibling|session)\b/i,
    chump: /\b(CHUMP|bandwidth|edge|infrastructure|\$450|earnings)\b/i,
    love: /\b(mesh|K4|care.?flow|co-op|spectate|family|bond)\b/i,
  };

  const detected: string[] = [];
  if (triggers.industry.test(input)) detected.push('Industry');
  if (triggers.arcade.test(input)) detected.push('Arcade');
  if (triggers.chump.test(input)) detected.push('CHUMP');
  if (triggers.love.test(input)) detected.push('Love Economy');

  return {
    domains: detected,
    isHybrid: detected.length > 1,
  };
}

interface PlayerState {
  id: PlayerId;
  credits: number;
  currentGame: GameId | null;
  isPlaying: boolean;
}

function AppV2() {
  const [currentPlayer, setCurrentPlayer] = useState<PlayerId>('sj');
  const [sibling, setSibling] = useState<PlayerId>('wj');
  const [playerState, setPlayerState] = useState<PlayerState>({
    id: 'sj',
    credits: 50,
    currentGame: null,
    isPlaying: false,
  });
  const [siblingState, setSiblingState] = useState<PlayerState>({
    id: 'wj',
    credits: 30,
    currentGame: null,
    isPlaying: false,
  });
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [activeSpectate, setActiveSpectate] = useState<SpectateSession | null>(null);
  const [centaurMode, setCentaurMode] = useState<string>('Arcade');

  // Initialize SDK
  const sdk = new ArcadeSDKv2({
    gameId: 'smallball',
    playerId: currentPlayer,
    debug: true,
  });

  // Poll sibling status
  useEffect(() => {
    const pollSibling = async () => {
      try {
        const response = await fetch(`https://chump-edge.trimtab-signal.workers.dev/api/arcade/player/${sibling}/status`);
        if (response.ok) {
          const data = await response.json();
          setSiblingState(prev => ({
            ...prev,
            currentGame: data.currentGame,
            isPlaying: data.status === 'playing',
            credits: data.credits || prev.credits,
          }));
        }
      } catch {
        // Silent fail
      }
    };

    pollSibling();
    const interval = setInterval(pollSibling, 5000);
    return () => clearInterval(interval);
  }, [sibling]);

  // Handle game launch
  const handleLaunch = useCallback(async (gameId: GameId, mode: 'solo' | 'coop') => {
    const coopWith = mode === 'coop' ? sibling : undefined;

    const session = await sdk.startSession(mode, coopWith);
    setActiveSession(session);

    setPlayerState(prev => ({
      ...prev,
      currentGame: gameId,
      isPlaying: true,
    }));

    // Detect mode for Centaur analysis
    const modeCheck = detectMode(`Launch ${gameId} ${mode} ${coopWith ? 'co-op' : ''}`);
    setCentaurMode(modeCheck.isHybrid ? 'HYBRID' : modeCheck.domains[0] || 'Arcade');
  }, [sdk, sibling]);

  // Handle game end
  const handleEndGame = useCallback(async (score?: number, percentile?: number) => {
    const session = await sdk.endSession(score, percentile);
    if (session) {
      setPlayerState(prev => ({
        ...prev,
        credits: prev.credits + session.creditsEarned,
        currentGame: null,
        isPlaying: false,
      }));
    }
    setActiveSession(null);
  }, [sdk]);

  // Handle spectate start
  const handleSpectateStart = useCallback((session: SpectateSession) => {
    setActiveSpectate(session);
    setCentaurMode('HYBRID');
  }, []);

  // Handle spectate end
  const handleSpectateEnd = useCallback(async () => {
    await sdk.endSpectate();
    setActiveSpectate(null);
    setPlayerState(prev => ({
      ...prev,
      credits: prev.credits + 0.5, // Spectate earns small amount
    }));
  }, [sdk]);

  // Switch player
  const switchPlayer = () => {
    const newPlayer = currentPlayer === 'sj' ? 'wj' : 'sj';
    const newSibling = sibling === 'sj' ? 'wj' : 'sj';
    setCurrentPlayer(newPlayer);
    setSibling(newSibling);
    setPlayerState(prev => ({ ...prev, id: newPlayer }));
    setSiblingState(prev => ({ ...prev, id: newSibling }));
  };

  // Game view - custom container for built-in games, iframe for external
  if (activeSession && playerState.currentGame) {
    const game = GAME_CATALOG[playerState.currentGame];

    // Built-in games with React containers
    if (playerState.currentGame === 'magnetic-poetry') {
      return (
        <MagneticPoetryContainer
          isActive={true}
          onBack={() => handleEndGame(0, 50)}
        />
      );
    }

    if (playerState.currentGame === 'geodesic-builder') {
      return (
        <GeodesicBuilderContainer
          isActive={true}
          onBack={() => handleEndGame(0, 50)}
        />
      );
    }

    // External games via iframe
    return (
      <div className="game-container">
        <div className="game-header">
          <button onClick={() => handleEndGame()} className="back-button">
            ← Back to Arcade
          </button>
          <div className="session-info">
            <span className="session-mode">{activeSession.mode}</span>
            {activeSession.coopWith && (
              <span className="coop-indicator">with {activeSession.coopWith.toUpperCase()}</span>
            )}
            <span className="timer">{Math.floor((Date.now() - activeSession.startTime) / 60000)}m</span>
          </div>
          <EarningsStackDisplay playerCredits={playerState.credits} compact />
        </div>

        <iframe
          src={`${game?.url}?player=${currentPlayer}&mode=${activeSession.mode}&session=${activeSession.sessionId}`}
          className="game-iframe"
          title={game?.name}
          allow="fullscreen"
        />

        <div className="game-footer">
          <div className="four-domain-bar">
            <span className="domain-tag">📊 Industry: {game?.category}</span>
            <span className="domain-tag">🎮 Arcade: {game?.maxSessionMinutes}m cap</span>
            <span className="domain-tag">🔧 CHUMP: {game?.baseRate}/hr</span>
            <span className="domain-tag">💚 Love: {activeSession.coopWith ? '+1 care flow' : 'solo mode'}</span>
          </div>
          <span className="mode-signature">[Mode: {centaurMode}]</span>
        </div>
      </div>
    );
  }

  // Spectate view
  if (activeSpectate) {
    return (
      <div className="spectate-view">
        <FamilySpectate
          currentPlayer={currentPlayer}
          siblingPlayer={sibling}
          onSpectateStart={handleSpectateStart}
          onSpectateEnd={handleSpectateEnd}
          activeSpectateSession={activeSpectate}
        />
      </div>
    );
  }

  // Main arcade hub
  return (
    <div className="arcade-hub-v2">
      {/* Header */}
      <header className="hub-header">
        <div className="header-brand">
          <h1>🎮 P31 ARCADE</h1>
          <span className="header-tagline">Four-Domain Centaur • Family-First Gaming</span>
        </div>

        <div className="header-player">
          <button onClick={switchPlayer} className="player-switch">
            <span className="current-player">{currentPlayer.toUpperCase()}</span>
            <small>Switch</small>
          </button>
          <EarningsStackDisplay playerCredits={playerState.credits} compact />
        </div>
      </header>

      {/* SENTINEL Banner */}
      <div className="sentinel-strip">
        <span className="sentinel-icon">🛡️</span>
        <span>SENTINEL Active: Zero ads • Age-appropriate • All funding from CHUMP earnings</span>
        <span className="k4-indicator">💚 K4 Mesh Connected</span>
      </div>

      <main className="hub-main">
        {/* Left: Game Launcher */}
        <section className="games-section">
          <GameLauncherV2
            playerId={currentPlayer}
            playerCredits={playerState.credits}
            onLaunch={handleLaunch}
            onSpectateRequest={(gameId) => {
              // Initiate spectate flow
              handleSpectateStart({
                sessionId: `spectate-${Date.now()}`,
                watcherId: currentPlayer,
                playerId: sibling,
                gameId,
                startTime: Date.now(),
                bothEarned: false,
                careFlowRecorded: false,
              });
            }}
            siblingPlaying={siblingState.isPlaying ? siblingState.currentGame : null}
          />
        </section>

        {/* Right: Sidebar */}
        <aside className="hub-sidebar">
          {/* Family Spectate Card */}
          {!siblingState.isPlaying ? (
            <FamilySpectate
              currentPlayer={currentPlayer}
              siblingPlayer={sibling}
              onSpectateStart={handleSpectateStart}
              onSpectateEnd={handleSpectateEnd}
            />
          ) : (
            <div className="sibling-playing-card">
              <h4>👫 Sibling Active</h4>
              <p>{sibling.toUpperCase()} is playing {GAME_CATALOG[siblingState.currentGame!]?.name}</p>
              <button
                onClick={() => handleSpectateStart({
                  sessionId: `spectate-${Date.now()}`,
                  watcherId: currentPlayer,
                  playerId: sibling,
                  gameId: siblingState.currentGame!,
                  startTime: Date.now(),
                  bothEarned: false,
                  careFlowRecorded: false,
                })}
                className="spectate-btn"
              >
                👀 Start Spectating
              </button>
            </div>
          )}

          {/* Earnings Stack */}
          <EarningsStackDisplay playerCredits={playerState.credits} />

          {/* Four-Domain Legend */}
          <div className="domain-legend">
            <h4>Four-Domain Centaur</h4>
            <div className="domain-list">
              <div className="domain-item">
                <span className="domain-icon">📊</span>
                <div>
                  <strong>Industry</strong>
                  <small>$92B market knowledge</small>
                </div>
              </div>
              <div className="domain-item">
                <span className="domain-icon">🎮</span>
                <div>
                  <strong>Arcade</strong>
                  <small>8 games, S.J./W.J. policies</small>
                </div>
              </div>
              <div className="domain-item">
                <span className="domain-icon">🔧</span>
                <div>
                  <strong>CHUMP</strong>
                  <small>$450/mo edge infrastructure</small>
                </div>
              </div>
              <div className="domain-item">
                <span className="domain-icon">💚</span>
                <div>
                  <strong>Love Economy</strong>
                  <small>K4 mesh, care flows tracked</small>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="hub-footer">
        <div className="footer-stack">
          <span>CHUMP: $450/mo</span>
          <span>+</span>
          <span>Arcade: $30/mo</span>
          <span>=</span>
          <span className="total">$480/mo family fund</span>
        </div>
        <p>P31 Arcade • No ads • No tracking • Family-owned infrastructure</p>
        <span className="mode-signature">[Mode: {centaurMode} | Domains: Industry+Arcade+CHUMP+Love | Target: Family cohesion]</span>
      </footer>
    </div>
  );
}

export default AppV2;
