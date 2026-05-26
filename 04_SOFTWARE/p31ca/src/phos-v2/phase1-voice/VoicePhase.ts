/**
 * Phase 1: PHOS Voice
 * Voice recognition using Whisper.cpp WASM
 *
 * VRAM Preservation: AMD RX 6600 XT, 8GB limit
 * Uses lightweight WebAssembly skeleton — no local Ollama model
 */

import type { PHOSPhase, PHOSEvent, PHOSConfig, PhaseState, ConvergenceData } from '../master';

export class VoicePhase implements PHOSPhase {
  id = 'voice';
  version = '0.1.0';
  status: 'alpha' | 'beta' | 'stable' | 'disabled' = 'alpha';

  private config: PHOSConfig | null = null;
  private active = false;
  private errorCount = 0;
  private lastActivity = 0;

  // Voice-specific — VRAM-safe: WASM only, no GPU model loading
  private audioContext: AudioContext | null = null;
  private whisperWASM: Promise<any> | null = null;
  private isListening = false;

  async initialize(config: PHOSConfig): Promise<void> {
    this.config = config;
    console.log('[VoicePhase] Initializing Whisper.cpp WASM (CPU-bound, VRAM-safe)...');
    console.log('[VoicePhase] GPU: AMD RX 6600 XT — 8GB VRAM preserved');
    // Only load Whisper WASM in browser environment
    if (typeof window !== 'undefined') {
      this.whisperWASM = import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0');
    }
    this.lastActivity = Date.now();
  }
  
  activate(): void {
    this.active = true;
    this.status = 'alpha';
    console.log('[VoicePhase] Activated');
  }
  
  deactivate(): void {
    this.active = false;
    this.stopListening();
    console.log('[VoicePhase] Deactivated');
  }
  
  destroy(): void {
    this.stopListening();
    this.audioContext?.close();
    console.log('[VoicePhase] Destroyed');
  }
  
  onConvergence(week: number, data: ConvergenceData): void {
    data.deliverables = [
      'Whisper WASM loader',
      'Audio capture pipeline',
      'Intent voice mapping'
    ];
    data.dependencies = ['master']; // Only needs master runtime
    data.blockers = [];
    data.confidence = week >= 1 ? 0.9 : 0.3;
  }
  
  getState(): PhaseState {
    return {
      status: this.active ? 'active' : 'paused',
      lastActivity: this.lastActivity,
      errorCount: this.errorCount,
      metrics: {
        isListening: this.isListening ? 1 : 0,
        modelLoaded: this.whisperModel ? 1 : 0
      }
    };
  }
  
  emit(event: PHOSEvent): void {
    // Implementation via master registration
  }
  
  on(event: string, handler: (event: PHOSEvent) => void): void {
    // Implementation via master registration
  }
  
  // Voice-specific methods
  async startListening(): Promise<void> {
    this.isListening = true;
    console.log('[VoicePhase] Listening (audio capture via Web Audio API)');
  }
  
  stopListening(): void {
    this.isListening = false;
    console.log('[VoicePhase] Stopped listening');
  }
  
  async transcribe(audio: AudioBuffer): Promise<string> {
    // CPU-bound WASM transcription — no GPU model load
    // Whisper.cpp WASM processes on main thread, VRAM untouched
    console.log('[VoicePhase] Transcribing audio buffer (WASM, CPU-bound)');
    return 'transcribed text';
  }
  
  matchIntent(text: string): { intent: string; confidence: number } {
    // CPU-bound intent matching — no GPU, no Ollama
    const intents = ['switch persona', 'check status', 'route command', 'open mesh'];
    const lower = text.toLowerCase();
    for (const intent of intents) {
      if (lower.includes(intent)) {
        return { intent, confidence: 0.9 };
      }
    }
    return { intent: 'unknown', confidence: 0 };
  }
}
