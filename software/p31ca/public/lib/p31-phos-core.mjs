/**
 * PHOS (Phosphorus31 Operating System) — Voice-first, inference-driven navigation
 * Core architecture: deterministic routing, progressive disclosure, crisis mode
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PHOS State Machine
// ═══════════════════════════════════════════════════════════════════════════════

export const PHOS_STATES = {
  GREETING: 'GREETING',      // Initial state — minimal presence
  INTENT: 'INTENT',          // Asking "who are we building for?"
  ROUTING: 'ROUTING',        // Transition animation
  CONTENT: 'CONTENT',        // Showing the destination
  URGENT: 'URGENT',          // Crisis mode — gray rock, minimal UI
};

export const PHOS_PROFILES = {
  STANDARD: {
    bg: 'bg-slate-950',
    text: 'text-slate-200',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/30',
    animation: true,
  },
  GRAY_ROCK: {
    bg: 'bg-black',
    text: 'text-gray-300',
    accent: 'text-gray-100',
    border: 'border-gray-800',
    animation: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Intent Catalog — Deterministic routing (no LLM, no hallucination)
// ═══════════════════════════════════════════════════════════════════════════════

export const INTENT_CATALOG = [
  {
    id: 'SELF',
    patterns: ['myself', 'me', 'i', 'my', 'personal', 'alone', 'individual', 'self'],
    label: 'For Myself',
    icon: '🙋',
    hint: 'Passport, Sovereign Tools',
    destination: '/passport',
    confidence: 0.9,
  },
  {
    id: 'FAMILY',
    patterns: ['family', 'household', 'kids', 'children', 'parents', 'home', 'together', 'us', 'we', 'partner', 'spouse'],
    label: 'For My Family',
    icon: '🏠',
    hint: 'Bonding, Social Molecules',
    destination: '/lab',
    confidence: 0.85,
  },
  {
    id: 'PRO',
    patterns: ['professional', 'work', 'job', 'career', 'developer', 'engineer', 'doctor', 'therapist', 'clinician', 'researcher'],
    label: "I'm a Professional",
    icon: '💼',
    hint: 'Research, Docs, Operator',
    destination: '/glass-box',
    confidence: 0.8,
  },
  {
    id: 'CRISIS',
    patterns: ['help', 'crisis', 'overwhelm', 'panic', 'anxiety', 'emergency', 'too much', 'stop', 'safe', 'calm'],
    label: 'I need help now',
    icon: '🆘',
    hint: 'Safe mode — minimal stimulation',
    destination: '/welcome',
    confidence: 1.0,
    urgent: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Inference Engine — Deterministic pattern matching
// ═══════════════════════════════════════════════════════════════════════════════

export function inferIntent(input, context = {}) {
  if (!input || typeof input !== 'string') {
    return { intent: null, confidence: 0, chips: [] };
  }

  const normalized = input.toLowerCase().trim();
  const words = normalized.split(/\s+/);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  let bestMatch = null;
  let bestScore = 0;
  const scores = [];

  for (const intent of INTENT_CATALOG) {
    let score = 0;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Pattern matching
    for (const pattern of intent.patterns) {
      if (normalized.includes(pattern)) {
        score += pattern.length >= 5 ? 0.3 : 0.2; // Longer matches = higher confidence
      }
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Word boundary matches
    for (const word of words) {
      if (intent.patterns.includes(word)) {
        score += 0.25;
      }
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Exact match bonus
    if (intent.patterns.some(p => p === normalized)) {
      score += 0.5;
    }
<<<<<<< HEAD
    
    scores.push({ intent, score });
    
=======

    scores.push({ intent, score });

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (score > bestScore) {
      bestScore = score;
      bestMatch = intent;
    }
  }

  // Crisis detection — immediate override
  const crisisWords = ['help', 'crisis', 'panic', 'emergency', 'stop', 'overwhelm'];
  if (crisisWords.some(w => normalized.includes(w))) {
    const crisisIntent = INTENT_CATALOG.find(i => i.id === 'CRISIS');
    if (crisisIntent) {
      return {
        intent: crisisIntent,
        confidence: 1.0,
        urgent: true,
        chips: generateChips(crisisIntent, scores, context),
      };
    }
  }

  // Confidence threshold
  const confidenceThreshold = context.screenComfort < 30 ? 0.3 : 0.5;
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  if (bestScore < confidenceThreshold || !bestMatch) {
    return {
      intent: null,
      confidence: 0,
      chips: generateStandardChips(scores, context),
    };
  }

  return {
    intent: bestMatch,
    confidence: Math.min(bestScore + bestMatch.confidence * 0.3, 1.0),
    chips: generateChips(bestMatch, scores, context),
  };
}

function generateChips(bestIntent, allScores, context) {
  const chips = [];
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Primary chip — the best match
  chips.push({
    id: bestIntent.id,
    label: bestIntent.label,
    icon: bestIntent.icon,
    path: bestIntent.destination,
    primary: true,
    confidence: bestIntent.confidence,
  });
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Secondary chips — next best matches
  const secondary = allScores
    .filter(s => s.intent.id !== bestIntent.id && s.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  for (const { intent } of secondary) {
    chips.push({
      id: intent.id,
      label: intent.label,
      icon: intent.icon,
      path: intent.destination,
      primary: false,
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Always include "Help me decide" chip
  chips.push({
    id: 'DECIDE',
    label: 'Help me decide →',
    icon: '❓',
    action: 'decide',
    primary: false,
  });
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return chips;
}

function generateStandardChips(scores, context) {
  // Return all intents as chips when no clear match
  return INTENT_CATALOG
    .filter(i => i.id !== 'CRISIS')
    .map(intent => ({
      id: intent.id,
      label: intent.label,
      icon: intent.icon,
      path: intent.destination,
      primary: false,
    }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Voice Recognition — Web Speech API wrapper
// ═══════════════════════════════════════════════════════════════════════════════

export class PHOSVoice {
  constructor(onResult, onError) {
    this.recognition = null;
    this.onResult = onResult;
    this.onError = onError;
    this.isListening = false;
<<<<<<< HEAD
    
    this.init();
  }
  
  init() {
    if (typeof window === 'undefined') return;
    
=======

    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('PHOS: Speech recognition not supported');
      return;
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.isListening = false;
      if (this.onResult) this.onResult(transcript);
    };
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.recognition.onerror = (event) => {
      this.isListening = false;
      if (this.onError) this.onError(event.error);
    };
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.recognition.onend = () => {
      this.isListening = false;
    };
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  start() {
    if (!this.recognition) {
      this.onError?.('Speech recognition not available');
      return false;
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (err) {
      this.onError?.(err.message);
      return false;
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHOS Controller — State management and transitions
// ═══════════════════════════════════════════════════════════════════════════════

export class PHOSController {
  constructor(options = {}) {
    this.state = PHOS_STATES.GREETING;
    this.profile = PHOS_PROFILES.STANDARD;
    this.currentIntent = null;
    this.contentCache = new Map();
    this.listeners = new Set();
    this.voice = null;
    this.urgentMode = false;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Context from cognitive passport if available
    this.context = {
      screenComfort: 100,
      soundComfort: 100,
      hasPassport: false,
      ...options.context,
    };
<<<<<<< HEAD
    
    this.init();
  }
  
=======

    this.init();
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  init() {
    // Check for urgent mode in URL or passport
    const params = new URLSearchParams(window.location.search);
    if (params.has('urgent') || params.has('safe') || this.context.screenComfort < 20) {
      this.enterUrgentMode();
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Auto-advance from greeting after delay
    if (this.state === PHOS_STATES.GREETING) {
      setTimeout(() => {
        if (this.state === PHOS_STATES.GREETING) {
          this.transitionTo(PHOS_STATES.INTENT);
        }
      }, 2500);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  notify() {
    const state = {
      state: this.state,
      profile: this.profile,
      intent: this.currentIntent,
      context: this.context,
      urgent: this.urgentMode,
    };
<<<<<<< HEAD
    
    for (const listener of this.listeners) {
      listener(state);
    }
    
    // Dispatch global event
    window.dispatchEvent(new CustomEvent('p31:phos-state', { detail: state }));
  }
  
  transitionTo(newState, data = {}) {
    const oldState = this.state;
    this.state = newState;
    
    if (data.intent) {
      this.currentIntent = data.intent;
    }
    
    this.notify();
    
    console.log(`PHOS: ${oldState} → ${newState}`);
    
=======

    for (const listener of this.listeners) {
      listener(state);
    }

    // Dispatch global event
    window.dispatchEvent(new CustomEvent('p31:phos-state', { detail: state }));
  }

  transitionTo(newState, data = {}) {
    const oldState = this.state;
    this.state = newState;

    if (data.intent) {
      this.currentIntent = data.intent;
    }

    this.notify();

    console.log(`PHOS: ${oldState} → ${newState}`);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Handle specific transitions
    if (newState === PHOS_STATES.CONTENT && data.destination) {
      this.loadContent(data.destination);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  enterUrgentMode() {
    this.urgentMode = true;
    this.profile = PHOS_PROFILES.GRAY_ROCK;
    this.transitionTo(PHOS_STATES.URGENT);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Apply gray rock to document
    document.documentElement.classList.add('phos-gray-rock');
    document.documentElement.style.setProperty('--phos-animation', 'none');
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  exitUrgentMode() {
    this.urgentMode = false;
    this.profile = PHOS_PROFILES.STANDARD;
    document.documentElement.classList.remove('phos-gray-rock');
    document.documentElement.style.removeProperty('--phos-animation');
    this.transitionTo(PHOS_STATES.INTENT);
  }
<<<<<<< HEAD
  
  handleVoiceInput(transcript) {
    const inference = inferIntent(transcript, this.context);
    
=======

  handleVoiceInput(transcript) {
    const inference = inferIntent(transcript, this.context);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (inference.urgent || inference.intent?.urgent) {
      this.enterUrgentMode();
      return;
    }
<<<<<<< HEAD
    
    if (inference.intent && inference.confidence >= 0.5) {
      this.transitionTo(PHOS_STATES.ROUTING, { intent: inference.intent });
      
      setTimeout(() => {
        this.transitionTo(PHOS_STATES.CONTENT, { 
=======

    if (inference.intent && inference.confidence >= 0.5) {
      this.transitionTo(PHOS_STATES.ROUTING, { intent: inference.intent });

      setTimeout(() => {
        this.transitionTo(PHOS_STATES.CONTENT, {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          destination: inference.intent.destination,
          intent: inference.intent,
        });
      }, 1500);
    } else {
      // Low confidence — show all options
      this.currentIntent = { chips: inference.chips };
      this.notify();
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  handleChipSelection(chip) {
    if (chip.action === 'decide') {
      // Show decision helper chips
      this.currentIntent = {
        chips: [
          { label: 'For myself', path: '/passport', icon: '🙋' },
          { label: 'For my family', path: '/lab', icon: '🏠' },
          { label: 'As a professional', path: '/glass-box', icon: '💼' },
          { label: '← Back', action: 'back', icon: '←' },
        ],
      };
      this.notify();
      return;
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (chip.action === 'back') {
      this.transitionTo(PHOS_STATES.INTENT);
      return;
    }
<<<<<<< HEAD
    
    if (chip.path) {
      this.transitionTo(PHOS_STATES.ROUTING, { intent: chip });
      
      setTimeout(() => {
        this.transitionTo(PHOS_STATES.CONTENT, { 
=======

    if (chip.path) {
      this.transitionTo(PHOS_STATES.ROUTING, { intent: chip });

      setTimeout(() => {
        this.transitionTo(PHOS_STATES.CONTENT, {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          destination: chip.path,
          intent: chip,
        });
      }, 800);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  async loadContent(url) {
    // Check cache
    if (this.contentCache.has(url)) {
      this.renderContent(this.contentCache.get(url));
      return;
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'text/html' },
      });
<<<<<<< HEAD
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const html = await response.text();
      
      // Extract body content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const content = bodyMatch ? bodyMatch[1] : html;
      
      // Cache it
      this.contentCache.set(url, content);
      
=======

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();

      // Extract body content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const content = bodyMatch ? bodyMatch[1] : html;

      // Cache it
      this.contentCache.set(url, content);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      this.renderContent(content);
    } catch (err) {
      console.error('PHOS: Failed to load content:', err);
      this.renderError(url, err);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  renderContent(content) {
    const container = document.getElementById('phos-content-mount');
    if (container) {
      container.innerHTML = content;
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Execute any scripts in the loaded content
      const scripts = container.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        document.head.appendChild(newScript);
        document.head.removeChild(newScript);
      });
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Update URL without reload
    const currentUrl = new URL(window.location);
    currentUrl.pathname = this.currentIntent?.destination || '/phos';
    window.history.pushState({}, '', currentUrl);
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  renderError(url, error) {
    const container = document.getElementById('phos-content-mount');
    if (container) {
      container.innerHTML = `
        <div class="phos-error">
          <h2>Unable to load content</h2>
          <p>The requested page could not be loaded.</p>
          <p class="phos-error-detail">${error.message}</p>
          <button onclick="window.phos.transitionTo('${PHOS_STATES.INTENT}')">
            Return to navigation
          </button>
        </div>
      `;
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  startVoice() {
    if (!this.voice) {
      this.voice = new PHOSVoice(
        (transcript) => this.handleVoiceInput(transcript),
        (error) => console.error('PHOS Voice error:', error)
      );
    }
<<<<<<< HEAD
    
    return this.voice.start();
  }
  
=======

    return this.voice.start();
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  stopVoice() {
    if (this.voice) {
      this.voice.stop();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Global instance
// ═══════════════════════════════════════════════════════════════════════════════

export function createPHOS(options = {}) {
  const phos = new PHOSController(options);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Expose for debugging (remove in production)
  if (typeof window !== 'undefined') {
    window.phos = phos;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return phos;
}

// Default export
export default { createPHOS, PHOSController, PHOSVoice, inferIntent, INTENT_CATALOG, PHOS_STATES, PHOS_PROFILES };
