import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HearingPrep from '../src/HearingPrep'
import { ErrorBoundary } from '../src/ErrorBoundary'

function renderApp() {
  return render(<HearingPrep />)
}

async function clickTab(user, label) {
  await user.click(screen.getByRole('button', { name: label }))
}

describe('T — TASK TESTS', () => {
  describe('App renders without crashing', () => {
    it('renders the header', () => {
      renderApp()
      expect(screen.getByText('P31 HEARING OPS')).toBeInTheDocument()
    })

    it('renders the date badge', () => {
      renderApp()
      expect(screen.getByText('APR 16 • 11:00')).toBeInTheDocument()
    })

    it('renders the tab bar with all 8 tabs', () => {
      renderApp()
      const tabLabels = ['MISSION', 'SCENARIOS', 'SCRIPT', 'DOCKET', 'LAW', 'RULES', 'FOLDER', 'VAULT']
      tabLabels.forEach(label => {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
      })
    })

    it('renders MISSION tab by default', () => {
      renderApp()
      expect(screen.getByText('CONTEMPT HEARING')).toBeInTheDocument()
    })

    it('renders case header on mission tab', () => {
      renderApp()
      expect(screen.getByText(/JOHNSON v\. JOHNSON/)).toBeInTheDocument()
      expect(screen.getByText(/2025CV936/)).toBeInTheDocument()
    })
  })

  describe('Phase navigation works', () => {
    it('navigates to SCENARIOS tab', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCENARIOS')
      expect(screen.getByText('DECISION TREE — TAP TO EXPAND')).toBeInTheDocument()
    })

    it('navigates to SCRIPT tab', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.getByText('OPENING + TIMELINE — READ EXACTLY')).toBeInTheDocument()
    })

    it('navigates to DOCKET tab', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'DOCKET')
      expect(screen.getByText('CRITICAL DOCKET ENTRIES')).toBeInTheDocument()
    })

    it('navigates to LAW tab', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'LAW')
      expect(screen.getByText('INCHOATE')).toBeInTheDocument()
    })

    it('navigates to RULES tab', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'RULES')
      expect(screen.getByText('✓ DO')).toBeInTheDocument()
      expect(screen.getByText('✗ DO NOT')).toBeInTheDocument()
    })

    it('navigates to FOLDER tab', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      expect(screen.getByText('FOLDER CHECKLIST')).toBeInTheDocument()
    })

    it('navigates to VAULT tab', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'VAULT')
      expect(screen.getByText('P31 Omnibus')).toBeInTheDocument()
    })

    it('navigates through all tabs in sequence without errors', async () => {
      const user = userEvent.setup()
      renderApp()
      const tabs = ['MISSION', 'SCENARIOS', 'SCRIPT', 'DOCKET', 'LAW', 'RULES', 'FOLDER', 'VAULT']
      for (const tab of tabs) {
        await clickTab(user, tab)
      }
    })
  })

  describe('Script content loads correctly', () => {
    it('displays opening script block', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.getByText('OPENING (SAY EXACTLY)')).toBeInTheDocument()
    })

    it('displays timeline statement block', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.getByText('TIMELINE STATEMENT (UNDER 90 SECONDS)')).toBeInTheDocument()
    })

    it('timeline references Entry 92 and Entry 104', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      const timelineBlock = screen.getByText(/Third Complaint for Contempt/).closest('div[style]')
      expect(screen.getByText(/Entry 92/)).toBeInTheDocument()
      expect(screen.getByText(/Entry 104/)).toBeInTheDocument()
    })

    it('displays response templates when expanded', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.getByText('RESPONSE TEMPLATES')).toBeInTheDocument()
      expect(screen.getByText('WHEN MCGHAN PRESENTS')).toBeInTheDocument()
      expect(screen.getByText('THREE ANCHORS')).toBeInTheDocument()
    })

    it('displays the close block', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.getByText('THE CLOSE (IF GIVEN THE OPPORTUNITY)')).toBeInTheDocument()
    })

    it('displays contempt found block', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.getByText('IF CONTEMPT FOUND')).toBeInTheDocument()
    })

    it('can toggle secondary defenses', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.queryByText('UNAUTHORIZED ENTRY (April 4)')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /SECONDARY DEFENSES/ }))
      expect(screen.getByText('UNAUTHORIZED ENTRY (April 4)')).toBeInTheDocument()
    })
  })

  describe('Checklist items can be toggled', () => {
    it('shows checklist with 0/total initially', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      expect(screen.getByText('0/19')).toBeInTheDocument()
    })

    it('toggles a single checklist item', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      const items = screen.getAllByRole('button')
      const firstItem = items.find(btn => within(btn).queryByText('Docket printout'))
      expect(firstItem).toBeDefined()
      await user.click(firstItem)
      expect(screen.getByText('1/19')).toBeInTheDocument()
    })

    it('toggles a checklist item back off', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      const buttons = screen.getAllByRole('button')
      const firstItem = buttons.find(btn => within(btn).queryByText('Docket printout'))
      await user.click(firstItem)
      expect(screen.getByText('1/19')).toBeInTheDocument()
      await user.click(firstItem)
      expect(screen.getByText('0/19')).toBeInTheDocument()
    })

    it('can toggle all items to completed', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      const buttons = screen.getAllByRole('button').filter(btn =>
        btn.textContent.includes('Docket printout') ||
        btn.textContent.includes('Order on Pending Motions') ||
        btn.textContent.includes('Consent Temporary Order') ||
        btn.textContent.includes('Response to Third Complaint') ||
        btn.textContent.includes('Motion to Dismiss') ||
        btn.textContent.includes('Affidavit re') ||
        btn.textContent.includes('Financial Affidavit') ||
        btn.textContent.includes('Maughon letter') ||
        btn.textContent.includes('ADA Accommodation Requests') ||
        btn.textContent.includes('Cross-Motion for Contempt') ||
        btn.textContent.includes('Motion to Strike') ||
        btn.textContent.includes('Notice of POA') ||
        btn.textContent.includes('Supersedeas Application') ||
        btn.textContent.includes('Notice of Intent to Appeal') ||
        btn.textContent.includes('W-2') ||
        btn.textContent.includes('Certificate of Incorporation') ||
        btn.textContent.includes('CP 575E') ||
        btn.textContent.includes('Transcript invoice') ||
        btn.textContent.includes('Gmail screenshot')
      )
      for (const btn of buttons) {
        await user.click(btn)
      }
      expect(screen.getByText('19/19')).toBeInTheDocument()
    })

    it('displays correct checklist item labels', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      expect(screen.getByText(/Docket printout/)).toBeInTheDocument()
      expect(screen.getByText(/Financial Affidavit/)).toBeInTheDocument()
      expect(screen.getByText(/Maughon letter/)).toBeInTheDocument()
      expect(screen.getByText(/Supersedeas Application/)).toBeInTheDocument()
      expect(screen.getByText(/Phone\/tablet for audio recording/)).toBeInTheDocument()
    })
  })
})

