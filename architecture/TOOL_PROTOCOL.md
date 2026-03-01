# ECHOMEN Tool Protocol

## Overview

The ECHOMEN Tool Protocol defines a formal interface for tools within the autonomous agent system. It establishes clear contracts for tool behavior, preconditions, effects, error handling, and composition patterns. This protocol ensures tools are discoverable, composable, and safely executable.

## Tool Interface

### Core Definition

```typescript
interface Tool {
  /**
   * Unique identifier for the tool
   */
  name: string;
  
  /**
   * Human-readable description of what the tool does
   */
  description: string;
  
  /**
   * JSON Schema defining the tool's input parameters
   */
  parameters: Schema;
  
  /**
   * Conditions that must be true before tool execution
   */
  preconditions: Precondition[];
  
  /**
   * Effects that occur after successful execution
   */
  effects: Effect[];
  
  /**
   * Maximum execution time in milliseconds
   */
  timeout: number;
  
  /**
   * Policy for retrying failed executions
   */
  retry: RetryPolicy;
  
  /**
   * Execute the tool with given arguments
   */
  execute(args: Record<string, any>, context: ToolContext): Promise<ToolResult>;
}
```

### Supporting Types

```typescript
/**
 * JSON Schema for parameter validation
 */
interface Schema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: any[];
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: PropertySchema; // For arrays
  properties?: Record<string, PropertySchema>; // For objects
}

/**
 * Context available during tool execution
 */
interface ToolContext {
  sessionId: string;
  loopId: string;
  agentId: string;
  memory: MemoryManager;
  config: ToolConfig;
  signal: AbortSignal;
}

/**
 * Result of tool execution
 */
interface ToolResult {
  success: boolean;
  data?: any;
  error?: ToolError;
  metadata: {
    duration: number;
    timestamp: number;
    toolName: string;
  };
}

/**
 * Tool-specific error
 */
interface ToolError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestions?: string[];
}
```

## Precondition System

### Precondition Types

```typescript
type Precondition = 
  | ResourcePrecondition
  | StatePrecondition
  | PermissionPrecondition
  | DependencyPrecondition
  | CustomPrecondition;

interface BasePrecondition {
  type: string;
  description: string;
  critical: boolean; // If false, tool can proceed with degraded functionality
}

interface ResourcePrecondition extends BasePrecondition {
  type: 'resource';
  resource: string;
  availability: 'required' | 'preferred';
  check: () => Promise<boolean>;
}

interface StatePrecondition extends BasePrecondition {
  type: 'state';
  state: string;
  expectedValue: any;
  check: (context: ToolContext) => Promise<boolean>;
}

interface PermissionPrecondition extends BasePreCondition {
  type: 'permission';
  permission: string;
  check: (context: ToolContext) => Promise<boolean>;
}

interface DependencyPrecondition extends BasePrecondition {
  type: 'dependency';
  tool: string;
  status: 'completed' | 'available';
  check: (context: ToolContext) => Promise<boolean>;
}

interface CustomPrecondition extends BasePrecondition {
  type: 'custom';
  id: string;
  check: (context: ToolContext) => Promise<boolean>;
}
```

### Precondition Examples

```typescript
// Example: Browser automation tool preconditions
const browserToolPreconditions: Precondition[] = [
  {
    type: 'resource',
    description: 'Browser instance must be available',
    resource: 'browser',
    availability: 'required',
    critical: true,
    check: async () => browserManager.isAvailable()
  },
  {
    type: 'state',
    description: 'Browser must not be in error state',
    state: 'browser.error',
    expectedValue: false,
    critical: true,
    check: async (ctx) => {
      const errorState = await ctx.memory.read('working', 'browser.error');
      return errorState !== true;
    }
  },
  {
    type: 'permission',
    description: 'User must have granted browser automation permission',
    permission: 'browser:automate',
    critical: true,
    check: async (ctx) => permissionManager.has(ctx.sessionId, 'browser:automate')
  }
];

// Example: API call tool preconditions
const apiToolPreconditions: Precondition[] = [
  {
    type: 'resource',
    description: 'API credentials must be configured',
    resource: 'api:credentials',
    availability: 'required',
    critical: true,
    check: async () => configManager.has('api.credentials')
  },
  {
    type: 'state',
    description: 'Rate limit must not be exceeded',
    state: 'api.rateLimit.remaining',
    expectedValue: (v: number) => v > 0,
    critical: true,
    check: async (ctx) => {
      const remaining = await ctx.memory.read('short-term', 'api.rateLimit.remaining');
      return remaining !== null && remaining > 0;
    }
  }
];
```

