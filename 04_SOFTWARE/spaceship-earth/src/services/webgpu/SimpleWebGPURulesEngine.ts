/**
 * Simple WebGPU Rules Engine - Constitution-based Constraint Evaluation
 * 
 * A simplified version that uses browser-native WebGPU types and focuses on core functionality.
 * Implements the three-tiered Constitution (Prime Directives, Global Rules, Creator Rules)
 * using WebGPU compute shaders for real-time constraint evaluation.
 */

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: any;
  description: string;
}

export type RuleOperator = 
  | 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN'
  | 'CONTAINS' | 'IN' | 'BETWEEN' | 'TIME_RANGE' | 'ALWAYS';

export interface RuleAction {
  type: 'ALLOW' | 'DENY' | 'REQUIRE_ACK' | 'WARN' | 'TRANSFORM' | 'SHIELD';
  target?: string;
  parameters?: Record<string, any>;
  message: string;
}

export interface Rule {
  id: string;
  tier: RuleTier;
  name: string;
  description: string;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  action: RuleAction;
  priority: number;
  zoneId?: string;
  createdBy: string;
  createdAt: number;
  enabled: boolean;
  immutable: boolean;
}

export enum RuleTier {
  PRIME_DIRECTIVE = 0,  // Immutable. Cannot be overridden.
  GLOBAL          = 1,  // Community consensus. Applies everywhere.
  CREATOR         = 2,  // Zone-specific. More restrictive only.
}

export interface Constitution {
  primeDirectives: Rule[];
  globalRules: Rule[];
  creatorRules: Map<string, Rule[]>; // Keyed by zoneId
}

export interface RuleContext {
  spoonBalance: number;
  karma: number;
  timeOfDay: number;
  zoneId: string;
  userId: string;
  action: string;
  target: string;
  timestamp: number;
}

export interface RuleEvaluationResult {
  allowed: boolean;
  matchedRules: Rule[];
  deniedBy?: Rule;
  warnings: string[];
  requiredAcknowledgments: string[];
  transformations: RuleAction[];
}

export class SimpleWebGPURulesEngine {
  // Use any for device to avoid type conflicts between custom and native WebGPU types
  private device: any = null;
  private initialized = false;

  constructor() {}

  /**
   * Initialize WebGPU and check if it's available
   */
  async initialize(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported, using CPU fallback');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn('Failed to get WebGPU adapter, using CPU fallback');
        return false;
      }

