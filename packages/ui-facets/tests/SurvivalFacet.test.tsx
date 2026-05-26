import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockIsLoading = false;

vi.mock('../hooks/useSovereignData', () => ({
  useSovereignData: () => ({
    data: [],
    isLoading: mockIsLoading,
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
  Sparkles: (props: any) => React.createElement('svg', props),
  Lock: (props: any) => React.createElement('svg', props),
  Trash2: (props: any) => React.createElement('svg', props),
}));

describe('SurvivalFacet', () => {
  beforeEach(() => {
    mockIsLoading = false;
  });

  it('renders without crashing while loading', async () => {
    mockIsLoading = true;
    const { default: SurvivalFacet } = await import('../src/facets/SurvivalFacet');
    render(React.createElement(SurvivalFacet));
    expect(screen.getByText('Waking up the backpack...')).toBeTruthy();
  });

  it('renders vault interface when loaded', async () => {
    const { default: SurvivalFacet } = await import('../src/facets/SurvivalFacet');
    render(React.createElement(SurvivalFacet));
    expect(screen.getByText('My Secret Backpack')).toBeTruthy();
  });

  it('shows "My Secret Backpack" heading', async () => {
    const { default: SurvivalFacet } = await import('../src/facets/SurvivalFacet');
    render(React.createElement(SurvivalFacet));
    expect(screen.getByText('My Secret Backpack')).toBeTruthy();
  });

  it('shows input field with placeholder', async () => {
    const { default: SurvivalFacet } = await import('../src/facets/SurvivalFacet');
    render(React.createElement(SurvivalFacet));
    const input = screen.getByPlaceholderText("What's your secret?");
    expect(input).toBeTruthy();
  });

  it('shows submit button', async () => {
    const { default: SurvivalFacet } = await import('../src/facets/SurvivalFacet');
    render(React.createElement(SurvivalFacet));
    expect(screen.getByText('Keep it Secret!')).toBeTruthy();
  });

  it('has orange/amber gradient background class', async () => {
    const { default: SurvivalFacet } = await import('../src/facets/SurvivalFacet');
    render(React.createElement(SurvivalFacet));
    const container = document.querySelector('[class*="amber-50"]');
    expect(container).toBeTruthy();
  });
});
