/**
 * P31 12-Pillar MVP Template - Context Toggle Component
 * Version: 1.0.0
 * 
 * Pillar 5: UI Components - Mode/context toggle
 */

import React from 'react';
import { useChromaticaStore, Entity } from '../stores/useChromaticaStore';

export interface ContextToggleProps {
  touchTargetSize?: number;
  fontSize?: number;
  highContrast?: boolean;
}

/**
 * Context Toggle Component
 * 
 * Pillar 5: Mode/context toggle component
 * - Toggle between Home, Business, Family contexts
 * - Visual feedback for current context
 * - Accessible controls
 */
export const ContextToggle: React.FC<ContextToggleProps> = ({
  touchTargetSize = 48,
  fontSize = 16,
  highContrast = false,
}) => {
  const { context, setContext, entities } = useChromaticaStore();

  const contexts: { id: Entity['context']; label: string; color: string; icon: string }[] = [
    { id: 'home', label: 'Home', color: '#5DCAA5', icon: '🏠' },
    { id: 'business', label: 'Business', color: '#cc6247', icon: '💼' },
    { id: 'family', label: 'Family', color: '#6B8DD6', icon: '👨‍👩‍👧‍👦' },
  ];

  // Count entities per context
  const countByContext = contexts.map(ctx => ({
    ...ctx,
    count: entities.filter(e => e.context === ctx.id).length,
  }));

  return (
    <div
      className="p31-context-toggle"
      role="radiogroup"
      aria-label="Select context"
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      {countByContext.map((ctx) => {
        const isActive = context === ctx.id;
        
        return (
          <button
            key={ctx.id}
            role="radio"
            aria-checked={isActive}
            onClick={() => setContext(ctx.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: `${touchTargetSize}px`,
              padding: '8px 16px',
              fontSize: `${fontSize}px`,
              backgroundColor: isActive
                ? (highContrast ? '#fff' : ctx.color)
                : (highContrast ? '#000' : '#f5f5f5'),
              color: isActive
                ? (highContrast ? '#000' : '#fff')
                : (highContrast ? '#fff' : '#333'),
              border: highContrast
                ? (isActive ? '3px solid #fff' : '3px solid #666')
                : (isActive ? 'none' : '1px solid #ddd'),
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: isActive ? 'bold' : 'normal',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: `${fontSize * 1.25}px` }}>
              {ctx.icon}
            </span>
            <span>{ctx.label}</span>
            {ctx.count > 0 && (
              <span
                aria-label={`${ctx.count} items`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 6px',
                  fontSize: `${fontSize * 0.75}px`,
                  backgroundColor: isActive
                    ? 'rgba(255,255,255,0.3)'
                    : (highContrast ? '#666' : '#ddd'),
                  borderRadius: '10px',
                }}
              >
                {ctx.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ContextToggle;
