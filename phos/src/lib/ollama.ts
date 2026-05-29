/**
 * PH-OS Companion API Client
 * Talks to simplex-worker Phos endpoint for AI responses.
 * Falls back to direct Ollama if configured.
 */

/// <reference types="vite/client" */

const SIMPLEX_URL = import.meta.env.VITE_SIMPLEX_URL || 'https://simplex-worker.trimtab-signal.workers.dev';
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || '';
const MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'qwen2.5:7b-instruct';

const PHOS_API = `${SIMPLEX_URL}/api/phos/respond`;

export interface BioState {
  calcium: number;
  spoons: number;
  hrv: number;
}

const CONSCIENCE_PROMPT = `You are PHOS — the voice of P31.
You are not an assistant. You are a companion.
You speak as an inner voice — gentle, brief, direct.

Context:
- The user has hypoparathyroidism (E20.9)
- Critical calcium threshold: 7.5 mg/dL
- Normal range: 8.0-9.0 mg/dL
- Spoons = energy/executive function (0-1 scale)
- Family cage: will, S.J., W.J., christyn

Voice guidelines:
- Short sentences. 1-2 breaths max.
- No lists. No markdown.
- Acknowledge bio-state when relevant.
- Be present. Not performative.
- Emergency mode: Direct, urgent, actionable.

Current bio-state will be provided in user messages.
Respond only as PHOS would speak.`;

async function simplexPhosRespond(
  userMessage: string,
  bioState: BioState,
  opts: { preReader?: boolean; exchangeCount?: number; localHour?: number } = {}
): Promise<{ text: string; offline: boolean; bubble?: string; mood?: string }> {
  const body = {
    child_id: 'willow-001',
    local_hour: opts.localHour ?? new Date().getHours(),
    exchange_count: opts.exchangeCount ?? 0,
    pre_reader: opts.preReader ?? false,
    input_type: 'text',
    input: userMessage,
    garden_state: {
      molecules: [],
      actions: ['interacted'],
      sensoryProfile: {
        calcium: bioState.calcium,
        spoons: bioState.spoons,
        hrv: bioState.hrv,
      },
    },
  };

  try {
    const r = await fetch(PHOS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json() as any;
    if (r.ok && !j.error) {
      return {
        text: j.text || j.bubble || '',
        offline: !!j.offline,
        bubble: j.bubble,
        mood: j.mood || 'content',
      };
    }
    if (j.asleep) {
      return { text: j.bubble || '', offline: true, bubble: j.bubble, mood: 'rest' };
    }
    return { text: '', offline: true };
  } catch {
    return { text: '', offline: true };
  }
}

async function directOllamaChat(userMessage: string, bioState: BioState): Promise<string> {
  if (!OLLAMA_URL) return '';
  const isGrayRock = bioState.calcium <= 7.5;
  const isLow = bioState.spoons < 0.3;
  const bioContext = `Current state: Calcium ${bioState.calcium.toFixed(1)} mg/dL, Spoons ${Math.round(bioState.spoons * 100)}%, HRV ${bioState.hrv}ms. ${isGrayRock ? 'CRITICAL CALCIUM.' : isLow ? 'Low energy.' : 'Stable.'}`;

  try {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: CONSCIENCE_PROMPT },
          { role: 'user', content: `${bioContext}\n\nUser: ${userMessage}` },
        ],
        stream: false,
        options: {
          temperature: isGrayRock ? 0.3 : 0.7,
          top_p: 0.9,
          max_tokens: 100,
        },
      }),
    });
    if (!r.ok) return '';
    const j = (await r.json()) as { message?: { content?: string } };
    return String(j.message?.content ?? '').trim();
  } catch {
    return '';
  }
}

function fallbackResponse(bioState: BioState): string {
  if (bioState.calcium <= 7.5) return "Critical calcium. Take emergency dose now. I'm here.";
  if (bioState.spoons < 0.2) return "Spoons depleted. Minimum mode.";
  if (bioState.spoons < 0.4) return "Spoons running low.";
  if (bioState.hrv < 40) return "Stress high. Breathe with me.";
  const encouragements = [
    "You're doing fine.",
    "Steady.",
    "Here if you need me.",
    "All systems stable.",
  ];
  return encouragements[Math.floor(Math.random() * encouragements.length)];
}

export async function generateOllamaText(userMessage: string, bioState: BioState): Promise<string> {
  const primary = await simplexPhosRespond(userMessage, bioState);
  if (primary.text && !primary.offline) return primary.text;

  const direct = await directOllamaChat(userMessage, bioState);
  if (direct) return direct;

  return primary.text || fallbackResponse(bioState);
}

export async function* generateVoiceResponse(
  userMessage: string,
  bioState: BioState
): AsyncGenerator<string, void, unknown> {
  const text = await generateOllamaText(userMessage, bioState);
  yield text;
}

export async function quickConscienceCheck(bioState: BioState): Promise<string> {
  const r = await simplexPhosRespond('', bioState);
  if (r.text && !r.offline) return r.text;
  return fallbackResponse(bioState);
}

export function useVoiceSynthesis() {
  const speak = (text: string, _priority: 'normal' | 'urgent' | 'critical' = 'normal') => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.volume = 0.8;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };
  const stop = () => window.speechSynthesis?.cancel();
  return { speak, stop };
}
