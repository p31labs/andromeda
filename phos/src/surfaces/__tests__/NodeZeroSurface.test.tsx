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

  it('toggles cognitive passport panel open', () => {
    renderNodeZero();
    fireEvent.click(screen.getByText(/COGNITIVE PASSPORT/));
    expect(screen.getByText(/Identity/)).toBeTruthy();
    expect(screen.getByText(/Visual State/)).toBeTruthy();
    expect(screen.getByText(/Linguistic Profile/)).toBeTruthy();
    expect(screen.getByText(/AI Context/)).toBeTruthy();
  });

  it('expansion indicator changes on toggle', () => {
    renderNodeZero();
    const btn = screen.getByText(/COGNITIVE PASSPORT/).closest('button')!;
    expect(btn.textContent).toContain('OPEN');
    fireEvent.click(btn);
    expect(btn.textContent).toContain('CLOSE');
    fireEvent.click(btn);
    expect(btn.textContent).toContain('OPEN');
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
    fireEvent.click(screen.getByText(/COGNITIVE PASSPORT/));
    fireEvent.click(screen.getByText(/COGNITIVE PASSPORT/));
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
