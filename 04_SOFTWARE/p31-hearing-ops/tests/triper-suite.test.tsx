import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HearingPrep from '../src/HearingPrep'
import { ErrorBoundary } from '../src/ErrorBoundary'

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(() => () => {}),
}))

function renderApp() {
  return render(<HearingPrep />)
}

async function clickTab(user, label) {
  const buttons = screen.getAllByRole('button')
  const btn = buttons.find(b => b.textContent.includes(label))
  if (!btn) throw new Error(`Tab button containing "${label}" not found`)
  await user.click(btn)
}

function getCounter() {
  const divs = document.querySelectorAll('div')
  for (const div of divs) {
    const text = div.textContent || ''
    if (/^\d+\/\d+$/.test(text.trim()) && div.children.length === 0) {
      return text.trim()
    }
  }
  return null
}

function findChecklistButton(label) {
  const all = screen.getAllByRole('button')
  const found = all.filter(b => {
    if (b.textContent.length < 10) return false
    const spans = b.querySelectorAll('span')
    for (const span of spans) {
      if (span.textContent.includes(label) && span.textContent.length > label.length) return true
    }
    return false
  })
  return found[0]
}

const TOTAL_ITEMS = 23

afterEach(cleanup)

describe('T - TASK TESTS', () => {
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
      ;['MISSION', 'SCENARIOS', 'SCRIPT', 'DOCKET', 'LAW', 'RULES', 'FOLDER', 'VAULT'].forEach(label => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.some(b => b.textContent.includes(label))).toBe(true)
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
    it('navigates to SCENARIOS', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCENARIOS')
      expect(screen.getByText('DECISION TREE — TAP TO EXPAND')).toBeInTheDocument()
    })

    it('navigates to SCRIPT', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.getByText('OPENING + TIMELINE — READ EXACTLY')).toBeInTheDocument()
    })

    it('navigates to DOCKET', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'DOCKET')
      expect(screen.getByText('CRITICAL DOCKET ENTRIES')).toBeInTheDocument()
    })

    it('navigates to LAW', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'LAW')
      expect(screen.getByText('INCHOATE')).toBeInTheDocument()
    })

    it('navigates to RULES', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'RULES')
      expect(screen.getByText('✓ DO')).toBeInTheDocument()
      expect(screen.getByText('✗ DO NOT')).toBeInTheDocument()
    })

    it('navigates to FOLDER', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      expect(screen.getByText('FOLDER CHECKLIST')).toBeInTheDocument()
    })

    it('navigates to VAULT', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'VAULT')
      expect(screen.getByText('P31 Omnibus')).toBeInTheDocument()
    })

    it('navigates through all tabs in sequence', async () => {
      const user = userEvent.setup()
      renderApp()
      for (const tab of ['MISSION', 'SCENARIOS', 'SCRIPT', 'DOCKET', 'LAW', 'RULES', 'FOLDER', 'VAULT']) {
        await clickTab(user, tab)
      }
    })
  })

  describe('Script content loads correctly', () => {
    it('displays opening script block', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.getByText(/OPENING \(SAY EXACTLY\)/)).toBeInTheDocument()
    })

    it('displays timeline statement block', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      expect(screen.getByText(/TIMELINE STATEMENT \(UNDER 90 SECONDS\)/)).toBeInTheDocument()
    })

    it('timeline references key date April 4 in the timeline block', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCRIPT')
      const matches = screen.getAllByText(/April 4/)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('docket tab references Entry 92 and Entry 104', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'DOCKET')
      const all92 = screen.getAllByText(/Entry 92/)
      const all104 = screen.getAllByText(/Entry 104/)
      expect(all92.length).toBeGreaterThan(0)
      expect(all104.length).toBeGreaterThan(0)
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
    it('shows checklist with 0 counter initially', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      expect(getCounter()).toBe(`0/${TOTAL_ITEMS}`)
    })

    it('toggles a single checklist item', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      const btn = findChecklistButton('Docket printout')
      expect(btn).toBeDefined()
      await user.click(btn)
      expect(getCounter()).toBe(`1/${TOTAL_ITEMS}`)
    })

    it('toggles a checklist item back off', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      const btn = findChecklistButton('Docket printout')
      await user.click(btn)
      expect(getCounter()).toBe(`1/${TOTAL_ITEMS}`)
      await user.click(btn)
      expect(getCounter()).toBe(`0/${TOTAL_ITEMS}`)
    })

    it('can toggle multiple items', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      const b1 = findChecklistButton('Docket printout')
      const b2 = findChecklistButton('Order on Pending Motions')
      const b3 = findChecklistButton('Consent Temporary Order')
      await user.click(b1)
      await user.click(b2)
      await user.click(b3)
      expect(getCounter()).toBe(`3/${TOTAL_ITEMS}`)
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

describe('R - RESILIENCE TESTS', () => {
  describe('ErrorBoundary', () => {
    it('displays fallback UI when child throws', () => {
      const ThrowingComponent = () => { throw new Error('Test error') }
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )
      expect(screen.getByText('Something came loose')).toBeInTheDocument()
      expect(screen.getByText('Reload')).toBeInTheDocument()
      consoleSpy.mockRestore()
    })

    it('shows children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      )
      expect(screen.getByText('Normal content')).toBeInTheDocument()
    })

    it('stores crash info in localStorage', () => {
      const ThrowingComponent = () => { throw new Error('Crash test') }
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )
      const stored = localStorage.getItem('p31_hearing_ops_crash')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored)
      expect(parsed.message).toBe('Crash test')
      consoleSpy.mockRestore()
      localStorage.removeItem('p31_hearing_ops_crash')
    })
  })

  describe('Checklist state initialization', () => {
    it('checklist initializes with all items unchecked', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      expect(getCounter()).toBe(`0/${TOTAL_ITEMS}`)
    })
  })

  describe('Full render without crashes', () => {
    it('renders all tabs without errors', () => {
      renderApp()
      ;['MISSION', 'SCENARIOS', 'SCRIPT', 'DOCKET', 'LAW', 'RULES', 'FOLDER', 'VAULT'].forEach(tab => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.some(b => b.textContent.includes(tab))).toBe(true)
      })
    })
  })
})