### Precondition Validation

```typescript
interface PreconditionValidator {
  /**
   * Validate all preconditions for a tool
   */
  async validate(
    tool: Tool,
    context: ToolContext
  ): Promise<PreconditionResult> {
    const results: PreconditionCheck[] = [];
    let allPassed = true;
    let criticalFailed = false;
    
    for (const precondition of tool.preconditions) {
      try {
        const passed = await precondition.check(context);
        results.push({
          precondition,
          passed,
          error: null
        });
        
        if (!passed) {
          allPassed = false;
          if (precondition.critical) {
            criticalFailed = true;
          }
        }
      } catch (error) {
        results.push({
          precondition,
          passed: false,
          error: error as Error
        });
        allPassed = false;
        if (precondition.critical) {
          criticalFailed = true;
        }
      }
    }
    
    return {
      passed: allPassed,
      criticalFailed,
      results,
      canProceed: !criticalFailed,
      degradedMode: criticalFailed === false && allPassed === false
    };
  }
}

interface PreconditionResult {
  passed: boolean;
  criticalFailed: boolean;
  results: PreconditionCheck[];
  canProceed: boolean;
  degradedMode: boolean;
}

interface PreconditionCheck {
  precondition: Precondition;
  passed: boolean;
  error: Error | null;
}
```

## Effect System

### Effect Types

```typescript
type Effect = 
  | StateChangeEffect
  | MemoryEffect
  | NotificationEffect
  | CascadeEffect;

interface BaseEffect {
  type: string;
  description: string;
  reversible: boolean;
}

interface StateChangeEffect extends BaseEffect {
  type: 'state_change';
  state: string;
  change: 'set' | 'clear' | 'increment' | 'decrement';
  value?: any;
  apply: (context: ToolContext) => Promise<void>;
  rollback?: (context: ToolContext) => Promise<void>;
}

interface MemoryEffect extends BaseEffect {
  type: 'memory';
  scope: MemoryScope;
  operation: 'write' | 'delete' | 'update';
  key: string;
  value?: any;
  apply: (context: ToolContext, result: ToolResult) => Promise<void>;
  rollback?: (context: ToolContext) => Promise<void>;
}

interface NotificationEffect extends BaseEffect {
  type: 'notification';
  event: string;
  payload: any;
  apply: (context: ToolContext, result: ToolResult) => Promise<void>;
  rollback: () => Promise<void>; // Notifications cannot be undone
}

interface CascadeEffect extends BaseEffect {
  type: 'cascade';
  triggerTool: string;
  triggerCondition: (result: ToolResult) => boolean;
  apply: (context: ToolContext, result: ToolResult) => Promise<void>;
  rollback?: (context: ToolContext) => Promise<void>;
}
```

### Effect Examples

