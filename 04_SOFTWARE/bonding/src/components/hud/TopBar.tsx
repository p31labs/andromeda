/**
 * WCD-08 → WCD-25 → WCD-29 → WCD-31: TopBar — Transparent HUD.
 *
 * Left:   Mode emoji + 🤝 multiplayer + mute toggle
 * Center: "BONDING" title
 * Right:  LoveCounter
 *
 * WCD-29: Glassmorphism removed. Text-shadow for legibility.
 * WCD-31: 🤝 multiplayer button restored between mode and mute.
 *         Shows 👥{n} when in an active room.
 */

import { useState } from 'react';
import { useEconomyStore } from '../../genesis/economyStore';
import { isMuted, setMuted } from '../../engine/sound';

// ─── Inline LoveCounter (stripped of absolute positioning) ──────

function LoveCounter() {
  const totalLove = useEconomyStore(s => s.totalLove);
  const currentStreak = useEconomyStore(s => s.currentStreak);
  const hasHydrated = useEconomyStore(s => s._hasHydrated);

  if (!hasHydrated) return <div className="w-20" />;

  return (
    <div className="flex items-center gap-2 font-mono text-lg font-bold text-[#FFD700]">
      <span className="text-xl">💛</span>
      <span>{totalLove % 1 === 0 ? totalLove.toFixed(0) : totalLove.toFixed(1)}</span>
      {currentStreak > 1 && (
        <span className="text-xs opacity-50">🔥{currentStreak}d</span>
      )}
    </div>
  );
}

// ─── TopBar ─────────────────────────────────────────────────────

interface TopBarProps {
  modeEmoji?: string;
  onModeExit?: () => void;
  /** WCD-31: Open multiplayer lobby */
  onLobby?: () => void;
  /** WCD-31: True when in an active multiplayer room */
  isInRoom?: boolean;
  /** WCD-31: Number of players in the room (including self) */
  playerCount?: number;
  title?: string;
}

export function TopBar({ modeEmoji, onModeExit, onLobby, isInRoom, playerCount, title = 'BONDING' }: TopBarProps) {
  const [audioMuted, setAudioMuted] = useState(isMuted());

  return (
    <div className="h-full flex items-center justify-between px-4 gap-3 hud-text pointer-events-auto">
      {/* Left: Mode indicator + multiplayer + mute */}
      <div className="flex items-center gap-1.5">
        {modeEmoji && (
          <button
            onClick={onModeExit}
            className="w-10 h-10 flex items-center justify-center
                       rounded-xl border border-white/[0.08]
                       hover:border-white/[0.15] active:scale-95
                       transition-all duration-150 text-lg"
            aria-label="Change mode"
            title="Tap to change mode"
          >
            {modeEmoji}
          </button>
        )}
        {/* WCD-31: Multiplayer — 🤝 solo, 👥{n} in room */}
        {onLobby && (
          <button
            onClick={onLobby}
            className="w-10 h-10 flex items-center justify-center
                       rounded-xl border border-white/[0.08]
                       hover:border-white/[0.15] active:scale-95
                       transition-all duration-150 text-base"
            aria-label={isInRoom ? 'Room status' : 'Play together'}
            title={isInRoom ? `${playerCount} players` : 'Play Together'}
          >
            {isInRoom ? `\u{1F465}${playerCount ?? ''}` : '\u{1F91D}'}
          </button>
        )}
        {/* Mute toggle */}
        <button
          onClick={() => {
            const next = !audioMuted;
            setAudioMuted(next);
            setMuted(next);
          }}
          className="w-10 h-10 flex items-center justify-center
                     rounded-xl border border-white/[0.08]
                     hover:border-white/[0.15] active:scale-95
                     transition-all duration-150 text-base"
          aria-label={audioMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {audioMuted ? '\u{1F507}' : '\u{1F50A}'}
        </button>
      </div>

      <span className="font-mono text-xs font-medium text-white/30 tracking-[0.15em] uppercase select-none">
        {title}
      </span>

      <LoveCounter />
    </div>
  );
}
