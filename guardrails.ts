import { GUARDRAIL_LEVELS } from './guardrails.js';

export interface GuardrailState {
  currentLevel: number;
  consecutiveReadings: number;
  lastSpoonCount: number;
};