describe('I - INTERFACE TESTS', () => {
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
      ;['INCHOATE', 'NUNC PRO TUNC', 'CONTEMPT', 'PARENTAL RIGHTS', 'DUE PROCESS', 'WEBEX', 'RECORDING', 'CONSENT ORDER', 'VISITATION'].forEach(cat => {
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

    it('has VAULT tab with 3 sub-tabs', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'VAULT')
      expect(screen.getByText('3D Oracle')).toBeInTheDocument()
      expect(screen.getByText('Vagal')).toBeInTheDocument()
      expect(screen.getByText('K4 Seal')).toBeInTheDocument()
    })
  })

  describe('No external API contracts', () => {
    it('VAULT content is self-contained', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'VAULT')
      expect(screen.getByText(/LOCAL ONLY — NO CLOUD/)).toBeInTheDocument()
    })
  })
})

describe('P - PURITY TESTS', () => {
  describe('No PII leaked in rendered content', () => {
    it('does not expose SSN patterns', () => {
      renderApp()
      expect(document.body.innerHTML).not.toMatch(/\d{3}-\d{2}-\d{4}/)
    })

    it('does not contain Sebastian in app content', () => {
      renderApp()
      expect(document.body.innerHTML).not.toMatch(/\bSebastian\b/)
    })

    it('does not contain Willow in app content', () => {
      renderApp()
      expect(document.body.innerHTML).not.toMatch(/\bWillow\b/)
    })
  })

  describe('Critical docket references are correct', () => {
    it('references Entry 92 for Third Complaint', () => {
      renderApp()
      expect(screen.getByText(/Entry 92/)).toBeInTheDocument()
    })

    it('references Entry 104 as key order', () => {
      renderApp()
      expect(screen.getByText(/Entry 104/)).toBeInTheDocument()
    })

    it('references Entry 29 on docket tab', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'DOCKET')
      expect(screen.getByText('29')).toBeInTheDocument()
    })
  })
})

