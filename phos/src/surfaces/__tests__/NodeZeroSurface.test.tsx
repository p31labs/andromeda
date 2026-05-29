import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/phos-api', () => ({
  phosAPI: {
    connectStream: () => ({ disconnect: () => {}, send: vi.fn() }),
    getAtmosphere: () => Promise.resolve({
      preset: {
        starfield: 'dense',
        palette: { primary: '#39ff14', secondary: '#00e5ff', accent: '#b026ff', background: '#0a0a0a', text: '#e0e0e0', muted: '#666666' },
        motion: { enabled: true, speed: 0.5, particleCount: 200, transitionMs: 800 },
        tracking: true, voice: true,
      },
    }),
  },
  PHOSAPIError: class PHOSAPIError extends Error { constructor(msg: string) { super(msg); this.name = 'PHOSAPIError'; } },
}));

vi.mock('../lib/VoiceEngine', () => ({ speak: vi.fn(), cancelSpeech: vi.fn() }));
vi.mock('../lib/EventLogger', () => ({ logEvent: vi.fn(), getEventLog: vi.fn(() => []), clearLogs: vi.fn() }));
vi.mock('../lib/KarmaEngine', () => ({
  KarmaEngine: { getBalance: vi.fn(() => 0), addLove: vi.fn(), getHistory: vi.fn(() => []) },
}));
vi.mock('../lib/CryptoEngine', () => ({
  CryptoEngine: { sealDevice: vi.fn(() => Promise.resolve()), isSealed: vi.fn(() => false) },
}));
vi.mock('@electric-sql/pglite', () => {
  const mockQuery = vi.fn(() => Promise.resolve({ rows: [] }));
  const mockImpl = vi.fn(() => ({
    waitReady: Promise.resolve(),
    query: mockQuery,
  }));
  return { PGlite: mockImpl, _mockQuery: mockQuery };
}));
vi.mock('../lib/PassportContext', () => ({
  useHardenedPassport: () => ({
    state: {
      identity: { displayName: 'Test User', isOperator: true, truncatedKeyId: 'abc123' },
      visuals: { theme: 'dark', motion: 'reduced', screenComfort: 75, animationsEnabled: true },
      linguistics: { tone: 'direct', formatPreference: 'concise', responseLength: 'medium', avoidPatterns: [] },
      context: { currentFocus: 'testing', domain: 'qa', toolsUsed: ['vitest'] },
    },
    isHydrated: true,
    refresh: vi.fn(),
  }),
}));
vi.mock('../components/BiologicalAnchor', () => ({
  BiologicalAnchor: () => React.createElement('div', { 'data-testid': 'bio-anchor' }, 'BiologicalAnchor'),
}));
vi.mock('../components/TheLedger', () => ({
  TheLedger: () => React.createElement('div', { 'data-testid': 'the-ledger' }, 'TheLedger'),
}));
vi.mock('../components/TheLoveLedger', () => ({
  LoveLedger: () => React.createElement('div', { 'data-testid': 'love-ledger' }, 'LoveLedger'),
}));
vi.mock('lucide-react', () => {
  const icons: Record<string, any> = {};
  for (const name of ['Shield', 'Activity', 'Briefcase', 'Eye', 'Fingerprint', 'Bone', 'Calculator', 'Anchor', 'Heart', 'Star', 'Lock', 'Unlock', 'Settings', 'Wifi', 'Zap']) {
    icons[name] = () => React.createElement('span', null, name);
  }
  return icons;
});

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { NodeZeroSurface } from '../NodeZeroSurface';

const renderNodeZero = (spoonLevel = 3) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoonLevel, remoteEnabled: false },
      React.createElement(NodeZeroSurface, { orbStatus: 'active' as any, spoonLevel })
    )
  );
};

