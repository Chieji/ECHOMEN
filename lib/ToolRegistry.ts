/**
 * ECHOMEN Tool Registry
 * 
 * Implements formal tool protocol with preconditions, effects,
 * retry policies, and execution tracking.
 */

import { z } from 'zod';

export interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
  duration?: number;
}

export interface Context {
  sessionId: string;
  userId?: string;
  permissions: string[];
  resources: Map<string, any>;
}

export interface Precondition {
  type: 'resource' | 'state' | 'permission' | 'data';
  check: (context: Context, args: any) => Promise<boolean>;
  message: string;
  recoverable: boolean;
}

export interface Effect {
  type: 'create' | 'update' | 'delete' | 'side_effect';
  target: string;
  description: string;
  reversible: boolean;
  rollback?: () => Promise<void>;
}

export interface RetryPolicy {
  maxRetries: number;
  backoff: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
  retryable: string[];
}

export interface Tool {
  // Identity
  name: string;
  description: string;
  version: string;
  
  // Schema
  parameters: z.ZodSchema;
  returns: z.ZodSchema;
  
  // Execution
  preconditions: Precondition[];
  effects: Effect[];
  timeout: number;
  retry: RetryPolicy;
  
  // Security
  requiresApproval: boolean;
  allowedRoles: string[];
  
  // Execution
  execute(args: any, context: Context): Promise<ToolResult>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private executionHistory: Map<string, ToolExecution> = new Map();
  
