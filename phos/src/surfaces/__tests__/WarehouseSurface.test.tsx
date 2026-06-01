import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WarehouseSurface } from '../WarehouseSurface';

const mockTheme = { name: 'QUANTUM' };

describe('WarehouseSurface', () => {
  it('should render warehouse title', () => {
    render(<WarehouseSurface theme={mockTheme} spoons={3} />);
    expect(screen.getByText(/Warehouse Service Interface/i)).toBeTruthy();
  });

  it('should show local connection badge', () => {
    render(<WarehouseSurface theme={mockTheme} spoons={3} />);
    expect(screen.getByText('Local Connection')).toBeTruthy();
  });

  it('should display metrics grid', () => {
    render(<WarehouseSurface theme={mockTheme} spoons={3} />);
    expect(screen.getByText('TOTAL_REGISTERED_ASSETS')).toBeTruthy();
    expect(screen.getByText('DELTA_SYNC_QUEUE')).toBeTruthy();
  });

  it('should show 0 items when vault is empty', () => {
    render(<WarehouseSurface theme={mockTheme} spoons={3} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
  });

  it('should show recent telemetry empty state', () => {
    render(<WarehouseSurface theme={mockTheme} spoons={3} />);
    expect(screen.getByText(/No recent scans caught in loop/i)).toBeTruthy();
  });
});
