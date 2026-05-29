import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/phos-api', () => ({
  phosAPI: {
    connectStream: () => ({ disconnect: () => {}, send: vi.fn() }),
    getAtmosphere: () => Promise.resolve({
      preset: {
        starfield: 'dense',
        palette: { primary: '#39ff14', secondary: '#00e5ff', accent: '#b026ff', background: '#0a0a0a', text: '#e0e0e0', muted: '#666666' },
        motion: { enabled: true, speed: 0.5, particleCount: 200, transitionMs: 800 },
        tracking: true, voice: true,
      },
    }),
  },
  PHOSAPIError: class PHOSAPIError extends Error { constructor(msg: string) { super(msg); this.name = 'PHOSAPIError'; } },
}));

vi.mock('../lib/VoiceEngine', () => ({ speak: vi.fn(), cancelSpeech: vi.fn() }));
vi.mock('../lib/EventLogger', () => ({ logEvent: vi.fn(), getEventLog: vi.fn(() => []), clearLogs: vi.fn() }));
vi.mock('../lib/KarmaEngine', () => ({
  KarmaEngine: { getBalance: vi.fn(() => 0), addLove: vi.fn(), getHistory: vi.fn(() => []) },
}));
vi.mock('../lib/CryptoEngine', () => ({
  CryptoEngine: { sealDevice: vi.fn(() => Promise.resolve()), isSealed: vi.fn(() => false) },
}));
vi.mock('../lib/ForgeLedger', () => ({
  recordTransaction: vi.fn(() => Promise.resolve()),
  getTransactions: vi.fn(() => Promise.resolve([])),
  voidTransaction: vi.fn(() => Promise.resolve()),
  getBalanceCents: vi.fn(() => Promise.resolve(0)),
  getDailyTotal: vi.fn(() => Promise.resolve({ revenueCents: 0, taxCents: 0 })),
  getDailyTotals: vi.fn(() => Promise.resolve([])),
  toCents: (n: number) => Math.round(n * 100),
  formatCurrency: (cents: number) => `$${(cents / 100).toFixed(2)}`,
  sumLineItems: (items: any[]) => items.reduce((s, i) => s + i.totalPriceCents, 0),
}));
vi.mock('../lib/KatenPOS', () => ({
  emptyCart: () => ({ items: [], itemCount: 0, subtotalCents: 0, taxCents: 0, totalCents: 0 }),
  cartAddItem: (cart: any, item: any) => ({ ...cart, items: [...cart.items, { ...item, cartId: 'c1', quantity: 1, totalPriceCents: item.unitPriceCents }], itemCount: cart.itemCount + 1, subtotalCents: cart.subtotalCents + item.unitPriceCents, taxCents: Math.round((cart.subtotalCents + item.unitPriceCents) * 0.04), totalCents: Math.round((cart.subtotalCents + item.unitPriceCents) * 1.04) }),
  cartUpdateQuantity: (cart: any, cartId: string, qty: number) => cart,
  cartRemoveItem: (cart: any, cartId: string) => cart,
  toLineItems: (cart: any) => cart.items || [],
  exchangeCash: (totalCents: number, cash: number) => {
    const cashCents = Math.round(cash * 100);
    return { changeCents: Math.max(0, cashCents - totalCents), shortfall: cashCents < totalCents };
  },
  parseBarcodeInput: (input: string) => {
    if (input.startsWith('/BARCODE:')) {
      const parts = input.replace('/BARCODE:', '').split(':');
      return { sku: parts[0], priceCents: parseInt(parts[1] || '0', 10) };
    }
    return null;
  },
  BAKERY_PRESETS: [
    { sku: 'BREAD-SOUR', name: 'Sourdough', unitPriceCents: 800 },
    { sku: 'MUFFIN-BLUE', name: 'Blueberry Muffin', unitPriceCents: 450 },
    { sku: 'COOKIE-CHOCO', name: 'Chocolate Chip Cookie', unitPriceCents: 300 },
  ],
}));
vi.mock('../lib/ForgeInventory', () => ({
  upsertProduct: vi.fn(() => Promise.resolve()),
  getProducts: vi.fn(() => Promise.resolve([])),
  getProduct: vi.fn(() => Promise.resolve(null)),
  deactivateProduct: vi.fn(() => Promise.resolve()),
  recordStockMovement: vi.fn(() => Promise.resolve()),
  getStockMovements: vi.fn(() => Promise.resolve([])),
  getStockLevels: vi.fn(() => Promise.resolve([])),
  getStockForSku: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('../lib/ForgeLoveCredits', () => ({
  ForgeLoveCredits: {
    getBalanceCents: vi.fn(() => 5000),
    payWithLove: vi.fn(() => Promise.resolve({ success: true })),
    reverseLovePayment: vi.fn(() => Promise.resolve()),
  },
}));
vi.mock('../lib/ForgeSync', () => ({
  ForgeReconciler: class {
    reconcile = vi.fn(() => Promise.resolve({ pushed: 0, confirmed: 0, conflicts: 0 }));
  },
}));

Object.defineProperty(window, 'localStorage', {
  value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
  writable: true,
});

import { AtmosphereProvider } from '../../components/AtmosphereProvider';
import { ForgeSurface } from '../ForgeSurface';

const renderForge = (spoons = 3) => {
  return render(
    React.createElement(
      AtmosphereProvider,
      { initialSurface: 'GREETING' as any, initialSpoons: spoons, remoteEnabled: false },
      React.createElement(ForgeSurface)
    )
  );
};

describe('TRIPER: T - Task', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    renderForge();
  });

  it('renders the Forge header', () => {
    renderForge();
    expect(screen.getByText(/The Forge/)).toBeTruthy();
  });

  it('renders three tab buttons', () => {
    renderForge();
    expect(screen.getByText(/POS/)).toBeTruthy();
    expect(screen.getByText(/Vault/)).toBeTruthy();
    expect(screen.getByText(/Warehouse/)).toBeTruthy();
  });

  it('renders POS tab by default', () => {
    renderForge();
    expect(screen.getByText(/Quick Add/)).toBeTruthy();
  });

  it('renders bakery presets', () => {
    renderForge();
    expect(screen.getByText('Sourdough')).toBeTruthy();
    expect(screen.getByText('Blueberry Muffin')).toBeTruthy();
  });

  it('renders stats row', () => {
    renderForge();
    expect(screen.getByText('Sales')).toBeTruthy();
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.getByText('Balance')).toBeTruthy();
    expect(screen.getByText('LOVE')).toBeTruthy();
  });

  it('renders cart area', () => {
    renderForge();
    expect(screen.getByText(/Tap items above or scan barcode/)).toBeTruthy();
  });

  it('renders barcode input', () => {
    renderForge();
    expect(screen.getByPlaceholderText(/BARCODE/)).toBeTruthy();
  });

  it('switches to Vault tab', () => {
    renderForge();
    fireEvent.click(screen.getByText(/Vault/));
    expect(screen.getByText(/Product catalog/)).toBeTruthy();
  });

  it('switches to Warehouse tab', () => {
    renderForge();
    fireEvent.click(screen.getByText(/Warehouse/));
    expect(screen.getByText(/Stock movement/)).toBeTruthy();
  });

  it('renders payment method buttons in POS', () => {
    renderForge();
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText('Card')).toBeTruthy();
    expect(screen.getByText('Manual')).toBeTruthy();
  });
});

