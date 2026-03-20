// D4.2: Fractal Depth Rendering — CSS overlay for Sierpinski topology
// Renders PosnerNodes as positioned elements over the 3D canvas.
// Uses AABB frustum culling (D4.4/D4.8) to prevent DOM thrashing.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSovereignStore } from '../../../sovereign/useSovereignStore';
import {
  buildPosnerTopology,
  computeRevealState,
  nodeToAABB,
  isAABBVisible,
  type PosnerNode,
} from '../../../sovereign/sierpinskiTopology';
import type { SovereignRoom } from '../../../sovereign/types';

interface SierpinskiOverlayProps {
  visible: boolean;
}

export function SierpinskiOverlay({ visible }: SierpinskiOverlayProps) {
  const sierpinskiDepth = useSovereignStore(s => s.sierpinskiDepth);
  const spoons = useSovereignStore(s => s.spoons);
  const maxSpoons = useSovereignStore(s => s.maxSpoons);
  const interactedSlots = useSovereignStore(s => s.interactedSlots);
  const setOverlay = useSovereignStore(s => s.setOverlay);
  const markSlotInteracted = useSovereignStore(s => s.markSlotInteracted);

  // Build topology once per depth change
  const rawNodes = useMemo(() => buildPosnerTopology(sierpinskiDepth), [sierpinskiDepth]);

  // Compute reveal state reactively
  const nodes = useMemo(() => {
    const spoonRatio = maxSpoons > 0 ? spoons / maxSpoons : 1;
    const interactedSet = new Set(interactedSlots);
    // Quest count approximation: interacted slots count as engagement
    const questsCompleted = interactedSlots.length;
    return computeRevealState(rawNodes, spoonRatio, questsCompleted, interactedSet);
  }, [rawNodes, spoons, maxSpoons, interactedSlots]);

  // Viewport dimensions for AABB culling
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handler = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Filter to visible + revealed nodes (D4.4: AABB culling)
  const visibleNodes = useMemo(() => {
    return nodes.filter(n => {
      if (!n.revealed) return false;
      const aabb = nodeToAABB(n, viewport.w, viewport.h);
      return isAABBVisible(aabb, viewport.w, viewport.h);
    });
  }, [nodes, viewport]);

  const handleNodeClick = useCallback((node: PosnerNode) => {
    if (node.slot > 0 && node.slot <= 9) {
      markSlotInteracted(node.slot);
      if (node.roomId) {
        setOverlay(node.roomId as SovereignRoom);
      }
    }
  }, [markSlotInteracted, setOverlay]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25,
    }}>
      {visibleNodes.map(node => {
        const aabb = nodeToAABB(node, viewport.w, viewport.h);
        const cx = (aabb.minX + aabb.maxX) / 2;
        const cy = (aabb.minY + aabb.maxY) / 2;
        const size = Math.max(12, (aabb.maxX - aabb.minX));
        const isHub = node.slot === 0;
        const isDepth0 = node.depth === 0;
        // Clamp brightness to dim constant — always visible, never bright
        const b = 0.25;

        return (
          <div
            key={node.id}
            role={isDepth0 ? 'button' : undefined}
            tabIndex={isDepth0 ? 0 : undefined}
            aria-label={isDepth0 ? node.label : undefined}
            onClick={() => handleNodeClick(node)}
            onKeyDown={isDepth0 ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNodeClick(node); } } : undefined}
            style={{
              position: 'absolute',
              left: cx - size / 2,
              top: cy - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              border: `1px solid rgba(0,255,255,${0.1 + b * 0.4})`,
              background: isHub
                ? `rgba(0,255,255,${0.05 + b * 0.15})`
                : `rgba(0,255,255,${0.02 + b * 0.08})`,
              boxShadow: 'none',
              pointerEvents: isDepth0 ? 'auto' : 'none',
              cursor: isDepth0 ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.5s, box-shadow 0.5s',
              opacity: b,
            }}
          >
            {isDepth0 && size >= 30 && (
              <span style={{
                color: `rgba(0,255,255,${0.3 + b * 0.5})`,
                fontFamily: 'monospace',
                fontSize: Math.max(8, size * 0.2),
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: size - 8,
                userSelect: 'none',
              }}>
                {node.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
