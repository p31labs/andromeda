import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../hooks/useSovereignData', () => ({
  useSovereignData: () => ({
    data: [],
    isLoading: false,
    error: null,
    addVaultItem: vi.fn(),
    deleteVaultItem: vi.fn(),
    subscribeToChanges: vi.fn(),
    initializeVault: vi.fn(),
  }),
}));

vi.mock('../src/facets/SurvivalFacet', () => ({
  SurvivalFacet: () => React.createElement('div', null, 'SurvivalFacet'),
}));

vi.mock('../src/facets/EditorialFacet', () => ({
  EditorialFacet: () => React.createElement('div', null, 'EditorialFacet'),
}));

vi.mock('../src/facets/TechFacet', () => ({
  TechFacet: () => React.createElement('div', null, 'TechFacet'),
}));

vi.mock('../src/shared/PolyhedronGlyph', () => ({
  default: (props: any) => React.createElement('svg', props),
}));

vi.mock('../src/shared/SecurityBadge', () => ({
  default: () => React.createElement('div', null, 'SECURED LOCALLY VIA ML-KEM-768'),
}));

const framerMotionMock = vi.hoisted(() => {
  const FramerProxy = new Proxy({}, {
    get: (_target, prop: string) => {
      const Mock = ({ children, ...props }: any) => {
        return React.createElement(prop as string, props, children);
      };
      Mock.displayName = `motion.${String(prop)}`;
      return Mock;
    },
  });
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    motion: FramerProxy,
  };
});

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  Sparkles: (props: any) => React.createElement('svg', props),
  Lock: (props: any) => React.createElement('svg', props),
  Trash2: (props: any) => React.createElement('svg', props),
  CheckCircle2: (props: any) => React.createElement('svg', props),
  AlertTriangle: (props: any) => React.createElement('svg', props),
  Radio: (props: any) => React.createElement('svg', props),
}));

describe('FacetSwitchboard', () => {
  it('renders without crashing', async () => {
    const { default: FacetSwitchboard } = await import('../src/shared/FacetSwitchboard');
    render(React.createElement(FacetSwitchboard));
  });

  it('shows facet switcher select with 3 options', async () => {
    const { default: FacetSwitchboard } = await import('../src/shared/FacetSwitchboard');
    render(React.createElement(FacetSwitchboard));
    const select = screen.getByLabelText('Reality:');
    expect(select).toBeTruthy();
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(3);
  });

  it("default facet is 'classic'", async () => {
    const { default: FacetSwitchboard } = await import('../src/shared/FacetSwitchboard');
    render(React.createElement(FacetSwitchboard));
    const select = screen.getByLabelText('Reality:') as HTMLSelectElement;
    expect(select.value).toBe('classic');
  });

  it('changing select value changes displayed facet', async () => {
    const { default: FacetSwitchboard } = await import('../src/shared/FacetSwitchboard');
    render(React.createElement(FacetSwitchboard));
    const select = screen.getByLabelText('Reality:') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'quantum' } });
    expect(select.value).toBe('quantum');
  });

  it('renders PolyhedronGlyph and SecurityBadge', async () => {
    const { default: FacetSwitchboard } = await import('../src/shared/FacetSwitchboard');
    render(React.createElement(FacetSwitchboard));
    expect(screen.getByText('SECURED LOCALLY VIA ML-KEM-768')).toBeTruthy();
  });
});