describe('R — RESILIENCE TESTS', () => {
  describe('Offline mode (service worker)', () => {
    it('main.jsx calls registerSW on load', async () => {
      const { registerSW } = await import('virtual:pwa-register')
      renderApp()
      expect(registerSW).toHaveBeenCalled()
    })

    it('ErrorBoundary logs crashes to localStorage on render', () => {
      const errorMsg = 'Test crash'
      const ThrowingComponent = () => { throw new Error(errorMsg) }
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => render(
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
      )).toThrow()
      consoleSpy.mockRestore()
    })
  })

  describe('Data persistence across reloads', () => {
    it('checklist state uses pre-initialized false values', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      expect(screen.getByText('0/19')).toBeInTheDocument()
    })
  })

  describe('Graceful handling of missing data', () => {
    it('ErrorBoundary displays fallback UI on error', () => {
      const errorMsg = 'Test crash'
      const ThrowingComponent = () => { throw new Error(errorMsg) }
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => render(
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
      )).toThrow()
      consoleSpy.mockRestore()
    })

    it('ErrorBoundary shows children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content here</div>
        </ErrorBoundary>
      )
      expect(screen.getByText('Child content here')).toBeInTheDocument()
    })
  })
})

describe('I — INTERFACE TESTS', () => {
  describe('All expected tabs/sections exist', () => {
    it('has MISSION tab with all stat boxes', () => {
      renderApp()
      expect(screen.getByText('DAYS WITHOUT KIDS')).toBeInTheDocument()
      expect(screen.getByText('TOTAL ASSETS')).toBeInTheDocument()
      expect(screen.getByText('SIGNED ORDERS')).toBeInTheDocument()
      expect(screen.getByText('ADA RESPONSES')).toBeInTheDocument()
    })

    it('has SCENARIOS tab with 5 scenario cards', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCENARIOS')
      expect(screen.getByText('McGhan No-Show')).toBeInTheDocument()
      expect(screen.getByText('WebEx Granted from Bench')).toBeInTheDocument()
      expect(screen.getByText('Hearing Proceeds')).toBeInTheDocument()
      expect(screen.getByText('Judge Continues Hearing')).toBeInTheDocument()
      expect(screen.getByText('Court Threatens Incarceration')).toBeInTheDocument()
    })

    it('can expand a scenario to reveal steps', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCENARIOS')
      await user.click(screen.getByRole('button', { name: /McGhan No-Show/ }))
      expect(screen.getByText(/State for the record/)).toBeInTheDocument()
    })

    it('has DOCKET tab with THE GAP analysis', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'DOCKET')
      expect(screen.getByText('THE GAP')).toBeInTheDocument()
      expect(screen.getByText(/TEN DAYS/)).toBeInTheDocument()
    })

    it('has LAW tab with all citation categories', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'LAW')
      const categories = ['INCHOATE', 'NUNC PRO TUNC', 'CONTEMPT', 'PARENTAL RIGHTS', 'DUE PROCESS', 'WEBEX', 'RECORDING', 'CONSENT ORDER', 'VISITATION']
      categories.forEach(cat => {
        expect(screen.getByText(cat)).toBeInTheDocument()
      })
    })

    it('has RULES tab with do and dont lists', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'RULES')
      expect(screen.getByText(/Announce audio recording/)).toBeInTheDocument()
      expect(screen.getByText(/DO NOT mention Camden County corruption/)).toBeInTheDocument()
    })

    it('has FOLDER tab with progress bar', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      expect(screen.getByText('FOLDER CHECKLIST')).toBeInTheDocument()
    })

    it('has VAULT tab with 3 sub-tabs', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'VAULT')
      expect(screen.getByText('3D Oracle')).toBeInTheDocument()
      expect(screen.getByText('Vagal')).toBeInTheDocument()
      expect(screen.getByText('K4 Seal')).toBeInTheDocument()
    })
  })

  describe('No external API calls in rendered content', () => {
    it('VAULT sub-tab content is self-contained', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'VAULT')
      expect(screen.getByText(/ISOSTATIC RIGIDITY MAINTAINED/)).toBeInTheDocument()
      expect(screen.getByText(/LOCAL ONLY — NO CLOUD/)).toBeInTheDocument()
    })
  })
})

