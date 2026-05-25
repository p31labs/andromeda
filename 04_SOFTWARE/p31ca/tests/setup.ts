import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'innerWidth', { value: 1024 });
Object.defineProperty(window, 'innerHeight', { value: 768 });

vi.mock('idb-keyval', () => ({
  get: vi.fn(() => Promise.resolve(null)),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  keys: vi.fn(() => Promise.resolve([])),
  clear: vi.fn(() => Promise.resolve()),
}));

vi.mock('@noble/ed25519', () => ({
  keygen: vi.fn(() => new Uint8Array(32)),
  getPublicKey: vi.fn(() => new Uint8Array(32)),
}));

vi.mock('@noble/curves/ed25519.js', () => ({
  ed25519: {
    getPublicKey: vi.fn(() => new Uint8Array(32)),
    sign: vi.fn(() => new Uint8Array(64)),
    verify: vi.fn(() => true),
  },
}));

const localStorageStore = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => localStorageStore.set(key, value)),
    removeItem: vi.fn((key: string) => localStorageStore.delete(key)),
    clear: vi.fn(() => localStorageStore.clear()),
    key: vi.fn((index: number) => Array.from(localStorageStore.keys())[index] ?? null),
    get length() { return localStorageStore.size; },
  },
});
