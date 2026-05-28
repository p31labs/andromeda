/**
 * VoiceEngine — Sovereign text-to-speech engine.
 *
 * Wraps the native Web Speech API (`window.speechSynthesis`).
 * Zero external dependencies, zero latency, fully offline-capable.
 *
 * GRAY_ROCK constraint: if Gray Rock is active, the engine must
 * immediately cancel all utterances and produce silence.
 */

import type { SurfaceKey } from './atmosphere';

// ---- Voice scripts ----
// These can be swapped with offline-drafted prompts from the Operator.
// Agents only draft scripts; the Operator promotes them.
interface VoiceScript {
  greeting: string;
  entry: string;
  narrative?: string;
}

const SURFACE_SCRIPTS: Record<SurfaceKey, VoiceScript> = {
  GREETING: {
    greeting: 'Welcome home, Operator.',
    entry: 'The calcium cage is stable. Cognition is externalized. I am here.',
    narrative: 'PHOS online. All systems nominal.',
  },
  IGNITION: {
    greeting: 'Welcome home.',
    entry: 'You are about to step out of the noise and into the Sanctuary. No passwords to remember. No trackers watching you. Just a private vault for your data, locked directly to this device.',
    narrative: 'Press the button when you are ready. I will seal the vault and open the DELTA.',
  },
  BONDING: {
    greeting: 'Bonding surface active.',
    entry: 'Channel open. You are held in safe connection.',
    narrative: 'Safe passage through the bonding field.',
  },
  THE_BUFFER: {
    greeting: 'Sanctuary active.',
    entry: 'You are insulated from raw signal.',
    narrative: 'Rest here. The noise cannot reach you.',
  },
  NODE_ZERO: {
    greeting: 'Local Vault accessed.',
    entry: 'Core nexus engaged. Your data is sovereign.',
    narrative: 'Deep work zone. All resources focused.',
  },
  ARCADE: {
    greeting: 'Arcade mode activated.',
    entry: 'Play is productive. Let the joy flow.',
    narrative: 'Games load. Dopamine circuits priming.',
  },
  VAULT: {
    greeting: 'Vault sealed.',
    entry: 'Your assets are secure.',
    narrative: 'Secure storage. Access logged.',
  },
  GRID: {
    greeting: 'The Referee is active.',
    entry: 'All family nodes are merging peacefully.',
    narrative: 'Mesh topology stable. Nodes reachable.',
  },
  COMPASS: {
    greeting: 'Compass active.',
    entry: 'Let us find your way.',
    narrative: 'Navigational triage engaged.',
  },
  SETTINGS: {
    greeting: 'Preferences accessible.',
    entry: 'Tuning your experience.',
    narrative: 'Configuration mode. Adjust as needed.',
  },
  LEDGER: {
    greeting: 'Memory surface active.',
    entry: 'Reviewing your cognitive history.',
    narrative: 'Event log loaded. Patterns detected.',
  },
  LOVE: {
    greeting: 'Love economy active.',
    entry: 'Your value is sovereign.',
    narrative: 'Karma balance stable. Transactions recorded.',
  },
  ARCHIVE: {
    greeting: 'Sovereign archive accessed.',
    entry: 'Sovereign archive accessed. What do you seek?',
    narrative: 'Local embeddings ready. Query at your own pace.',
  },
  HEARTH: {
    greeting: 'The Hearth is warm.',
    entry: 'Family and care mesh active. You are not alone.',
    narrative: 'Chores, recipes, and pain levels consolidated.',
  },
  SANCTUARY: {
    greeting: 'The Sanctuary is sealed.',
    entry: 'Zero-telemetry journal active. Your words stay here.',
    narrative: 'Encrypted local storage. No cloud. No witnesses.',
  },
  FORGE: {
    greeting: 'The Forge is hot.',
    entry: 'Commerce layer active. All transactions are integer-math.',
    narrative: 'Revenue engine online. SHA-256 chained audit trail.',
  },
  DRIVE: {
    greeting: 'Drive surface connected.',
    entry: 'Google Drive browser active. Select files for local ingestion.',
    narrative: 'Documents flow into the knowledge graph.',
  },
  LEGAL: {
    greeting: 'Legal vault accessed.',
    entry: 'Court documents and filings. Chain of custody intact.',
    narrative: 'Discovery materials. Tamper-evident logs.',
  },
  CONSTELLATION: {
    greeting: 'Constellation surface active.',
    entry: 'Agent mesh topology visible. All nodes accounted for.',
    narrative: 'Multi-agent coordination layer.',
  },
};

export { SURFACE_SCRIPTS };

// ---- Voice state ----
let _muted = false;

// Initialize mute state from localStorage (synchronous hydration)
try {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('phos_voice_muted');
    if (stored === 'true') _muted = true;
  }
} catch { /* localStorage unavailable */ }

/**
 * Check if the browser supports speech synthesis.
 */
export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined'
  );
}

/**
 * Get the global mute state.
 */
export function isMuted(): boolean {
  return _muted;
}

/**
 * Set the global mute state.
 * When muted, all future speak() calls are cancelled immediately.
 */
export function setMuted(muted: boolean): void {
  _muted = muted;
  // Persist to localStorage
  try {
    localStorage.setItem('phos_voice_muted', String(muted));
  } catch { /* ignore */ }
  if (muted && isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Toggle mute state. Returns the new state.
 */
export function toggleMute(): boolean {
  setMuted(!_muted);
  return _muted;
}

/**
 * Immediately cancel all speech.
 */
export function cancelSpeech(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speak a surface entry announcement.
 *
 * Constraint: If `isUrgent` is true OR the preset has `voice: false`,
 * the engine cancels all audio and returns immediately (silence).
 *
 * @param text   The text to speak (overrides the script if provided)
 * @param surface The target surface (for script lookups)
 * @param isUrgent Gray Rock override — forces silence
 * @param voiceEnabled Whether voice is enabled for this surface
 */
export function speak(
  text?: string,
  surface?: SurfaceKey,
  isUrgent: boolean = false,
  voiceEnabled: boolean = true
): void {
  // Gray Rock silence: halt immediately
  if (isUrgent || _muted || !isSpeechSupported()) {
    cancelSpeech();
    return;
  }

  if (!voiceEnabled) {
    return; // surface has voice disabled (e.g. ARCADE, SETTINGS)
  }

  // Resolve script text
  let utteranceText = text;
  if (!utteranceText && surface) {
    const script = SURFACE_SCRIPTS[surface];
    if (script) {
      utteranceText = script.entry;
    }
  }
  if (!utteranceText) {
    return;
  }

  // Cancel any current speech before starting new
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(utteranceText);

  // Configure voice preferences
  utterance.rate = 0.9;   // slightly slower for clarity
  utterance.pitch = 1.05; // gentle warmth
  utterance.volume = 0.85;

  // Try to find a decent voice
  const voices = window.speechSynthesis.getVoices();
  // Prefer a calm, clear voice
  const preferred = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Google UK') || v.name.includes('Samantha') || v.name.includes('Microsoft'))
  );
  if (preferred) {
    utterance.voice = preferred;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Speak a greeting for when the operator first arrives.
 */
export function speakGreeting(surface: SurfaceKey, isUrgent: boolean): void {
  if (isUrgent || _muted) return;
  const script = SURFACE_SCRIPTS[surface];
  if (script) {
    speak(script.greeting, surface, isUrgent, true);
  }
}
