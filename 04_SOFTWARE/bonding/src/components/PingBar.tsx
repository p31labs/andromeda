// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// PingBar: persistent reaction buttons for multiplayer
//
// WCD-49: Always visible when in a multiplayer room.
// Sends pings to ALL remote players. Flashes green on
// send with "Sent!" feedback. Shows waiting state when
// no other players are in the room.
// ═══════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { sendPing } from '../lib/gameSync';
import { logEventA } from '../engine/exhibitA';
import { eventBus, GameEventType } from '../genesis/eventBus';
import { generateFormula } from '../engine/chemistry';

const REACTIONS = ['\u{1F49A}', '\u{1F914}', '\u{1F602}', '\u{1F53A}']; // 💚 🤔 😂 🔺

export function PingBar() {
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const roomCode = useGameStore((s) => s.roomCode);
  const playerName = useGameStore((s) => s.playerName);
  const atoms = useGameStore((s) => s.atoms);
  const [sentFlash, setSentFlash] = useState<string | null>(null);

  const handlePing = useCallback(async (reaction: string) => {
    if (remotePlayers.length === 0) return;

    for (const player of remotePlayers) {
      await sendPing(player.id, reaction);
      logEventA({
        type: 'ping_sent',
        from: playerName || 'Player',
        to: player.name,
        reaction,
      });
      // Genesis: PING_SENT
      eventBus.emit(GameEventType.PING_SENT, {
        reaction,
        targetPlayerId: player.id,
        moleculeId: generateFormula(atoms),
      });
    }

    setSentFlash(reaction);
    setTimeout(() => setSentFlash(null), 800);
  }, [remotePlayers, playerName]);

  if (!roomCode) return null;

  return (
    <div className="absolute bottom-[88px] right-6 flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-2 rounded-2xl border border-white/10 z-10">
      {remotePlayers.length === 0 ? (
        <span className="text-[11px] text-white/30 px-2 py-2">Waiting for player...</span>
      ) : (
        REACTIONS.map((reaction) => (
          <button
            key={reaction}
            type="button"
            onClick={() => void handlePing(reaction)}
            className={`relative flex items-center justify-center rounded-xl text-lg transition-all cursor-pointer touch-expand ${
              sentFlash === reaction
                ? 'bg-emerald-500/30 scale-110'
                : 'bg-white/5 hover:bg-white/10 active:scale-95'
            }`}
            style={{ width: 48, height: 48, minWidth: 48, minHeight: 48, touchAction: 'manipulation' }}
          >
            {reaction}
            {sentFlash === reaction && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-emerald-400 font-semibold whitespace-nowrap">
                Sent!
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
}
