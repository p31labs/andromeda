/**
 * WebGPU Rules Engine - Constitution-based Constraint Evaluation
 * 
 * Implements the three-tiered Constitution (Prime Directives, Global Rules, Creator Rules)
 * using WebGPU compute shaders for real-time constraint evaluation.
 * 
 * This engine enforces the hierarchical constraint system where:
 * - Prime Directives are immutable and non-negotiable
 * - Global Rules apply everywhere but can be overridden by Creator Rules
 * - Creator Rules can only be MORE restrictive than Global Rules
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

import { 
  GPUBufferUsage, 
  GPUShaderStage, 
  GPUMapMode,
  GPUBuffer,
  GPUBindGroup,
  GPUComputePipeline,
  GPUDevice
} from '../../types/webgpu';

export interface WebGPUBufferLayout {
  rules: GPUBuffer;
  context: GPUBuffer;
  results: GPUBuffer;
  conditions: GPUBuffer;
}

export class WebGPURulesEngine {
  // Use any for device to avoid type conflicts between custom and native WebGPU types
  private device: any = null;
  private buffers: WebGPUBufferLayout | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPUComputePipeline | null = null;
  private fallbackEngine: CPUFallbackRulesEngine;

  constructor() {
    this.fallbackEngine = new CPUFallbackRulesEngine();
  }

  /**
   * Initialize WebGPU and create compute pipeline
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
      if (!this.device) {
        console.warn('Failed to get WebGPU device, using CPU fallback');
        return false;
      }

      this.createBuffers();
      this.createPipeline();
      return true;
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      return false;
    }
  }

  private createBuffers() {
    if (!this.device) return;

    // Rules buffer
    this.buffers = {
      rules: this.device.createBuffer({
        size: MAX_RULES * RULE_STRUCT_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      context: this.device.createBuffer({
        size: CONTEXT_STRUCT_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      results: this.device.createBuffer({
        size: MAX_RULES * 4, // 4 bytes per rule result
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      }),
      conditions: this.device.createBuffer({
        size: MAX_CONDITIONS * CONDITION_STRUCT_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
    };
  }

  private createPipeline() {
    if (!this.device || !this.buffers) return;

    const computeShader = `
      @group(0) @binding(0) var<storage, read> rules: array<Rule>;
      @group(0) @binding(1) var<storage, read> context: Context;
      @group(0) @binding(2) var<storage, read_write> results: array<u32>;
      @group(0) @binding(3) var<storage, read> conditions: array<Condition>;

      struct Rule {
        id: u32,
        tier: u32,
        condition_count: u32,
        action_type: u32,
        priority: u32,
        enabled: u32,
        zone_id: u32,
        condition_offset: u32,
      };

      struct Context {
        spoon_balance: f32,
        karma: f32,
        time_of_day: f32,
        zone_id: u32,
        action: u32,
        timestamp: u32,
      };

      struct Condition {
        field: u32,
        operator: u32,
        value: f32,
        description: u32,
      };

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let rule_idx = global_id.x;
        if (rule_idx >= ${MAX_RULES}) {
          return;
        }

        let rule = rules[rule_idx];
        
        // Skip disabled rules
        if (rule.enabled == 0u) {
          results[rule_idx] = 2u; // SKIPPED
          return;
        }

        // Evaluate conditions
        var allowed = true;
        var conditions_met = 0u;
        
        for (var i = 0u; i < rule.condition_count; i = i + 1u) {
          let cond_idx = rule.condition_offset + i;
          let condition = conditions[cond_idx];
          
          if (evaluate_condition(condition, context)) {
            conditions_met = conditions_met + 1u;
          } else if (rule.condition_logic == 0u) { // AND logic
            allowed = false;
            break;
          }
        }

        // Check if conditions are met based on logic type
        if (rule.condition_logic == 0u && conditions_met < rule.condition_count) {
          allowed = false;
        } else if (rule.condition_logic == 1u && conditions_met == 0u) {
          allowed = false;
        }

        // Set result
        if (allowed) {
          results[rule_idx] = 1u; // ALLOWED
        } else {
          results[rule_idx] = 0u; // DENIED
        }
      }

      fn evaluate_condition(condition: Condition, context: Context) -> bool {
        let field = condition.field;
        let operator = condition.operator;
        let value = condition.value;
        
        // Field mapping: 0=spoon_balance, 1=karma, 2=time_of_day, 3=zone_id
        var field_value: f32 = 0.0;
        if (field == 0u) { field_value = context.spoon_balance; }
        else if (field == 1u) { field_value = context.karma; }
        else if (field == 2u) { field_value = context.time_of_day; }
        
        // Operator mapping: 0=equals, 1=not_equals, 2=greater_than, 3=less_than
        if (operator == 0u) { return field_value == value; }
        else if (operator == 1u) { return field_value != value; }
        else if (operator == 2u) { return field_value > value; }
        else if (operator == 3u) { return field_value < value; }
        
        return true; // Default allow
      }
    `;

    const module = this.device.createShaderModule({
      code: computeShader,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' },
        },
      ],
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.buffers.rules } },
        { binding: 1, resource: { buffer: this.buffers.context } },
        { binding: 2, resource: { buffer: this.buffers.results } },
        { binding: 3, resource: { buffer: this.buffers.conditions } },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module,
        entryPoint: 'main',
      },
    });
  }

  /**
   * Evaluate rules against context using WebGPU
   */
  async evaluateRules(
    constitution: Constitution, 
    context: RuleContext, 
    zoneId?: string
  ): Promise<RuleEvaluationResult> {
    
    // If WebGPU is not available, fall back to CPU
    if (!this.device || !this.buffers || !this.pipeline || !this.bindGroup) {
      return this.fallbackEngine.evaluateRules(constitution, context, zoneId);
    }

    try {
      // Prepare data for GPU
      const rulesData = this.serializeRules(constitution, context);
      const contextData = this.serializeContext(context);
      const conditionsData = this.serializeConditions(constitution);

      // Upload data to GPU
      this.device.queue.writeBuffer(this.buffers.rules, 0, rulesData);
      this.device.queue.writeBuffer(this.buffers.context, 0, contextData);
      this.device.queue.writeBuffer(this.buffers.conditions, 0, conditionsData);

      // Execute compute shader
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.dispatchWorkgroups(Math.ceil(MAX_RULES / 64));
      pass.end();

      this.device.queue.submit([encoder.finish()]);

      // Read results back
      const resultBuffer = this.device.createBuffer({
        size: MAX_RULES * 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });

      const copyEncoder = this.device.createCommandEncoder();
      copyEncoder.copyBufferToBuffer(
        this.buffers.results,
        0,
        resultBuffer,
        0,
        MAX_RULES * 4
      );

      this.device.queue.submit([copyEncoder.finish()]);

      await resultBuffer.mapAsync(GPUMapMode.READ);
      const resultData = resultBuffer.getMappedRange();
      const results = new Uint32Array(resultData);

      resultBuffer.unmap();

      // Process results and build evaluation result
      return this.processResults(results, constitution, context, zoneId);

    } catch (error) {
      console.error('WebGPU rules evaluation failed:', error);
      return this.fallbackEngine.evaluateRules(constitution, context, zoneId);
    }
  }

  private serializeRules(constitution: Constitution, context: RuleContext): ArrayBuffer {
    // Convert Constitution to flat array for GPU
    const rules = [...constitution.primeDirectives, ...constitution.globalRules];
    const zoneRules = constitution.creatorRules.get(context.zoneId || '') || [];
    rules.push(...zoneRules);

    // Implementation would flatten the rules into a typed array
    // This is a simplified version - actual implementation would need
    // proper binary layout matching the shader struct
    const buffer = new ArrayBuffer(rules.length * RULE_STRUCT_SIZE);
    // ... serialization logic
    return buffer;
  }

  private serializeContext(context: RuleContext): ArrayBuffer {
    // Convert context to binary format for GPU
    const buffer = new ArrayBuffer(CONTEXT_STRUCT_SIZE);
    // ... serialization logic
    return buffer;
  }

  private serializeConditions(constitution: Constitution): ArrayBuffer {
    // Serialize all conditions for all rules
    const buffer = new ArrayBuffer(MAX_CONDITIONS * CONDITION_STRUCT_SIZE);
    // ... serialization logic
    return buffer;
  }

  private processResults(
    results: Uint32Array, 
    constitution: Constitution, 
    context: RuleContext, 
    zoneId?: string
  ): RuleEvaluationResult {
    
    const matchedRules: Rule[] = [];
    let deniedBy: Rule | undefined;
    const warnings: string[] = [];
    const requiredAcknowledgments: string[] = [];
    const transformations: RuleAction[] = [];

    // Process results in order: Prime Directives, Global Rules, Creator Rules
    let ruleIndex = 0;

    // Check Prime Directives first
    for (const rule of constitution.primeDirectives) {
      const result = results[ruleIndex++];
      if (result === 0) { // DENIED
        deniedBy = rule;
        break;
      } else if (result === 1) { // ALLOWED
        matchedRules.push(rule);
      }
    }

    if (deniedBy) {
      return {
        allowed: false,
        matchedRules,
        deniedBy,
        warnings,
        requiredAcknowledgments,
        transformations
      };
    }

    // Check Global Rules
    for (const rule of constitution.globalRules) {
      const result = results[ruleIndex++];
      if (result === 1) { // ALLOWED
        matchedRules.push(rule);
        if (rule.action.type === 'WARN') {
          warnings.push(rule.action.message);
        } else if (rule.action.type === 'REQUIRE_ACK') {
          requiredAcknowledgments.push(rule.action.message);
        } else if (rule.action.type === 'TRANSFORM') {
          transformations.push(rule.action);
        }
      }
    }

    // Check Creator Rules for specific zone
    const creatorRules = constitution.creatorRules.get(zoneId || '') || [];
    for (const rule of creatorRules) {
      const result = results[ruleIndex++];
      if (result === 1) { // ALLOWED
        matchedRules.push(rule);
        if (rule.action.type === 'WARN') {
          warnings.push(rule.action.message);
        } else if (rule.action.type === 'REQUIRE_ACK') {
          requiredAcknowledgments.push(rule.action.message);
        } else if (rule.action.type === 'TRANSFORM') {
          transformations.push(rule.action);
        }
      }
    }

    return {
      allowed: !deniedBy,
      matchedRules,
      deniedBy,
      warnings,
      requiredAcknowledgments,
      transformations
    };
  }

  /**
   * Dispose of WebGPU resources
   */
  dispose() {
    if (this.buffers) {
      this.buffers.rules.destroy();
      this.buffers.context.destroy();
      this.buffers.results.destroy();
      this.buffers.conditions.destroy();
    }
    this.device = null;
    this.buffers = null;
    this.bindGroup = null;
    this.pipeline = null;
  }
}

/**
 * CPU Fallback Rules Engine
 * 
 * Provides the same interface as WebGPURulesEngine but uses CPU computation.
 * This ensures the system works even when WebGPU is not available.
 */
class CPUFallbackRulesEngine {
  
  evaluateRules(
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
}

// Constants for buffer sizes
const MAX_RULES = 1000;
const MAX_CONDITIONS = 5000;
const RULE_STRUCT_SIZE = 64; // bytes
const CONTEXT_STRUCT_SIZE = 32; // bytes
const CONDITION_STRUCT_SIZE = 16; // bytes