// ============================================
// P31 STRATEGY BOARD CLASSICS - MAIN APP
// Chess | Checkers | Othello
// Arcade Visual System Integration
// ============================================

import { useState, useCallback, useEffect } from 'react';
import type {
  GameId,
  BoardState,
  BoardPiece,
  Position,
  Move,
  SpoonState,
  AIMoveResult,
} from './types';
import {
  SPOON_CONFIG,
  AI_PERSONALITIES,
  XP_AWARDS,
} from './types';

// Engine imports
import { createInitialChessState, generateChessMoves, applyMove as applyChessMove } from './engine/rules/chessRules';
import { createInitialCheckersState, generateCheckersMoves, applyMove as applyCheckersMove } from './engine/rules/checkersRules';
import { createInitialOthelloState, generateOthelloMoves, applyMove as applyOthelloMove } from './engine/rules/othelloRules';
import { calculateBestMove } from './engine/ai/MinimaxEngine';

// Components
import { Board3D } from './components/Board3D';
import './arcade-theme.css';
import { ReturnRibbon } from '@p31/arcade-theme';

// ============================================
// MAIN APP COMPONENT
// ============================================

function App() {
  // Game state
  const [currentGame, setCurrentGame] = useState<GameId>('chess');
  const [gameState, setGameState] = useState<BoardState>(createInitialChessState());
  const [selectedPiece, setSelectedPiece] = useState<BoardPiece | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);

  // Spoon Theory state
  const [spoonAllocation, setSpoonAllocation] = useState<SpoonState>(6);
  const [undoCount, setUndoCount] = useState(0);

  // AI state
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [lastAiResult, setLastAiResult] = useState<AIMoveResult | null>(null);

  // UI state
  const [showHints, setShowHints] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [playerColor, setPlayerColor] = useState<'WHITE' | 'BLACK'>('WHITE');

  // Initialize game when changed
  useEffect(() => {
    let newState: BoardState;
    switch (currentGame) {
      case 'chess':
        newState = createInitialChessState();
        break;
      case 'checkers':
        newState = createInitialCheckersState();
        break;
      case 'othello':
        newState = createInitialOthelloState();
        break;
    }
    setGameState(newState);
    setSelectedPiece(null);
    setLegalMoves(generateLegalMoves(newState));
    setMoveHistory([]);
    setUndoCount(0);
    setStatusMessage(`${currentGame} started! ${newState.currentTurn} to move`);
  }, [currentGame]);

  // Update legal moves when state changes
  useEffect(() => {
    setLegalMoves(generateLegalMoves(gameState));

    // Check for game end
    if (gameState.gameId === 'chess') {
      const chess = gameState as import('./types').ChessState;
      if (chess.isCheckmate) {
        setStatusMessage(`Checkmate! ${gameState.currentTurn === 'WHITE' ? 'Black' : 'White'} wins!`);
      } else if (chess.isStalemate) {
        setStatusMessage('Stalemate! Game is a draw.');
      } else if (chess.isCheck) {
        setStatusMessage('Check!');
      }
    } else if (gameState.gameId === 'checkers') {
      const checkers = gameState as import('./types').CheckersState;
      if (checkers.isGameOver && checkers.winner) {
        setStatusMessage(`Game over! ${checkers.winner} wins!`);
      } else if (checkers.isGameOver) {
        setStatusMessage('Game over! Draw!');
      }
    } else if (gameState.gameId === 'othello') {
      const othello = gameState as import('./types').OthelloState;
      if (othello.isGameOver && othello.winner) {
        setStatusMessage(`Game over! ${othello.winner} wins!`);
      } else if (othello.isGameOver) {
        setStatusMessage('Game over! Draw!');
      }
    }
  }, [gameState]);

  // AI turn
  useEffect(() => {
    if (aiEnabled && gameState.currentTurn !== playerColor && !aiThinking) {
      makeAiMove();
    }
  }, [gameState.currentTurn, aiEnabled, playerColor]);

  const generateLegalMoves = (state: BoardState): Move[] => {
    switch (state.gameId) {
      case 'chess':
        return generateChessMoves(state as import('./types').ChessState);
      case 'checkers':
        return generateCheckersMoves(state as import('./types').CheckersState);
      case 'othello':
        return generateOthelloMoves(state as import('./types').OthelloState);
    }
  };

  const applyMove = (state: BoardState, move: Move): BoardState => {
    switch (state.gameId) {
      case 'chess':
        return applyChessMove(state as import('./types').ChessState, move);
      case 'checkers':
        return applyCheckersMove(state as import('./types').CheckersState, move);
      case 'othello':
        return applyOthelloMove(state as import('./types').OthelloState, move);
    }
  };

  const handleSquareClick = useCallback((position: Position) => {
    // For Othello, clicking an empty valid square places a disc
    if (currentGame === 'othello') {
      const othelloMove = legalMoves.find(m =>
        m.to.row === position.row && m.to.col === position.col
      );
      if (othelloMove) {
        executeMove(othelloMove);
      }
      return;
    }

    // If piece is selected, try to move
    if (selectedPiece) {
      const move = legalMoves.find(m =>
        m.pieceId === selectedPiece.id &&
        m.to.row === position.row &&
        m.to.col === position.col
      );

      if (move) {
        executeMove(move);
      } else {
        // Deselect if clicked elsewhere
        setSelectedPiece(null);
      }
    }
  }, [selectedPiece, legalMoves, currentGame]);

  const handlePieceClick = useCallback((piece: BoardPiece) => {
    // Check if it's the current player's turn
    if (piece.color !== gameState.currentTurn) {
      return;
    }

    // If this piece is already selected, deselect it
    if (selectedPiece?.id === piece.id) {
      setSelectedPiece(null);
      return;
    }

    // Select the piece
    setSelectedPiece(piece);
  }, [selectedPiece, gameState.currentTurn]);

  const executeMove = (move: Move) => {
    const newState = applyMove(gameState, move);
    setGameState(newState);
    setMoveHistory(prev => [...prev, move]);
    setSelectedPiece(null);
    setUndoCount(0);

    // Award XP for captures (simplified)
    if (move.capturedPieceId) {
      const xpGain = currentGame === 'chess' ? 10 : currentGame === 'checkers' ? 5 : 3;
      // Would sync with convergence hub here
    }
  };

  const makeAiMove = async () => {
    if (aiThinking) return;

    setAiThinking(true);
    setStatusMessage('AI is thinking...');

    try {
      const personality = AI_PERSONALITIES[
        currentGame === 'chess' ? 'tactician' :
        currentGame === 'checkers' ? 'hoppy' : 'corner'
      ];

      const result = await calculateBestMove(gameState, {
        difficulty: personality.depth > 6 ? 'expert' : 'intermediate',
        personality: personality.style,
        maxThinkTime: 3000,
        depthLimit: personality.depth,
      });

      setLastAiResult(result);

      // Small delay for realism
      await new Promise(r => setTimeout(r, 500));

      executeMove(result.move);
      setStatusMessage(`AI played: ${result.move.notation}`);
    } catch (err) {
      setStatusMessage('AI error: ' + (err as Error).message);
    } finally {
      setAiThinking(false);
    }
  };

  const handleUndo = () => {
    const spoonConfig = SPOON_CONFIG[spoonAllocation];
    const maxUndos = spoonConfig.maxUndos;

    if (maxUndos === 'unlimited' || undoCount < maxUndos) {
      // Undo last move(s) - in 2-player games, undo both players' moves
      const movesToUndo = aiEnabled ? 1 : 2;

      if (moveHistory.length >= movesToUndo) {
        // Reset to initial state and replay
        let newState: BoardState;
        switch (currentGame) {
          case 'chess':
            newState = createInitialChessState();
            break;
          case 'checkers':
            newState = createInitialCheckersState();
            break;
          case 'othello':
            newState = createInitialOthelloState();
            break;
        }

        // Replay moves except the last one(s)
        const movesToReplay = moveHistory.slice(0, -movesToUndo);
        for (const move of movesToReplay) {
          newState = applyMove(newState, move);
        }

        setGameState(newState);
        setMoveHistory(movesToReplay);
        setUndoCount(prev => prev + 1);
        setSelectedPiece(null);
        setStatusMessage('Move undone');
      }
    }
  };

  const handleHint = () => {
    if (!SPOON_CONFIG[spoonAllocation].showHints) {
      setStatusMessage('Hints not available at current spoon level');
      return;
    }

    makeAiMove().then(() => {
      // AI makes the move for you as a hint
      setStatusMessage('Hint: AI suggested this move');
    });
  };

  const getGameTitle = () => {
    switch (currentGame) {
      case 'chess': return '♟️ Chess';
      case 'checkers': return '🔴 Checkers';
      case 'othello': return '⚫ Othello';
    }
  };

  const getSpoonLabel = () => {
    switch (spoonAllocation) {
      case 1: return '🥄 Recovery Mode';
      case 3: return '🥄🥄🥄 Casual';
      case 6: return '🥄🥄🥄🥄🥄🥄 Competitive';
    }
  };

  const highlightedSquares: Position[] = [];
  if (currentGame === 'chess') {
    const chess = gameState as import('./types').ChessState;
    if (chess.isCheck) {
      const king = gameState.pieces.find(p =>
        p.type === 'KING' && p.color === gameState.currentTurn && !p.isCaptured
      );
      if (king) highlightedSquares.push(king.position);
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="arcade-background" />
      <div className="floating-particles" />

      <div style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header */}
        <header className="arcade-header glass-card" style={{
          marginBottom: '20px',
          background: 'rgba(18, 18, 26, 0.9)',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎯</span>
              <span className="gradient-text">P31 Strategy Board</span>
            </h1>
            <p style={{ margin: '5px 0 0', opacity: 0.7, fontSize: '14px' }}>{getSpoonLabel()}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{getGameTitle()}</div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              Turn: {gameState.currentTurn} | Moves: {moveHistory.length}
            </div>
          </div>
        </header>

        {/* Game Selector */}
        <div className="glass-card" style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          padding: '15px',
        }}>
          {(['chess', 'checkers', 'othello'] as GameId[]).map(game => (
            <button
              key={game}
              onClick={() => setCurrentGame(game)}
              className="arcade-button"
              style={{
                flex: 1,
                padding: '12px 24px',
                fontSize: '16px',
                background: currentGame === game ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                borderColor: currentGame === game ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)',
                fontWeight: currentGame === game ? 'bold' : 'normal',
              }}
            >
              {game === 'chess' && '♟️ Chess'}
              {game === 'checkers' && '🔴 Checkers'}
              {game === 'othello' && '⚫ Othello'}
            </button>
          ))}
        </div>

        {/* Main Game Area */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '20px',
        }}>
          {/* 3D Board */}
          <div className="glass-card" style={{
            overflow: 'hidden',
            aspectRatio: '1',
            padding: 0,
          }}>
            <Board3D
              state={gameState}
              selectedPiece={selectedPiece}
              legalMoves={selectedPiece ? legalMoves.filter(m => m.pieceId === selectedPiece.id) : []}
              lastMove={moveHistory[moveHistory.length - 1] || null}
              onSquareClick={handleSquareClick}
              onPieceClick={handlePieceClick}
              highlightedSquares={highlightedSquares}
              showLegalMoves={SPOON_CONFIG[spoonAllocation].highlightLegalMoves}
            />
          </div>

          {/* Sidebar */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
          }}>
            {/* Status */}
            <div className="glass-card" style={{
              padding: '15px',
              minHeight: '60px',
            }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: 0.9 }}>Status</h3>
              <p style={{ margin: 0, opacity: 0.8 }}>{statusMessage}</p>
              {aiThinking && <p style={{ margin: '10px 0 0', color: '#3b82f6' }}>🤔 Thinking...</p>}
            </div>

            {/* Controls */}
            <div className="glass-card" style={{ padding: '15px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: 0.9 }}>Controls</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={handleUndo}
                  disabled={moveHistory.length === 0 ||
                    (SPOON_CONFIG[spoonAllocation].maxUndos !== 'unlimited' &&
                     undoCount >= SPOON_CONFIG[spoonAllocation].maxUndos)}
                  className="arcade-button danger"
                  style={{
                    opacity: moveHistory.length === 0 ? 0.5 : 1,
                  }}
                >
                  ↩️ Undo ({undoCount}/{SPOON_CONFIG[spoonAllocation].maxUndos === 'unlimited' ? '∞' : SPOON_CONFIG[spoonAllocation].maxUndos})
                </button>

                <button
                  onClick={handleHint}
                  disabled={!SPOON_CONFIG[spoonAllocation].showHints || aiThinking}
                  className="arcade-button warning"
                  style={{
                    opacity: !SPOON_CONFIG[spoonAllocation].showHints ? 0.5 : 1,
                  }}
                >
                  💡 Hint
                </button>

                <button
                  onClick={() => {
                    setAiEnabled(!aiEnabled);
                    setStatusMessage(aiEnabled ? 'AI disabled' : 'AI enabled - playing as ' + playerColor);
                  }}
                  className={aiEnabled ? "arcade-button success" : "arcade-button"}
                  style={{
                    background: aiEnabled ? 'rgba(34, 197, 94, 0.3)' : undefined,
                    borderColor: aiEnabled ? 'rgba(34, 197, 94, 0.5)' : undefined,
                  }}
                >
                  {aiEnabled ? '🤖 AI ON' : '🤖 AI OFF'}
                </button>

                {aiEnabled && (
                  <select
                    value={playerColor}
                    onChange={(e) => setPlayerColor(e.target.value as 'WHITE' | 'BLACK')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(0,0,0,0.3)',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="WHITE">Play as White</option>
                    <option value="BLACK">Play as Black</option>
                  </select>
                )}
              </div>
            </div>

            {/* Spoon Settings */}
            <div className="glass-card" style={{ padding: '15px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: 0.9 }}>Spoon Allocation</h3>

              <div style={{ display: 'flex', gap: '5px' }}>
                {[1, 3, 6].map(spoons => (
                  <button
                    key={spoons}
                    onClick={() => {
                      setSpoonAllocation(spoons as SpoonState);
                      setUndoCount(0);
                    }}
                    className="arcade-button"
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: spoonAllocation === spoons ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255,255,255,0.05)',
                      borderColor: spoonAllocation === spoons ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {spoons === 1 && '🥄'}
                    {spoons === 3 && '🥄🥄🥄'}
                    {spoons === 6 && '🥄×6'}
                  </button>
                ))}
              </div>

              <p style={{ margin: '10px 0 0', fontSize: '12px', opacity: 0.6 }}>
                {spoonAllocation === 1 && 'Recovery: Unlimited undo, AI assistance'}
                {spoonAllocation === 3 && 'Casual: 3 undos, hints available'}
                {spoonAllocation === 6 && 'Competitive: No undos, full rules'}
              </p>
            </div>

            {/* AI Info */}
            {lastAiResult && (
              <div className="glass-card slide-up" style={{
                padding: '15px',
                fontSize: '12px',
                background: 'rgba(34, 197, 94, 0.1)',
                borderColor: 'rgba(34, 197, 94, 0.3)',
              }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '14px' }}>Last AI Move</h3>
                <div style={{ opacity: 0.8 }}>Confidence: {(lastAiResult.confidence * 100).toFixed(0)}%</div>
                <div style={{ opacity: 0.8 }}>Nodes: {lastAiResult.nodesEvaluated.toLocaleString()}</div>
                <div style={{ opacity: 0.8 }}>Time: {(lastAiResult.calculationTime / 1000).toFixed(1)}s</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="glass-card" style={{
          marginTop: '20px',
          marginBottom: '60px',
          padding: '15px',
          textAlign: 'center',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ opacity: 0.7 }}>P31 Arcade — Strategy Board Classics</span>
          <a
            href="https://p31-arcade-hub.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#9b59b6',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            🎮 Arcade Hub →
          </a>
        </footer>

        <ReturnRibbon currentApp="strategy" />
      </div>
    </div>
  );
}

export default App;
