// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// ElementPalette: bottom tray of draggable elements
//
// Drag activation requires 20px threshold (prevents
// accidental drags on tap). Pointer events are captured
// at the window level to support drag-outside-element.
// ═══════════════════════════════════════════════════════

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { ELEMENTS_ARRAY, ELEMENTS } from '../data/elements';
import { useGameStore } from '../store/gameStore';
import { getModeById } from '../data/modes';
import { playSelectBlip } from '../engine/sound';
import type { ElementSymbol } from '../types';

const DRAG_THRESHOLD = 20;
const DEAD_ZONE = 40;
const SCROLL_EDGE_PX = 4; // threshold for fade affordance

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

  // WCD-24: Scroll affordance state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > SCROLL_EDGE_PX);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - SCROLL_EDGE_PX);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState, visibleElements]);

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
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= DRAG_THRESHOLD) {
          // WCD-24: Only activate drag if movement is primarily vertical.
          // Horizontal movement → palette scroll (handled natively).
          if (Math.abs(dy) > Math.abs(dx)) {
            activatedRef.current = true;
            useGameStore.getState().startDrag(pending.element);
          } else {
            // Horizontal swipe — cancel pending drag, let scroll happen
            pendingRef.current = null;
          }
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

    // WCD-14: blur cancels drag if window loses focus (tab switch, alt-tab)
    const onBlur = () => onUp();
    const onVisChange = () => { if (document.hidden) onUp(); };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, []);

  if (gamePhase === 'complete') return null;

  return (
    <div className="h-full relative bg-black/30 backdrop-blur-[8px] rounded-2xl border border-white/5 select-none pointer-events-auto">
      {/* WCD-24: Left fade — only when scrolled right */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 z-[2] pointer-events-none rounded-l-2xl"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)' }} />
      )}
      {/* WCD-24: Right fade — only when more content to the right */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 z-[2] pointer-events-none rounded-r-2xl"
          style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.7), transparent)' }} />
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="h-full flex items-center justify-center gap-3 px-4 overflow-x-auto scrollbar-none"
        style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}
      >
        {visibleElements.map((el) => {
          const isDragging = dragging === el.symbol;
          return (
            <button
              key={el.symbol}
              type="button"
              onPointerDown={(e) => handlePointerDown(el.symbol, e)}
              className={`group relative flex items-center justify-center rounded-full shrink-0 transition-all active:scale-95 touch-expand ${
                isDragging ? 'opacity-30 scale-90' : 'hover:scale-110'
              }`}
              style={{
                cursor: 'grab',
                touchAction: 'pan-x',
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
    </div>
  );
}