```typescript
// Example: Browser navigation effects
const navigationEffects: Effect[] = [
  {
    type: 'state_change',
    description: 'Update current URL state',
    state: 'browser.currentUrl',
    change: 'set',
    reversible: true,
    apply: async (ctx) => {
      // Applied after execution with actual URL
    },
    rollback: async (ctx) => {
      const previousUrl = await ctx.memory.read('working', 'browser.previousUrl');
      if (previousUrl) {
        await browserManager.navigate(previousUrl);
      }
    }
  },
  {
    type: 'memory',
    description: 'Store navigation history',
    scope: 'short-term',
    operation: 'update',
    key: 'browser.history',
    reversible: true,
    apply: async (ctx, result) => {
      if (result.success) {
        const history = await ctx.memory.read('short-term', 'browser.history') || [];
        history.push({
          url: result.data.url,
          timestamp: Date.now(),
          title: result.data.title
        });
        await ctx.memory.write('short-term', 'browser.history', history.slice(-100));
      }
    },
    rollback: async (ctx) => {
      // Remove last entry from history
      const history = await ctx.memory.read('short-term', 'browser.history') || [];
      await ctx.memory.write('short-term', 'browser.history', history.slice(0, -1));
    }
  }
];

// Example: API call effects
const apiCallEffects: Effect[] = [
  {
    type: 'memory',
    description: 'Update rate limit counter',
    scope: 'short-term',
    operation: 'update',
    key: 'api.rateLimit.remaining',
    reversible: false,
    apply: async (ctx, result) => {
      const remaining = await ctx.memory.read('short-term', 'api.rateLimit.remaining');
      if (remaining !== null) {
        await ctx.memory.write('short-term', 'api.rateLimit.remaining', remaining - 1);
      }
    }
  },
  {
    type: 'notification',
    description: 'Notify on API error',
    event: 'api:error',
    reversible: false,
    apply: async (ctx, result) => {
      if (!result.success) {
        eventBus.emit('api:error', {
          tool: ctx.config.toolName,
          error: result.error,
          timestamp: Date.now()
        });
      }
    },
    rollback: async () => {} // No-op
  }
];
```

### Effect Application

```typescript
interface EffectManager {
  /**
   * Apply effects after successful tool execution
   */
  async applyEffects(
    tool: Tool,
    result: ToolResult,
    context: ToolContext
  ): Promise<void> {
    const appliedEffects: Effect[] = [];
    
    try {
      for (const effect of tool.effects) {
        await effect.apply(context, result);
        appliedEffects.push(effect);
      }
    } catch (error) {
      // Rollback applied effects on failure
      await this.rollbackEffects(appliedEffects, result, context);
      throw error;
    }
  }
  
  /**
   * Rollback effects on tool failure
   */
  async rollbackEffects(
    effects: Effect[],
    result: ToolResult,
    context: ToolContext
  ): Promise<void> {
    // Rollback in reverse order
    for (const effect of effects.reverse()) {
      if (effect.reversible && effect.rollback) {
        try {
          await effect.rollback(context);
        } catch (rollbackError) {
          // Log but continue with other rollbacks
          console.error('Effect rollback failed:', effect, rollbackError);
        }
      }
    }
  }
}
```

## Retry Policies

### Retry Policy Definition

```typescript
interface RetryPolicy {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;
  
  /**
   * Backoff strategy
   */
  backoff: BackoffStrategy;
  
  /**
   * Conditions under which retry is allowed
   */
  retryableErrors?: string[];
  
  /**
   * Conditions under which retry is not allowed
   */
  nonRetryableErrors?: string[];
  
  /**
   * Custom condition for retry decision
   */
  shouldRetry?: (error: ToolError, attempt: number) => boolean;
}

type BackoffStrategy = 
  | { type: 'none' }
  | { type: 'fixed'; delay: number }
  | { type: 'linear'; baseDelay: number; increment: number }
  | { type: 'exponential'; baseDelay: number; maxDelay: number; multiplier: number }
  | { type: 'jittered'; base: BackoffStrategy; jitter: number };
```

### Built-in Retry Policies

