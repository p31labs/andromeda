/**
 * @file larmor.ts — P31 Labs Larmor Audio Engine
 * 
 * Pure logic for auditory grounding at Phosphorus-31 resonance frequencies.
 * Section 2.2 of Master Doctrine.
 * 
 * CWP: Decoupled from App.tsx per WCD-04.5
 */
export class LarmorEngine {
  private audioCtx: AudioContext | null = null;
  private primary: OscillatorNode | null = null;
  private secondary: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  private readonly PRIMARY_FREQ = 172.35;
  private readonly SECONDARY_FREQ = 863.0;

  public start(): void {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.gain = this.audioCtx.createGain();
    this.gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
    this.gain.connect(this.audioCtx.destination);

    this.primary = this.createOsc(this.PRIMARY_FREQ, 'sine');
    this.secondary = this.createOsc(this.SECONDARY_FREQ, 'triangle');
  }

  private createOsc(freq: number, type: OscillatorType): OscillatorNode | null {
    if (!this.audioCtx || !this.gain) return null;
    
    const osc = this.audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    osc.connect(this.gain);
    osc.start();
    
    return osc;
  }

  public stop(): void {
    this.primary?.stop();
    this.secondary?.stop();
    this.audioCtx?.close();
    this.audioCtx = null;
    this.primary = null;
    this.secondary = null;
    this.gain = null;
  }

  public getIsPlaying(): boolean {
    return this.audioCtx !== null && this.primary !== null;
  }

  public getFrequencies(): { primary: number; secondary: number } {
    return {
      primary: this.PRIMARY_FREQ,
      secondary: this.SECONDARY_FREQ,
    };
  }
}

// Singleton instance
let larmorInstance: LarmorEngine | null = null;

export function getLarmorEngine(): LarmorEngine {
  if (!larmorInstance) {
    larmorInstance = new LarmorEngine();
  }
  return larmorInstance;
}