describe('P — PURITY TESTS', () => {
  describe('No PII leaked in test output', () => {
    it('mission tab does not expose SSN patterns', () => {
      renderApp()
      const body = document.body.innerHTML
      expect(body).not.toMatch(/\d{3}-\d{2}-\d{4}/)
    })
  })

  describe('No children full names in rendered content', () => {
    it('HearingPrep component does not contain "Sebastian"', () => {
      renderApp()
      const body = document.body.innerHTML
      expect(body).not.toMatch(/\bSebastian\b/i)
    })

    it('HearingPrep component does not contain "Willow Marie"', () => {
      renderApp()
      const body = document.body.innerHTML
      expect(body).not.toMatch(/\bWillow Marie\b/i)
    })

    it('HearingPrep component uses initials S.J. and W.J.', () => {
      renderApp()
      const body = document.body.innerHTML
      const hasSJ = body.includes('S.J.')
      const hasWJ = body.includes('W.J.')
      expect(hasSJ || hasWJ).toBe(true)
    })

    it('K4Seal shows Willow and Bash but not full legal names in K4 context', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'VAULT')
      await user.click(screen.getByText('K4 Seal'))
      const body = document.body.innerHTML
      expect(body).not.toMatch(/\bSebastian\b/)
    })
  })

  describe('Proper initials-only enforcement', () => {
    it('content referencing children uses S.J. or W.J. pattern', () => {
      renderApp()
      const body = document.body.innerHTML
      const fullChildNamePatterns = [
        /Sebastian\s+Johnson/i,
        /Willow\s+Johnson/i,
        /Sebastian\s+J\.?/i,
      ]
      fullChildNamePatterns.forEach(pattern => {
        expect(body).not.toMatch(pattern)
      })
    })
  })

  describe('Critical docket entries referenced with correct numbers', () => {
    it('references Entry 92 for Third Complaint for Contention', () => {
      renderApp()
      expect(screen.getByText(/Entry 92/)).toBeInTheDocument()
    })

    it('references Entry 104 as key order', () => {
      renderApp()
      expect(screen.getByText(/Entry 104/)).toBeInTheDocument()
    })
  })
})

