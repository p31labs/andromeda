/**
 * Family Spectate Mode - Four-Domain Centaur Feature
 * Sibling watches gameplay, both earn credits, strengthens K4 mesh
 */

import { useState, useEffect } from 'react';
import type { PlayerId, GameId, SpectateSession } from '../types/arcade';
import { GAME_CATALOG } from '../sdk/arcade-sdk-v2';

interface FamilySpectateProps {
  currentPlayer: PlayerId;
  siblingPlayer: PlayerId;
  onSpectateStart: (session: SpectateSession) => void;
  onSpectateEnd: () => void;
  activeSpectateSession?: SpectateSession | null;
}

export function FamilySpectate({
  currentPlayer,
  siblingPlayer,
  onSpectateStart,
  onSpectateEnd,
  activeSpectateSession,
}: FamilySpectateProps) {
  const [siblingStatus, setSiblingStatus] = useState<'online' | 'playing' | 'offline'>('offline');
  const [siblingGame, setSiblingGame] = useState<GameId | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Poll sibling status every 10 seconds
  useEffect(() => {
    const checkSiblingStatus = async () => {
      try {
        const response = await fetch(`https://chump-edge.trimtab-signal.workers.dev/api/arcade/player/${siblingPlayer}/status`);
        if (response.ok) {
          const data = await response.json();
          setSiblingStatus(data.status);
          setSiblingGame(data.currentGame);
        }
      } catch {
        setSiblingStatus('offline');
      }
    };

    checkSiblingStatus();
    const interval = setInterval(checkSiblingStatus, 10000);
    return () => clearInterval(interval);
  }, [siblingPlayer]);

  const handleStartSpectate = async () => {
    if (!siblingGame) return;

    setIsConnecting(true);

    // Create spectate session
    const session: SpectateSession = {
      sessionId: `spectate-${currentPlayer}-${Date.now()}`,
      watcherId: currentPlayer,
      playerId: siblingPlayer,
      gameId: siblingGame,
      startTime: Date.now(),
      bothEarned: false,
      careFlowRecorded: false,
    };

    // Report to edge worker
    try {
      await fetch('https://chump-edge.trimtab-signal.workers.dev/api/arcade/spectate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      });
    } catch (err) {
      console.error('Failed to start spectate:', err);
    }

    setIsConnecting(false);
    onSpectateStart(session);
  };

  const handleEndSpectate = async () => {
    if (activeSpectateSession) {
      // Record care flow to K4 mesh
      try {
        await fetch('https://k4-cage.p31ca.org/api/care-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            edge: currentPlayer === 'sj' ? 'sj↔wj' : 'sj↔wj',
            amount: 1,
            reason: 'Family Spectate session completed',
            timestamp: Date.now(),
            gameContext: activeSpectateSession.gameId,
          }),
        });
      } catch (err) {
        console.error('Care flow recording failed:', err);
      }

      // Report end to edge
      try {
        await fetch('https://chump-edge.trimtab-signal.workers.dev/api/arcade/spectate/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSpectateSession.sessionId,
            endTime: Date.now(),
          }),
        });
      } catch (err) {
        console.error('Failed to end spectate:', err);
      }
    }

    onSpectateEnd();
  };

  // Active spectate view
  if (activeSpectateSession && siblingGame) {
    const game = GAME_CATALOG[siblingGame];
    return (
      <div className="spectate-active">
        <div className="spectate-header">
          <div className="spectate-badge">
            <span className="live-indicator">●</span>
            LIVE SPECTATE
          </div>
          <h3>Watching {siblingPlayer.toUpperCase()} play {game?.name}</h3>
          <p className="spectate-subtitle">
            Both earning credits • Strengthening sibling bond
          </p>
        </div>

        <div className="spectate-viewer">
          <iframe
            src={`${game?.url}?spectate=true&watcher=${currentPlayer}&player=${siblingPlayer}`}
            className="spectate-iframe"
            title={`Spectating ${game?.name}`}
            allow="fullscreen"
          />
        </div>

        <div className="spectate-info">
          <div className="info-card">
            <span className="info-label">💚 Love Economy</span>
            <span className="info-value">+1 care flow recorded</span>
          </div>
          <div className="info-card">
            <span className="info-label">💰 CHUMP Earnings</span>
            <span className="info-value">Both players earning</span>
          </div>
          <div className="info-card">
            <span className="info-label">🎮 SENTINEL</span>
            <span className="info-value">Zero ads, family-safe</span>
          </div>
        </div>

        <button onClick={handleEndSpectate} className="end-spectate-btn">
          End Spectate Session
        </button>
      </div>
    );
  }

  // Spectate launcher
  return (
    <div className="family-spectate">
      <div className="spectate-header">
        <h3>👀 Family Spectate</h3>
        <p className="spectate-subtitle">
          Watch your sibling play, both earn credits, strengthen your bond
        </p>
      </div>

      <div className="sibling-status">
        <div className={`status-badge ${siblingStatus}`}>
          <span className="status-dot"></span>
          {siblingPlayer.toUpperCase()} is {siblingStatus}
        </div>

        {siblingStatus === 'playing' && siblingGame && (
          <div className="current-game">
            Playing: <strong>{GAME_CATALOG[siblingGame]?.name}</strong>
          </div>
        )}
      </div>

      <div className="spectate-benefits">
        <h4>Why Spectate?</h4>
        <ul>
          <li>📺 You watch, you both earn credits</li>
          <li>💚 Sibling bond strengthens (+1 K4 edge)</li>
          <li>🧠 Learn strategies for your own play</li>
          <li>🛡️ SENTINEL: 100% ad-free, always safe</li>
        </ul>
      </div>

      <button
        onClick={handleStartSpectate}
        disabled={siblingStatus !== 'playing' || !siblingGame || isConnecting}
        className="start-spectate-btn"
      >
        {isConnecting ? 'Connecting...' : siblingStatus === 'playing' ? 'Start Spectating' : 'Waiting for sibling to play...'}
      </button>

      <div className="spectate-policy">
        <small>
          Powered by CHUMP bandwidth earnings. No ads. No tracking.
          Family-first design.
        </small>
      </div>
    </div>
  );
}
