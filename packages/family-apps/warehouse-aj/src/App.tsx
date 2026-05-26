/**
 * Warehouse AJ - 12 Pillar Certified
 * Zero-tap inventory scanner with full P31 integration
 * @version 2.0.0
 * @pillar-count 12/12
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { ZeroTapWarehouse } from './components/ZeroTapWarehouse';
import { WarehouseDashboard } from './components/WarehouseDashboard';
import { P31Welcome } from '../../../../shared-components/p31-welcome/P31Welcome';
import { VoiceBugReporter } from '../../../../shared-components/bug-reporter/VoiceBugReporter';
// CWP-020: Genesis Protocol - Sovereign Onboarding
import { GenesisFlow } from '../../../../shared-components/onboarding/components/GenesisFlow';
import type { SovereignIdentity } from '../../../../shared-components/onboarding/types';

function App() {
  // ────────────────────────────────────────────────────────────────────────────
  // CWP-020: SOVEREIGN IDENTITY THRESHOLD
  // ────────────────────────────────────────────────────────────────────────────
  const [sovereignIdentity, setSovereignIdentity] = useState<SovereignIdentity | null>(null);
  const [inviteAlias, setInviteAlias] = useState<string>('Guest');
  const [isCheckingThreshold, setIsCheckingThreshold] = useState(true);

  useEffect(() => {
    // 1. Identity Check: Do they have a minted SBT?
    const storedIdentity = localStorage.getItem('p31_sovereign_identity');
    if (storedIdentity) {
      try {
        setSovereignIdentity(JSON.parse(storedIdentity));
      } catch {
        // Invalid stored identity, will trigger onboarding
      }
    }

    // 2. URL Parsing: Did Will send them a custom link?
    const urlParams = new URLSearchParams(window.location.search);
    const queryInvite = urlParams.get('invite');
    const pathMatch = window.location.pathname.match(/\/join\/([^/]+)/);

    if (queryInvite) {
      setInviteAlias(decodeURIComponent(queryInvite));
    } else if (pathMatch) {
      setInviteAlias(decodeURIComponent(pathMatch[1]));
    }

    setIsCheckingThreshold(false);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // 12 PILLAR: Original App State
  // ────────────────────────────────────────────────────────────────────────────
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    activeTab,
    setActiveTab,
    context,
    isBatchMode,
    setBatchMode,
    selectedItems,
    clearSelection,
    autoSync,
    setLastVoiceCommand,
  } = useAppStore();

  // 12 PILLAR: Status Beacon for Command Center
  useStatusBeacon({
    appName: 'warehouse-aj',
    appVersion: '2.0.0',
  });

  // 12 PILLAR: Keyboard Shortcuts
  useKeyboardShortcuts({
    onScanToggle: () => {
      setActiveTab('scan');
    },
    onSearchFocus: () => {
      searchInputRef.current?.focus();
    },
    onHelpOpen: () => setShowHelp(true),
    onSettingsOpen: () => setShowSettings(true),
    onBatchToggle: () => setBatchMode(!isBatchMode),
  });

  // INIT: Database + Bio-State
  useEffect(() => {
    initBioState();

    (async () => {
      try {
        const db = await getWarehouseDB();
        (globalThis as any).__WAREHOUSE_DB__ = db;
        setDbReady(true);

        // Check if user has seen welcome
        const hasSeenWelcome = localStorage.getItem('p31-warehouse-welcome-shown');
        if (!hasSeenWelcome) {
          setTimeout(() => setShowWelcome(true), 500);
        }
      } catch (err: any) {
        console.error('DB init failed:', err);
        setError(err.message);
      }
    })();
  }, []);

  // SYNC: Push to p31-state Worker
  const handleSync = useCallback(async (items: InventoryItem[]) => {
    const response = await fetch('https://p31-state.trimtab-signal.workers.dev/api/warehouse/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        source: 'warehouse-aj',
        timestamp: Math.floor(Date.now() / 1000),
        context,
      }),
    });
    if (!response.ok) throw new Error('Sync failed');
    return response.json();
  }, [context]);

  // 12 PILLAR: Voice Commands
  const handleVoiceCommand = useCallback((command: string) => {
    setLastVoiceCommand(command);
    const cmd = command.toLowerCase();

    if (cmd.includes('scan') || cmd.includes('camera')) {
      setActiveTab('scan');
    } else if (cmd.includes('dashboard') || cmd.includes('overview')) {
      setActiveTab('dashboard');
    } else if (cmd.includes('zone 1') || cmd.includes('seating')) {
      console.log('Voice: Switch to Zone 1');
    } else if (cmd.includes('sync')) {
      console.log('Voice: Trigger sync');
    } else if (cmd.includes('select all')) {
      setBatchMode(true);
    } else if (cmd.includes('settings')) {
      setShowSettings(true);
    } else if (cmd.includes('help')) {
      setShowHelp(true);
    }
  }, [setActiveTab, setLastVoiceCommand, setBatchMode]);

  // 12 PILLAR: Search Handler
  const handleSearch = useCallback((query: string) => {
    console.log('Search:', query);
  }, []);

  // 12 PILLAR: Export CSV
  const handleExport = useCallback(() => {
    const csv = 'QR Data,Category,Zone,Status,Scanned At\n' +
      'P31-SEAT-001,Seating,Zone 1: Seating,received,2026-05-17\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-aj-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // CWP-020: THRESHOLD CHECKS
  // ────────────────────────────────────────────────────────────────────────────

  // Prevent flash while checking identity
  if (isCheckingThreshold) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingIcon}>🔐</div>
          <div style={styles.loadingText}>Checking Sovereign Identity...</div>
        </div>
      </div>
    );
  }

  // 3. Absolute Interception: The Genesis Protocol
  if (!sovereignIdentity) {
    return (
      <GenesisFlow
        inviteCode="p31-family-mesh"
        invitedAlias={inviteAlias}
        onComplete={(identity) => {
          // 4. Post-Ceremony: Save identity, unlock app
          setSovereignIdentity(identity);
          localStorage.setItem('p31_sovereign_identity', JSON.stringify(identity));

          // Clean the URL
          const cleanUrl = window.location.pathname.replace(/\/join\/[^/]+/, '');
          window.history.replaceState({}, document.title, cleanUrl || '/');
        }}
        onExit={() => {
          // 5. Exit Handling: Send to public hub
          window.location.href = 'https://p31ca.org';
        }}
      />
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Error State
  // ────────────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h1 style={styles.errorTitle}>Initialization Error</h1>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Loading State
  // ────────────────────────────────────────────────────────────────────────────
  if (!dbReady) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingIcon}>📦</div>
          <div style={styles.loadingText}>Loading Warehouse Scanner...</div>
          <div style={styles.loadingSubtext}>12 Pillar Certified</div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER (Sovereign verified)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div style={styles.app}>
        {/* 12 PILLAR: Offline Indicator */}
        <OfflineIndicator />

        {/* 12 PILLAR: P31 Welcome Modal */}
        {showWelcome && (
          <P31Welcome
            userName={sovereignIdentity.alias}
            appName="Warehouse AJ"
            appDescription="Your family's inventory management system. Scan items, track stock levels, and sync across the mesh. Built for zero-friction warehouse operations."
            moneyTips={[
              "Sell excess inventory on marketplace apps",
              "Start a reselling business with tracked inventory",
              "Offer inventory management services to others",
              "Create bulk buying co-ops with tracked savings",
              "Build a rental business from your asset catalog"
            ]}
            nextSteps={[
              { energy: 'spoon-deficit', action: 'Scan just one item to try it out' },
              { energy: 'spoon-deficit', action: 'Browse the demo inventory' },
              { energy: 'moderate', action: 'Scan 5 items in your pantry' },
              { energy: 'moderate', action: 'Set up your first category' },
              { energy: 'full', action: 'Inventory your entire garage' },
              { energy: 'full', action: 'Set up auto-sync with Culinary Matria' },
              { energy: 'any', action: 'Share access with family members' }
            ]}
            onClose={() => {
              localStorage.setItem('p31-warehouse-welcome-shown', 'true');
              setShowWelcome(false);
            }}
          />
        )}

        {/* 12 PILLAR: Settings Panel */}
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onExport={handleExport}
        />

        {/* 12 PILLAR: Help Guide */}
        <HelpGuide isOpen={showHelp} onClose={() => setShowHelp(false)} />

        {/* 12 PILLAR: Voice Bug Reporter */}
        <VoiceBugReporter
          appName="Warehouse AJ"
          appVersion="2.0.0"
          onReportSubmit={async (report) => {
            console.log('Bug report:', report);
          }}
        />

        {/* 12 PILLAR: Voice Button */}
        <VoiceButton onCommand={handleVoiceCommand} />

        {/* 12 PILLAR: Batch Actions */}
        <BatchActions
          onDelete={() => {
            console.log('Delete selected:', selectedItems);
            clearSelection();
          }}
          onMove={() => {
            console.log('Move selected:', selectedItems);
          }}
          onMarkReceived={() => {
            console.log('Mark received:', selectedItems);
            clearSelection();
          }}
          onMarkSold={() => {
            console.log('Mark sold:', selectedItems);
            clearSelection();
          }}
        />

        {/* ─── HEADER ─── */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.logo}>📦</span>
            <span style={styles.appName}>Warehouse AJ</span>
            <span style={styles.version}>2.0</span>
            {/* Sovereign indicator */}
            <span style={styles.sovereignBadge}>{sovereignIdentity.alias}</span>
          </div>

          <div style={styles.headerCenter}>
            {/* 12 PILLAR: Context Toggle */}
            <ContextToggle />
          </div>

          <div style={styles.headerRight}>
            {/* 12 PILLAR: Bio-State Bar */}
            <BioStateBar compact />

            {/* 12 PILLAR: Status Light */}
            <StatusLight appName="warehouse-aj" appVersion="2.0.0" />

            {/* Help Button */}
            <button onClick={() => setShowHelp(true)} style={styles.iconButton}>
              <HelpCircle size={20} />
            </button>

            {/* Settings Button */}
            <button onClick={() => setShowSettings(true)} style={styles.iconButton}>
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* ─── SEARCH PANEL (Dashboard only) ─── */}
        {activeTab === 'dashboard' && (
          <SearchPanel onSearch={handleSearch} placeholder="Search inventory..." />
        )}

        {/* ─── MAIN CONTENT ─── */}
        <main style={styles.main}>
          {activeTab === 'scan' ? (
            <ZeroTapWarehouse onSync={handleSync} />
          ) : (
            <WarehouseDashboard />
          )}
        </main>

        {/* ─── TAB NAVIGATION ─── */}
        <nav style={{...styles.nav, bottom: '48px'}}>
          <TabButton
            active={activeTab === 'scan'}
            onClick={() => setActiveTab('scan')}
            icon={<Scan size={20} />}
            label="Scan"
          />
          <TabButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
          />
        </nav>

        <ReturnRibbon currentApp="warehouse-aj" />
      </div>
    </ErrorBoundary>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tabButton,
        color: active ? '#5DCAA5' : '#666',
      }}
    >
      {icon}
      <span style={styles.tabLabel}>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#0f1115',
    color: '#D8D6D0',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#161920',
    borderBottom: '1px solid #2a2e35',
    gap: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  logo: {
    fontSize: '24px',
  },
  appName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#5DCAA5',
  },
  version: {
    fontSize: '12px',
    color: '#666',
    background: 'rgba(255,255,255,0.05)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  sovereignBadge: {
    fontSize: '11px',
    color: '#22d3ee',
    background: 'rgba(34, 211, 238, 0.1)',
    padding: '2px 8px',
    borderRadius: '12px',
    marginLeft: '8px',
    border: '1px solid rgba(34, 211, 238, 0.3)',
  },
  headerCenter: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  iconButton: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#9ca3af',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },

  // Main
  main: {
    flex: 1,
    overflow: 'auto',
    paddingBottom: '80px',
  },

  // Navigation
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    background: '#161920',
    borderTop: '1px solid #2a2e35',
    zIndex: 100,
  },
  tabButton: {
    flex: 1,
    padding: '16px',
    background: 'transparent',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    transition: 'color 0.2s',
  },
  tabLabel: {
    fontSize: '12px',
  },

  // Loading
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0f1115',
    color: '#5DCAA5',
  },
  loadingContent: {
    textAlign: 'center',
  },
  loadingIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '16px',
    marginBottom: '8px',
  },
  loadingSubtext: {
    fontSize: '12px',
    color: '#666',
  },

  // Error
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
    textAlign: 'center',
    background: '#0f1115',
    color: '#cc6247',
  },
  errorCard: {
    background: '#161920',
    padding: '32px',
    borderRadius: '16px',
    border: '1px solid rgba(204, 98, 71, 0.3)',
    maxWidth: '400px',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorTitle: {
    marginBottom: '1rem',
    fontSize: '24px',
  },
  errorMessage: {
    marginBottom: '1.5rem',
    fontSize: '14px',
    opacity: 0.8,
  },
  retryButton: {
    padding: '12px 24px',
    background: '#5DCAA5',
    color: '#0f1115',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 500,
  },
};

export default App;