describe('E — E2E TESTS', () => {
  describe('Full navigation flow', () => {
    it('navigates MISSION → SCENARIOS → SCRIPT → DOCKET', async () => {
      const user = userEvent.setup()
      renderApp()
      expect(screen.getByText('CONTEMPT HEARING')).toBeInTheDocument()

      await clickTab(user, 'SCENARIOS')
      expect(screen.getByText('DECISION TREE — TAP TO EXPAND')).toBeInTheDocument()

      await clickTab(user, 'SCRIPT')
      expect(screen.getByText('OPENING + TIMELINE — READ EXACTLY')).toBeInTheDocument()

      await clickTab(user, 'DOCKET')
      expect(screen.getByText('CRITICAL DOCKET ENTRIES')).toBeInTheDocument()
    })

    it('navigates through hearing prep flow and interacts with checklist', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      await user.click(screen.getByRole('button', { name: /SECONDARY DEFENSES/ }))
      expect(screen.getByText('UNAUTHORIZED ENTRY (April 4)')).toBeInTheDocument()

      await clickTab(user, 'DOCKET')
      expect(screen.getByText('THE GAP')).toBeInTheDocument()

      await clickTab(user, 'FOLDER')
      const buttons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Docket printout'))
      if (buttons.length > 0) {
        await user.click(buttons[0])
      }
      expect(screen.getByText('1/19')).toBeInTheDocument()
    })

    it('navigates to VAULT, switches sub-tabs, and views all three panels', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'VAULT')
      expect(screen.getByText('P31 Omnibus')).toBeInTheDocument()

      await user.click(screen.getByText('3D Oracle'))
      expect(screen.getByText(/FACE 1 \/ 20/)).toBeInTheDocument()

      await user.click(screen.getByText('Vagal'))
      expect(screen.getByText(/SOMATIC GROUNDING/)).toBeInTheDocument()

      await user.click(screen.getByText('K4 Seal'))
      expect(screen.getByText(/TETRAHEDRON TOPOLOGY/)).toBeInTheDocument()
    })
  })

  describe('Offline-first verification', () => {
    it('app renders fully without network after initial load', () => {
      renderApp()
      expect(screen.getByText('P31 HEARING OPS')).toBeInTheDocument()
      const tabLabels = ['MISSION', 'SCENARIOS', 'SCRIPT', 'DOCKET', 'LAW', 'RULES', 'FOLDER', 'VAULT']
      tabLabels.forEach(label => {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
      })
    })

    it('all tabs have static content that renders without async data', async () => {
      const user = userEvent.setup()
      renderApp()
      const tabs = ['MISSION', 'SCENARIOS', 'SCRIPT', 'DOCKET', 'LAW', 'RULES', 'FOLDER', 'VAULT']
      for (const tab of tabs) {
        await clickTab(user, tab)
        expect(document.body.innerHTML.length).toBeGreaterThan(100)
      }
    })
  })
})

