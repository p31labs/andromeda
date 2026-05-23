/**
 * P31 12-Pillar MVP Template - Entity Card Component
 * Version: 1.0.0
 * 
 * Pillar 5: UI Components - Entity card (64×64px touch targets minimum)
 */

import React from 'react';
import { Entity } from '../stores/useChromaticaStore';

export interface EntityCardProps {
  entity: Entity;
  onAction?: (action: string, entity: Entity) => void;
  touchTargetSize?: number;
  fontSize?: number;
  highContrast?: boolean;
  compact?: boolean;
}

/**
 * Entity Card Component
 * 
 * Pillar 5: Entity card component
 * - 64×64px touch targets minimum
 * - Accessible (ARIA labels)
 * - Visual feedback on interaction
 */
export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  onAction,
  touchTargetSize = 64,
  fontSize = 16,
  highContrast = false,
  compact = false,
}) => {
  const handleAction = (action: string) => {
    onAction?.(action, entity);
  };

  const primaryData = entity.data || {};
  const title = String(primaryData.name || primaryData.title || `Item ${entity.id.slice(-6)}`);
  const subtitle = String(primaryData.description || primaryData.type || entity.entity_type || '');
  
  // Get first letter for avatar
  const avatar = title.charAt(0).toUpperCase();
  
  // Color based on context
  const contextColors: Record<string, string> = {
    home: '#5DCAA5',
    business: '#cc6247',
    family: '#6B8DD6',
  };
  const accentColor = contextColors[entity.context] || '#999';

  return (
    <article
      className="p31-entity-card-detailed"
      aria-label={`${title} - ${entity.context}`}
      style={{
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        gap: '12px',
        padding: compact ? '12px' : '16px',
        backgroundColor: highContrast ? '#000' : '#fff',
        border: highContrast ? '3px solid currentColor' : '1px solid #e5e5e5',
        borderRadius: '8px',
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      {/* Avatar Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: `${touchTargetSize}px`,
            height: `${touchTargetSize}px`,
            minWidth: `${touchTargetSize}px`,
            minHeight: `${touchTargetSize}px`,
            backgroundColor: accentColor,
            color: '#fff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${fontSize * 1.25}px`,
            fontWeight: 'bold',
          }}
        >
          {avatar}
        </div>

        {/* Title Section */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: `${fontSize * (compact ? 1 : 1.125)}px`,
              fontWeight: 'bold',
              color: highContrast ? '#fff' : 'var(--p31-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={title}
          >
            {title}
          </h3>
          
          {subtitle && !compact && (
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: `${fontSize * 0.875}px`,
                color: highContrast ? '#fff' : 'var(--p31-text-secondary)',
                lineHeight: 1.4,
              }}
            >
              {subtitle.substring(0, 100)}
              {subtitle.length > 100 ? '...' : ''}
            </p>
          )}
          
          {/* Metadata */}
          <div
            style={{
              marginTop: '8px',
              fontSize: `${fontSize * 0.75}px`,
              color: highContrast ? '#fff' : '#999',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span>{new Date(entity.createdAt).toLocaleDateString()}</span>
            <span aria-label={`Context: ${entity.context}`}>{entity.context}</span>
            {entity.pqcSignature && (
              <span title="PQC Protected" aria-label="PQC Protected">
                🔐
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Section */}
      {onAction && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: compact ? 'flex-end' : 'flex-start',
          }}
        >
          <CardActionButton
            action="view"
            label="View"
            onClick={() => handleAction('view')}
            touchTargetSize={touchTargetSize}
            fontSize={fontSize}
            highContrast={highContrast}
          />
          <CardActionButton
            action="edit"
            label="Edit"
            onClick={() => handleAction('edit')}
            touchTargetSize={touchTargetSize}
            fontSize={fontSize}
            highContrast={highContrast}
          />
          <CardActionButton
            action="share"
            label="Share"
            onClick={() => handleAction('share')}
            touchTargetSize={touchTargetSize}
            fontSize={fontSize}
            highContrast={highContrast}
          />
        </div>
      )}
    </article>
  );
};

// === Card Action Button ===

interface CardActionButtonProps {
  action: string;
  label: string;
  onClick: () => void;
  touchTargetSize: number;
  fontSize: number;
  highContrast: boolean;
}

const CardActionButton: React.FC<CardActionButtonProps> = ({
  action,
  label,
  onClick,
  touchTargetSize,
  fontSize,
  highContrast,
}) => (
  <button
    onClick={onClick}
    aria-label={`${label} item`}
    data-action={action}
    style={{
      minWidth: `${touchTargetSize}px`,
      minHeight: `${touchTargetSize / 1.5}px`,
      padding: '8px 16px',
      fontSize: `${fontSize}px`,
      backgroundColor: highContrast ? '#000' : '#f5f5f5',
      color: highContrast ? '#fff' : '#333',
      border: highContrast ? '3px solid #fff' : '1px solid #ddd',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {label}
  </button>
);

export default EntityCard;
