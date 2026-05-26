import { Check, Trash2, Move, Package } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

interface BatchActionsProps {
  onDelete?: () => void;
  onMove?: () => void;
  onMarkReceived?: () => void;
  onMarkSold?: () => void;
}

export function BatchActions({
  onDelete,
  onMove,
  onMarkReceived,
  onMarkSold,
}: BatchActionsProps) {
  const { selectedItems, clearSelection, isBatchMode, setBatchMode } = useAppStore();

  if (!isBatchMode || selectedItems.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.count}>{selectedItems.length} selected</span>
        <button onClick={() => { clearSelection(); setBatchMode(false); }} style={styles.doneButton}>
          Done
        </button>
      </div>

      <div style={styles.actions}>
        <ActionButton icon={<Check size={18} />} label="Received" onClick={onMarkReceived} color="#5DCAA5" />
        <ActionButton icon={<Package size={18} />} label="Sold" onClick={onMarkSold} color="#cc6247" />
        <ActionButton icon={<Move size={18} />} label="Move" onClick={onMove} color="#6366f1" />
        <ActionButton icon={<Trash2 size={18} />} label="Delete" onClick={onDelete} color="#ef4444" />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.actionButton,
        borderColor: color,
        color: color,
      }}
    >
      {icon}
      <span style={styles.actionLabel}>{label}</span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '80px',
    left: '16px',
    right: '16px',
    backgroundColor: '#161920',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '16px',
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  count: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#5DCAA5',
  },
  doneButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'space-between',
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    borderRadius: '10px',
    border: '1px solid',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
  },
  actionLabel: {
    fontSize: '11px',
    fontWeight: 500,
  },
};

export default BatchActions;
