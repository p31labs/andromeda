// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// App: root component
//
// Layers (back to front):
//   0. ModeSelect / Lobby (full screen routing)
//   1. MoleculeCanvas (3D scene, full viewport)
//   2. ElementPalette (bottom, draggable elements)
//   3. StabilityMeter (top-right, formula + bar)
//   4. LoveCounter (top-center, LOVE token total)
//   5. AchievementToast (top-right, slide-in notifications)
//   6. Mode emoji (top-left, tap to return to mode select)
//   7. QuestHUD (top-left, below mode emoji)
//   8. Hint text (center, when no atoms)
//   9. MoleculeCount (bottom-center, above palette)
//  10. RoomSidebar (right, multiplayer only)
//  11. Completion overlay (modal + Exhibit A export)
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import { MoleculeCanvas } from './components/MoleculeCanvas';
import { ElementPalette } from './components/ElementPalette';
import { StabilityMeter } from './components/StabilityMeter';
import { AchievementToast } from './components/AchievementToast';
import { LoveCounter } from './components/LoveCounter';
import { ModeSelect } from './components/ModeSelect';
import { Lobby } from './components/Lobby';
import { RoomSidebar } from './components/RoomSidebar';
import { QuestHUD } from './components/QuestHUD';
import { DiscoveryModal } from './components/DiscoveryModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { FormulaDisplay } from './components/FormulaDisplay';
import { PingBar } from './components/PingBar';
import { useGameStore } from './store/gameStore';
import { generateFormula, displayFormula, MOLECULE_NAMES } from './engine/chemistry';
import { getPersonality } from './engine/personalities';
import type { PersonalityType } from './engine/personalities';
import { getModeById } from './data/modes';
import { useMultiplayer } from './hooks/useMultiplayer';
import { exportAsSummary } from './engine/exhibitA';
import { isHapticEnabled, setHapticEnabled } from './engine/haptic';

