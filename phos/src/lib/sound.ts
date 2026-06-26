let ctx: AudioContext | null = null;
let _muted = false;

const LARMOR_HZ = 863;

const FREQ = {
  hydrogen: Math.round(LARMOR_HZ * 2.997),
  carbon:   Math.round(LARMOR_HZ * 0.749),
  oxygen:   Math.round(LARMOR_HZ * 1.253),
  phosphor: LARMOR_HZ,
  calcium:  Math.round(LARMOR_HZ * 0.489),
  sodium:   Math.round(LARMOR_HZ * 0.552),
};

const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ensureCtx(): AudioContext | null {
  if (_muted || reducedMotion()) return null;
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

}

export function initAudio(): void {
  if (ctx) return;
  ctx = new AudioContext();
}

export function isMuted(): boolean {
  return _muted;
}

export function setMuted(v: boolean): void {
  _muted = v;
  try {
    localStorage.setItem('phos_muted', String(v));
  } catch { /* ignore */ }
  if (v && ctx) {
    ctx.suspend();
  } else if (!v && ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

export function getFrequencies(): typeof FREQ {
  return { ...FREQ };
}

export function tapOrb(spoons: number = 5): void {
}

export function changeSurface(spoons: number = 5): void {
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const bufferSize = ac.sampleRate * 0.4;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(200, t);
  filter.frequency.linearRampToValueAtTime(600, t + 0.3);
  filter.Q.setValueAtTime(1.5, t);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  source.start(t);
  source.stop(t + 0.45);
}

export function changeSpoons(level: number): void {
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(FREQ.carbon, t);
  osc.frequency.linearRampToValueAtTime(FREQ.carbon * 0.5, t + 1.5);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 1.6);
}

  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(FREQ.oxygen * 0.7, t);
  osc.frequency.linearRampToValueAtTime(FREQ.oxygen, t + 1.2);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 1.3);
}

export function breatheIn(spoons: number = 1): void {
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(FREQ.calcium, t);
  gain.gain.setValueAtTime(0, t);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 3.1);
}

export function breatheOut(spoons: number = 1): void {
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(FREQ.sodium, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 3.0);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 3.1);
}

export function achievement(spoons: number = 5): void {
  const t = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.12);
    gain.gain.setValueAtTime(0, t + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t + i * 0.12);
    osc.stop(t + i * 0.12 + 0.5);
  });
}

export function error(spoons: number = 3): void {
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(FREQ.phosphor / 4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

export function surfaceTone(surface: string, spoons: number = 5): void {
}

export function getPentatonic(): number[] {
  return [...PENTATONIC];
}
