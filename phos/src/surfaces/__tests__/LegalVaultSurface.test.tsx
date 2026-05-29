import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
vi.mock('../lib/ChaosVault', () => ({
  getChaosVault: vi.fn(() => Promise.resolve({
    query: vi.fn(() => Promise.resolve({ rows: [] })),
  })),
  recentEntries: vi.fn(() => Promise.resolve([])),
}));

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { LegalVaultSurface } from '../LegalVaultSurface';

const renderLegalVault = (spoons = 3) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(LegalVaultSurface)
    )
  );
};

describe('TRIPER: T - Task', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    renderLegalVault();
  });

  it('renders Legal Vault header', () => {
    renderLegalVault();
    expect(screen.getByText(/Legal Vault/)).toBeTruthy();
  });

  it('renders section count', () => {
    const { container } = renderLegalVault();
    expect(container.textContent).toContain('10 sections');
  });

  it('renders category filter buttons', () => {
    renderLegalVault();
    const allBtns = screen.getAllByRole('button');
    const settlementBtns = allBtns.filter((b) => b.textContent?.includes('settlement'));
    const corporateBtns = allBtns.filter((b) => b.textContent?.includes('corporate'));
    const technicalBtns = allBtns.filter((b) => b.textContent?.includes('technical'));
    const taxBtns = allBtns.filter((b) => b.textContent?.includes('tax'));
    expect(settlementBtns.length).toBeGreaterThanOrEqual(1);
    expect(corporateBtns.length).toBeGreaterThanOrEqual(1);
    expect(technicalBtns.length).toBeGreaterThanOrEqual(1);
    expect(taxBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('renders search input', () => {
    renderLegalVault();
    expect(screen.getByPlaceholderText(/Search legal sections/)).toBeTruthy();
  });

  it('renders legal section titles', () => {
    renderLegalVault();
    expect(screen.getByText(/Stipulation of Present Corporate Value/)).toBeTruthy();
    expect(screen.getByText(/Transfer of Marital Residence/)).toBeTruthy();
    expect(screen.getByText(/PQC Family Vault/)).toBeTruthy();
  });

  it('renders index to knowledge graph button', () => {
    renderLegalVault();
    expect(screen.getByText(/Index to Knowledge Graph/)).toBeTruthy();
  });

  it('expands section on click', () => {
    renderLegalVault();
    fireEvent.click(screen.getByText(/Stipulation of Present Corporate Value/));
    expect(screen.getByText(/Husband is the Founder\/CEO of P31 Labs/)).toBeTruthy();
  });

  it('filters sections by category', () => {
    renderLegalVault();
    const allBtns = screen.getAllByRole('button');
    const settlementBtn = allBtns.find((b) => b.textContent?.includes('settlement') && !b.textContent?.includes('all'));
    if (settlementBtn) fireEvent.click(settlementBtn);
    expect(screen.getByText(/Stipulation of Present Corporate Value/)).toBeTruthy();
    expect(screen.queryByText(/Corporate Governance/)).toBeNull();
  });

  it('filters sections by search query', () => {
    renderLegalVault();
    const input = screen.getByPlaceholderText(/Search legal sections/);
    fireEvent.change(input, { target: { value: 'COCOMO' } });
    expect(screen.getByText(/COCOMO II Valuation Rebuttal/)).toBeTruthy();
    expect(screen.queryByText(/Corporate Governance/)).toBeNull();
  });
});

describe('TRIPER: R - Resilience', () => {
  it('renders at spoons=0 without crashing', () => {
    renderLegalVault(0);
  });

  it('renders at spoons=1 without crashing', () => {
    renderLegalVault(1);
  });
});

describe('TRIPER: I - Interface', () => {
  it('exports LegalVaultSurface as named export', () => {
    expect(LegalVaultSurface).toBeDefined();
  });

  it('exports LegalVaultSurface as default export', async () => {
    const mod = await import('../LegalVaultSurface');
    expect(mod.default).toBeDefined();
  });
});

describe('TRIPER: P - Purity', () => {
  it('does not leak secrets in rendered output', () => {
    const { container } = renderLegalVault();
    expect(container.innerHTML).not.toContain('secret');
    expect(container.innerHTML).not.toContain('password');
    expect(container.innerHTML).not.toContain('api_key');
  });
});

describe('TRIPER: E - E2E', () => {
  it('full render cycle completes', () => {
    const { unmount } = renderLegalVault();
    unmount();
  });

  it('full render cycle with section expand and collapse', () => {
    const { unmount } = renderLegalVault();
    fireEvent.click(screen.getByText(/Stipulation of Present Corporate Value/));
    fireEvent.click(screen.getByText(/Stipulation of Present Corporate Value/));
    unmount();
  });
});

describe('TRIPER: R - Regression', () => {
  it('renders multiple times without state leakage', () => {
    const { unmount } = renderLegalVault();
    unmount();
    renderLegalVault();
    expect(screen.getByText(/Legal Vault/)).toBeTruthy();
  });
});
