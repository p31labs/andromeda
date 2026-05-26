// P31 Card Table: Main Application
// Family card game pack with Spoon Theory accessibility
// Arcade Visual System Integration

import { useState, useCallback } from 'react';
import type { GameId, SpoonState, CrossGameIdentity, PlayerId, MatchState } from './types';
import { GAMES, SPOON_CONFIG } from './types';
import { initializeIdentity, processMatchResult } from './engine/cross-game';
import { DatabaseProvider } from './db/hooks';

// Game components
import { CrazyEights } from './components/games/CrazyEights';
import { Hearts } from './components/games/Hearts';
import { Euchre } from './components/games/Euchre';
import { BridgeLite } from './components/games/BridgeLite';
import { IdentityDisplay, GameSelector } from './components/Scoreboard';
import './arcade-theme.css';
import { ReturnRibbon } from '@p31/arcade-theme';

// ============================================
// MAIN APP
// ============================================

function App() {
  // Game state
  const [selectedGame, setSelectedGame] = useState<GameId>('crazy-eights');
  const [spoons, setSpoons] = useState<SpoonState>(3);
  const [identity, setIdentity] = useState<CrossGameIdentity>(() => initializeIdentity());
  const [showWelcome, setShowWelcome] = useState(true);
  const [message, setMessage] = useState<string>('');

  // Handle match completion
  const handleMatchComplete = useCallback((matchState: MatchState, winner: PlayerId | null) => {
    // Process XP and achievements
    const gameHistory = [{ gameId: selectedGame, won: winner === 'player' }];
    const result = processMatchResult(identity, matchState, gameHistory);

    setIdentity(result.identity);

    if (winner === 'player') {
      setMessage(`🎉 You won! +${result.totalXPEarned} XP`);
    } else {
      setMessage('Game over. Better luck next time!');
    }

    // Clear message after delay
    setTimeout(() => setMessage(''), 5000);
  }, [identity, selectedGame]);

  // Handle identity updates
  const handleIdentityUpdate = useCallback((newIdentity: CrossGameIdentity) => {
    setIdentity(newIdentity);
  }, []);

  // Start new game
  const startGame = () => {
    setShowWelcome(false);
    setMessage('');
  };

  // Render game component
  const renderGame = () => {
    const props = {
      spoons,
      identity,
      onMatchComplete: handleMatchComplete,
      onIdentityUpdate: handleIdentityUpdate,
    };

    switch (selectedGame) {
      case 'crazy-eights':
        return <CrazyEights {...props} />;
      case 'hearts':
        return <Hearts {...props} />;
      case 'euchre':
        return <Euchre {...props} />;
      case 'bridge-lite':
        return <BridgeLite {...props} />;
      default:
        return <CrazyEights {...props} />;
    }
  };

  // Welcome screen
  if (showWelcome) {
    return (
      <DatabaseProvider>
        <WelcomeScreen
          identity={identity}
          selectedGame={selectedGame}
          onSelectGame={setSelectedGame}
          spoons={spoons}
          onSpoonChange={setSpoons}
          onStart={startGame}
        />
      </DatabaseProvider>
    );
  }

  return (
    <DatabaseProvider>
      <div style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div className="arcade-background" />
        <div className="floating-particles" />

        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 1,
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {/* Header */}
          <header className="arcade-header" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '16px 24px',
            zIndex: 100,
            background: 'rgba(18, 18, 26, 0.9)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🃏</span>
                <span className="gradient-text">P31 Card Table</span>
              </h1>
              <GameSelector currentGame={selectedGame} onSelectGame={(game) => {
                setSelectedGame(game);
                setShowWelcome(true);
              }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Spoon selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', opacity: 0.7 }}>Spoons:</span>
                {[1, 3, 6].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpoons(s as SpoonState)}
                    className="arcade-button"
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      background: spoons === s ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.1)',
                      borderColor: spoons === s ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowWelcome(true)}
                className="arcade-button"
                style={{ padding: '8px 16px' }}
              >
                Menu
              </button>
            </div>
          </header>

          {/* Main content */}
          <main style={{
            position: 'absolute',
            top: '72px',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            overflow: 'auto',
          }}>
            {renderGame()}
          </main>

          {/* Identity display */}
          <IdentityDisplay identity={identity} />

          {/* Message toast */}
          {message && (
            <div className="slide-up" style={{
              position: 'absolute',
              bottom: '200px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '16px 24px',
              background: 'rgba(59, 130, 246, 0.95)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: 600,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.2)',
              zIndex: 1000,
            }}>
              {message}
            </div>
          )}

          {/* Footer */}
          <footer style={{
            position: 'fixed',
            bottom: 48,
            left: 0,
            right: 0,
            padding: '8px 16px',
            background: 'rgba(18, 18, 26, 0.9)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
            fontSize: '12px',
            zIndex: 10,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <span style={{ opacity: 0.6 }}>P31 Card Table • Arcade Series</span>
            <a
              href="https://p31-arcade-hub.pages.dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#f97316',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              🎮 Arcade Hub →
            </a>
          </footer>

          <ReturnRibbon currentApp="cards" />
        </div>
      </div>
    </DatabaseProvider>
  );
}

// ============================================
// WELCOME SCREEN
// ============================================

interface WelcomeScreenProps {
  identity: CrossGameIdentity;
  selectedGame: GameId;
  onSelectGame: (game: GameId) => void;
  spoons: SpoonState;
  onSpoonChange: (spoons: SpoonState) => void;
  onStart: () => void;
}

function WelcomeScreen({
  identity,
  selectedGame,
  onSelectGame,
  spoons,
  onSpoonChange,
  onStart,
}: WelcomeScreenProps) {
  const spoonConfig = SPOON_CONFIG[spoons];
  const game = GAMES[selectedGame];

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="arcade-background" />
      <div className="floating-particles" />

      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 1,
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div className="glass-card" style={{
          maxWidth: '800px',
          width: '100%',
          textAlign: 'center',
          padding: '40px',
        }}>
          {/* Logo */}
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🃏</div>
          <h1 style={{ fontSize: '36px', margin: '0 0 8px 0' }} className="gradient-text">P31 Card Table</h1>
          <p style={{ fontSize: '18px', opacity: 0.7, marginBottom: '32px' }}>
            Family card games with Spoon Theory accessibility
          </p>

          {/* Game selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '32px',
          }}>
            {(['crazy-eights', 'hearts', 'euchre', 'bridge-lite'] as GameId[]).map((gameId) => {
              const g = GAMES[gameId];
              const isSelected = gameId === selectedGame;

              return (
                <button
                  key={gameId}
                  onClick={() => onSelectGame(gameId)}
                  className="arcade-button"
                  style={{
                    padding: '24px',
                    background: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                    borderColor: isSelected ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {g.minPlayers}-{g.maxPlayers} players • {g.spoonCost} spoon{g.spoonCost > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px' }}>
                    {g.rules.trickTaking ? 'Trick-taking' : 'Shedding'} • {g.aiDifficulty}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected game info */}
          <div className="glass-card" style={{
            padding: '24px',
            background: 'rgba(255,255,255,0.03)',
            marginBottom: '32px',
          }}>
            <h2 style={{ margin: '0 0 8px 0' }}>{game.name}</h2>
            <p style={{ opacity: 0.7, margin: '0 0 16px 0' }}>
              {game.rules.trickTaking
                ? 'Trick-taking game with strategic card play'
                : 'Shedding game - be the first to empty your hand'}
            </p>

            {/* Spoon mode selector */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>
                Select your energy level (Spoon Theory)
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[1, 3, 6].map(s => (
                  <button
                    key={s}
                    onClick={() => onSpoonChange(s as SpoonState)}
                    className="arcade-button"
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      background: spoons === s ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.1)',
                      borderColor: spoons === s ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255,255,255,0.1)',
                      fontWeight: spoons === s ? 600 : 400,
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                      {'🥄'.repeat(s === 1 ? 1 : s === 3 ? 3 : 6)}
                    </div>
                    <div style={{ fontSize: '12px' }}>{s} Spoon{s > 1 ? 's' : ''}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Spoon mode description */}
            <div style={{
              padding: '12px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              fontSize: '14px',
            }}>
              <strong>{spoonConfig.mode}</strong>: {' '}
              {spoonConfig.mode === 'auto-play' && 'AI suggests moves - just tap to confirm'}
              {spoonConfig.mode === 'assisted' && 'Hints available - learn as you play'}
              {spoonConfig.mode === 'competitive' && 'Full control - competitive play'}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={onStart}
            className="arcade-button primary"
            style={{
              padding: '16px 48px',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Start Playing
          </button>

          {/* Identity preview */}
          <div className="glass-card" style={{
            marginTop: '32px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: identity.avatar.primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}>
              {identity.globalLevel}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Level {identity.globalLevel}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>
                {identity.gamesPlayed.cards} card games played
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          position: 'fixed',
          bottom: 48,
          left: 0,
          right: 0,
          padding: '12px',
          background: 'rgba(18, 18, 26, 0.9)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center',
          fontSize: '12px',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <span style={{ opacity: 0.6 }}>P31 Card Table • Arcade Series</span>
          <a
            href="https://p31-arcade-hub.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#f97316',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            🎮 Arcade Hub →
          </a>
        </footer>

        <ReturnRibbon currentApp="cards" />
      </div>
    </div>
  );
}

export default App;
