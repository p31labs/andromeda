import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HearthSurface } from '../HearthSurface';
import { AtmosphereProvider } from '../../components/AtmosphereProvider';

const mockTheme = { name: 'QUANTUM' };

const renderWithProvider = (spoons: number) => {
  return render(
    <AtmosphereProvider initialSpoons={spoons} initialSurface="HEARTH">
      <HearthSurface theme={mockTheme} spoons={spoons} />
    </AtmosphereProvider>
  );
};

describe('HearthSurface', () => {
  it('should show 3 tabs at normal spoons', () => {
    renderWithProvider(4);
    // Tab buttons use CSS capitalize class; actual DOM text is lowercase
    expect(screen.getByText(/^overview$/i)).toBeTruthy();
    expect(screen.getByText(/^energy$/i)).toBeTruthy();
    expect(screen.getByText(/^kitchen$/i)).toBeTruthy();
  });

  it('should show simplified view at low spoons', () => {
    renderWithProvider(1);
    expect(screen.getByText('Hearth')).toBeTruthy();
    expect(screen.getByText(/How are you feeling/)).toBeTruthy();
    // Should NOT show the multi-tab overview view
    expect(screen.queryByText(/Current Energy/)).toBeNull();
  });

  it('should show recipe scaling in kitchen tab', () => {
    renderWithProvider(4);
    // The overview card shows "Kitchen" emoji button; the tab button says "kitchen"
    // Click the tab button to switch to kitchen tab
    fireEvent.click(screen.getByText(/^kitchen$/i));
    expect(screen.getByText('1x')).toBeTruthy();
    expect(screen.getByText('8x')).toBeTruthy();
  });
});
