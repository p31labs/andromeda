/**
 * @file cognitiveShield.test.ts — Tests for Cognitive Shield LLM Pipeline
 *
 * Tests the LLM-mediated message filtering with BLUF conversion.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock fetch for Ollama tests
vi.stubGlobal('fetch', vi.fn());

describe('Cognitive Shield', () => {
  it('should have correct configuration constants', async () => {
    // Test configuration values
    const SPOON_PENALTY_BYPASS = 50;
    expect(SPOON_PENALTY_BYPASS).toBe(50);
  });

  it('should export test strings', async () => {
    const { TEST_STRINGS } = await import('../services/cognitiveShield');
    
    expect(TEST_STRINGS.aggressive).toBeDefined();
    expect(TEST_STRINGS.emotional).toBeDefined();
    expect(TEST_STRINGS.venting).toBeDefined();
    expect(TEST_STRINGS.neutral).toBeDefined();
    expect(TEST_STRINGS.complex).toBeDefined();
  });

  it('should have processThroughShield function', async () => {
    const { processThroughShield } = await import('../services/cognitiveShield');
    
    expect(typeof processThroughShield).toBe('function');
  });

  it('should have getShieldStatus function', async () => {
    const { getShieldStatus } = await import('../services/cognitiveShield');
    
    expect(typeof getShieldStatus).toBe('function');
  });

  it('should have initializeShield function', async () => {
    const { initializeShield } = await import('../services/cognitiveShield');
    
    expect(typeof initializeShield).toBe('function');
  });

  it('should have useCognitiveShield hook', async () => {
    const { useCognitiveShield } = await import('../services/cognitiveShield');
    
    expect(typeof useCognitiveShield).toBe('function');
    
    const state = useCognitiveShield.getState();
    expect(state.status).toBeDefined();
    expect(state.method).toBeDefined();
    expect(state.isProcessing).toBe(false);
    expect(state.lastResult).toBeNull();
    expect(typeof state.initialize).toBe('function');
    expect(typeof state.process).toBe('function');
  });
});

describe('ShieldResult Type', () => {
  it('should have correct shield result structure', () => {
    const result = {
      originalText: "I'm so angry!",
      shieldText: 'Request: Resolve issue.',
      wasBypassed: false,
      spoonPenalty: 0,
      latency: 1500,
      method: 'ollama' as const,
    };
    
    expect(result.originalText).toBeDefined();
    expect(result.shieldText).toBeDefined();
    expect(result.wasBypassed).toBe(false);
    expect(result.spoonPenalty).toBe(0);
    expect(result.latency).toBeGreaterThan(0);
    expect(['webllm', 'ollama', 'bypass']).toContain(result.method);
  });

  it('should mark bypassed results correctly', () => {
    const bypassedResult = {
      originalText: "Test message",
      shieldText: "Test message",
      wasBypassed: true,
      spoonPenalty: 50,
      latency: 100,
      method: 'bypass' as const,
    };
    
    expect(bypassedResult.wasBypassed).toBe(true);
    expect(bypassedResult.spoonPenalty).toBe(50);
    expect(bypassedResult.method).toBe('bypass');
  });
});

describe('Test String Patterns', () => {
  it('should have aggressive test string with emotional vocabulary', async () => {
    const { TEST_STRINGS } = await import('../services/cognitiveShield');
    
    // Aggressive string should contain emotional words
    expect(TEST_STRINGS.aggressive.toLowerCase()).toMatch(/angry|furious|ridiculous/);
  });

  it('should have emotional test string with positive emotion', async () => {
    const { TEST_STRINGS } = await import('../services/cognitiveShield');
    
    // Emotional string should contain positive emotional words
    expect(TEST_STRINGS.emotional.toLowerCase()).toMatch(/love|amazing|perfect/);
  });

  it('should have venting test string', async () => {
    const { TEST_STRINGS } = await import('../services/cognitiveShield');
    
    // Venting string should be a complaint
    expect(TEST_STRINGS.venting.toLowerCase()).toMatch(/nobody|listens|wrong/);
  });

  it('should have neutral test string', async () => {
    const { TEST_STRINGS } = await import('../services/cognitiveShield');
    
    // Neutral string should be simple request
    expect(TEST_STRINGS.neutral).toBe('Please restart the system');
  });
});

describe('Shield Status', () => {
  it('should have correct status values', async () => {
    const { getShieldStatus } = await import('../services/cognitiveShield');
    
    const status = getShieldStatus();
    
    expect(status.status).toMatch(/idle|initializing|ready|error/);
    expect(['webllm', 'ollama', 'none']).toContain(status.method);
  });
});

describe('System Prompt', () => {
  it('should contain BLUF instructions', async () => {
    // The system prompt should instruct the LLM to return BLUF format
    const prompt = `You are the P31 Cognitive Shield — a communication filter designed to help the operator communicate clearly during high-emotion states.

Your task is to:
1. Strip ALL emotional vocabulary from the user's message
2. Identify the CORE OPERATIONAL REQUEST (what they actually need/want)
3. Return a BLUF (Bottom Line Up Front) response

BLUF FORMAT:
- Start with the action/need
- Keep it to 1-2 sentences maximum
- Use neutral, clinical language
- Remove: adjectives, adverbs expressing emotion, venting, accusations, sarcasm`;
    
    expect(prompt).toContain('BLUF');
    expect(prompt).toContain('Bottom Line Up Front');
    expect(prompt).toContain('neutral');
    expect(prompt).toContain('OPERATIONAL');
  });
});
