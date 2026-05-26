import { X, HelpCircle, Keyboard, Mic, Zap, Shield } from 'lucide-react';

interface HelpGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpGuide({ isOpen, onClose }: HelpGuideProps) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Help & Shortcuts</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Keyboard size={16} style={styles.sectionIcon} />
              Keyboard Shortcuts
            </h3>
            <ShortcutRow keys={['?']} description="Open this help" />
            <ShortcutRow keys={['Space']} description="Start/stop scanner" />
            <ShortcutRow keys={['S']} description="Switch to Scan tab" />
            <ShortcutRow keys={['D']} description="Switch to Dashboard" />
            <ShortcutRow keys={['B']} description="Toggle batch mode" />
            <ShortcutRow keys={['/']} description="Focus search" />
            <ShortcutRow keys={['Esc']} description="Close/cancel" />
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Mic size={16} style={styles.sectionIcon} />
              Voice Commands
            </h3>
            <ShortcutRow keys={['"Scan"']} description="Start scanning" />
            <ShortcutRow keys={['"Dashboard"']} description="Show dashboard" />
            <ShortcutRow keys={['"Zone 1"']} description="Switch to zone 1" />
            <ShortcutRow keys={['"Sync now"']} description="Trigger sync" />
            <ShortcutRow keys={['"Select all"']} description="Select all items" />
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Zap size={16} style={styles.sectionIcon} />
              Gestures (Mobile)
            </h3>
            <ShortcutRow keys={['Swipe →']} description="Mark as received" />
            <ShortcutRow keys={['Swipe ←']} description="Mark as sold" />
            <ShortcutRow keys={['Swipe ↑']} description="Next zone" />
            <ShortcutRow keys={['Swipe ↓']} description="Previous zone" />
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Shield size={16} style={styles.sectionIcon} />
              12-Pillar Status
            </h3>
            <div style={styles.pillarGrid}>
              {PILLARS.map((pillar, i) => (
                <div key={i} style={styles.pillarItem}>
                  <span style={styles.pillarCheck}>✓</span>
                  <span style={styles.pillarName}>{pillar}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div style={styles.shortcutRow}>
      <div style={styles.keys}>
        {keys.map((key, i) => (
          <kbd key={i} style={styles.kbd}>{key}</kbd>
        ))}
      </div>
      <span style={styles.description}>{description}</span>
    </div>
  );
}

const PILLARS = [
  'Bio-State',
  'Voice Control',
  'Context Modes',
  'Status Light',
  'Search/Filter',
  'Batch Actions',
  'Offline Sync',
  'Settings Panel',
  'Export/Reports',
  'Help System',
  'Keyboard Shortcuts',
  'Error Boundaries',
];

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  modal: {
    backgroundColor: '#161920',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
    padding: '20px 24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#5DCAA5',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sectionIcon: {
    color: '#5DCAA5',
  },
  shortcutRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  keys: {
    display: 'flex',
    gap: '4px',
  },
  kbd: {
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  description: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  pillarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  pillarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(93, 202, 165, 0.1)',
    borderRadius: '8px',
    fontSize: '13px',
  },
  pillarCheck: {
    color: '#5DCAA5',
    fontWeight: 'bold',
  },
  pillarName: {
    color: '#fff',
  },
};

export default HelpGuide;
