// D3.5: Cartridge Drawer — horizontal swipe UI with physics-based scrolling
// Max 9 cartridge slots (Calcium Slots), swipeable like physical media console.

import { useRef, useState, useCallback, useEffect } from 'react';
import { useJitterbugCompiler } from '../../../hooks/useJitterbugCompiler';
import type { CartridgeRecord } from '../../../services/cartridgeStore';

interface CartridgeDrawerProps {
  visible: boolean;
  onClose: () => void;
  onLoadCartridge?: (cartridge: CartridgeRecord) => void;
}

const MAX_SLOTS = 9;

export function CartridgeDrawer({ visible, onClose, onLoadCartridge }: CartridgeDrawerProps) {
  const { cartridges, status, refreshCartridges } = useJitterbugCompiler();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Physics-based swipe state
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    scrollStart: 0,
    velocity: 0,
    lastX: 0,
    lastTime: 0,
    animFrame: 0,
  });

  // Refresh on mount
  useEffect(() => {
    if (visible) refreshCartridges();
  }, [visible, refreshCartridges]);

  // Physics momentum decay
  const applyMomentum = useCallback(() => {
    const el = scrollRef.current;
    const ds = dragState.current;
    if (!el || ds.isDragging) return;

    if (Math.abs(ds.velocity) > 0.5) {
      el.scrollLeft += ds.velocity;
      ds.velocity *= 0.92; // friction
      ds.animFrame = requestAnimationFrame(applyMomentum);
    } else {
      ds.velocity = 0;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    cancelAnimationFrame(dragState.current.animFrame);
    const ds = dragState.current;
    ds.isDragging = true;
    ds.startX = e.clientX;
    ds.scrollStart = el.scrollLeft;
    ds.velocity = 0;
    ds.lastX = e.clientX;
    ds.lastTime = performance.now();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current;
    const el = scrollRef.current;
    if (!ds.isDragging || !el) return;

    const dx = ds.startX - e.clientX;
    el.scrollLeft = ds.scrollStart + dx;

    const now = performance.now();
    const dt = Math.max(1, now - ds.lastTime);
    ds.velocity = (ds.lastX - e.clientX) / dt * 16; // normalize to ~60fps
    ds.lastX = e.clientX;
    ds.lastTime = now;
  }, []);

  const handlePointerUp = useCallback(() => {
    dragState.current.isDragging = false;
    dragState.current.animFrame = requestAnimationFrame(applyMomentum);
  }, [applyMomentum]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(dragState.current.animFrame);
  }, []);

  if (!visible) return null;

  // Pad to MAX_SLOTS with empty slots
  const slots: (CartridgeRecord | null)[] = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    slots.push(cartridges[i] ?? null);
  }

  return (
    <div
      role="complementary"
      aria-label="Cartridge drive"
      style={{
        position: 'absolute', bottom: 60, left: 0, right: 0, zIndex: 42,
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 16px',
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,255,255,0.2)',
      }}>
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            color: 'var(--cyan)', fontFamily: 'monospace', fontSize: 12,
            letterSpacing: '0.1em', fontWeight: 600,
          }}
        >
          CARTRIDGE DRIVE [{cartridges.length}/{MAX_SLOTS}]
        </span>
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: 10,
          }}
        >
          {status === 'ready' ? 'BABEL READY' : status.toUpperCase()}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cartridge drive"
          style={{
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: 14, padding: '4px 8px',
            minWidth: 44, minHeight: 44, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* Scrollable drawer — role="list" with keyboard arrow-key navigation */}
      <div
        ref={scrollRef}
        role="list"
        aria-label="Cartridge slots"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(e) => {
          // Allow left/right arrow keys to scroll the slot list
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollRef.current?.scrollBy({ left: 136, behavior: 'smooth' });
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollRef.current?.scrollBy({ left: -136, behavior: 'smooth' });
          }
        }}
        style={{
          display: 'flex', gap: 8, padding: '10px 16px',
          overflowX: 'auto', overflowY: 'hidden',
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
          scrollbarWidth: 'none',
          cursor: 'grab',
          touchAction: 'pan-x',
          borderBottom: '1px solid rgba(0,255,255,0.1)',
        }}
      >
        {slots.map((cart, i) => (
          <div key={cart?.id ?? `empty-${i}`} role="listitem">
            <CartridgeSlot
              index={i}
              cartridge={cart}
              onLoad={onLoadCartridge}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CartridgeSlot({
  index,
  cartridge,
  onLoad,
}: {
  index: number;
  cartridge: CartridgeRecord | null;
  onLoad?: (c: CartridgeRecord) => void;
}) {
  const [hovered, setHovered] = useState(false);

  if (!cartridge) {
    return (
      <div
        aria-label={`Slot ${index + 1} — empty`}
        style={{
          flex: '0 0 120px', height: 80,
          border: '1px dashed rgba(255,255,255,0.12)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 4,
          color: 'rgba(255,255,255,0.15)',
          fontFamily: 'monospace', fontSize: 10,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 16, opacity: 0.3 }}>+</span>
        <span>SLOT {index + 1}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onLoad?.(cartridge)}
      aria-label={`Load cartridge: ${cartridge.name}, slot ${index + 1}`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        flex: '0 0 120px', height: 80,
        border: `1px solid ${hovered ? 'rgba(0,255,255,0.5)' : 'rgba(0,255,255,0.2)'}`,
        borderRadius: 8,
        background: hovered ? 'rgba(0,255,255,0.08)' : 'rgba(0,255,255,0.03)',
        display: 'flex', flexDirection: 'column',
        padding: '8px 10px', gap: 2,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <span style={{
        color: 'var(--cyan)', fontFamily: 'monospace', fontSize: 11,
        fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden',
        textOverflow: 'ellipsis', maxWidth: '100%',
      }}>
        {cartridge.name}
      </span>
      <span style={{
        color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: 9,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {cartridge.intent.slice(0, 30)}
      </span>
      <span style={{
        color: 'rgba(0,255,255,0.4)', fontFamily: 'monospace', fontSize: 8,
        marginTop: 'auto',
      }}>
        SLOT {(cartridge.slot ?? index) + 1}
      </span>
    </button>
  );
}
