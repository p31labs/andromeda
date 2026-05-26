import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { MaidDashboard } from './components/MaidDashboard'
import { initDB } from './utils/pglite-maid.ts'
import { createSyncBridge } from './sdk/sync-bridge.ts'
import { P31Welcome } from '../../shared/components/P31Welcome'
import { VoiceBugReporter } from '../../shared/components/VoiceBugReporter'
import { ReturnRibbon } from '@p31/arcade-theme'

// CWP-020: Genesis Protocol - Sovereign Onboarding
import { GenesisFlow } from '../../shared-components/onboarding/components/GenesisFlow'
import type { SovereignIdentity } from '../../shared-components/onboarding/types'

function MaidApp(): JSX.Element {
  // ────────────────────────────────────────────────────────────────────────────
  // CWP-020: SOVEREIGN IDENTITY THRESHOLD
  // ────────────────────────────────────────────────────────────────────────────
  const [sovereignIdentity, setSovereignIdentity] = useState<SovereignIdentity | null>(null)
  const [inviteAlias, setInviteAlias] = useState<string>('Guest')
  const [isCheckingThreshold, setIsCheckingThreshold] = useState(true)

  useEffect(() => {
    // 1. Identity Check: Do they have a minted SBT?
    const storedIdentity = localStorage.getItem('p31_sovereign_identity')
    if (storedIdentity) {
      try {
        setSovereignIdentity(JSON.parse(storedIdentity))
      } catch {
        // Invalid stored identity, will trigger onboarding
      }
    }

    // 2. URL Parsing: Did Will send them a custom link?
    const urlParams = new URLSearchParams(window.location.search)
    const queryInvite = urlParams.get('invite')
    const pathMatch = window.location.pathname.match(/\/join\/([^/]+)/)

    if (queryInvite) {
      setInviteAlias(decodeURIComponent(queryInvite))
    } else if (pathMatch) {
      setInviteAlias(decodeURIComponent(pathMatch[1]))
    }

    setIsCheckingThreshold(false)
  }, [])

  // ────────────────────────────────────────────────────────────────────────────
  // APP STATE (Original)
  // ────────────────────────────────────────────────────────────────────────────
  const [dbReady, setDbReady] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    // Only init DB if sovereign identity exists
    if (!sovereignIdentity) return

    initDB().then(async (db) => {
      console.log('[Maid] PGLite ready, initializing SBT sync...')

      const bridge = await createSyncBridge(
        db,
        sovereignIdentity.alias.toLowerCase().replace(/\s+/g, '_') + '_live',
        'maid-manager',
        ['maid_operator']
      )

      bridge.start()
      console.log(`[Maid] Sync bridge active — ${sovereignIdentity.alias} is connected to the mesh`)
      setDbReady(true)

      // Check if user has seen welcome before
      const hasSeenWelcome = localStorage.getItem('p31-maid-welcome-shown')
      if (!hasSeenWelcome) {
        setTimeout(() => setShowWelcome(true), 500)
      }
    }).catch(err => {
      console.error('[Maid] Failed to initialize sync:', err)
    })
  }, [sovereignIdentity])

  const handleCloseWelcome = () => {
    localStorage.setItem('p31-maid-welcome-shown', 'true')
    setShowWelcome(false)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CWP-020: THRESHOLD CHECKS
  // ────────────────────────────────────────────────────────────────────────────

  // Prevent flash while checking identity
  if (isCheckingThreshold) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#5DCAA5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <div>Checking Sovereign Identity...</div>
        </div>
      </div>
    )
  }

  // 3. Absolute Interception: The Genesis Protocol
  if (!sovereignIdentity) {
    return (
      <GenesisFlow
        inviteCode="p31-family-mesh"
        invitedAlias={inviteAlias}
        onComplete={(identity) => {
          // 4. Post-Ceremony: Save identity, unlock app
          setSovereignIdentity(identity)
          localStorage.setItem('p31_sovereign_identity', JSON.stringify(identity))

          // Clean the URL
          const cleanUrl = window.location.pathname.replace(/\/join\/[^/]+/, '')
          window.history.replaceState({}, document.title, cleanUrl || '/')
        }}
        onExit={() => {
          // 5. Exit Handling: Send to public hub
          window.location.href = 'https://p31ca.org'
        }}
      />
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // APP LOADING STATE
  // ────────────────────────────────────────────────────────────────────────────
  if (!dbReady) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#5DCAA5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧹</div>
          <div>Initializing Maid Manager...</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            Sovereign: {sovereignIdentity.alias}
          </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER (Sovereign verified)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* P31 Welcome Modal */}
      {showWelcome && (
        <P31Welcome
          userName={sovereignIdentity.alias}
          appName="Maid Manager"
          appDescription="Client scheduling, pacing protection, and earnings tracking for independent cleaning professionals. Built by Carrie, for Carrie—and anyone else taking ownership of their labor."
          moneyTips={[
            "Track all earnings for accurate tax reporting",
            "Optimize routes to maximize daily revenue",
            "Upsell deep-cleaning services with tracked timing",
            "Build recurring client relationships for stable income",
            "Create training materials from your documented process"
          ]}
          nextSteps={[
            { energy: 'spoon-deficit', action: 'Add just one client today' },
            { energy: 'spoon-deficit', action: 'Review the pacing safety features' },
            { energy: 'moderate', action: 'Import your existing client list' },
            { energy: 'moderate', action: 'Set up your first job timer' },
            { energy: 'full', action: 'Schedule a full week of clients' },
            { energy: 'full', action: 'Connect with the family mesh for referrals' },
            { energy: 'any', action: 'Share the app with other cleaners' }
          ]}
          onClose={handleCloseWelcome}
        />
      )}

      {/* Voice Bug Reporter */}
      <VoiceBugReporter
        appName="Maid Manager"
        appVersion="1.0.0"
        onReportSubmit={async (report) => {
          console.log('Bug report:', report);
          // TODO: Sync to mesh when connected
        }}
      />

      <MaidDashboard />

      <ReturnRibbon currentApp="maid-manager" />

      {/* Sovereign indicator */}
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          padding: '4px 12px',
          background: 'rgba(34, 211, 238, 0.1)',
          border: '1px solid rgba(34, 211, 238, 0.3)',
          borderRadius: '12px',
          color: '#22d3ee',
          fontSize: '11px',
          fontFamily: 'monospace',
          zIndex: 100,
        }}
      >
        {sovereignIdentity.alias}
      </div>

      {/* Help button to reopen welcome */}
      <button
        onClick={() => setShowWelcome(true)}
        aria-label="Show welcome guide"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#16213e',
          color: '#5DCAA5',
          border: '1px solid #2a2e35',
          fontSize: '1.25rem',
          cursor: 'pointer',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ❓
      </button>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MaidApp />
  </React.StrictMode>,
)
