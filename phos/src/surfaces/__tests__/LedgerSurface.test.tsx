import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LedgerSurface } from '../LedgerSurface';

const mockTheme = { name: 'QUANTUM' };

describe('LedgerSurface', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should show zero balance by default', () => {
    render(<LedgerSurface theme={mockTheme} />);
    expect(screen.getByText('0 LOVE')).toBeTruthy();
  });

  it('should mint credits on check-in', () => {
    render(<LedgerSurface theme={mockTheme} />);
    const btn = screen.getByText(/Daily Check-in/);
    act(() => { fireEvent.click(btn); });
    expect(screen.getByText('5 LOVE')).toBeTruthy();
  });

  it('should show empty state when no transactions', () => {
    render(<LedgerSurface theme={mockTheme} />);
    expect(screen.getByText(/No transactions yet/)).toBeTruthy();
  });

  it('should show ledger header', () => {
    render(<LedgerSurface theme={mockTheme} />);
    expect(screen.getByText('LOVE Ledger')).toBeTruthy();
  });

  it('should show Care Economy Credits label', () => {
    render(<LedgerSurface theme={mockTheme} />);
    expect(screen.getByText('Care Economy Credits')).toBeTruthy();
  });

  it('should show balance in large format', () => {
    render(<LedgerSurface theme={mockTheme} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('should show Transaction History header', () => {
    render(<LedgerSurface theme={mockTheme} />);
    expect(screen.getByText('Transaction History')).toBeTruthy();
  });

  it('should persist balance across renders', () => {
    const { unmount } = render(<LedgerSurface theme={mockTheme} />);
    act(() => { fireEvent.click(screen.getByText(/Daily Check-in/)); });
    expect(screen.getByText('5 LOVE')).toBeTruthy();
    unmount();
    render(<LedgerSurface theme={mockTheme} />);
    expect(screen.getByText('5 LOVE')).toBeTruthy();
  });
});