```typescript
const RetryPolicies = {
  /**
   * No retry - fail immediately
   */
  NONE: {
    maxRetries: 0,
    backoff: { type: 'none' } as const
  },
  
  /**
   * Quick retry for transient failures
   */
  QUICK: {
    maxRetries: 3,
    backoff: { type: 'fixed', delay: 1000 } as const,
    retryableErrors: ['TIMEOUT', 'RATE_LIMIT', 'NETWORK']
  },
  
  /**
   * Standard retry with exponential backoff
   */
  STANDARD: {
    maxRetries: 3,
    backoff: { 
      type: 'exponential', 
      baseDelay: 1000, 
      maxDelay: 30000, 
      multiplier: 2 
    } as const,
    retryableErrors: ['TIMEOUT', 'RATE_LIMIT', 'NETWORK', 'SERVER_ERROR']
  },
  
  /**
   * Aggressive retry for critical operations
   */
  AGGRESSIVE: {
    maxRetries: 5,
    backoff: { 
      type: 'jittered',
      base: { type: 'exponential', baseDelay: 500, maxDelay: 60000, multiplier: 2 },
      jitter: 0.1
    } as const,
    retryableErrors: ['TIMEOUT', 'RATE_LIMIT', 'NETWORK', 'SERVER_ERROR', 'LOCK']
  },
  
  /**
   * Custom retry policy
   */
  CUSTOM: (policy: RetryPolicy) => policy
} as const;
```

### Retry Execution

```typescript
interface RetryExecutor {
  /**
   * Execute tool with retry logic
   */
  async executeWithRetry<T>(
    tool: Tool,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    let lastError: ToolError | null = null;
    let attempt = 0;
    
    while (attempt <= tool.retry.maxRetries) {
      try {
        // Apply backoff delay (except first attempt)
        if (attempt > 0) {
          const delay = this.calculateBackoff(tool.retry.backoff, attempt);
          await this.sleep(delay, context.signal);
        }
        
        // Execute tool
        const result = await tool.execute(args, context);
        
        if (result.success) {
          return result;
        }
        
        // Check if error is retryable
        if (!this.isRetryable(result.error!, tool.retry, attempt)) {
          return result;
        }
        
        lastError = result.error!;
        attempt++;
        
      } catch (error) {
        const toolError = this.normalizeError(error);
        
        if (!this.isRetryable(toolError, tool.retry, attempt)) {
          throw error;
        }
        
        lastError = toolError;
        attempt++;
      }
    }
    
    // All retries exhausted
    return {
      success: false,
      error: lastError || {
        code: 'MAX_RETRIES_EXCEEDED',
        message: `Exceeded maximum retries (${tool.retry.maxRetries})`,
        recoverable: false
      },
      metadata: {
        duration: 0,
        timestamp: Date.now(),
        toolName: tool.name
      }
    };
  }
  
  private calculateBackoff(strategy: BackoffStrategy, attempt: number): number {
    switch (strategy.type) {
      case 'none':
        return 0;
      case 'fixed':
        return strategy.delay;
      case 'linear':
        return strategy.baseDelay + (strategy.increment * (attempt - 1));
      case 'exponential':
        return Math.min(
          strategy.baseDelay * Math.pow(strategy.multiplier, attempt - 1),
          strategy.maxDelay
        );
      case 'jittered':
        const baseDelay = this.calculateBackoff(strategy.base, attempt);
        const jitterRange = baseDelay * strategy.jitter;
        return baseDelay + (Math.random() * 2 - 1) * jitterRange;
      default:
        return 0;
    }
  }
  
  private isRetryable(error: ToolError, policy: RetryPolicy, attempt: number): boolean {
    // Check attempt limit
    if (attempt >= policy.maxRetries) {
      return false;
    }
    
    // Check custom condition
    if (policy.shouldRetry && !policy.shouldRetry(error, attempt)) {
      return false;
    }
    
    // Check retryable errors list
    if (policy.retryableErrors && !policy.retryableErrors.includes(error.code)) {
      return false;
    }
    
    // Check non-retryable errors list
    if (policy.nonRetryableErrors?.includes(error.code)) {
      return false;
    }
    
    return error.recoverable;
  }
}
```

## Tool Composition

### Sequential Composition