describe('TRIPER: T - Task', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    renderNodeZero();
  });

  it('renders system layer header', () => {
    renderNodeZero();
    expect(screen.getByText(/PHOS SYSTEM LAYER ALPHA/)).toBeTruthy();
  });

  it('renders spoon level indicator', () => {
    renderNodeZero();
    expect(screen.getByText(/SPARKS: 3\/5/)).toBeTruthy();
  });

  it('renders all 4 panel buttons', () => {
    renderNodeZero();
    expect(screen.getByText(/ENDOCRINE TRACKS/)).toBeTruthy();
    expect(screen.getByText(/DEFERRED INVOICING CORE/)).toBeTruthy();
    expect(screen.getByText(/OMNI OBJECT ARCHIVE/)).toBeTruthy();
    expect(screen.getByText(/COGNITIVE PASSPORT/)).toBeTruthy();
  });

  it('toggles biological panel open', () => {
    renderNodeZero();
    fireEvent.click(screen.getByText(/ENDOCRINE TRACKS/));
    expect(screen.getByTestId('bio-anchor')).toBeTruthy();
  });

  it('toggles ledger panel open', () => {
    renderNodeZero();
    fireEvent.click(screen.getByText(/DEFERRED INVOICING CORE/));
    expect(screen.getByTestId('the-ledger')).toBeTruthy();
  });

  it('toggles archive panel open', () => {
    renderNodeZero();
    fireEvent.click(screen.getByText(/OMNI OBJECT ARCHIVE/));
    expect(screen.getByTestId('love-ledger')).toBeTruthy();
  });

  it('toggles cognitive passport panel open', () => {
    renderNodeZero();
    fireEvent.click(screen.getByText(/COGNITIVE PASSPORT/));
    expect(screen.getByText(/Identity/)).toBeTruthy();
  });

  it('renders passport identity data', () => {
    renderNodeZero();
    fireEvent.click(screen.getByText(/COGNITIVE PASSPORT/));
    expect(screen.getByText('Test User')).toBeTruthy();
    expect(screen.getByText('OPERATOR')).toBeTruthy();
  });

  it('renders passport visual state data', () => {
    renderNodeZero();
    fireEvent.click(screen.getByText(/COGNITIVE PASSPORT/));
    expect(screen.getByText('dark')).toBeTruthy();
    expect(screen.getByText('reduced')).toBeTruthy();
    expect(screen.getByText('ON')).toBeTruthy();
  });

  it('renders passport context data', () => {
    renderNodeZero();
    fireEvent.click(screen.getByText(/COGNITIVE PASSPORT/));
    expect(screen.getByText('testing')).toBeTruthy();
    expect(screen.getByText('qa')).toBeTruthy();
    expect(screen.getByText('vitest')).toBeTruthy();
  });
});

describe('TRIPER: R - Resilience', () => {
  it('renders at spoonLevel=0 without crashing', () => {
    renderNodeZero(0);
    expect(screen.getByText(/SPARKS: 0\/5/)).toBeTruthy();
  });

  it('renders at spoonLevel=1 without crashing', () => {
    renderNodeZero(1);
    expect(screen.getByText(/SPARKS: 1\/5/)).toBeTruthy();
  });
});

describe('TRIPER: I - Interface', () => {
  it('exports NodeZeroSurface as named export', () => {
    expect(NodeZeroSurface).toBeDefined();
  });
});

describe('TRIPER: P - Purity', () => {
  it('does not leak secrets in rendered output', () => {
    const { container } = renderNodeZero();
    expect(container.innerHTML).not.toContain('secret');
    expect(container.innerHTML).not.toContain('password');
    expect(container.innerHTML).not.toContain('api_key');
  });
});

describe('TRIPER: E - E2E', () => {
  it('full render cycle completes', () => {
    const { unmount } = renderNodeZero();
    unmount();
  });

  it('full render cycle with panel toggle', () => {
    const { unmount } = renderNodeZero();
    fireEvent.click(screen.getByText(/ENDOCRINE TRACKS/));
    fireEvent.click(screen.getByText(/ENDOCRINE TRACKS/));
    unmount();
  });
});

describe('TRIPER: R - Regression', () => {
  it('renders multiple times without state leakage', () => {
    const { unmount } = renderNodeZero();
    unmount();
    renderNodeZero();
    expect(screen.getByText(/PHOS SYSTEM LAYER ALPHA/)).toBeTruthy();
  });
});
