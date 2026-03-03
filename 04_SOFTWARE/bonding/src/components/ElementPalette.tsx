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
  const genesisComplete = useGameStore((s) => s.questProgress['genesis']?.completed ?? false);
  const kitchenComplete = useGameStore((s) => s.questProgress['kitchen']?.completed ?? false);

  const visibleElements = useMemo(() => {
    if (!gameMode) return ELEMENTS_ARRAY;
    const mode = getModeById(gameMode);
    const modeElements = ELEMENTS_ARRAY.filter((el) => mode.palette.includes(el.symbol));
    // Bashium: appears in Seed palette after Genesis quest chain complete
    if (genesisComplete && gameMode === 'seed' && ELEMENTS['Ba']) {
      modeElements.push(ELEMENTS['Ba']);
    }
    // Willium: appears in Sprout palette after Kitchen quest chain complete
    if (kitchenComplete && gameMode === 'sprout' && ELEMENTS['Wi']) {
      modeElements.push(ELEMENTS['Wi']);
    }
    return modeElements;
  }, [gameMode, genesisComplete, kitchenComplete]);
  const pendingRef = useRef<{
    element: ElementSymbol;
    x: number;
    y: number;
  } | null>(null);
  const activatedRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>();

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
      } else if (pendingRef.current) {
        // Tap (no drag) → show ghost site preview for 3 seconds
        const el = pendingRef.current.element;
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
        useGameStore.getState().setPreviewElement(el);
        previewTimerRef.current = setTimeout(() => {
          useGameStore.getState().setPreviewElement(null);
        }, 3000);
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
    <div className="h-full relative select-none pointer-events-auto">
      <div
        ref={scrollRef}
        className="h-full flex items-center justify-center gap-3 px-4 overflow-x-auto scrollbar-none"
        style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}
      >
        {visibleElements.map((el) => {
          const isDragging = dragging === el.symbol;
          // Size buttons proportional to atom size (clamped 0.25–0.65 → 40–60px)
          const buttonSize = Math.round(40 + ((Math.min(0.65, el.size) - 0.25) / 0.4) * 20);
          return (
            <button
              key={el.symbol}
              type="button"
              onPointerDown={(e) => handlePointerDown(el.symbol, e)}
              className={`group relative flex items-center justify-center rounded-full shrink-0 transition-transform duration-200 active:scale-95 touch-expand ${
                isDragging ? 'opacity-30 scale-90' : 'hover:scale-110'
              }`}
              style={{
                cursor: 'grab',
                touchAction: 'pan-x',
                width: buttonSize,
                height: buttonSize,
                minWidth: buttonSize,
                minHeight: buttonSize,
              }}
            >
              {/* Glass shell — bright Fresnel rim matching canvas atoms */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 30% 30%, transparent 20%, ${el.emissive}40 55%, ${el.emissive}aa 82%, ${el.emissive} 100%)`,
                  border: `1.5px solid ${el.emissive}44`,
                  boxShadow: `0 0 16px ${el.emissive}30, 0 0 4px ${el.emissive}18`,
                }}
              />
              {/* Luminous core — white specular + emissive glow */}
              <div
                className="absolute inset-[12%] rounded-full animate-pulse-core"
                style={{
                  background: `radial-gradient(circle at 38% 35%, rgba(255,255,255,0.5) 0%, ${el.emissive} 25%, ${el.emissive}66 50%, transparent 75%)`,
                  boxShadow: `0 0 14px ${el.emissive}55, inset 0 0 12px ${el.emissive}44`,
                }}
              />
              {/* Symbol */}
              <span className="relative z-[1] text-sm font-bold text-white/90 group-hover:text-white transition-colors"
                style={{ textShadow: `0 1px 4px rgba(0,0,0,0.9), 0 0 8px ${el.emissive}33` }}
              >
                {el.symbol}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