```typescript
interface ToolComposer {
  /**
   * Execute tools in sequence, passing output to next input
   */
  sequence(tools: Tool[], options?: SequenceOptions): ComposedTool {
    return {
      name: `sequence:${tools.map(t => t.name).join('→')}`,
      description: `Sequential execution of ${tools.length} tools`,
      parameters: tools[0].parameters,
      preconditions: tools.flatMap(t => t.preconditions),
      effects: tools.flatMap(t => t.effects),
      timeout: tools.reduce((sum, t) => sum + t.timeout, 0),
      retry: tools[0].retry,
      
      async execute(args: Record<string, any>, context: ToolContext): Promise<ToolResult> {
        let currentArgs = args;
        const results: ToolResult[] = [];
        
        for (const tool of tools) {
          const result = await tool.execute(currentArgs, context);
          
          if (!result.success) {
            if (options?.stopOnError) {
              return result;
            }
            // Continue with original args on error
          } else {
            // Transform output to next input
            if (options?.transformOutput && results.length < tools.length - 1) {
              currentArgs = options.transformOutput(result.data, tools[results.length]);
            }
          }
          
          results.push(result);
        }
        
        return {
          success: results.every(r => r.success),
          data: { results },
          metadata: {
            duration: results.reduce((sum, r) => sum + r.metadata.duration, 0),
            timestamp: Date.now(),
            toolName: `sequence:${tools.map(t => t.name).join('→')}`
          }
        };
      }
    };
  }
}

interface SequenceOptions {
  stopOnError?: boolean;
  transformOutput?: (output: any, nextTool: Tool) => Record<string, any>;
}
```

### Parallel Composition

```typescript
interface ParallelOptions {
  maxConcurrency?: number;
  stopOnError?: boolean;
  timeout?: number;
}

interface ToolComposer {
  /**
   * Execute tools in parallel
   */
  parallel(tools: Tool[], options?: ParallelOptions): ComposedTool {
    return {
      name: `parallel:${tools.map(t => t.name).join('+')}`,
      description: `Parallel execution of ${tools.length} tools`,
      parameters: {
        type: 'object',
        properties: Object.assign({}, ...tools.map(t => t.parameters.properties))
      },
      preconditions: tools.flatMap(t => t.preconditions),
      effects: tools.flatMap(t => t.effects),
      timeout: options?.timeout || Math.max(...tools.map(t => t.timeout)),
      retry: { maxRetries: 1, backoff: { type: 'none' } },
      
      async execute(args: Record<string, any>, context: ToolContext): Promise<ToolResult> {
        const concurrency = options?.maxConcurrency || tools.length;
        const results = new Map<string, ToolResult>();
        let hasError = false;
        
        // Execute in batches based on concurrency limit
        for (let i = 0; i < tools.length; i += concurrency) {
          const batch = tools.slice(i, i + concurrency);
          
          const batchResults = await Promise.allSettled(
            batch.map(async (tool) => {
              const toolArgs = this.extractArgsForTool(args, tool);
              return { toolName: tool.name, result: await tool.execute(toolArgs, context) };
            })
          );
          
          for (const settled of batchResults) {
            if (settled.status === 'fulfilled') {
              results.set(settled.value.toolName, settled.value.result);
              if (!settled.value.result.success) {
                hasError = true;
              }
            } else {
              results.set(batch[batchResults.indexOf(settled)].name, {
                success: false,
                error: {
                  code: 'EXECUTION_FAILED',
                  message: settled.reason.message,
                  recoverable: false
                },
                metadata: { duration: 0, timestamp: Date.now(), toolName: batch[batchResults.indexOf(settled)].name }
              });
              hasError = true;
            }
          }
          
          if (hasError && options?.stopOnError) {
            break;
          }
        }
        
        return {
          success: !hasError,
          data: Object.fromEntries(results),
          metadata: {
            duration: Math.max(...Array.from(results.values()).map(r => r.metadata.duration)),
            timestamp: Date.now(),
            toolName: `parallel:${tools.map(t => t.name).join('+')}`
          }
        };
      }
    };
  }
}
```