function App() {
  const atoms = useGameStore((s) => s.atoms);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const gameMode = useGameStore((s) => s.gameMode);
  const completedMolecules = useGameStore((s) => s.completedMolecules);
  const unlockedAchievements = useGameStore((s) => s.unlockedAchievements);
  const loveTotal = useGameStore((s) => s.loveTotal);
  const reset = useGameStore((s) => s.reset);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const lobbyActive = useGameStore((s) => s.lobbyActive);
  const roomCode = useGameStore((s) => s.roomCode);
  const leaveMultiplayer = useGameStore((s) => s.leaveMultiplayer);
  const breathing = useGameStore((s) => s.breathing);
  const toggleBreathing = useGameStore((s) => s.toggleBreathing);
  const pendingDiscovery = useGameStore((s) => s.pendingDiscovery);
  const fireTutorialEvent = useGameStore((s) => s.fireTutorialEvent);
  const showMoleculeFact = useGameStore((s) => s.showMoleculeFact);
  const continueBuilding = useGameStore((s) => s.continueBuilding);
  const pingNotification = useGameStore((s) => s.pingNotification);

  const [exportCopied, setExportCopied] = useState(false);
  const [hapticOn, setHapticOn] = useState(isHapticEnabled());

  const PERSONALITY_EMOJI: Record<PersonalityType, string> = {
    mediator: '\u{1F30A}',
    rock: '\u{1FAA8}',
    loner: '\u{1F43A}',
    fuel: '\u{1F525}',
    messenger: '\u{1F4A8}',
    builder: '\u{1F9B4}',
    oracle: '\u{1F52E}',
  };

  // Multiplayer polling + auto-push (no-ops when not in a room)
  useMultiplayer();

  // Layer 0a: Lobby (multiplayer create/join)
  if (lobbyActive) return <Lobby />;

  // Layer 0b: Mode selection
  if (!gameMode) return <ModeSelect />;

  const mode = getModeById(gameMode);
  const isMultiplayer = roomCode !== null;
  const formula = generateFormula(atoms);
  const dispFormula = displayFormula(formula);
  const moleculeName = MOLECULE_NAMES[formula] ?? dispFormula;

  // Compute personality for completed molecules
  const personality = gamePhase === 'complete' && atoms.length > 0
    ? (() => {
        const counts: Record<string, number> = {};
        for (const a of atoms) {
          counts[a.element] = (counts[a.element] ?? 0) + 1;
        }
        return getPersonality(formula, counts);
      })()
    : null;

  const handleModeExit = () => {
    if (isMultiplayer) {
      leaveMultiplayer();
    } else {
      setGameMode(null);
    }
  };

  const handleExportClipboard = async () => {
    const summary = exportAsSummary();
    try {
      await navigator.clipboard.writeText(summary);
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    } catch {
      handleExportDownload();
    }
  };

  const handleExportDownload = () => {
    const summary = exportAsSummary();
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bonding-exhibit-a-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-screen bg-[#0a0a1a] overflow-hidden">
      {/* Layer 1: 3D Scene */}
      <MoleculeCanvas />

      {/* Layer 2: Element palette */}
      <ElementPalette />

      {/* Layer 3: Stability meter */}
      <StabilityMeter />

      {/* Layer 4: LOVE counter */}
      <LoveCounter />

      {/* Layer 5: Achievement toasts */}
      <AchievementToast />

      {/* Layer 6: Mode emoji — tap to return to mode select */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <button
          type="button"
          onClick={handleModeExit}
          className="text-2xl opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          style={{ minWidth: 48, minHeight: 48, touchAction: 'manipulation' }}
          title={`${mode.label} mode — tap to change`}
        >
          {mode.emoji}
        </button>
        <button
          type="button"
          onClick={toggleBreathing}
          className={`text-lg transition-opacity cursor-pointer ${breathing ? 'opacity-80' : 'opacity-30 hover:opacity-50'}`}
          style={{ minWidth: 40, minHeight: 48, touchAction: 'manipulation' }}
          title={breathing ? 'Stop breathing pacer' : 'Start breathing pacer (4-4-6)'}
        >
          {'\u{1FAC1}'}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !hapticOn;
            setHapticOn(next);
            setHapticEnabled(next);
          }}
          className={`text-lg transition-opacity cursor-pointer ${hapticOn ? 'opacity-80' : 'opacity-30 hover:opacity-50'}`}
          style={{ minWidth: 40, minHeight: 48, touchAction: 'manipulation' }}
          title={hapticOn ? 'Haptics on — tap to disable' : 'Haptics off — tap to enable'}
        >
          {'\u{1F4F3}'}
        </button>
      </div>

      {/* Layer 7: Quest HUD */}
      <QuestHUD />

      {/* Layer 8: Hint text */}
      {atoms.length === 0 && gamePhase !== 'complete' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
          <p className="text-white/25 text-sm font-mono">
            Drag an element up to begin
          </p>
        </div>
      )}

      {/* Layer 9: Molecule count (WCD-46: visible at arm's length) */}
      {completedMolecules.length > 0 && gamePhase !== 'complete' && (
        <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10 text-base text-white/60 font-mono">
            {'\u{1F9EA}'} {completedMolecules.length} molecule{completedMolecules.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Layer 10: Room sidebar (multiplayer only) */}
      {isMultiplayer && <RoomSidebar />}

      {/* Layer 10b: Ping bar (WCD-49: multiplayer reaction buttons) */}
      {isMultiplayer && <PingBar />}

      {/* Layer 10c: Ping notification (WCD-49: large centered overlay) */}
      {pingNotification && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="ping-enter bg-black/50 backdrop-blur-sm px-8 py-6 rounded-3xl border border-white/10 text-center">
            <p className="text-6xl mb-2">{pingNotification.emoji}</p>
            <p className="text-sm text-white/50 font-mono">{pingNotification.senderName}</p>
          </div>
        </div>
      )}

      {/* Layer 11: Tutorial overlay */}
      <TutorialOverlay />

      {/* Layer 12a: Discovery naming modal */}
      {gamePhase === 'complete' && pendingDiscovery && (
        <DiscoveryModal />
      )}

      {/* Layer 11b: Completion overlay */}
      {gamePhase === 'complete' && !pendingDiscovery && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="complete-enter bg-black/60 backdrop-blur-md p-10 rounded-3xl border border-white/15 text-center max-w-[420px]">
            {/* Formula (WCD-50: HTML <sub> for universal rendering) */}
            <p className="text-5xl font-black text-white mb-2">
              <FormulaDisplay formula={dispFormula} />
            </p>
            <p className="text-2xl text-white/70 mb-1">
              {moleculeName !== dispFormula ? moleculeName : 'Complete!'}
            </p>
            {moleculeName !== dispFormula && (
              <p className="text-sm text-green mb-2">Complete!</p>
            )}

            {/* Personality */}
            {personality && (
              <div className="mb-4">
                <p className="text-lg mb-0.5">
                  {PERSONALITY_EMOJI[personality.type]} {personality.name}
                </p>
                <p className="text-xs text-white/30 italic">
                  {personality.description}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 mb-6 text-xs text-white/30">
              <span>{atoms.length} atoms</span>
              <span>{'\u00B7'}</span>
              <span className="text-amber-400 font-semibold">
                {'\u2665'} {loveTotal} L.O.V.E.
              </span>
              {unlockedAchievements.length > 0 && (
                <>
                  <span>{'\u00B7'}</span>
                  <span>
                    {unlockedAchievements.length} achievement
                    {unlockedAchievements.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  fireTutorialEvent({ type: 'button_tapped', button: 'build_another' });
                  const completedFormula = formula;
                  reset();
                  showMoleculeFact(completedFormula);
                }}
                className="px-7 py-3 bg-green hover:bg-green/90 text-void rounded-xl transition-all cursor-pointer text-sm font-semibold min-h-12"
              >
                Build Another
              </button>

              {/* WCD-48: Keep Building — dismiss overlay, continue placing */}
              <button
                type="button"
                onClick={() => {
                  fireTutorialEvent({ type: 'button_tapped', button: 'keep_building' });
                  continueBuilding();
                }}
                className="px-5 py-3 bg-white/10 hover:bg-white/15 text-white/70 rounded-xl transition-all cursor-pointer text-sm min-h-12"
              >
                Keep Building
              </button>

              {/* Exhibit A export */}
              <button
                type="button"
                onClick={handleExportClipboard}
                className="px-4 py-3 bg-transparent hover:bg-white/5 text-white/40 hover:text-white/60 rounded-xl transition-all cursor-pointer border border-white/15 text-xs min-h-12"
                title="Copy engagement log to clipboard"
              >
                {exportCopied ? 'Copied!' : 'Exhibit A'}
              </button>
            </div>

            {/* Download fallback */}
            <button
              type="button"
              onClick={handleExportDownload}
              className="mt-3 text-[10px] text-white/15 hover:text-white/30 transition-colors cursor-pointer"
            >
              Download .txt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
