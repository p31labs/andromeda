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
}));

describe('EditorialFacet', () => {
  it('renders without crashing', async () => {
    const { default: EditorialFacet } = await import('../src/facets/EditorialFacet');
    render(React.createElement(EditorialFacet));
  });

  it('shows "ACCESSIBLE DATA VAULT" heading', async () => {
    const { default: EditorialFacet } = await import('../src/facets/EditorialFacet');
    render(React.createElement(EditorialFacet));
    expect(screen.getByText('ACCESSIBLE DATA VAULT')).toBeTruthy();
  });

  it('shows input field', async () => {
    const { default: EditorialFacet } = await import('../src/facets/EditorialFacet');
    render(React.createElement(EditorialFacet));
    const input = screen.getByPlaceholderText('Enter data to store securely...');
    expect(input).toBeTruthy();
  });

  it('shows "SAVE TO VAULT" button', async () => {
    const { default: EditorialFacet } = await import('../src/facets/EditorialFacet');
    render(React.createElement(EditorialFacet));
    expect(screen.getByText('SAVE TO VAULT')).toBeTruthy();
  });

  it('has zinc background classes', async () => {
    const { default: EditorialFacet } = await import('../src/facets/EditorialFacet');
    render(React.createElement(EditorialFacet));
    const container = document.querySelector('[class*="zinc-50"]');
    expect(container).toBeTruthy();
  });
});
