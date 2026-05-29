// �������������������������������������������������������������������
// PHOS - Test Setup
// Mocks for browser APIs and side-effect modules
// �������������������������������������������������������������������

import { vi } from 'vitest';

// �� Browser API stubs ��
Object.defineProperty(window, 'innerWidth', { value: 1024 });
Object.defineProperty(window, 'innerHeight', { value: 768 });

// �� matchMedia mock (required by some components) ��
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

// �� localStorage mock ��
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// �� PGLite mock ��
vi.mock('@electric-sql/pglite', () => {
  const mockPgliteInstance = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue(undefined),
    exec: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    waitReady: Promise.resolve(),
  };
  return {
    PGlite: vi.fn(() => mockPgliteInstance),
  };
});

// �� Fetch mock for LiteLLM and other API calls ��
global.fetch = vi.fn();

// �� WebSocket mock ��
vi.mock('ws', () => {
  return {
    WebSocket: vi.fn().mockImplementation(() => {
      return {
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN,
      };
    }),
  };
});

// Note: If there are any other side-effect modules (like sound, haptic) that are used in the codebase,
// they should be mocked here. However, from the current lib directory, we don't see them.

export {};