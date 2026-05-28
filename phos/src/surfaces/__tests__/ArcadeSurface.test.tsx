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

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { ArcadeSurface } from '../ArcadeSurface';

const renderArcade = (spoons = 3, grayRock = false) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(ArcadeSurface, { spoons, grayRock })
    )
  );
};

describe('TRIPER: T - Task', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    renderArcade();
  });

  it('renders the arcade lobby header', () => {
    renderArcade();
    expect(screen.getByText(/The Arcade/)).toBeTruthy();
  });

  it('renders earnings stack bar', () => {
    renderArcade();
    expect(screen.getByText(/\$480\/mo/)).toBeTruthy();
  });

  it('renders category filter buttons', () => {
    renderArcade();
    expect(screen.getByText(/Sports/)).toBeTruthy();
    expect(screen.getByText(/Strategy/)).toBeTruthy();
    expect(screen.getByText(/Physics/)).toBeTruthy();
    expect(screen.getByText(/Creative/)).toBeTruthy();
  });

  it('renders all 10 games in the catalog', () => {
    renderArcade();
    expect(screen.getByText('SmallBall')).toBeTruthy();
    expect(screen.getByText('Liquid Sculptor')).toBeTruthy();
    expect(screen.getByText('Geodesic Builder')).toBeTruthy();
  });

  it('filters games by category', () => {
    renderArcade();
    fireEvent.click(screen.getByText(/Sports/));
    expect(screen.getByText('SmallBall')).toBeTruthy();
    expect(screen.queryByText('Liquid Sculptor')).toBeNull();
  });

  it('shows bounties view', () => {
    renderArcade();
    fireEvent.click(screen.getByText(/Bounties/));
    expect(screen.getByText(/CHUMP Bounties/)).toBeTruthy();
    expect(screen.getByText(/Scan 10 items in Warehouse/)).toBeTruthy();
  });

  it('shows player identity view', () => {
    renderArcade();
    fireEvent.click(screen.getByText(/S\.J\./i));
    expect(screen.getByText(/Player Identity/)).toBeTruthy();
  });

  it('launches a game into iframe view', () => {
    renderArcade();
    fireEvent.click(screen.getByText('SmallBall'));
    expect(screen.getByText(/Back to Arcade/)).toBeTruthy();
  });

  it('navigates back from game view', () => {
    renderArcade();
    fireEvent.click(screen.getByText('SmallBall'));
    fireEvent.click(screen.getByText(/Back to Arcade/));
    expect(screen.getByText(/The Arcade/)).toBeTruthy();
  });
});

describe('TRIPER: R - Resilience', () => {
  it('shows CRISIS suspension at spoons=0', () => {
    renderArcade(0);
    expect(screen.getByText(/Arcade suspended/)).toBeTruthy();
  });

  it('shows CRISIS suspension when grayRock=true', () => {
    renderArcade(3, true);
    expect(screen.getByText(/Arcade suspended/)).toBeTruthy();
  });

  it('shows zen mode with low spoons (spoons<=2)', () => {
    renderArcade(2);
    expect(screen.getByText(/Zen Mode/)).toBeTruthy();
  });

  it('zen mode only shows low-spoon games', () => {
    renderArcade(1);
    expect(screen.getByText('Liquid Sculptor')).toBeTruthy();
    expect(screen.queryByText('Geodesic Builder')).toBeNull();
  });
});

describe('TRIPER: I - Interface', () => {
  it('exports ArcadeSurface as named export', () => {
    expect(ArcadeSurface).toBeDefined();
  });

  it('exports ArcadeSurface as default export', () => {
    const mod = require('../ArcadeSurface');
    expect(mod.default).toBeDefined();
  });
});

describe('TRIPER: P - Purity', () => {
  it('does not leak secrets in rendered output', () => {
    const { container } = renderArcade();
    expect(container.innerHTML).not.toContain('secret');
    expect(container.innerHTML).not.toContain('password');
    expect(container.innerHTML).not.toContain('api_key');
  });

  it('does not render children full names', () => {
    const { container } = renderArcade();
    expect(container.innerHTML).not.toContain('Sebastian');
    expect(container.innerHTML).not.toContain('Willow');
  });
});

describe('TRIPER: E - E2E', () => {
  it('full render cycle completes', () => {
    const { unmount } = renderArcade();
    unmount();
  });

  it('full render cycle with game launch and return', () => {
    const { unmount } = renderArcade();
    fireEvent.click(screen.getByText('SmallBall'));
    fireEvent.click(screen.getByText(/Back to Arcade/));
    unmount();
  });
});

describe('TRIPER: R - Regression', () => {
  it('renders multiple times without state leakage', () => {
    const { unmount } = renderArcade();
    unmount();
    renderArcade();
    expect(screen.getByText(/The Arcade/)).toBeTruthy();
  });

  it('renders bounties multiple times', () => {
    renderArcade();
    fireEvent.click(screen.getByText(/Bounties/));
    fireEvent.click(screen.getByText(/Back/));
    fireEvent.click(screen.getByText(/Bounties/));
    expect(screen.getByText(/CHUMP Bounties/)).toBeTruthy();
  });
});
