// P31 Smallball: Audio System
// Spatial audio for stadium ambience, hit sounds, and crowd reactions
// Web Audio API with fallback support

// ============================================
// AUDIO CONFIGURATION
// ============================================

export interface AudioConfig {
  masterVolume: number;
  ambienceVolume: number;
  sfxVolume: number;
  uiVolume: number;
  crowdVolume: number;
  enableSpatialAudio: boolean;
  maxConcurrentSounds: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  masterVolume: 0.8,
  ambienceVolume: 0.6,
  sfxVolume: 1.0,
  uiVolume: 0.7,
  crowdVolume: 0.5,
  enableSpatialAudio: true,
  maxConcurrentSounds: 16,
};

// ============================================
// SOUND BANK
// ============================================

export const SOUND_BANK = {
  // Hit sounds - exit velocity based
  hits: {
    weak: ['hit_weak_1', 'hit_weak_2'],
    medium: ['hit_medium_1', 'hit_medium_2', 'hit_medium_3'],
    hard: ['hit_hard_1', 'hit_hard_2', 'hit_hard_3'],
    homeRun: ['hr_1', 'hr_2', 'hr_crack'],
  },

  // Crowd reactions
  crowd: {
    idle: ['crowd_idle_loop'],
    cheer_small: ['cheer_small_1', 'cheer_small_2'],
    cheer_medium: ['cheer_medium_1', 'cheer_medium_2'],
    cheer_big: ['cheer_big_1', 'cheer_big_2', 'cheer_big_3'],
    groan: ['crowd_groan_1', 'crowd_groan_2'],
    anticipation: ['crowd_anticipation'],
    organ: ['organ_charge', 'organ_charge_2'],
  },

  // Game sounds
  game: {
    bat_crack: 'bat_crack',
    glove_catch: 'glove_catch',
    ball_bounce: ['bounce_grass', 'bounce_dirt'],
    cleats: ['cleats_1', 'cleats_2', 'cleats_3'],
    slide: 'slide_dirt',
    whistle: 'umpire_whistle',
  },

  // Stadium ambience
  ambience: {
    day: 'ambience_day',
    night: 'ambience_night',
    wind: 'wind_loop',
  },

  // UI sounds
  ui: {
    click: 'ui_click',
    hover: 'ui_hover',
    success: 'ui_success',
    error: 'ui_error',
    whistle_start: 'whistle_start',
  },

  // Training sounds
  training: {
    ball_machine: 'ball_machine',
    swing_whoosh: 'swing_whoosh',
    bat_ping: 'bat_ping',
    footstep: ['footstep_1', 'footstep_2', 'footstep_3'],
    sled_slide: 'sled_slide',
    catch_glove: 'catch_glove',
  },
} as const;

