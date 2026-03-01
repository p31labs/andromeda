// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// ElementPalette: bottom tray of draggable elements
//
// Drag activation requires 20px threshold (prevents
// accidental drags on tap). Pointer events are captured
// at the window level to support drag-outside-element.
// ═══════════════════════════════════════════════════════

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { ELEMENTS_ARRAY, ELEMENTS } from '../data/elements';
import { useGameStore } from '../store/gameStore';
import { getModeById } from '../data/modes';
import { playSelectBlip } from '../engine/sound';
import type { ElementSymbol } from '../types';

const DRAG_THRESHOLD = 20;
const DEAD_ZONE = 40;

function isInDeadZone(x: number, y: number): boolean {
  return (
    x < DEAD_ZONE ||
    y < DEAD_ZONE ||
    x > window.innerWidth - DEAD_ZONE ||
    y > window.innerHeight - DEAD_ZONE
  );
}

export function ElementPalette() {
  const dragging = useGameStore((s) => s.dragging);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const gameMode = useGameStore((s) => s.gameMode);

  const visibleElements = useMemo(() => {
    if (!gameMode) return ELEMENTS_ARRAY;
    const mode = getModeById(gameMode);
    return ELEMENTS_ARRAY.filter((el) => mode.palette.includes(el.symbol));
  }, [gameMode]);
  const pendingRef = useRef<{
    element: ElementSymbol;
    x: number;
    y: number;
  } | null>(null);
  const activatedRef = useRef(false);

  const handlePointerDown = useCallback(
    (element: ElementSymbol, e: React.PointerEvent) => {
      e.preventDefault();
      // Dead zone: ignore drags starting near screen edges
      if (isInDeadZone(e.clientX, e.clientY)) return;
      pendingRef.current = { element, x: e.clientX, y: e.clientY };
      activatedRef.current = false;
      playSelectBlip(ELEMENTS[element].frequency);
    },
    [],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending) return;

      if (!activatedRef.current) {
        const dx = e.clientX - pending.x;
        const dy = e.clientY - pending.y;
        if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
          activatedRef.current = true;
          useGameStore.getState().startDrag(pending.element);
        }
      }

      if (activatedRef.current) {
        useGameStore.getState().updateDragPointer(e.clientX, e.clientY);
      }
    };

    const onUp = () => {
      if (activatedRef.current) {
        useGameStore.getState().endDrag();
      }
      pendingRef.current = null;
      activatedRef.current = false;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  if (gamePhase === 'complete') return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-md p-3 rounded-2xl border border-white/10 select-none touch-none">
      {visibleElements.map((el) => {
        const isDragging = dragging === el.symbol;
        return (
          <button
            key={el.symbol}
            type="button"
            onPointerDown={(e) => handlePointerDown(el.symbol, e)}
            className={`group relative flex items-center justify-center rounded-full transition-all active:scale-95 touch-expand ${
              isDragging ? 'opacity-30 scale-90' : 'hover:scale-110'
            }`}
            style={{
              cursor: 'grab',
              touchAction: 'none',
              width: 56,
              height: 56,
              minWidth: 56,
              minHeight: 56,
              backgroundColor: `${el.color}33`,
              border: `1px solid ${el.color}`,
              boxShadow: `0 0 12px ${el.emissive}33`,
            }}
          >
            <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
              {el.symbol}
            </span>
          </button>
        );
      })}
    </div>
  );
}
