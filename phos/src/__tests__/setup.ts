import { vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });

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

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    speakGreeting: vi.fn(),
    getVoices: vi.fn(() => []),
  }
});

Object.defineProperty(window, 'AudioContext', {
  value: class {
    resume() {}
    suspend() {}
    get currentTime() { return 0; }
    get state() { return 'running'; }
    createOscillator() {
      return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, type: 'sine' };
    }
    createGain() {
      return { connect: () => {}, gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } };
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(0) };
    }
    createBiquadFilter() {
      return { connect: () => {}, frequency: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, Q: { setValueAtTime: () => {} }, type: 'bandpass' };
    }
    createBufferSource() {
      return { connect: () => {}, buffer: null, start: () => {}, stop: () => {} };
    }
  } as any,
  writable: true,
});

Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32))),
    },
    getRandomValues: vi.fn((arr: any) => arr),
  },
});

vi.mock('@electric-sql/pglite', () => {
  return {
    PGlite: vi.fn().mockImplementation(() => ({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      exec: vi.fn().mockResolvedValue([]),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

class MockWebSocket {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 5);
  }
  send(data: string) {}
  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }
}
Object.defineProperty(window, 'WebSocket', { value: MockWebSocket });

const globalFetchMock = vi.fn().mockImplementation(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: [] }),
    ok: true,
  })
);
Object.defineProperty(window, 'fetch', { value: globalFetchMock });

HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === '2d') {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Array(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => []),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      ellipse: vi.fn(),
      strokeRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
}) as any;

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', { value: MockResizeObserver });

// Mock requestAnimationFrame to register but not immediately execute
let rafId = 0;
Object.defineProperty(window, 'requestAnimationFrame', {
  value: (_cb: FrameRequestCallback) => ++rafId,
  writable: true,
  configurable: true,
});
Object.defineProperty(window, 'cancelAnimationFrame', {
  value: () => {},
  writable: true,
  configurable: true,
});

vi.mock('lucide-react', () => {
  return {
    BrainCircuit: () => null,
    ChevronDown: () => null,
    ShieldAlert: () => null,
    default: () => null,
  };
});

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});
