import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock Web Speech API
if (typeof window !== 'undefined') {
  (window as any).SpeechRecognition = vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    onresult: null,
    onerror: null,
    onend: null,
  }));
  (window as any).webkitSpeechRecognition = (window as any).SpeechRecognition;
}

// Mock AudioContext
if (typeof window !== 'undefined') {
  (window as any).AudioContext = vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn().mockReturnValue({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 440 },
    }),
    createGain: vi.fn().mockReturnValue({
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    }),
    destination: {},
    currentTime: 0,
  }));
}

// Mock MediaDevices
if (typeof window !== 'undefined' && window.navigator) {
  Object.defineProperty(window.navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    },
    writable: true,
  });
}

beforeAll(() => {
  // Global setup
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  // Global cleanup
});