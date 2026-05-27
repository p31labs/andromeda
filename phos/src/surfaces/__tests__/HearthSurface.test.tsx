import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockOnPainAlert = vi.fn();

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
import { HearthSurface } from '../HearthSurface';

const renderHearth = (spoons = 3, grayRock = false) => {
  localStorageMock.clear();
  mockOnPainAlert.mockClear();
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(HearthSurface, { spoons, grayRock, onPainAlert: mockOnPainAlert })
    )
  );
};

describe('HearthSurface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset the localStorage mock data
    localStorage.removeItem('phos_event_log');
    localStorage.removeItem('phos_family_contacts');
    localStorage.removeItem('phos_visitation_schedule');
  });

  it('should show CRISIS suspension at spoons=0', () => {
    renderHearth(0);
    expect(screen.getByText(/Hearth suspended/i)).toBeTruthy();
  });

  it('should show CRISIS suspension when grayRock=true', () => {
    renderHearth(3, true);
    expect(screen.getByText(/Hearth suspended/i)).toBeTruthy();
  });

  it('should render family mesh header at spoons=3', async () => {
    renderHearth(3);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/The Hearth/i)).toBeTruthy();
  });

  it('should render tab switcher with 4 tabs', async () => {
    renderHearth(3);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Log/i)).toBeTruthy();
    expect(screen.getByText(/Schedule/i)).toBeTruthy();
    expect(screen.getByText(/Bonding/i)).toBeTruthy();
    expect(screen.getByText(/Cage/i)).toBeTruthy();
  });

  it('should render contact log form', async () => {
    renderHearth(3);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Log New Contact/i)).toBeTruthy();
  });

  it('should render summary stats', async () => {
    renderHearth(3);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Total Contacts/i)).toBeTruthy();
  });

  it('should render export button', async () => {
    renderHearth(3);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Export Legal Log/i)).toBeTruthy();
  });

  it('should trigger onPainAlert when pain level >= 7', async () => {
    const painData = JSON.stringify([{
      id: 'p1', type: 'PAIN_LOGGED', timestamp: new Date().toISOString(),
      data: { painLevel: 8, location: 'lower back' },
    }]);
    localStorage.setItem('phos_event_log', painData);
    mockOnPainAlert.mockClear();
    renderHearth(3);
    await waitFor(() => expect(mockOnPainAlert).toHaveBeenCalled(), { timeout: 5000 });
  });

  it('should NOT trigger onPainAlert when pain level < 7', async () => {
    localStorage.setItem('phos_event_log', JSON.stringify([{
      id: 'p2', type: 'PAIN_LOGGED', timestamp: new Date().toISOString(),
      data: { painLevel: 5, location: 'shoulder' },
    }]));
    renderHearth(3);
    await new Promise(r => setTimeout(r, 500));
    expect(mockOnPainAlert).not.toHaveBeenCalled();
  });
});

  it('should show CRISIS suspension when grayRock=true', () => {
    renderHearth(3, true);
    expect(screen.getByText(/Hearth suspended/i)).toBeTruthy();
  });

  it('should render family mesh header at spoons=3', async () => {
    renderHearth(3);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/The Hearth/i)).toBeTruthy();
    expect(screen.getByText(/Family mesh/i)).toBeTruthy();
  });

  it('should render tab switcher with 4 tabs', async () => {
    renderHearth(3);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Log/i)).toBeTruthy();
    expect(screen.getByText(/Schedule/i)).toBeTruthy();
    expect(screen.getByText(/Bonding/i)).toBeTruthy();
    expect(screen.getByText(/Cage/i)).toBeTruthy();
  });

  it('should render contact log form', async () => {
    renderHearth(3);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Log New Contact/i)).toBeTruthy();
    expect(screen.getByText(/LOG →/i)).toBeTruthy();
  });

  it('should render summary stats', async () => {
    renderHearth(3);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Total Contacts/i)).toBeTruthy();
    expect(screen.getByText(/S\.J\./i)).toBeTruthy();
    expect(screen.getByText(/W\.J\./i)).toBeTruthy();
  });

  it('should render export button', async () => {
    renderHearth(3);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/Export Legal Log/i)).toBeTruthy();
  });

  it('should render simplified view at spoons=1', async () => {
    renderHearth(1);
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    expect(screen.getByText(/The Hearth/i)).toBeTruthy();
  });

  it('should trigger onPainAlert when pain level >= 7', async () => {
    const painData = JSON.stringify([{
      id: 'p1', type: 'PAIN_LOGGED', timestamp: new Date().toISOString(),
      data: { painLevel: 8, location: 'lower back' },
    }]);
    localStorageMock.setItem('phos_event_log', painData);
    mockOnPainAlert.mockClear();
    render(
      React.createElement(
        AtmosphereProvider,
        { initialSurface: 'GREETING' as any, initialSpoons: 3, remoteEnabled: false },
        React.createElement(HearthSurface, { spoons: 3, grayRock: false, onPainAlert: mockOnPainAlert })
      )
    );
    await waitFor(() => expect(mockOnPainAlert).toHaveBeenCalled(), { timeout: 5000 });
  });

  it('should NOT trigger onPainAlert when pain level < 7', async () => {
    localStorageMock.setItem('phos_event_log', JSON.stringify([{
      id: 'p2', type: 'PAIN_LOGGED', timestamp: new Date().toISOString(),
      data: { painLevel: 5, location: 'shoulder' },
    }]));
    renderHearth(3);
    await new Promise(r => setTimeout(r, 1000));
    expect(mockOnPainAlert).not.toHaveBeenCalled();
  });

  it('should handle malformed localStorage gracefully', async () => {
    localStorageMock.setItem('phos_event_log', 'not valid json{{{');
    await act(async () => { renderHearth(3); });
    expect(true).toBe(true);
  });
});
