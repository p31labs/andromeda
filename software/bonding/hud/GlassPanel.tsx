/**
 * WCD-08 Phase A: GlassPanel — Base glassmorphism material component.
<<<<<<< HEAD
 * 
 * Every HUD panel in The Cockpit uses this as its container.
 * Material: bg-black/40, backdrop-blur-[12px], border-white/[0.08], rounded-2xl.
 * 
=======
 *
 * Every HUD panel in The Cockpit uses this as its container.
 * Material: bg-black/40, backdrop-blur-[12px], border-white/[0.08], rounded-2xl.
 *
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
 * pointer-events default: auto (interactive). Set interactive={false}
 * for display-only panels that should pass clicks to the canvas below.
 */

import { type ReactNode, type CSSProperties } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** If false, panel passes pointer events to layers below. Default: true. */
  interactive?: boolean;
}

export function GlassPanel({
  children,
  className = '',
  style,
  interactive = true,
}: GlassPanelProps) {
  return (
    <div
      className={`
        bg-black/40
        backdrop-blur-[12px]
        border border-white/[0.08]
        rounded-2xl
        ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}
        ${className}
      `.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