// ============================================
// AUDIO MANAGER
// ============================================

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private uiGain: GainNode | null = null;

  private config: AudioConfig;
  private activeSounds: Map<string, AudioBufferSourceNode> = new Map();
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private isInitialized: boolean = false;

  // Spatial audio
  private listener: AudioListener | null = null;

  constructor(config: AudioConfig = DEFAULT_AUDIO_CONFIG) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create master gain chain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.config.masterVolume;
      this.masterGain.connect(this.audioContext.destination);

      // Category gains
      this.ambienceGain = this.audioContext.createGain();
      this.ambienceGain.gain.value = this.config.ambienceVolume;
      this.ambienceGain.connect(this.masterGain);

      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = this.config.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.crowdGain = this.audioContext.createGain();
      this.crowdGain.gain.value = this.config.crowdVolume;
      this.crowdGain.connect(this.masterGain);

      this.uiGain = this.audioContext.createGain();
      this.uiGain.gain.value = this.config.uiVolume;
      this.uiGain.connect(this.masterGain);

      // Load sound buffers
      await this.loadSounds();

      this.isInitialized = true;
    } catch (err) {
      console.warn('Audio initialization failed:', err);
    }
  }

  private async loadSounds(): Promise<void> {
    // In production, these would be loaded from files
    // For now, we'll create procedural sounds
    await this.createProceduralSounds();
  }

  private async createProceduralSounds(): Promise<void> {
    if (!this.audioContext) return;

    // Create bat crack sound
    const batBuffer = this.createNoiseBuffer(0.1, 'brown');
    this.soundBuffers.set('bat_crack', batBuffer);

    // Create crowd ambience
    const crowdBuffer = this.createNoiseBuffer(2.0, 'pink');
    this.soundBuffers.set('crowd_idle_loop', crowdBuffer);

    // Create glove catch
    const gloveBuffer = this.createThudBuffer(0.05);
    this.soundBuffers.set('glove_catch', gloveBuffer);

    // Create ball bounce
    const bounceBuffer = this.createThudBuffer(0.03);
    this.soundBuffers.set('bounce_dirt', bounceBuffer);

    // Create UI click
    const clickBuffer = this.createToneBuffer(800, 0.05);
    this.soundBuffers.set('ui_click', clickBuffer);

    // Create swing whoosh
    const whooshBuffer = this.createWhooshBuffer();
    this.soundBuffers.set('swing_whoosh', whooshBuffer);
  }

  // Procedural sound generation
  private createNoiseBuffer(duration: number, type: 'white' | 'pink' | 'brown'): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Apply simple filter based on type
    if (type === 'pink' || type === 'brown') {
      for (let i = 1; i < data.length; i++) {
        data[i] = (data[i] + data[i - 1]) / 2;
      }
    }

    if (type === 'brown') {
      for (let i = 1; i < data.length; i++) {
        data[i] = (data[i] + data[i - 1]) / 2;
      }
    }

    return buffer;
  }

  private createThudBuffer(duration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 50);
      data[i] = Math.sin(t * 100 * Math.PI * 2) * decay * 0.5;
    }

    return buffer;
  }

  private createToneBuffer(frequency: number, duration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = t < 0.01 ? t / 0.01 : Math.exp(-(t - 0.01) * 20);
      data[i] = Math.sin(t * frequency * Math.PI * 2) * envelope * 0.3;
    }

    return buffer;
  }

  private createWhooshBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const duration = 0.15;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 200 + (t / duration) * 400; // Rising frequency
      const envelope = Math.sin((t / duration) * Math.PI); // Bell curve
      data[i] = Math.sin(t * freq * Math.PI * 2) * envelope * 0.3;
    }

    return buffer;
  }

  // ============================================
  // PLAYBACK METHODS
  // ============================================

  play(soundName: string, volume: number = 1.0, loop: boolean = false): string | null {
    if (!this.isInitialized || !this.audioContext) return null;

    // Resume context if suspended (browser policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const buffer = this.soundBuffers.get(soundName);
    if (!buffer) {
      console.warn(`Sound not found: ${soundName}`);
      return null;
    }

    const id = `${soundName}_${Date.now()}_${Math.random()}`;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.sfxGain || this.masterGain!);

    source.start();

    this.activeSounds.set(id, source);

    source.onended = () => {
      this.activeSounds.delete(id);
    };

    return id;
  }

  stop(soundId: string): void {
    const source = this.activeSounds.get(soundId);
    if (source) {
      source.stop();
      this.activeSounds.delete(soundId);
    }
  }

  stopAll(): void {
    this.activeSounds.forEach(source => source.stop());
    this.activeSounds.clear();
  }

  // ============================================
 // SPATIAL AUDIO