      this.device = await adapter.requestDevice();
      this.initialized = true;
      console.log('WebGPU Rules Engine initialized successfully');
      return true;
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      return false;
    }
  }

  /**
   * Evaluate rules against context using CPU (fallback or primary method)
   */
  async evaluateRules(
    constitution: Constitution, 
    context: RuleContext, 
    zoneId?: string
  ): Promise<RuleEvaluationResult> {
    
    // Use CPU evaluation for now - this is the core logic
    return this.evaluateRulesCPU(constitution, context, zoneId);
  }

  private evaluateRulesCPU(
    constitution: Constitution, 
    context: RuleContext, 
    zoneId?: string
  ): RuleEvaluationResult {
    
    const result: RuleEvaluationResult = {
      allowed: true,
      matchedRules: [],
      warnings: [],
      requiredAcknowledgments: [],
      transformations: []
    };

    // Phase 1: Prime Directives - absolute, non-negotiable
    for (const rule of constitution.primeDirectives) {
      if (!rule.enabled) continue;
      if (this.matchesConditions(rule, context)) {
        result.matchedRules.push(rule);
        if (rule.action.type === 'DENY') {
          result.allowed = false;
          result.deniedBy = rule;
          return result;
        }
      }
    }

    // Phase 2: Global Rules
    for (const rule of constitution.globalRules) {
      if (!rule.enabled) continue;
      if (this.matchesConditions(rule, context)) {
        result.matchedRules.push(rule);
        this.applyAction(rule, result);
      }
    }

    const globalDeny = !result.allowed;

    // Phase 3: Creator Rules - can only TIGHTEN, never RELAX
    if (zoneId) {
      const zoneRules = constitution.creatorRules.get(zoneId) || [];
      for (const rule of zoneRules) {
        if (!rule.enabled) continue;
        if (this.matchesConditions(rule, context)) {
          result.matchedRules.push(rule);
          
          // CRITICAL INVARIANT: Creator rules cannot reverse a Global denial
          // and cannot ALLOW something a Global rule denies
          if (rule.action.type === 'ALLOW' && globalDeny) continue;
          
          this.applyAction(rule, result);
        }
      }
    }

    return result;
  }

  private matchesConditions(rule: Rule, context: RuleContext): boolean {
    const evaluation = rule.conditionLogic === 'AND'
      ? rule.conditions.every(c => this.evaluateCondition(c, context))
      : rule.conditions.some(c => this.evaluateCondition(c, context));
    return evaluation;
  }

  private evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
    const actualValue = this.getFieldValue(condition.field, context);
    
    switch (condition.operator) {
      case 'ALWAYS': return true;
      case 'EQUALS': return actualValue === condition.value;
      case 'NOT_EQUALS': return actualValue !== condition.value;
      case 'GREATER_THAN': return actualValue > condition.value;
      case 'LESS_THAN': return actualValue < condition.value;
      case 'TIME_RANGE': {
        const now = new Date();
        const hour = now.getHours();
        return hour >= condition.value[0] && hour < condition.value[1];
      }
      case 'IN': return (condition.value as any[]).includes(actualValue);
      default: return false;
    }
  }

  private getFieldValue(field: string, context: RuleContext): any {
    switch (field) {
      case 'spoonBalance': return context.spoonBalance;
      case 'karma': return context.karma;
      case 'timeOfDay': return context.timeOfDay;
      case 'zoneId': return context.zoneId;
      case 'userId': return context.userId;
      case 'action': return context.action;
      case 'target': return context.target;
      default: return null;
    }
  }

  private applyAction(rule: Rule, result: RuleEvaluationResult) {
    switch (rule.action.type) {
      case 'WARN':
        result.warnings.push(rule.action.message);
        break;
      case 'REQUIRE_ACK':
        result.requiredAcknowledgments.push(rule.action.message);
        break;
      case 'TRANSFORM':
        result.transformations.push(rule.action);
        break;
      case 'DENY':
        result.allowed = false;
        result.deniedBy = rule;
        break;
      case 'ALLOW':
        // Allow action - only processed if no previous denial
        break;
      case 'SHIELD':
        // Cognitive Shield action
        result.transformations.push(rule.action);
        break;
    }
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.device = null;
    this.initialized = false;
  }

  /**
   * Check if WebGPU is available
   */
  isAvailable(): boolean {
    return this.initialized && this.device !== null;
  }
}

/**
 * Example Constitution for testing
 */
export const createExampleConstitution = (): Constitution => {
  return {
    primeDirectives: [
      {
        id: 'pd-001',
        tier: RuleTier.PRIME_DIRECTIVE,
        name: 'Right to Sovereign Space',
        description: 'Every person has the right to a space where they can exist without justification.',
        conditions: [{ field: 'any', operator: 'ALWAYS', value: true, description: 'Applies universally' }],
        conditionLogic: 'AND',
        action: { type: 'ALLOW', message: 'Sovereign space rights are inviolable.' },
        priority: 1000,
        createdBy: 'SYSTEM',
        createdAt: Date.now(),
        enabled: true,
        immutable: true,
        zoneId: undefined
      }
    ],
    globalRules: [
      {
        id: 'gr-001',
        tier: RuleTier.GLOBAL,
        name: 'Quiet Hours',
        description: 'Quiet hours active. Keep volume below conversational level.',
        conditions: [{ field: 'timeOfDay', operator: 'TIME_RANGE', value: [22, 7], description: '10PM–7AM' }],
        conditionLogic: 'AND',
        action: { type: 'REQUIRE_ACK', message: 'Quiet hours active. Keep volume below conversational level.' },
        priority: 100,
        createdBy: 'COMMUNITY',
        createdAt: Date.now(),
        enabled: true,
        immutable: false,
        zoneId: undefined
      },
      {
        id: 'gr-002',
        tier: RuleTier.GLOBAL,
        name: 'Spoon Gate — Stand Down Protection',
        description: 'Stand Down active. You have no spoons remaining. Rest first.',
        conditions: [{ field: 'spoonBalance', operator: 'LESS_THAN', value: 1, description: 'Zero spoons remaining' }],
        conditionLogic: 'AND',
        action: { type: 'DENY', message: 'Stand Down active. You have no spoons remaining. Rest first.' },
        priority: 200,
        createdBy: 'SYSTEM',
        createdAt: Date.now(),
        enabled: true,
        immutable: false,
        zoneId: undefined
      }
    ],
    creatorRules: new Map()
  };
};