describe('TRIPER: R - Resilience', () => {
  it('renders at spoons=0 without crashing', () => {
    renderForge(0);
  });

  it('renders at spoons=1 without crashing', () => {
    renderForge(1);
  });
});

describe('TRIPER: I - Interface', () => {
  it('exports ForgeSurface as named export', () => {
    expect(ForgeSurface).toBeDefined();
  });

  it('exports ForgeSurface as default export', () => {
    const mod = require('../ForgeSurface');
    expect(mod.default).toBeDefined();
  });
});

describe('TRIPER: P - Purity', () => {
  it('does not leak secrets in rendered output', () => {
    const { container } = renderForge();
    expect(container.innerHTML).not.toContain('secret');
    expect(container.innerHTML).not.toContain('password');
    expect(container.innerHTML).not.toContain('api_key');
  });
});

describe('TRIPER: E - E2E', () => {
  it('full render cycle completes', () => {
    const { unmount } = renderForge();
    unmount();
  });

  it('full render cycle through all tabs', () => {
    const { unmount } = renderForge();
    const allBtns = screen.getAllByRole('button');
    const vaultTab = allBtns.find((b) => b.textContent?.includes('\uD83C\uDDFE Vault'));
    const warehouseTab = allBtns.find((b) => b.textContent?.includes('\uD83D\uDCE6 Warehouse'));
    const posTab = allBtns.find((b) => b.textContent?.includes('\uD83D\uDECB POS'));
    if (vaultTab) fireEvent.click(vaultTab);
    if (warehouseTab) fireEvent.click(warehouseTab);
    if (posTab) fireEvent.click(posTab);
    unmount();
  });
});

describe('TRIPER: R - Regression', () => {
  it('renders multiple times without state leakage', () => {
    const { unmount } = renderForge();
    unmount();
    renderForge();
    expect(screen.getByText(/The Forge/)).toBeTruthy();
  });
});