// ============================================

  playSpatial(
    soundName: string,
    position: { x: number; y: number; z: number },
    volume: number = 1.0
  ): string | null {
    if (!this.isInitialized || !this.audioContext || !this.config.enableSpatialAudio) {
      return this.play(soundName, volume);
    }

    const buffer = this.soundBuffers.get(soundName);
    if (!buffer) return null;

    const id = `${soundName}_spatial_${Date.now()}`;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // Create panner for spatial positioning
    const panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 100;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain || this.masterGain!);

    source.start();

    this.activeSounds.set(id, source);

    source.onended = () => {
      this.activeSounds.delete(id);
    };

    return id;
  }

  // ============================================
  // GAME EVENT SOUNDS
  // ============================================

  playHit(exitVelocity: number): void {
    // Determine hit intensity based on exit velocity
    let soundCategory: keyof typeof SOUND_BANK.hits;
    if (exitVelocity < 85) soundCategory = 'weak';
    else if (exitVelocity < 100) soundCategory = 'medium';
    else soundCategory = 'hard';

    const sounds = SOUND_BANK.hits[soundCategory];
    const sound = sounds[Math.floor(Math.random() * sounds.length)];

    this.play(sound, exitVelocity / 100 + 0.3);

    // Add bat crack for hard hits
    if (exitVelocity > 95) {
      setTimeout(() => this.play('bat_crack', 0.5), 50);
    }
  }

  playHomeRun(): void {
    const sounds = SOUND_BANK.hits.homeRun;
    const sound = sounds[Math.floor(Math.random() * sounds.length)];
    this.play(sound, 1.2);
    this.playCrowd('cheer_big', 1.0);
  }

  playCatch(): void {
    this.play('glove_catch', 0.8);
  }

  playSwing(): void {
    this.play('swing_whoosh', 0.6);
  }

  playBounce(surface: 'grass' | 'dirt'): void {
    const sound = surface === 'grass' ? 'bounce_grass' : 'bounce_dirt';
    this.play(sound, 0.4);
  }

  // ============================================
  // CROWD CONTROL
  // ============================================

  private crowdLoopId: string | null = null;

  startCrowdAmbience(): void {
    if (this.crowdLoopId) return;
    this.crowdLoopId = this.play('crowd_idle_loop', 0.3, true);
  }

  stopCrowdAmbience(): void {
    if (this.crowdLoopId) {
      this.stop(this.crowdLoopId);
      this.crowdLoopId = null;
    }
  }

  playCrowd(type: keyof typeof SOUND_BANK.crowd, volume: number = 1.0): void {
    const sounds = SOUND_BANK.crowd[type];
    if (Array.isArray(sounds)) {
      const sound = sounds[Math.floor(Math.random() * sounds.length)];
      this.play(sound, volume);
    }
  }

  // ============================================
  // TRAINING SOUNDS
  // ============================================

  playTrainingHit(): void {
    this.play('bat_ping', 0.7);
  }

  playCatchTraining(): void {
    this.play('catch_glove', 0.8);
  }

  playFootstep(): void {
    const sounds = SOUND_BANK.training.footstep;
    const sound = sounds[Math.floor(Math.random() * sounds.length)];
    this.play(sound, 0.3);
  }

  playBallMachine(): void {
    this.play('ball_machine', 0.5);
  }

  // ============================================
  // UI SOUNDS
  // ============================================

  playClick(): void {
    this.play('ui_click', 0.5);
  }

  playSuccess(): void {
    // Success chord
    if (this.audioContext) {
      const now = this.audioContext.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.uiGain || this.masterGain!);
        gain.gain.setValueAtTime(0, now + i * 0.05);
        gain.gain.linearRampToValueAtTime(0.1, now + i * 0.05 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.3);
      });
    }
  }

  playError(): void {
    if (this.audioContext) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.frequency.value = 200;
      osc.type = 'sawtooth';
      osc.connect(gain);
      gain.connect(this.uiGain || this.masterGain!);
      gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.3);
    }
  }

  // ============================================
  // VOLUME CONTROL
  // ============================================

  setMasterVolume(volume: number): void {
    this.config.masterVolume = volume;
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  setCategoryVolume(category: 'ambienceVolume' | 'sfxVolume' | 'crowdVolume' | 'uiVolume', volume: number): void {
    this.config[category] = volume;

    const gainMap: Record<string, GainNode | null> = {
      ambienceVolume: this.ambienceGain,
      sfxVolume: this.sfxGain,
      crowdVolume: this.crowdGain,
      uiVolume: this.uiGain,
    };

    const gain = gainMap[category];
    if (gain) {
      gain.gain.value = volume;
    }
  }

  mute(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = 0;
    }
  }

  unmute(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.config.masterVolume;
    }
  }
}

// Singleton instance
let globalAudioManager: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!globalAudioManager) {
    globalAudioManager = new AudioManager();
  }
  return globalAudioManager;
}

export async function initAudio(): Promise<void> {
  const audio = getAudioManager();
  await audio.initialize();
}
