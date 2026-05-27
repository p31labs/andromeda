import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@electric-sql/pglite', () => {
  const mockQuery = vi.fn(() => Promise.resolve({ rows: [] }));
  const mockImpl = vi.fn(() => ({
    waitReady: Promise.resolve(),
    query: mockQuery,
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
vi.mock('../lib/EventLogger', () => ({ logEvent: vi.fn(), getEventLog: vi.fn(() => []), clearLogs: vi.fn() }));
vi.mock('../lib/KarmaEngine', () => ({
  KarmaEngine: { getBalance: vi.fn(() => 0), addLove: vi.fn(), getHistory: vi.fn(() => []) },
}));
vi.mock('../lib/CryptoEngine', () => ({
  CryptoEngine: { sealDevice: vi.fn(() => Promise.resolve()), isSealed: vi.fn(() => false) },
}));

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { WarehouseSurface } from '../WarehouseSurface';

describe('WarehouseSurface', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should show loading state initially', () => {
    render(
      React.createElement(
        AtmosphereProvider,
        { initialSurface: 'GREETING' as any, initialSpoons: 3, remoteEnabled: false },
        React.createElement(WarehouseSurface)
      )
    );
    expect(screen.getByText(/Loading warehouse/i)).toBeTruthy();
  });

  it('should render warehouse content after loading', async () => {
    render(
      React.createElement(
        AtmosphereProvider,
        { initialSurface: 'GREETING' as any, initialSpoons: 3, remoteEnabled: false },
        React.createElement(WarehouseSurface)
      )
    );
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Forge/i)).toBeTruthy();
  });

  it('should handle PGLite errors gracefully', async () => {
    const { PGlite } = await import('@electric-sql/pglite');
    (PGlite as any).mockImplementationOnce(() => ({
      waitReady: Promise.reject(new Error('DB failed')),
      query: vi.fn(),
    }));
    expect(() => {
      render(
        React.createElement(
          AtmosphereProvider,
          { initialSurface: 'GREETING' as any, initialSpoons: 3, remoteEnabled: false },
          React.createElement(WarehouseSurface)
        )
      );
    }).not.toThrow();
  });
});
