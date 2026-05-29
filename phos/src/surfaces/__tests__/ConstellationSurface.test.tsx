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

vi.mock('lucide-react', () => ({
  Scissors: () => React.createElement('span', null, 'scissors'),
  Hammer: () => React.createElement('span', null, 'hammer'),
  Trophy: () => React.createElement('span', null, 'trophy'),
  Cpu: () => React.createElement('span', null, 'cpu'),
  Utensils: () => React.createElement('span', null, 'utensils'),
  LineChart: () => React.createElement('span', null, 'chart'),
  BookOpen: () => React.createElement('span', null, 'book'),
  ChevronRight: () => React.createElement('span', null, 'chevron'),
  ExternalLink: () => React.createElement('span', null, 'link'),
}));

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { ConstellationSurface } from '../ConstellationSurface';

const renderConstellation = (spoons = 3, grayRock = false) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(ConstellationSurface)
    )
  );
};

describe('TRIPER: T - Task', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    renderConstellation();
  });

  it('renders all 7 app nodes', () => {
    renderConstellation();
    expect(screen.getByText('Chromatica')).toBeTruthy();
    expect(screen.getByText('Fence Pro')).toBeTruthy();
    expect(screen.getByText('Fantasy Sports')).toBeTruthy();
    expect(screen.getByText('Vibe Studio')).toBeTruthy();
    expect(screen.getByText('Matriarch Culinary')).toBeTruthy();
    expect(screen.getByText('CashPilot')).toBeTruthy();
    expect(screen.getByText('Lighthouse Edu')).toBeTruthy();
  });

  it('renders domain filter buttons', () => {
    renderConstellation();
    expect(screen.getByText('ALL')).toBeTruthy();
    expect(screen.getByText('CAPITAL')).toBeTruthy();
    expect(screen.getByText('SUSTENANCE')).toBeTruthy();
    expect(screen.getByText('LEGACY')).toBeTruthy();
    expect(screen.getByText('SANCTUARY')).toBeTruthy();
  });

  it('filters apps by domain', () => {
    renderConstellation();
    fireEvent.click(screen.getByText('CAPITAL'));
    expect(screen.getByText('Fence Pro')).toBeTruthy();
    expect(screen.getByText('CashPilot')).toBeTruthy();
    expect(screen.queryByText('Chromatica')).toBeNull();
  });

  it('shows app descriptions', () => {
    renderConstellation();
    expect(screen.getByText('Salon & Creative Workstation')).toBeTruthy();
    expect(screen.getByText('Financial Tracking & Budgets')).toBeTruthy();
  });

  it('opens app in iframe on click', () => {
    renderConstellation();
    fireEvent.click(screen.getByText('Chromatica').closest('button') || screen.getByText('Chromatica'));
    expect(screen.getByText(/CONSTELLATION/)).toBeTruthy();
  });
});

describe('TRIPER: R - Resilience', () => {
  it('renders at spoons=0 without crashing', () => {
    renderConstellation(0);
  });

  it('hides hint text in triage mode (spoons<=1)', () => {
    renderConstellation(1);
    expect(screen.queryByText(/Every surface/)).toBeNull();
  });

  it('shows hint text when spoons>1', () => {
    renderConstellation(3);
    expect(screen.getByText(/Every surface/)).toBeTruthy();
  });
});

describe('TRIPER: I - Interface', () => {
  it('exports ConstellationSurface as named export', () => {
    expect(ConstellationSurface).toBeDefined();
  });

  it('exports ConstellationSurface as default export', async () => {
    const mod = await import('../ConstellationSurface');
    expect(mod.default).toBeDefined();
  });
});

describe('TRIPER: P - Purity', () => {
  it('does not leak secrets in rendered output', () => {
    const { container } = renderConstellation();
    expect(container.innerHTML).not.toContain('secret');
    expect(container.innerHTML).not.toContain('password');
    expect(container.innerHTML).not.toContain('api_key');
  });
});

describe('TRIPER: E - E2E', () => {
  it('full render cycle completes', () => {
    const { unmount } = renderConstellation();
    unmount();
  });

  it('full render cycle with domain filter', () => {
    const { unmount } = renderConstellation();
    fireEvent.click(screen.getByText('SANCTUARY'));
    fireEvent.click(screen.getByText('ALL'));
    unmount();
  });
});

describe('TRIPER: R - Regression', () => {
  it('renders multiple times without state leakage', () => {
    const { unmount } = renderConstellation();
    unmount();
    renderConstellation();
    expect(screen.getByText('Chromatica')).toBeTruthy();
  });
});
