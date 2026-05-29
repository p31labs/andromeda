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
vi.mock('../lib/hooks/usePanicEject', () => ({
  usePanicEject: () => {},
}));

vi.mock('lucide-react', () => ({
  Lock: () => React.createElement('span', null, 'lock'),
  Unlock: () => React.createElement('span', null, 'unlock'),
  ShieldCheck: () => React.createElement('span', null, 'shield'),
  PowerOff: () => React.createElement('span', null, 'poweroff'),
  AlertTriangle: () => React.createElement('span', null, 'alert'),
}));

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { SanctuarySurface } from '../SanctuarySurface';

const renderSanctuary = (spoons = 3) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(SanctuarySurface, {
        onAttemptUnlock: vi.fn(() => Promise.resolve(false)),
        onEject: vi.fn(),
        isUnlocked: false,
      })
    )
  );
};

describe('TRIPER: T - Task', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    renderSanctuary();
  });

  it('renders safety confirmation screen first', () => {
    renderSanctuary();
    expect(screen.getByText(/CONFIRM PHYSICAL SECURITY AND ISOLATION/)).toBeTruthy();
  });

  it('renders isolation bounds button', () => {
    renderSanctuary();
    expect(screen.getByText(/ISOLATION BOUNDS CONFIRMED/)).toBeTruthy();
  });

  it('shows passphrase form after confirming safety', () => {
    renderSanctuary();
    fireEvent.click(screen.getByText(/ISOLATION BOUNDS CONFIRMED/));
    expect(screen.getByPlaceholderText(/Passphrase credential verification/)).toBeTruthy();
  });

  it('shows decrypt button after confirming safety', () => {
    renderSanctuary();
    fireEvent.click(screen.getByText(/ISOLATION BOUNDS CONFIRMED/));
    expect(screen.getByText(/DECRYPT SYSTEM DATA/)).toBeTruthy();
  });

  it('shows auth error on wrong passphrase', async () => {
    renderSanctuary();
    fireEvent.click(screen.getByText(/ISOLATION BOUNDS CONFIRMED/));
    const input = screen.getByPlaceholderText(/Passphrase credential verification/);
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText(/DECRYPT SYSTEM DATA/));
    await new Promise(r => setTimeout(r, 100));
    expect(screen.getByText(/KEY CALCULATION EXCEPTION/)).toBeTruthy();
  });
});

describe('TRIPER: R - Resilience', () => {
  it('renders at spoons=0 without crashing', () => {
    renderSanctuary(0);
  });

  it('renders at spoons=1 without crashing', () => {
    renderSanctuary(1);
  });
});

describe('TRIPER: I - Interface', () => {
  it('exports SanctuarySurface as named export', () => {
    expect(SanctuarySurface).toBeDefined();
  });
});

describe('TRIPER: P - Purity', () => {
  it('does not leak secrets in rendered output', () => {
    const { container } = renderSanctuary();
    expect(container.innerHTML).not.toContain('secret');
    expect(container.innerHTML).not.toContain('password');
    expect(container.innerHTML).not.toContain('api_key');
  });
});

describe('TRIPER: E - E2E', () => {
  it('full render cycle completes', () => {
    const { unmount } = renderSanctuary();
    unmount();
  });

  it('full render cycle through safety and back', () => {
    const { unmount } = renderSanctuary();
    fireEvent.click(screen.getByText(/ISOLATION BOUNDS CONFIRMED/));
    unmount();
  });
});

describe('TRIPER: R - Regression', () => {
  it('renders multiple times without state leakage', () => {
    const { unmount } = renderSanctuary();
    unmount();
    renderSanctuary();
    expect(screen.getByText(/CONFIRM PHYSICAL SECURITY AND ISOLATION/)).toBeTruthy();
  });
});
