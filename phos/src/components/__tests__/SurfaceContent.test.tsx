import { AtmosphereProvider } from '../AtmosphereProvider';
import { SurfaceContent } from '../SurfaceContent';

const renderSurface = (surface: string, spoons = 3) => {
  return render(
  );
};

describe('SurfaceContent', () => {
  it('should render GREETING surface', () => {
    renderSurface('GREETING');
    expect(screen.getByText('P³¹')).toBeTruthy();
  });

  });

  it('should render VAULT surface', () => {
    renderSurface('VAULT');
    expect(screen.getByText('PQC Protective Layer')).toBeTruthy();
  });

  });

  it('should render HEARTH surface', () => {
    renderSurface('HEARTH');
    expect(screen.getByText('Current Energy')).toBeTruthy();
    expect(screen.getByText('⚡ Log Energy')).toBeTruthy();
  });

  it('should render LEDGER surface', () => {
    renderSurface('LEDGER');
  });

  it('should render SETTINGS surface', () => {
    renderSurface('SETTINGS');
    expect(screen.getByText('Reduce Motion')).toBeTruthy();
  });

  it('should show error for unknown surface', () => {
    renderSurface('NONEXISTENT');
    expect(screen.getByText(/ERR_SURFACE_NOT_BOUND/)).toBeTruthy();
  });

  });

  it('should render COMPASS surface', () => {
    renderSurface('COMPASS');
    expect(screen.getByText('Compass')).toBeTruthy();
    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText('Build')).toBeTruthy();
  });

  it('should render IGNITION surface', () => {
    renderSurface('IGNITION');
    expect(screen.getByText(/Choose your entry point/)).toBeTruthy();
  });

  it('should render BONDING surface', () => {
    renderSurface('BONDING');
    expect(screen.getByText('LAUNCH_BONDING')).toBeTruthy();
  });

  it('should render NODE_ZERO surface', () => {
    renderSurface('NODE_ZERO');
    expect(screen.getByText('Node Zero Bridge')).toBeTruthy();
    expect(screen.getByText('DISCOVERING')).toBeTruthy();
  });

  });
});