### Conditional Composition

```typescript
interface ConditionalBranch {
  condition: (result: ToolResult, context: ToolContext) => boolean;
  tools: Tool[];
}

interface ToolComposer {
  /**
   * Execute different tool chains based on conditions
   */
  conditional(branches: ConditionalBranch[], fallback?: Tool[]): ComposedTool {
    return {
      name: `conditional:${branches.length}branches`,
      description: 'Conditional tool execution based on runtime conditions',
      parameters: branches[0]?.tools[0]?.parameters || { type: 'object', properties: {} },
      preconditions: branches.flatMap(b => b.tools.flatMap(t => t.preconditions)),
      effects: branches.flatMap(b => b.tools.flatMap(t => t.effects)),
      timeout: Math.max(...branches.map(b => b.tools.reduce((sum, t) => sum + t.timeout, 0))),
      retry: { maxRetries: 1, backoff: { type: 'none' } },
      
      async execute(args: Record<string, any>, context: ToolContext): Promise<ToolResult> {
        // First, execute all branches' first tools to get condition results
        for (const branch of branches) {
          if (branch.tools.length === 0) continue;
          
          const firstTool = branch.tools[0];
          const result = await firstTool.execute(args, context);
          
          if (branch.condition(result, context)) {
            // Execute remaining tools in this branch
            const remainingTools = branch.tools.slice(1);
            let currentResult = result;
            
            for (const tool of remainingTools) {
              currentResult = await tool.execute(args, context);
              if (!currentResult.success) {
                return currentResult;
              }
            }
            
            return currentResult;
          }
        }
        
        // Execute fallback if no branch matched
        if (fallback && fallback.length > 0) {
          let result: ToolResult | null = null;
          for (const tool of fallback) {
            result = await tool.execute(args, context);
            if (!result.success) {
              return result;
            }
          }
          return result!;
        }
        
        return {
          success: false,
          error: {
            code: 'NO_BRANCH_MATCHED',
            message: 'No conditional branch matched and no fallback provided',
            recoverable: false
          },
          metadata: { duration: 0, timestamp: Date.now(), toolName: 'conditional' }
        };
      }
    };
  }
}
```

## Tool Registry

### Registry Interface

```typescript
interface ToolRegistry {
  /**
   * Register a tool with the registry
   */
  register(tool: Tool): void;
  
  /**
   * Register multiple tools
   */
  registerAll(tools: Tool[]): void;
  
  /**
   * Get a tool by name
   */
  get(name: string): Tool | null;
  
  /**
   * Check if a tool exists
   */
  has(name: string): boolean;
  
  /**
   * List all registered tools
   */
  list(): Tool[];
  
  /**
   * List tools matching a pattern
   */
  search(pattern: string): Tool[];
  
  /**
   * Execute a tool by name
   */
  execute(name: string, args: Record<string, any>, context?: ToolContext): Promise<ToolResult>;
  
  /**
   * Validate preconditions for a tool
   */
  validatePreconditions(tool: Tool, context: ToolContext): Promise<PreconditionResult>;
  
  /**
   * Apply effects after tool execution
   */
  applyEffects(tool: Tool, result: ToolResult, context: ToolContext): Promise<void>;
  
  /**
   * Unregister a tool
   */
  unregister(name: string): void;
}
```

### Registry Implementation

