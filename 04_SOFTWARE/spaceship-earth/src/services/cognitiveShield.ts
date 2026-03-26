/**
 * @file cognitiveShield.ts — Cognitive Shield LLM Pipeline
 *
 * P31 Labs — LLM-Mediated Communication Filter
 *
 * Intercepts user messages and uses LLM to strip emotional vocabulary,
 * returning BLUF (Bottom Line Up Front) operational requests.
 *
 * Architecture:
 *   1. Attempt WebAssembly inference (WebLLM with 4-bit Phi-3-mini)
 *   2. Fallback to local LAN Ollama endpoint
 *   3. If both fail, allow bypass with Spoon penalty
 *
 * Spoon Penalty: Bypassing the shield costs 50 Spoons (configurable)
 * This incentivizes using the filter for emotional regulation.
 *
 * System Prompt: Forces LLM to act as emotional vocabulary stripper,
 * returning neutral operational requests.
 */

import { loadLLMConfig, streamChat, type ChatMessage, type LLMConfig } from './llmClient';
import { useLedgerStore } from '../stores/ledgerStore';

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

const SPOON_PENALTY_BYPASS = 50;  // Spoons deducted for bypassing shield
const SPOON_PENALTY_BYPASS_REASON = 'Cognitive Shield bypass';

// WebLLM model configuration
const WEBLLM_MODEL = 'Phi-3-mini-4k-instruct-q4';
const WEBLLM_ENGINE = 'Phi3MiniInstructW4G16';

// Local Ollama fallback endpoint
const OLLAMA_ENDPOINT = 'http://localhost:11434';
const OLLAMA_MODEL = 'llama3';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface ShieldResult {
  originalText: string;
  shieldText: string;
  wasBypassed: boolean;
  spoonPenalty: number;
  latency: number;  // ms
  method: 'webllm' | 'ollama' | 'bypass';
}

export interface ShieldConfig {
  enablePenalty: boolean;
  minSpoonsRequired: number;
  fallbackToBypass: boolean;
}

export type ShieldStatus = 'idle' | 'initializing' | 'ready' | 'error';

// ─────────────────────────────────────────────────────────────────
// Cognitive Shield State
// ─────────────────────────────────────────────────────────────────

interface CognitiveShieldState {
  status: ShieldStatus;
  method: 'webllm' | 'ollama' | 'none';
  config: ShieldConfig;
  error: string | null;
  
  // Initialize the shield
  initialize: () => Promise<void>;
  
  // Process message through shield
  processMessage: (text: string, forceBypass?: boolean) => Promise<ShieldResult>;
  
  // Update config
  setConfig: (config: Partial<ShieldConfig>) => void;
  
  // Check if bypass is allowed
  canBypass: () => boolean;
}

// ─────────────────────────────────────────────────────────────────
// WebLLM Integration (experimental)
// ─────────────────────────────────────────────────────────────────

let webllmEngine: any = null;

/**
 * Initialize WebLLM for local inference
 */
async function initWebLLM(): Promise<boolean> {
  try {
    // Dynamic import - WebLLM requires special build
    // In production, this loads from CDN or bundled WASM
    // Note: webllm package is not available in this environment
    // For now, we'll skip WebLLM and use Ollama fallback
    return false;
  } catch (error) {
    console.warn('[CognitiveShield] WebLLM init failed:', error);
    return false;
  }
}

/**
 * Process with WebLLM
 */
async function processWithWebLLM(text: string, systemPrompt: string): Promise<string> {
  if (!webllmEngine) {
    throw new Error('WebLLM not initialized');
  }
  
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ];
  
  const chunks: string[] = [];
  
  // Note: WebLLM has different API than OpenAI
  // Using chat.completions interface
  const stream = await webllmEngine.chat.completions.create({
    messages,
    temperature: 0.3,
    max_tokens: 256,
  });
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      chunks.push(content);
    }
  }
  
  return chunks.join('');
}

// ─────────────────────────────────────────────────────────────────
// Ollama Fallback
// ─────────────────────────────────────────────────────────────────

/**
 * Process with Ollama (local LAN endpoint)
 */
async function processWithOllama(text: string, systemPrompt: string): Promise<string> {
  const url = `${OLLAMA_ENDPOINT}/api/generate`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: `<|system|>\n${systemPrompt}\n<|user|>\n${text}\n<|assistant|>`,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 256,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }
  
  const data = await response.json() as { response: string };
  return data.response;
}

// ─────────────────────────────────────────────────────────────────
// System Prompt for BLUF Conversion
// ─────────────────────────────────────────────────────────────────

const COGNITIVE_SHIELD_SYSTEM_PROMPT = `You are the P31 Cognitive Shield — a communication filter designed to help the operator communicate clearly during high-emotion states.

Your task is to:
1. Strip ALL emotional vocabulary from the user's message
2. Identify the CORE OPERATIONAL REQUEST (what they actually need/want)
3. Return a BLUF (Bottom Line Up Front) response

BLUF FORMAT:
- Start with the action/need
- Keep it to 1-2 sentences maximum
- Use neutral, clinical language
- Remove: adjectives, adverbs expressing emotion, venting, accusations, sarcasm

EXAMPLES:
Input: "I'm SO ANGRY that this is happening and nobody cares!"
Output: "Request: Resolve issue with system."

Input: "OMG this is amazing and I love it so much!!!"
Output: "Response: Confirm feature works as expected."

Input: "This is absolutely ridiculous and I'm done with this"
Output: "Request: End current session."

Return ONLY the BLUF response. No explanations. No preamble.`;


// ─────────────────────────────────────────────────────────────────
// Main Processing Function
// ─────────────────────────────────────────────────────────────────