describe('E - E2E TESTS', () => {
  describe('Full navigation flow', () => {
    it('navigates MISSION to SCRIPT to DOCKET', async () => {
      const user = userEvent.setup()
      renderApp()
      expect(screen.getByText('CONTEMPT HEARING')).toBeInTheDocument()
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
      const btn = findChecklistButton('Docket printout')
      if (btn) await user.click(btn)
      expect(getCounter()).toBe(`1/${TOTAL_ITEMS}`)
    })

    it('navigates to VAULT and switches sub-tabs', async () => {
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
    it('app renders fully without network', () => {
      renderApp()
      expect(screen.getByText('P31 HEARING OPS')).toBeInTheDocument()
    })

    it('all tabs render static content without async data', async () => {
      const user = userEvent.setup()
      renderApp()
      for (const tab of ['MISSION', 'SCENARIOS', 'SCRIPT', 'DOCKET', 'LAW', 'RULES', 'FOLDER', 'VAULT']) {
        await clickTab(user, tab)
        expect(document.body.innerHTML.length).toBeGreaterThan(100)
      }
    })
  })
})

describe('R - REGRESSION TESTS', () => {
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

    it('handles 10 consecutive tab switches', async () => {
      const user = userEvent.setup()
      renderApp()
      const allTabs = ['MISSION', 'SCENARIOS', 'SCRIPT', 'DOCKET', 'LAW', 'RULES', 'FOLDER', 'VAULT']
      for (let i = 0; i < 10; i++) {
        await clickTab(user, allTabs[i % allTabs.length])
      }
    })
  })

  describe('Multiple checklist toggles work correctly', () => {
    it('alternates checklist items without state corruption', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      const b1 = findChecklistButton('Docket printout')
      const b3 = findChecklistButton('Supersedeas Application')
      const b4 = findChecklistButton('Phone')
      const b5 = findChecklistButton('Transcript invoice')
      await user.click(b1)
      expect(getCounter()).toBe(`1/${TOTAL_ITEMS}`)
      await user.click(b3)
      expect(getCounter()).toBe(`2/${TOTAL_ITEMS}`)
      await user.click(b1)
      expect(getCounter()).toBe(`1/${TOTAL_ITEMS}`)
      await user.click(b1)
      expect(getCounter()).toBe(`2/${TOTAL_ITEMS}`)
      await user.click(b4)
      expect(getCounter()).toBe(`3/${TOTAL_ITEMS}`)
      await user.click(b5)
      expect(getCounter()).toBe(`4/${TOTAL_ITEMS}`)
      await user.click(b5)
      expect(getCounter()).toBe(`3/${TOTAL_ITEMS}`)
    })

    it('rapid checklist toggles round trip', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'FOLDER')
      const targets = [
        findChecklistButton('Phone'),
        findChecklistButton('Pen and notepad'),
        findChecklistButton('Water bottle'),
        findChecklistButton('Medication'),
      ].filter(Boolean)
      for (const btn of targets) await user.click(btn)
      for (const btn of targets) await user.click(btn)
      expect(getCounter()).toBe(`0/${TOTAL_ITEMS}`)
    })
  })

  describe('Scenario expansion state isolation', () => {
    it('can expand multiple scenario cards', async () => {
      const user = userEvent.setup()
      renderApp()
      await clickTab(user, 'SCENARIOS')
      await user.click(screen.getByRole('button', { name: /McGhan No-Show/ }))
      expect(screen.getByText(/State for the record/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /WebEx Granted from Bench/ }))
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
    it('cycles between D20, VAGAL, and K4', async () => {
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
      await user.click(screen.getByRole('button', { name: 'Pause' }))
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Play' }))
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    })
  })
})
