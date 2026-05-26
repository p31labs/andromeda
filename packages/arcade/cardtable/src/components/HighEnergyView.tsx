import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Radio, Wifi, WifiOff, Users, Play, Plus, Send } from 'lucide-react';
import { CardTable, type CardState, type ChipState } from './CardTable';
import { createShuffledDeck } from '../engine/Deck';
import { useDatabase } from '../db/PGLiteProvider';
import { createWebRTCSync } from '../network/WebRTCSync';
import type { WebRTCMessage } from '../network/WebRTCSync';

interface HighEnergyViewProps {
  onBack: () => void;
}

export const HighEnergyView: React.FC<HighEnergyViewProps> = ({ onBack }) => {
  const { db } = useDatabase();
  const webRTCRef = useRef(db ? createWebRTCSync(db) : null);

  const [cards, setCards] = useState<CardState[]>([]);
  const [chips, setChips] = useState<ChipState[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [potSize, setPotSize] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'default' | 'top' | 'player'>('default');
  const [coOpMode, setCoOpMode] = useState(false);
  const [victoryMode, setVictoryMode] = useState(false);

  // Add log
  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Initialize session
  const initSession = useCallback(async () => {
    if (!db) return;

    const seed = Date.now();
    const newSessionId = `live-${seed}`;
    setSessionId(newSessionId);

    // Deal cards
    const deck = createShuffledDeck(seed);
    const dealtCards: CardState[] = [];

    // Deal 5 cards per player
    for (let seat = 0; seat < 2; seat++) {
      const hand = deck.draw(5);
      hand.forEach((card, i) => {
        dealtCards.push({
          id: card.id,
          value: card.value,
          suit: card.suit,
          position: {
            x: (seat === 0 ? -1 : 1) * 8,
            y: 0.5 + i * 0.05,
            z: (seat === 0 ? -6 : 6),
          },
          rotation: { x: -Math.PI / 2, y: 0, z: seat === 1 ? Math.PI : 0 },
          isFaceUp: seat === 0,
          owner: seat === 0 ? 'local' : 'remote',
        });
      });
    }

    setCards(dealtCards);
    setIsConnected(true);
    setPeerCount(1);
    addLog('Session created with seed: ' + seed);

    // Setup WebRTC
    if (webRTCRef.current) {
      await webRTCRef.current.initializeSession(newSessionId, 'local-player');
      addLog('WebRTC initialized');

      webRTCRef.current.onMessage((msg: WebRTCMessage) => {
        addLog(`Received: ${msg.type} from ${msg.sender}`);

        if (msg.type === 'COOP_LINK') {
          setCoOpMode(true);
        } else if (msg.type === 'GAME_WIN') {
          setVictoryMode(true);
        }
      });
    }
  }, [db, addLog]);

  // Handle card play
  const handleCardClick = useCallback((cardId: string) => {
    if (!sessionId || !webRTCRef.current) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || card.owner !== 'local') return;

    // Play animation
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          position: { x: 0, y: 0.5, z: 0 },
          isFaceUp: true,
        };
      }
      return c;
    }));

    // Send to peer
    webRTCRef.current.sendMessage(sessionId, 'PLAY_CARD', {
      card: `${card.value} of ${card.suit}`,
      position: { x: 0, y: 0, z: 0 },
    });

    addLog(`Played: ${card.value} of ${card.suit}`);
  }, [cards, sessionId, addLog]);

  // Bet function
  const placeBet = useCallback((amount: number) => {
    if (!sessionId || !webRTCRef.current) return;

    setPotSize(p => p + amount);

    // Add chip with physics
    const chip: ChipState = {
      id: `chip-${Date.now()}`,
      color: amount >= 100 ? '#da70d6' : amount >= 50 ? '#feca57' : '#00f5ff',
      value: amount,
      position: { x: (Math.random() - 0.5) * 4, y: 5, z: (Math.random() - 0.5) * 2 },
      velocity: { x: (Math.random() - 0.5) * 0.3, y: 0, z: (Math.random() - 0.5) * 0.3 },
    };

    setChips(prev => [...prev, chip]);

    webRTCRef.current.sendMessage(sessionId, 'BET', {
      amount,
      newPot: potSize + amount,
    });

    addLog(`Bet: ${amount} chips`);
  }, [sessionId, potSize, addLog]);

  // Co-op link
  const activateCoOp = useCallback(() => {
    if (!sessionId || !webRTCRef.current) return;

    setCoOpMode(true);
    webRTCRef.current.sendMessage(sessionId, 'COOP_LINK', { active: true });
    addLog('Co-op mode activated!');
  }, [sessionId, addLog]);

  // Win game
  const triggerWin = useCallback(() => {
    if (!sessionId || !webRTCRef.current) return;

    setVictoryMode(true);
    webRTCRef.current.sendMessage(sessionId, 'GAME_WIN', { winner: 'local' });
    addLog('Victory!');
  }, [sessionId, addLog]);

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-orchid" />
        </button>

        <div className="flex items-center gap-2 flex-1">
          <Radio className={`w-5 h-5 ${isConnected ? 'text-red-500 animate-pulse' : 'text-white/30'}`} />
          <div>
            <h1 className="text-lg font-bold text-white">High Energy Mode</h1>
            <p className="text-xs text-white/50">6 Spoons • 30-Minute Loop</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-phos" />
                <span className="text-phos">{peerCount} peer</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-white/30" />
                <span className="text-white/30">Offline</span>
              </>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs text-white/50">Pot</p>
            <p className="text-lg font-bold text-gold">{potSize}</p>
          </div>
        </div>
      </header>

      {/* Main 3D Canvas */}
      <main className="flex-1 relative">
        {!sessionId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-orchid/20 flex items-center justify-center mx-auto">
                <Users className="w-10 h-10 text-orchid" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">P2P Multiplayer</h2>
                <p className="text-white/50 mt-2">WebRTC synchronized gameplay</p>
              </div>
              <button
                onClick={initSession}
                className="glass-button px-8 py-4 rounded-xl font-bold text-orchid border-orchid/30
                           flex items-center gap-2 mx-auto hover:shadow-[0_0_30px_rgba(218,112,214,0.3)]"
              >
                <Play className="w-5 h-5" />
                Create Session
              </button>
            </div>
          </div>
        ) : (
          <>
            <CardTable
              cards={cards}
              chips={chips}
              coOpMode={coOpMode}
              victoryMode={victoryMode}
              onCardClick={handleCardClick}
              cameraMode={cameraMode}
            />

            {/* Side Panel */}
            <div className="absolute top-4 left-4 glass-card rounded-xl p-4 w-64 space-y-4">
              {/* Camera Controls */}
              <div>
                <p className="text-xs text-white/50 font-bold mb-2">Camera</p>
                <div className="flex gap-2">
                  {(['default', 'top', 'player'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setCameraMode(mode)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${
                        cameraMode === mode
                          ? 'bg-orchid/20 text-orchid'
                          : 'bg-white/5 text-white/50'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <p className="text-xs text-white/50 font-bold mb-2">Actions</p>
                <div className="space-y-2">
                  <button
                    onClick={() => placeBet(25)}
                    className="w-full glass-button py-2 rounded-lg text-cyan text-sm font-bold"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Bet 25
                  </button>
                  <button
                    onClick={() => placeBet(100)}
                    className="w-full glass-button py-2 rounded-lg text-orchid text-sm font-bold"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Bet 100
                  </button>
                  <button
                    onClick={activateCoOp}
                    disabled={coOpMode}
                    className="w-full glass-button py-2 rounded-lg text-phos text-sm font-bold
                               disabled:opacity-50"
                  >
                    {coOpMode ? 'Co-op Active' : 'Link Co-op'}
                  </button>
                  <button
                    onClick={triggerWin}
                    className="w-full glass-button py-2 rounded-lg text-gold text-sm font-bold"
                  >
                    <Send className="w-4 h-4 inline mr-1" />
                    Declare Win
                  </button>
                </div>
              </div>

              {/* Event Log */}
              <div>
                <p className="text-xs text-white/50 font-bold mb-2">Event Log</p>
                <div className="bg-black/30 rounded-lg p-2 h-32 overflow-y-auto font-mono text-xs space-y-1">
                  {logs.map((log, i) => (
                    <p key={i} className="text-white/70">{log}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Session Info */}
            <div className="absolute top-4 right-4 glass-card rounded-xl p-4 text-right">
              <p className="text-xs text-white/50">Session ID</p>
              <p className="text-sm font-mono text-orchid truncate w-32">
                {sessionId}
              </p>
              <p className="text-xs text-white/30 mt-2">
                {isConnected ? 'WebRTC Connected' : 'Disconnected'}
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="glass-card px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-white/30">
          High Energy • WebRTC P2P • Deterministic Shuffle
        </p>
        <div className="flex items-center gap-4 text-[10px] text-white/20">
          <span>Procedural Cards</span>
          <span>•</span>
          <span>Chip Physics</span>
          <span>•</span>
          <span>Love Economy</span>
        </div>
      </footer>
    </div>
  );
};