/**
 * Process a message through the Cognitive Shield
 * Returns both original and filtered text
 */
export async function processThroughShield(
  text: string,
  options: {
    forceBypass?: boolean;
    deductSpoons?: boolean;
  } = {}
): Promise<ShieldResult> {
  const startTime = performance.now();
  const { forceBypass = false, deductSpoons = true } = options;
  
  // Check if bypass is requested or required
  const ledgerStore = useLedgerStore.getState();
  const currentSpoons = ledgerStore.spoonBalance;
  
  if (forceBypass || currentSpoons < SPOON_PENALTY_BYPASS) {
    // Bypass the shield
    if (deductSpoons && currentSpoons >= SPOON_PENALTY_BYPASS) {
      await ledgerStore.deductSpoon(SPOON_PENALTY_BYPASS, SPOON_PENALTY_BYPASS_REASON);
    }
    
    return {
      originalText: text,
      shieldText: text,  // No filtering
      wasBypassed: true,
      spoonPenalty: deductSpoons ? SPOON_PENALTY_BYPASS : 0,
      latency: performance.now() - startTime,
      method: 'bypass',
    };
  }
  
  // Try WebLLM first
  let shieldText: string;
  let method: 'webllm' | 'ollama' = 'webllm';
  
  try {
    if (webllmEngine) {
      shieldText = await processWithWebLLM(text, COGNITIVE_SHIELD_SYSTEM_PROMPT);
    } else {
      throw new Error('WebLLM not available');
    }
  } catch (webllmError) {
    // Fall back to Ollama
    console.warn('[CognitiveShield] WebLLM failed, trying Ollama:', webllmError);
    method = 'ollama';
    
    try {
      shieldText = await processWithOllama(text, COGNITIVE_SHIELD_SYSTEM_PROMPT);
    } catch (ollamaError) {
      // Both failed - offer bypass
      console.error('[CognitiveShield] Both WebLLM and Ollama failed:', ollamaError);
      
      // Ask user if they want to bypass with penalty
      return {
        originalText: text,
        shieldText: text,
        wasBypassed: true,
        spoonPenalty: 0,  // No penalty if service unavailable
        latency: performance.now() - startTime,
        method: 'bypass',
      };
    }
  }
  
  // Success - clean up the response
  shieldText = shieldText.trim();
  
  // Remove any remaining prefixes like "BLUF:" or "Response:"
  shieldText = shieldText
    .replace(/^(BLUF:|Response:|Request:|Action:)\s*/i, '')
    .trim();
  
  return {
    originalText: text,
    shieldText,
    wasBypassed: false,
    spoonPenalty: 0,
    latency: performance.now() - startTime,
    method,
  };
}

// ─────────────────────────────────────────────────────────────────
// Shield Status Hook
// ─────────────────────────────────────────────────────────────────

let _status: ShieldStatus = 'idle';
let _method: 'webllm' | 'ollama' | 'none' = 'none';
let _error: string | null = null;

export function getShieldStatus(): { status: ShieldStatus; method: string; error: string | null } {
  return { status: _status, method: _method, error: _error };
}

export async function initializeShield(): Promise<void> {
  _status = 'initializing';
  
  try {
    // Try WebLLM first
    const webllmOk = await initWebLLM();
    
    if (webllmOk) {
      _method = 'webllm';
      _status = 'ready';
      console.log('[CognitiveShield] Ready (WebLLM)');
      return;
    }
    
    // Test Ollama connection
    try {
      const ollamaTest = await fetch(`${OLLAMA_ENDPOINT}/api/tags`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      if (ollamaTest.ok) {
        _method = 'ollama';
        _status = 'ready';
        console.log('[CognitiveShield] Ready (Ollama)');
        return;
      }
    } catch {
      // Ollama not available
    }
    
    // Neither available
    _method = 'none';
    _status = 'ready';  // Still ready - will use bypass
    console.log('[CognitiveShield] Ready (bypass only)');
    
  } catch (error) {
    _error = error instanceof Error ? error.message : 'Unknown error';
    _status = 'error';
    console.error('[CognitiveShield] Error:', _error);
  }
}

// ─────────────────────────────────────────────────────────────────
// React Hook
// ─────────────────────────────────────────────────────────────────

import { create } from 'zustand';

interface UseCognitiveShieldState {
  status: ShieldStatus;
  method: 'webllm' | 'ollama' | 'none';
  isProcessing: boolean;
  lastResult: ShieldResult | null;
  
  initialize: () => Promise<void>;
  process: (text: string, forceBypass?: boolean) => Promise<ShieldResult>;
}

export const useCognitiveShield = create<UseCognitiveShieldState>((set, get) => ({
  status: 'idle',
  method: 'none',
  isProcessing: false,
  lastResult: null,
  
  initialize: async () => {
    await initializeShield();
    const { status, method } = getShieldStatus();
    set({ status, method: method as any });
  },
  
  process: async (text: string, forceBypass?: boolean) => {
    set({ isProcessing: true });
    
    try {
      const result = await processThroughShield(text, { forceBypass });
      set({ lastResult: result });
      return result;
    } finally {
      set({ isProcessing: false });
    }
  },
}));

// ─────────────────────────────────────────────────────────────────
// Test Strings
// ─────────────────────────────────────────────────────────────────

export const TEST_STRINGS = {
  aggressive: "I'm absolutely furious that this keeps breaking! This is ridiculous and I'm done!",
  emotional: "Oh my god I love this so much!!! It's amazing and perfect!!!",
  venting: "Nobody ever listens to me and everything always goes wrong",
  neutral: "Please restart the system",
  complex: "I've been thinking about this for a while and I feel like we need to change the approach because the current one isn't working and it's really frustrating",
};

// ─────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────