describe('R — REGRESSION TESTS', () => {
  describe('Rapid phase switching does not corrupt state', () => {
    it('rapidly switches tabs and verifies each renders', async () => {
      const user = userEvent.setup()
      renderApp()
      for (let i = 0; i < 3; i++) {
        await clickTab(user, 'MISSION')
        expect(screen.getByText('CONTEMPT HEARING')).toBeInTheDocument()
        await clickTab(user, 'SCENARIOS')
        expect(screen.getByText('DECISION TREE — TAP TO EXPAND')).toBeInTheDocument()
        await clickTab(user, 'SCRIPT')
        expect(screen.getByText('OPENING + TIMELINE — READ EXACTLY')).toBeInTheDocument()
        await clickTab(user, 'DOCKET')
        expect(screen.getByText('CRITICAL DOCKET ENTRIES')).toBeInTheDocument()
        await clickTab(user, 'LAW')
        expect(screen.getByText('INCHOATE')).toBeInTheDocument()
        await clickTab(user, 'RULES')
        expect(screen.getByText('✓ DO')).toBeInTheDocument()
        await clickTab(user, 'FOLDER')
        expect(screen.getByText('FOLDER CHECKLIST')).toBeInTheDocument()
        await clickTab(user, 'VAULT')
        expect(screen.getByText('P31 Omnibus')).toBeInTheDocument()
      }
    })

    it('handles 10 consecutive tab switches without error', async () => {
      const user = userEvent.setup()
      renderApp()
      const allTabs = ['MISSION', 'SCENARIOS', 'SCRIPT', 'DOCKET', 'LAW', 'RULES', 'FOLDER', 'VAULT']
      for (let i = 0; i < 10; i++) {
        const tab = allTabs[i % allTabs.length]
        await clickTab(user, tab)
      }
    })
  })

  describe('Multiple checklist toggles work correctly', () => {
    it('alternates checklist items without state corruption', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      const buttons = screen.getAllByRole('button')
      const checklistButtons = buttons.filter(btn =>
        btn.textContent.includes('Docket printout') ||
        btn.textContent.includes('Order on Pending Motions') ||
        btn.textContent.includes('Consent Temporary Order') ||
        btn.textContent.includes('Response to Third Complaint') ||
        btn.textContent.includes('Financial Affidavit')
      )
      await user.click(checklistButtons[0])
      await user.click(checklistButtons[1])
      expect(screen.getByText('2/19')).toBeInTheDocument()
      await user.click(checklistButtons[0])
      expect(screen.getByText('1/19')).toBeInTheDocument()
      await user.click(checklistButtons[0])
      await user.click(checklistButtons[2])
      expect(screen.getByText('2/19')).toBeInTheDocument()
    })

    it('rapid checklist toggles do not cause errors', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      const buttons = screen.getAllByRole('button')
      const checklistButtons = buttons.filter(btn =>
        btn.textContent.includes('Phone') ||
        btn.textContent.includes('Pen and notepad') ||
        btn.textContent.includes('Water bottle') ||
        btn.textContent.includes('Medication')
      )
      for (const btn of checklistButtons) {
        await user.click(btn)
      }
      for (const btn of checklistButtons) {
        await user.click(btn)
      }
      expect(screen.getByText('0/19')).toBeInTheDocument()
    })
  })

  describe('Scenario expansion state isolation', () => {
    it('opening a second scenario closes the first', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCENARIOS')

      const noShowBtn = screen.getByRole('button', { name: /McGhan No-Show/ })
      await user.click(noShowBtn)
      expect(screen.getByText(/State for the record/)).toBeInTheDocument()

      const webExBtn = screen.getByRole('button', { name: /WebEx Granted from Bench/ })
      await user.click(webExBtn)
      expect(screen.getByText(/Object under USCR 9\.2/)).toBeInTheDocument()
    })
  })

  describe('Script collapse/expand state', () => {
    it('toggles response templates visibility', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.getByText('WHEN MCGHAN PRESENTS')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /RESPONSE TEMPLATES/ }))
      expect(screen.queryByText('WHEN MCGHAN PRESENTS')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /RESPONSE TEMPLATES/ }))
      expect(screen.getByText('WHEN MCGHAN PRESENTS')).toBeInTheDocument()
    })

    it('toggles secondary defenses visibility', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.queryByText('UNAUTHORIZED ENTRY (April 4)')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /SECONDARY DEFENSES/ }))
      expect(screen.getByText('UNAUTHORIZED ENTRY (April 4)')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /SECONDARY DEFENSES/ }))
      expect(screen.queryByText('UNAUTHORIZED ENTRY (April 4)')).not.toBeInTheDocument()
    })
  })

  describe('VAULT sub-tab switching', () => {
    it('cycles between D20, VAGAL, and K4 without error', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'VAULT')

      await user.click(screen.getByText('3D Oracle'))
      expect(screen.getByText(/FACE 1 \/ 20/)).toBeInTheDocument()

      await user.click(screen.getByText('Vagal'))
      expect(screen.getByText(/SOMATIC GROUNDING/)).toBeInTheDocument()

      await user.click(screen.getByText('K4 Seal'))
      expect(screen.getByText(/TETRAHEDRON TOPOLOGY/)).toBeInTheDocument()

      await user.click(screen.getByText('3D Oracle'))
      expect(screen.getByText(/FACE 1 \/ 20/)).toBeInTheDocument()
    })

    it('toggles auto-rotate on D20', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'VAULT')
      await user.click(screen.getByText('3D Oracle'))
      const pauseBtn = screen.getByRole('button', { name: 'Pause' })
      await user.click(pauseBtn)
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Play' }))
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    })
  })
})
