import React from 'react';
import { render, screen } from '@testing-library/react';
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

const mocks = vi.hoisted(() => {
  const FramerProxy = new Proxy({}, {
    get: (_target, prop: string) => {
      const Mock = ({ children, ...props }: any) => {
        return React.createElement(prop as string, props, children);
      };
      Mock.displayName = `motion.${String(prop)}`;
      return Mock;
    },
  });
  return { FramerProxy };
});

vi.mock('framer-motion', () => ({
  motion: mocks.FramerProxy,
}));

vi.mock('lucide-react', () => ({
  CheckCircle2: (props: any) => React.createElement('svg', props),
  Trash2: (props: any) => React.createElement('svg', props),
  AlertTriangle: (props: any) => React.createElement('svg', props),
  Radio: (props: any) => React.createElement('svg', props),
}));

describe('TechFacet', () => {
  it('renders without crashing', async () => {
    const { default: TechFacet } = await import('../src/facets/TechFacet');
    render(React.createElement(TechFacet));
  });

  it('shows "[QUANTUM_DATA_VAULT]" heading', async () => {
    const { default: TechFacet } = await import('../src/facets/TechFacet');
    render(React.createElement(TechFacet));
    expect(screen.getByText('[QUANTUM_DATA_VAULT]')).toBeTruthy();
  });

  it('shows input field', async () => {
    const { default: TechFacet } = await import('../src/facets/TechFacet');
    render(React.createElement(TechFacet));
    const input = screen.getByPlaceholderText('> enter data...');
    expect(input).toBeTruthy();
  });

  it('shows "COMMIT" button', async () => {
    const { default: TechFacet } = await import('../src/facets/TechFacet');
    render(React.createElement(TechFacet));
    expect(screen.getByText('COMMIT')).toBeTruthy();
  });

  it('has dark slate/emerald color scheme classes', async () => {
    const { default: TechFacet } = await import('../src/facets/TechFacet');
    render(React.createElement(TechFacet));
    const container = document.querySelector('[class*="slate-950"]');
    expect(container).toBeTruthy();
  });
});
