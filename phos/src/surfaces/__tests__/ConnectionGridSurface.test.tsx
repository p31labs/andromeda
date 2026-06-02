import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionGridSurface } from '../ConnectionGridSurface';

describe('ConnectionGridSurface', () => {
  it('should render mesh topology header', () => {
    render(<ConnectionGridSurface theme={{ name: 'QUANTUM' }} spoons={3} />);
    expect(screen.getByText(/CONNECTION_GRID/)).toBeTruthy();
  });

  it('should show loading state', () => {
    render(<ConnectionGridSurface theme={{ name: 'QUANTUM' }} spoons={3} />);
    expect(screen.getByText(/Mesh Topology Loading/)).toBeTruthy();
  });

  it('should show discovering nodes message', () => {
    render(<ConnectionGridSurface theme={{ name: 'QUANTUM' }} spoons={3} />);
    expect(screen.getByText(/Discovering nodes on the delta network/)).toBeTruthy();
  });
});