  // ============================================================================
  // Registration
  // ============================================================================
  
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`);
    }
    
    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  list(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  // ============================================================================
  // Execution
  // ============================================================================
  
  async execute(name: string, args: any, context?: Partial<Context>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool ${name} not found`
      };
    }
    
    // Validate parameters
    const validation = tool.parameters.safeParse(args);
    if (!validation.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validation.error.message}`
      };
    }
    
    // Create context
    const execContext: Context = {
      sessionId: `session_${Date.now()}`,
      permissions: ['read', 'write', 'execute'],
      resources: new Map(),
      ...context
    };
    
    // Check preconditions
    const preconditionsMet = await this.validatePreconditions(tool, args, execContext);
    if (!preconditionsMet) {
      return {
        success: false,
        error: 'Preconditions not met'
      };
    }
    
    // Execute with retry
    const result = await this.executeWithRetry(tool, args, execContext);
    
    // Apply effects
    if (result.success) {
      await this.applyEffects(tool, result, execContext);
    }
    
    // Record execution
    this.recordExecution(name, args, result);
    
    return result;
  }
  
  // ============================================================================
  // Validation
  // ============================================================================
  
  async validatePreconditions(
    tool: Tool,
    args: any,
    context: Context
  ): Promise<boolean> {
    for (const precondition of tool.preconditions) {
      try {
        const met = await precondition.check(context, args);
        
        if (!met) {
          console.warn(
            `[ToolRegistry] Preconditions failed for ${tool.name}: ${precondition.message}`
          );
          
          if (!precondition.recoverable) {
            return false;
          }
          
          // Attempt recovery
          const recovered = await this.recoverPrecondition(precondition, context, args);
          if (!recovered) {
            return false;
          }
        }
      } catch (error: any) {
        console.error(
          `[ToolRegistry] Precondition check failed for ${tool.name}:`,
          error.message
        );
        
        if (!precondition.recoverable) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  // ============================================================================
  // Effects
  // ============================================================================
  
  async applyEffects(tool: Tool, result: ToolResult, context: Context): Promise<void> {
    for (const effect of tool.effects) {
      try {
        console.log(
          `[ToolRegistry] Applying effect: ${effect.type} on ${effect.target}`
        );
        
        // Track effect for potential rollback
        context.resources.set(`effect_${effect.target}`, {
          type: effect.type,
          applied: Date.now()
        });
      } catch (error: any) {
        console.error(
          `[ToolRegistry] Failed to apply effect:`,
          error.message
        );
        
        // Attempt rollback if effect is reversible
        if (effect.reversible && effect.rollback) {
          await effect.rollback();
        }
      }
    }
  }
  
  async rollback(tool: Tool, context: Context): Promise<void> {
    // Rollback effects in reverse order
    for (const effect of tool.effects.reverse()) {
      if (effect.reversible && effect.rollback) {
        try {
          await effect.rollback();
          console.log(
            `[ToolRegistry] Rolled back effect: ${effect.target}`
          );
        } catch (error: any) {
          console.error(
            `[ToolRegistry] Failed to rollback effect:`,
            error.message
          );
        }
      }
    }
  }
  
  // ============================================================================
  // Retry Logic
  // ============================================================================
  
  private async executeWithRetry(
    tool: Tool,
    args: any,
    context: Context
  ): Promise<ToolResult> {
    let lastError: Error | null = null;
    const { maxRetries, backoff, baseDelay, maxDelay, retryable } = tool.retry;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await tool.execute(args, context);
        result.duration = Date.now() - startTime;
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable
        if (!retryable.some(r => error.message.includes(r))) {
          throw error; // Non-retryable error
        }
        
        if (attempt === maxRetries) {
          break; // No more retries
        }
        
        // Calculate delay
        const delay = this.calculateDelay(backoff, baseDelay, maxDelay, attempt);
        
        console.log(
          `[ToolRegistry] Tool ${tool.name} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        
        await this.sleep(delay);
      }
    }
    
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      duration: 0
    };
  }
  
  private calculateDelay(
    backoff: 'linear' | 'exponential' | 'fixed',
    baseDelay: number,
    maxDelay: number,
    attempt: number
  ): number {
    let delay: number;
    
    switch (backoff) {
      case 'linear':
        delay = baseDelay * (attempt + 1);
        break;
      case 'exponential':
        delay = baseDelay * Math.pow(2, attempt);
        break;
      case 'fixed':
        delay = baseDelay;
        break;
    }
    
    return Math.min(delay, maxDelay);
  }
  
  // ============================================================================
  // Utilities
  // ============================================================================
  
  private async recoverPrecondition(
    precondition: Precondition,
    context: Context,
    args: any
  ): Promise<boolean> {
    // Placeholder for precondition recovery
    // Could involve requesting permissions, creating resources, etc.
    return false;
  }
  
  private recordExecution(name: string, args: any, result: ToolResult): void {
    const execution: ToolExecution = {
      tool: name,
      args,
      result,
      timestamp: Date.now()
    };
    
    this.executionHistory.set(`${name}_${Date.now()}`, execution);
    
    // Keep only last 1000 executions
    if (this.executionHistory.size > 1000) {
      const oldest = Array.from(this.executionHistory.entries())[0][0];
      this.executionHistory.delete(oldest);
    }
  }
  
  getExecutionHistory(toolName?: string): ToolExecution[] {
    if (toolName) {
      return Array.from(this.executionHistory.values())
        .filter(exec => exec.tool === toolName);
    }
    return Array.from(this.executionHistory.values());
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Types
// ============================================================================

interface ToolExecution {
  tool: string;
  args: any;
  result: ToolResult;
  timestamp: number;
}

// ============================================================================
// Precondition Helpers
// ============================================================================

export const PreconditionFactory = {
  resourceExists: (resourcePath: string): Precondition => ({
    type: 'resource',
    check: async (context, args) => {
      // Check if resource exists
      return context.resources.has(resourcePath);
    },
    message: `Resource ${resourcePath} does not exist`,
    recoverable: false
  }),
  
  hasPermission: (permission: string): Precondition => ({
    type: 'permission',
    check: async (context, args) => {
      return context.permissions.includes(permission);
    },
    message: `Missing permission: ${permission}`,
    recoverable: false
  }),
  
  stateEquals: (key: string, value: any): Precondition => ({
    type: 'state',
    check: async (context, args) => {
      return context.resources.get(key) === value;
    },
    message: `State ${key} does not equal ${value}`,
    recoverable: true
  }),
  
  dataValid: (validator: (args: any) => boolean): Precondition => ({
    type: 'data',
    check: async (context, args) => {
      return validator(args);
    },
    message: 'Data validation failed',
    recoverable: false
  })
};

// ============================================================================
// Retry Policy Presets
// ============================================================================

export const RetryPresets = {
  conservative: {
    maxRetries: 3,
    backoff: 'exponential' as const,
    baseDelay: 1000,
    maxDelay: 10000,
    retryable: ['timeout', 'rate_limit', 'network_error']
  },
  
  aggressive: {
    maxRetries: 5,
    backoff: 'linear' as const,
    baseDelay: 500,
    maxDelay: 5000,
    retryable: ['timeout', 'rate_limit', 'network_error', 'server_error']
  },
  
  none: {
    maxRetries: 0,
    backoff: 'fixed' as const,
    baseDelay: 0,
    maxDelay: 0,
    retryable: []
  }
};