```typescript
class ToolRegistryImpl implements ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private validators: Map<string, ToolValidator> = new Map();
  
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }
    
    // Validate tool definition
    this.validateToolDefinition(tool);
    
    this.tools.set(tool.name, tool);
  }
  
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }
  
  get(name: string): Tool | null {
    return this.tools.get(name) || null;
  }
  
  has(name: string): boolean {
    return this.tools.has(name);
  }
  
  list(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  search(pattern: string): Tool[] {
    const regex = new RegExp(pattern, 'i');
    return this.list().filter(tool => 
      regex.test(tool.name) || regex.test(tool.description)
    );
  }
  
  async execute(
    name: string, 
    args: Record<string, any>, 
    context?: ToolContext
  ): Promise<ToolResult> {
    const tool = this.get(name);
    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool '${name}' not found`,
          recoverable: false
        },
        metadata: { duration: 0, timestamp: Date.now(), toolName: name }
      };
    }
    
    // Validate arguments
    const validation = this.validateArguments(tool, args);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'INVALID_ARGUMENTS',
          message: validation.errors.join(', '),
          recoverable: false
        },
        metadata: { duration: 0, timestamp: Date.now(), toolName: name }
      };
    }
    
    // Create default context if not provided
    const ctx = context || this.createDefaultContext(tool);
    
    // Validate preconditions
    const preconditionResult = await this.validatePreconditions(tool, ctx);
    if (!preconditionResult.canProceed) {
      return {
        success: false,
        error: {
          code: 'PRECONDITION_FAILED',
          message: 'Tool preconditions not met',
          recoverable: true,
          suggestions: preconditionResult.results
            .filter(r => !r.passed)
            .map(r => r.precondition.description)
        },
        metadata: { duration: 0, timestamp: Date.now(), toolName: name }
      };
    }
    
    // Execute with retry
    const executor = new RetryExecutor();
    const result = await executor.executeWithRetry(tool, args, ctx);
    
    // Apply effects on success
    if (result.success) {
      await this.applyEffects(tool, result, ctx);
    }
    
    return result;
  }
  
  async validatePreconditions(
    tool: Tool, 
    context: ToolContext
  ): Promise<PreconditionResult> {
    const validator = new PreconditionValidator();
    return validator.validate(tool, context);
  }
  
  async applyEffects(
    tool: Tool, 
    result: ToolResult, 
    context: ToolContext
  ): Promise<void> {
    const effectManager = new EffectManager();
    await effectManager.applyEffects(tool, result, context);
  }
  
  unregister(name: string): void {
    this.tools.delete(name);
  }
  
  private validateToolDefinition(tool: Tool): void {
    // Validate required fields
    if (!tool.name) throw new Error('Tool must have a name');
    if (!tool.description) throw new Error('Tool must have a description');
    if (!tool.parameters) throw new Error('Tool must have parameters schema');
    if (!tool.execute) throw new Error('Tool must have execute function');
    
    // Validate parameters schema
    this.validateSchema(tool.parameters);
  }
  
  private validateSchema(schema: Schema): void {
    if (schema.type !== 'object') {
      throw new Error('Tool parameters must be an object schema');
    }
  }
  
  private validateArguments(
    tool: Tool, 
    args: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    const required = tool.parameters.required || [];
    for (const field of required) {
      if (!(field in args)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Check types (simplified validation)
    for (const [key, value] of Object.entries(args)) {
      const propSchema = tool.parameters.properties[key];
      if (propSchema && typeof value !== propSchema.type) {
        errors.push(`Field '${key}' must be of type ${propSchema.type}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  private createDefaultContext(tool: Tool): ToolContext {
    return {
      sessionId: 'default',
      loopId: 'default',
      agentId: 'default',
      memory: new MemoryManager(),
      config: { toolName: tool.name },
      signal: new AbortController().signal
    };
  }
}
```

## Example Tools

### Web Scraping Tool

```typescript
const webScrapeTool: Tool = {
  name: 'web:scrape',
  description: 'Extract content from a web page',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to scrape',
        pattern: '^https?://'
      },
      selector: {
        type: 'string',
        description: 'CSS selector for content extraction'
      },
      waitFor: {
        type: 'number',
        description: 'Milliseconds to wait before scraping',
        default: 0
      }
    },
    required: ['url']
  },
  preconditions: [
    {
      type: 'resource',
      description: 'Browser must be available',
      resource: 'browser',
      availability: 'required',
      critical: true,
      check: async () => browserManager.isAvailable()
    },
    {
      type: 'permission',
      description: 'Web scraping must be allowed',
      permission: 'web:scrape',
      critical: true,
      check: async (ctx) => permissionManager.has(ctx.sessionId, 'web:scrape')
    }
  ],
  effects: [
    {
      type: 'memory',
      description: 'Cache scraped content',
      scope: 'short-term',
      operation: 'write',
      key: 'web:cache',
      reversible: true,
      apply: async (ctx, result) => {
        if (result.success) {
          const cache = await ctx.memory.read('short-term', 'web:cache') || {};
          cache[result.data.url] = {
            content: result.data.content,
            timestamp: Date.now()
          };
          await ctx.memory.write('short-term', 'web:cache', cache);
        }
      },
      rollback: async (ctx) => {
        // Remove cache entry
      }
    }
  ],
  timeout: 30000,
  retry: RetryPolicies.STANDARD,
  
  async execute(args, context) {
    const startTime = Date.now();
    
    try {
      const page = await browserManager.getPage(args.url);
      
      if (args.waitFor) {
        await page.waitForTimeout(args.waitFor);
      }
      
      const content = args.selector 
        ? await page.$eval(args.selector, el => el.textContent)
        : await page.content();
      
      return {
        success: true,
        data: {
          url: args.url,
          content,
          timestamp: Date.now()
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: Date.now(),
          toolName: 'web:scrape'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCRAPE_FAILED',
          message: error.message,
          recoverable: true,
          suggestions: ['Check URL validity', 'Verify page accessibility']
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: Date.now(),
          toolName: 'web:scrape'
        }
      };
    }
  }
};
```

### File Operation Tool

```typescript
const fileWriteTool: Tool = {
  name: 'file:write',
  description: 'Write content to a file',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path to write to'
      },
      content: {
        type: 'string',
        description: 'Content to write'
      },
      encoding: {
        type: 'string',
        description: 'File encoding',
        enum: ['utf-8', 'ascii', 'base64'],
        default: 'utf-8'
      },
      overwrite: {
        type: 'boolean',
        description: 'Overwrite existing file',
        default: false
      }
    },
    required: ['path', 'content']
  },
  preconditions: [
    {
      type: 'permission',
      description: 'File write permission required',
      permission: 'file:write',
      critical: true,
      check: async (ctx) => permissionManager.has(ctx.sessionId, 'file:write')
    },
    {
      type: 'state',
      description: 'File must not exist unless overwrite is true',
      state: 'file:exists',
      critical: false,
      check: async (ctx) => {
        // This check happens during execution
        return true;
      }
    }
  ],
  effects: [
    {
      type: 'notification',
      description: 'Notify on file change',
      event: 'file:changed',
      reversible: false,
      apply: async (ctx, result) => {
        if (result.success) {
          eventBus.emit('file:changed', {
            path: result.data.path,
            action: 'write',
            timestamp: Date.now()
          });
        }
      },
      rollback: async () => {}
    }
  ],
  timeout: 10000,
  retry: RetryPolicies.QUICK,
  
  async execute(args, context) {
    const startTime = Date.now();
    
    try {
      // Check if file exists
      const exists = await fs.exists(args.path);
      if (exists && !args.overwrite) {
        return {
          success: false,
          error: {
            code: 'FILE_EXISTS',
            message: `File '${args.path}' already exists`,
            recoverable: true,
            suggestions: ['Set overwrite: true', 'Choose different path']
          },
          metadata: { duration: Date.now() - startTime, timestamp: Date.now(), toolName: 'file:write' }
        };
      }
      
      await fs.writeFile(args.path, args.content, { encoding: args.encoding });
      
      return {
        success: true,
        data: {
          path: args.path,
          bytesWritten: Buffer.byteLength(args.content, args.encoding)
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: Date.now(),
          toolName: 'file:write'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WRITE_FAILED',
          message: error.message,
          recoverable: false
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: Date.now(),
          toolName: 'file:write'
        }
      };
    }
  }
};
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-01 | Initial specification |
