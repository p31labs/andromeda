import { useState } from 'react';
import { X, Settings, Volume2, Vibrate, RefreshCw, Download, Database } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { BioStateBar } from './BioStateBar';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onExport?: () => void;
}

export function SettingsPanel({ isOpen, onClose, onExport }: SettingsPanelProps) {
  const {
    voiceEnabled,
    setVoiceEnabled,
    hapticEnabled,
    setHapticEnabled,
    autoSync,
    setAutoSync,
  } = useAppStore();

  const [showDataCleared, setShowDataCleared] = useState(false);

  if (!isOpen) return null;

  const handleClearData = () => {
    if (confirm('Clear all local data? This cannot be undone.')) {
      localStorage.removeItem('warehouse-aj-storage');
      setShowDataCleared(true);
      setTimeout(() => setShowDataCleared(false), 2000);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.content}>
          {/* Bio-State Section */}
          <BioStateBar compact={false} />

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Preferences</h3>

            <ToggleRow
              icon={<Volume2 size={18} />}
              label="Voice Commands"
              description="Enable voice control"
              enabled={voiceEnabled}
              onToggle={() => setVoiceEnabled(!voiceEnabled)}
            />

            <ToggleRow
              icon={<Vibrate size={18} />}
              label="Haptic Feedback"
              description="Vibrate on actions"
              enabled={hapticEnabled}
              onToggle={() => setHapticEnabled(!hapticEnabled)}
            />

            <ToggleRow
              icon={<RefreshCw size={18} />}
              label="Auto Sync"
              description="Sync when online"
              enabled={autoSync}
              onToggle={() => setAutoSync(!autoSync)}
            />
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Data</h3>

            <button onClick={onExport} style={styles.actionRow}>
              <Download size={18} />
              <span>Export Inventory (CSV)</span>
            </button>

            <button onClick={handleClearData} style={{ ...styles.actionRow, color: '#ef4444' }}>
              <Database size={18} />
              <span>Clear Local Data</span>
            </button>

            {showDataCleared && (
              <div style={styles.successMessage}>Data cleared</div>
            )}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>About</h3>
            <div style={styles.aboutRow}>
              <span style={styles.aboutLabel}>Version</span>
              <span style={styles.aboutValue}>2.0.0 (12-Pillar)</span>
            </div>
            <div style={styles.aboutRow}>
              <span style={styles.aboutLabel}>P31 Certified</span>
              <span style={styles.aboutValue}>✓ 12/12 Pillars</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={styles.toggleRow}>
      <div style={styles.toggleIcon}>{icon}</div>
      <div style={styles.toggleInfo}>
        <div style={styles.toggleLabel}>{label}</div>
        <div style={styles.toggleDescription}>{description}</div>
      </div>
      <button
        onClick={onToggle}
        style={{
          ...styles.toggleButton,
          backgroundColor: enabled ? '#5DCAA5' : 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          style={{
            ...styles.toggleKnob,
            transform: enabled ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: '#0f1115',
    width: '100%',
    maxHeight: '85vh',
    borderRadius: '20px 20px 0 0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    margin: 0,
    color: '#fff',
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    overflowY: 'auto',
    padding: '16px 24px 100px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: 0,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
  },
  toggleIcon: {
    color: '#9ca3af',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#fff',
  },
  toggleDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '2px',
  },
  toggleButton: {
    width: '48px',
    height: '28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s',
    padding: '2px',
  },
  toggleKnob: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    transition: 'transform 0.2s',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 0',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  successMessage: {
    padding: '10px 16px',
    backgroundColor: 'rgba(93, 202, 165, 0.2)',
    borderRadius: '8px',
    color: '#5DCAA5',
    fontSize: '14px',
    textAlign: 'center',
  },
  aboutRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    fontSize: '14px',
  },
  aboutLabel: {
    color: '#9ca3af',
  },
  aboutValue: {
    color: '#5DCAA5',
  },
};

export default SettingsPanel;
