import React from 'react';
import { render, screen, act } from '@testing-library/react';
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
});

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { RetroVaultSurface } from '../RetroVaultSurface';

const renderRetroVault = (spoons = 3) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(RetroVaultSurface)
    )
  );
};

describe('TRIPER: T - Task', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    renderRetroVault();
  });

  it('shows loading state initially', () => {
    renderRetroVault();
    expect(screen.getByText(/Loading vault data/)).toBeTruthy();
  });

  it('renders vault header after loading', async () => {
    renderRetroVault();
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Retro Vault/)).toBeTruthy();
  });

  it('renders total items stat after loading', async () => {
    renderRetroVault();
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Total Items/)).toBeTruthy();
  });

  it('renders recently added section after loading', async () => {
    renderRetroVault();
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Recently Added/)).toBeTruthy();
  });

  it('renders no entities message when empty', async () => {
    renderRetroVault();
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/No entities yet/)).toBeTruthy();
  });
});

describe('TRIPER: R - Resilience', () => {
  it('renders at spoons=0 without crashing', () => {
    renderRetroVault(0);
  });

  it('renders at spoons=1 without crashing', () => {
    renderRetroVault(1);
  });

  it('handles PGLite errors gracefully', async () => {
    const { PGlite } = await import('@electric-sql/pglite');
    (PGlite as any).mockImplementationOnce(() => ({
      waitReady: Promise.reject(new Error('DB failed')),
      query: vi.fn(),
    }));
    expect(() => {
      renderRetroVault();
    }).not.toThrow();
  });
});

describe('TRIPER: I - Interface', () => {
  it('exports RetroVaultSurface as named export', () => {
    expect(RetroVaultSurface).toBeDefined();
  });

  it('exports RetroVaultSurface as default export', async () => {
    const mod = await import('../RetroVaultSurface');
    expect(mod.default).toBeDefined();
  });
});

describe('TRIPER: P - Purity', () => {
  it('does not leak secrets in rendered output', () => {
    const { container } = renderRetroVault();
    expect(container.innerHTML).not.toContain('secret');
    expect(container.innerHTML).not.toContain('password');
    expect(container.innerHTML).not.toContain('api_key');
  });
});

describe('TRIPER: E - E2E', () => {
  it('full render cycle completes', () => {
    const { unmount } = renderRetroVault();
    unmount();
  });

  it('full render cycle after loading', async () => {
    const { unmount } = renderRetroVault();
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    unmount();
  });
});

describe('TRIPER: R - Regression', () => {
  it('renders multiple times without state leakage', () => {
    const { unmount } = renderRetroVault();
    unmount();
    renderRetroVault();
    expect(screen.getByText(/Loading vault data/)).toBeTruthy();
  });
});
