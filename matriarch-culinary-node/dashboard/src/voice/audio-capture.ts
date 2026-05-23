import { handleVoiceIntent } from '../voice-bridge';
import { CulinaryStore } from '../db';

/**
 * P31 Local Audio Capture Pipeline
 * Secures microphone permissions, streams continuous Float32 buffers to the WASM Worker,
 * and routes transcribed intents to the Synaptic Bridge.
 */
export class SovereignAudioNode {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private worker: Worker;
  private store: CulinaryStore['store'] | null = null;

  constructor(workerPath: string, store?: CulinaryStore['store']) {
    // Instantiate the Web Worker holding the WASM STT model
    this.worker = new Worker(workerPath, { type: 'module' });
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    
    // Bind the TinyBase store so we can mutate local state based on voice commands
    if (store) this.store = store;
  }

  async initialize() {
    // Request hardware permissions strictly for mono 16kHz audio
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 16000
      }
    });

    this.context = new AudioContext({ sampleRate: 16000 });
    const source = this.context.createMediaStreamSource(this.stream);
    
    // Load the AudioWorkletProcessor from the public directory
    await this.context.audioWorklet.addModule('/audio-processor.js');
    const processorNode = new AudioWorkletNode(this.context, 'phos-audio-processor');
    
    // Pipe the PCM Float32 buffers from the Worklet to the WASM Worker
    processorNode.port.onmessage = (event) => {
      this.worker.postMessage({ type: 'PROCESS_AUDIO', buffer: event.data });
    };

    source.connect(processorNode);
    
    // Send initialization signal to the WASM worker to load the model into heap memory
    this.worker.postMessage({ type: 'INIT' });
    console.info("[PHOS Audio] Sovereign audio context and worklet initialized.");
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, payload } = event.data;
    
    if (type === 'READY') {
      console.info("[PHOS STT] WASM Whisper model loaded into memory and ready.");
      // Fire an event to wake up the visual PhosOrb UI
      window.dispatchEvent(new Event('phos:wake'));
    }

    if (type === 'INTENT_TRANSCRIBED') {
      console.log(`[PHOS STT] Transcribed Intent: "${payload}"`);
      
      // Route the secure local transcription to the Edge LLM Cognitive Router
      if (this.store) {
        handleVoiceIntent(payload, this.store);
      }
    }
  }

  kill() {
    console.info("[PHOS Audio] Tearing down audio pipelines and terminating worker.");
    this.stream?.getTracks().forEach(track => track.stop());
    this.context?.close();
    this.worker.terminate();
    window.dispatchEvent(new Event('phos:sleep'));
  }
}
