import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/phos-api', () => ({
  phosAPI: {
    connectStream: () => ({ disconnect: () => {}, send: vi.fn() }),
    getAtmosphere: () => Promise.resolve({
      preset: {
        starfield: 'dense',
        palette: { primary: '#39ff14', secondary: '#00e5ff', accent: '#b026ff', background: '#0a0a0a', text: '#e0e0e0', muted: '#664466' },
        motion: { enabled: true, speed: 0.5, particleCount: 200, transitionMs: 800 },
        tracking: true, voice: true,
      },
    }),
    exchangeDriveCode: vi.fn(() => Promise.resolve({ accessToken: 'mock-token', refreshToken: 'mock-refresh' })),
    getDriveAuthUrl: vi.fn(() => Promise.resolve({ authUrl: 'https://accounts.google.com/o/oauth2' })),
    refreshDriveToken: vi.fn(() => Promise.resolve('new-token')),
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
vi.mock('../lib/Embedder', () => ({
  ingestAndEmbed: vi.fn(() => Promise.resolve({ embedded: 1 })),
}));

Object.defineProperty(window, 'localStorage', {
  value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
  writable: true,
});

vi.stubGlobal('fetch', vi.fn());

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { DriveSurface } from '../DriveSurface';

const renderDrive = (spoons = 3) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(DriveSurface)
    )
  );
};

describe('TRIPER: T - Task', () => {
  beforeEach(() => { vi.clearAllMocks(); (global.fetch as any).mockReset(); });

  it('renders without crashing', () => {
    renderDrive();
  });

  it('renders connect button when not connected', () => {
    renderDrive();
    expect(screen.getByText(/Connect Google Drive/)).toBeTruthy();
  });

  it('renders Google Drive header', () => {
    renderDrive();
    expect(screen.getByText(/Google Drive/)).toBeTruthy();
  });

  it('renders description text', () => {
    renderDrive();
    expect(screen.getByText(/Connect your Google Drive to ingest/)).toBeTruthy();
  });

  it('renders connect button', () => {
    renderDrive();
    const btn = screen.getByText(/Connect Google Drive/);
    expect(btn).toBeTruthy();
  });
});

describe('TRIPER: R - Resilience', () => {
  it('renders at spoons=0 without crashing', () => {
    renderDrive(0);
  });

  it('renders at spoons=1 without crashing', () => {
    renderDrive(1);
  });
});

describe('TRIPER: I - Interface', () => {
  it('exports DriveSurface as named export', () => {
    expect(DriveSurface).toBeDefined();
  });

  it('exports DriveSurface as default export', async () => {
    const mod = await import('../DriveSurface');
    expect(mod.default).toBeDefined();
  });
});

describe('TRIPER: P - Purity', () => {
  it('does not leak secrets in rendered output', () => {
    const { container } = renderDrive();
    expect(container.innerHTML).not.toContain('secret');
    expect(container.innerHTML).not.toContain('password');
    expect(container.innerHTML).not.toContain('api_key');
  });
});

describe('TRIPER: E - E2E', () => {
  it('full render cycle completes', () => {
    const { unmount } = renderDrive();
    unmount();
  });
});

describe('TRIPER: R - Regression', () => {
  it('renders multiple times without state leakage', () => {
    const { unmount } = renderDrive();
    unmount();
    renderDrive();
    expect(screen.getByText(/Connect Google Drive/)).toBeTruthy();
  });
});
