import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RetroVaultSurface } from '../RetroVaultSurface';

const mockTheme = { name: 'QUANTUM', wrapper: '', orb: '', button: '', hud: '', input: '', container: '' };

describe('RetroVaultSurface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render vault title', () => {
    render(<RetroVaultSurface theme={mockTheme} spoons={3} />);
    expect(screen.getByText(/Retro-Vault Core Metrics/i)).toBeTruthy();
  });

  it('should show PQC badge', () => {
    render(<RetroVaultSurface theme={mockTheme} spoons={3} />);
    expect(screen.getByText('PQC Protective Layer')).toBeTruthy();
  });

  it('should display metric cards', () => {
    render(<RetroVaultSurface theme={mockTheme} spoons={3} />);
    expect(screen.getByText('Entities')).toBeTruthy();
    expect(screen.getByText('Media_Blobs')).toBeTruthy();
    expect(screen.getByText('PQC_Catalogs')).toBeTruthy();
  });

  it('should show 0 counts when PGlite returns empty rows', () => {
    render(<RetroVaultSurface theme={mockTheme} spoons={3} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it('should show empty state when no data', () => {
    render(<RetroVaultSurface theme={mockTheme} spoons={3} />);
    expect(screen.getByText(/Vault is empty/i)).toBeTruthy();
  });
});
