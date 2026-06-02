import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LedgerSurface } from '../LedgerSurface';

vi.mock('../../lib/KarmaEngine', () => ({
  getBalanceAtomic: vi.fn().mockResolvedValue(0),
  mintCreditsAtomic: vi.fn().mockResolvedValue(5),
  getLedgerHistory: vi.fn().mockResolvedValue([]),
  verifyLedgerIntegrity: vi.fn().mockResolvedValue({ valid: true, count: 0 }),
}));

const mockTheme = { name: 'QUANTUM', wrapper: '', orb: '', button: '', hud: '', input: '', container: '' };

describe('LedgerSurface', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render ledger header', () => {
    render(<LedgerSurface theme={mockTheme} />);
    expect(screen.getByText('LOVE Ledger')).toBeInTheDocument();
  });

  it('should show Atomic badge', () => {
    render(<LedgerSurface theme={mockTheme} />);
    expect(screen.getByText('Atomic')).toBeInTheDocument();
  });

  it('should render signed transaction entries', async () => {
    const { getLedgerHistory } = await import('../../lib/KarmaEngine');
    vi.mocked(getLedgerHistory).mockResolvedValue([
      { kind: 'DAILY_CHECK_IN', delta: 5, timestamp: Date.now() - 60000, signature: 'abc123def456', prevSignature: 'GENESIS' },
      { kind: 'arcade:test-game', delta: 10, timestamp: Date.now() - 120000, signature: 'bcd234efg567', prevSignature: 'abc123def456' },
    ]);

    render(<LedgerSurface theme={mockTheme} />);
    await act(async () => {});

    expect(screen.getByText(/DAILY_CHECK_IN/)).toBeInTheDocument();
    expect(screen.getByText(/arcade:test-game/)).toBeInTheDocument();
  });

  it('should show chain validity indicator', async () => {
    render(<LedgerSurface theme={mockTheme} />);
    await act(async () => {});
    expect(screen.getByText(/CHAIN VALID/)).toBeInTheDocument();
  });

  it('should show tampered indicator if integrity fails', async () => {
    const { verifyLedgerIntegrity } = await import('../../lib/KarmaEngine');
    vi.mocked(verifyLedgerIntegrity).mockResolvedValue({ valid: false, count: 5 });

    render(<LedgerSurface theme={mockTheme} />);
    await act(async () => {});
    expect(screen.getByText(/TAMPERED/)).toBeInTheDocument();
  });
});
