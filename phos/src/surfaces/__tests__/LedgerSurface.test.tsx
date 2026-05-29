import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@electric-sql/pglite', () => {
  const mockQuery = vi.fn(() => Promise.resolve({ rows: [] }));
  const mockImpl = vi.fn(() => ({
    waitReady: Promise.resolve(),
    query: mockQuery,
    exec: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }));
  return { PGlite: mockImpl, _mockQuery: mockQuery };
});

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
vi.mock('../lib/EventLogger', () => ({
  logEvent: vi.fn(),
  getEventLog: vi.fn(() => []),
  clearLogs: vi.fn(),
}));
vi.mock('../lib/KarmaEngine', () => ({
  KarmaEngine: {
    getBalanceCents: vi.fn().mockReturnValue(4200),
    getBalance: vi.fn().mockReturnValue(42),
    getHistory: vi.fn().mockReturnValue([]),
    addLove: vi.fn(),
  },
  toDollars: (cents: number) => `$${(cents / 100).toFixed(2)}`,
}));
vi.mock('../lib/CryptoEngine', () => ({
  CryptoEngine: { sealDevice: vi.fn(() => Promise.resolve()), isSealed: vi.fn(() => false) },
}));

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { LedgerSurface } from '../LedgerSurface';

const renderLedger = (spoons = 3) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(LedgerSurface)
    )
  );
};

describe('TRIPER: T - Task', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    renderLedger();
  });

  it('renders L.O.V.E. Ledger header', () => {
    renderLedger();
    expect(screen.getByText(/L\.O\.V\.E\. Ledger/)).toBeTruthy();
  });

  it('renders balance display', async () => {
    await act(async () => {});
    const { container } = renderLedger();
    expect(container.textContent).toContain('Balance');
  });

  it('renders balance subtitle', () => {
    renderLedger();
    expect(screen.getByText(/Ledger of Ontological Volume and Entropy/)).toBeTruthy();
  });

  it('renders filter input', () => {
    renderLedger();
    expect(screen.getByPlaceholderText(/Filter by type/)).toBeTruthy();
  });

  it('renders transactions section header', () => {
    renderLedger();
    expect(screen.getByText(/Transactions/)).toBeTruthy();
  });

  it('renders no transactions message', () => {
    renderLedger();
    expect(screen.getByText(/No transactions yet/)).toBeTruthy();
  });

  it('renders system events section header', () => {
    renderLedger();
    expect(screen.getByText(/System Events/)).toBeTruthy();
  });

  it('renders no events message', () => {
    renderLedger();
    expect(screen.getByText(/No events logged/)).toBeTruthy();
  });
});

describe('TRIPER: R - Resilience', () => {
  it('renders at spoons=0 without crashing', () => {
    renderLedger(0);
  });

  it('renders at spoons=1 without crashing', () => {
    renderLedger(1);
  });
});

describe('TRIPER: I - Interface', () => {
  it('exports LedgerSurface as named export', () => {
    expect(LedgerSurface).toBeDefined();
  });

  it('exports LedgerSurface as default export', async () => {
    const mod = await import('../LedgerSurface');
    expect(mod.default).toBeDefined();
  });
});

describe('TRIPER: P - Purity', () => {
  it('does not leak secrets in rendered output', () => {
    const { container } = renderLedger();
    expect(container.innerHTML).not.toContain('secret');
    expect(container.innerHTML).not.toContain('password');
    expect(container.innerHTML).not.toContain('api_key');
  });
});

describe('TRIPER: E - E2E', () => {
  it('full render cycle completes', () => {
    const { unmount } = renderLedger();
    unmount();
  });

  it('full render cycle with filter interaction', () => {
    const { unmount } = renderLedger();
    const input = screen.getByPlaceholderText(/Filter by type/);
    fireEvent.change(input, { target: { value: 'test' } });
    unmount();
  });
});

describe('TRIPER: R - Regression', () => {
  it('renders multiple times without state leakage', () => {
    const { unmount } = renderLedger();
    unmount();
    renderLedger();
    expect(screen.getByText(/L\.O\.V\.E\. Ledger/)).toBeTruthy();
  });
});
