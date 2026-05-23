/**
 * P31 12-Pillar MVP Template - Entity List Component
 * Version: 1.0.0
 * 
 * Pillar 5: UI Components - Entity list (scrollable, touch-optimized)
 * Standards: 64px touch targets, WCAG 2.1 AAA
 */

import React, { useCallback, useState } from 'react';
import { Entity, useChromaticaStore } from '../stores/useChromaticaStore';

export interface EntityListProps {
  entities: Entity[];
  onSelect?: (entity: Entity) => void;
  onEdit?: (entity: Entity) => void;
  onDelete?: (entity: Entity) => void;
  touchTargetSize?: number;
  fontSize?: number;
  highContrast?: boolean;
}

/**
 * Entity List Component
 * 
 * Pillar 5: Entity list component
 * - Scrollable list
 * - Touch-optimized (48-64px touch targets)
 * - Accessible (ARIA labels, keyboard navigation)
 */
export const EntityList: React.FC<EntityListProps> = ({
  entities,
  onSelect,
  onEdit,
  onDelete,
  touchTargetSize = 48,
  fontSize = 16,
  highContrast = false,
}) => {
  const { deleteEntity, setError } = useChromaticaStore();
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const handleSelect = useCallback((entity: Entity) => {
    onSelect?.(entity);
  }, [onSelect]);

  const handleEdit = useCallback((entity: Entity) => {
    onEdit?.(entity);
  }, [onEdit]);

  const handleDelete = useCallback(async (entity: Entity) => {
    if (confirmingDelete === entity.id) {
      try {
        await deleteEntity(entity.id);
        setConfirmingDelete(null);
      } catch (error) {
        setError(`Failed to delete: ${error}`);
      }
    } else {
      setConfirmingDelete(entity.id);
      // Auto-clear confirmation after 3 seconds
      setTimeout(() => setConfirmingDelete(null), 3000);
    }
  }, [confirmingDelete, deleteEntity, setError]);

  if (entities.length === 0) {
    return (
      <div 
        role="status"
        aria-label="No items"
        style={{
          padding: '24px',
          textAlign: 'center',
          color: highContrast ? '#fff' : '#666',
          fontSize: `${fontSize}px`,
        }}
      >
        No items to display
      </div>
    );
  }

  return (
    <ul
      className="p31-entity-list"
      role="list"
      aria-label={`${entities.length} items`}
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        maxHeight: '60vh',
        overflowY: 'auto',
      }}
    >
      {entities.map((entity, index) => (
        <EntityCard
          key={entity.id}
          entity={entity}
          index={index}
          total={entities.length}
          isConfirmingDelete={confirmingDelete === entity.id}
          touchTargetSize={touchTargetSize}
          fontSize={fontSize}
          highContrast={highContrast}
          onSelect={handleSelect}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </ul>
  );
};

// === Entity Card Subcomponent ===

interface EntityCardProps {
  entity: Entity;
  index: number;
  total: number;
  isConfirmingDelete: boolean;
  touchTargetSize: number;
  fontSize: number;
  highContrast: boolean;
  onSelect: (entity: Entity) => void;
  onEdit: (entity: Entity) => void;
  onDelete: (entity: Entity) => void;
}

const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  index,
  total,
  isConfirmingDelete,
  touchTargetSize,
  fontSize,
  highContrast,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const formattedDate = new Date(entity.createdAt).toLocaleDateString();
  
  // Format entity data preview
  const dataPreview = Object.entries(entity.data || {})
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value).substring(0, 30)}`)
    .join(' • ');

  return (
    <li
      className="p31-entity-card"
      role="listitem"
      aria-posinset={index + 1}
      aria-setsize={total}
      style={{
        padding: '12px',
        marginBottom: '8px',
        backgroundColor: highContrast ? '#000' : '#fff',
        border: highContrast ? '3px solid currentColor' : '1px solid #e5e5e5',
        borderRadius: '8px',
        cursor: onSelect ? 'pointer' : 'default',
      }}
      onClick={() => onSelect(entity)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(entity);
        }
      }}
      tabIndex={0}
    >
      {/* Card Content */}
      <div style={{ marginBottom: '12px' }}>
        <div 
          style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: 'bold',
              color: highContrast ? '#fff' : 'var(--p31-text-primary)',
            }}
          >
            {entity.data?.name || entity.data?.title || `Item ${entity.id.slice(-6)}`}
          </span>
          <span
            style={{
              fontSize: `${fontSize * 0.75}px`,
              color: highContrast ? '#fff' : '#999',
              textTransform: 'uppercase',
            }}
          >
            {entity.context}
          </span>
        </div>
        
        {dataPreview && (
          <p
            style={{
              fontSize: `${fontSize * 0.875}px`,
              color: highContrast ? '#fff' : 'var(--p31-text-secondary)',
              margin: '4px 0',
              lineHeight: 1.4,
            }}
          >
            {dataPreview}
          </p>
        )}
        
        <span
          style={{
            fontSize: `${fontSize * 0.75}px`,
            color: highContrast ? '#fff' : '#999',
          }}
        >
          Created: {formattedDate}
        </span>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end',
        }}
      >
        {onEdit && (
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entity);
            }}
            label="Edit"
            touchTargetSize={touchTargetSize}
            fontSize={fontSize}
            highContrast={highContrast}
            variant="secondary"
          />
        )}
        
        {onDelete && (
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entity);
            }}
            label={isConfirmingDelete ? 'Confirm?' : 'Delete'}
            touchTargetSize={touchTargetSize}
            fontSize={fontSize}
            highContrast={highContrast}
            variant={isConfirmingDelete ? 'danger' : 'secondary'}
            ariaLabel={isConfirmingDelete ? 'Confirm delete' : 'Delete item'}
          />
        )}
      </div>
    </li>
  );
};

// === Action Button Subcomponent ===

interface ActionButtonProps {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  touchTargetSize: number;
  fontSize: number;
  highContrast: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  ariaLabel?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  label,
  touchTargetSize,
  fontSize,
  highContrast,
  variant = 'secondary',
  ariaLabel,
}) => {
  const colors = {
    primary: {
      bg: highContrast ? '#fff' : '#5DCAA5',
      text: highContrast ? '#000' : '#fff',
      border: highContrast ? '3px solid #fff' : 'none',
    },
    secondary: {
      bg: highContrast ? '#000' : '#f5f5f5',
      text: highContrast ? '#fff' : '#333',
      border: highContrast ? '3px solid #fff' : '1px solid #ddd',
    },
    danger: {
      bg: highContrast ? '#ff6b6b' : '#dc2626',
      text: '#fff',
      border: highContrast ? '3px solid #ff6b6b' : 'none',
    },
  };

  const style = colors[variant];

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel || label}
      style={{
        minWidth: `${touchTargetSize}px`,
        minHeight: `${touchTargetSize}px`,
        padding: '8px 16px',
        fontSize: `${fontSize}px`,
        backgroundColor: style.bg,
        color: style.text,
        border: style.border,
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
};

export default EntityList;
