/**
 * BDI Halting Guards - Execution Safety Layer
 * Fixes Priority 2.3: Prevents infinite loops and cost explosions
 */

export interface ExecutionConfig {
  maxIterations: number; // Default: 10
  maxCostUSD: number; // Default: 5.00
  maxTimeMs: number; // Default: 60000 (1 min)
  maxMemoryMB: number; // Default: 100
  costPerToken?: number; // Cost per 1K tokens
  modelName?: string; // For cost calculation
}

export interface ExecutionMetrics {
  iterationCount: number;
  accumulatedCost: number;
  elapsedTimeMs: number;
  memoryUsedMB: number;
  goalAchieved: boolean;
  haltReason?: string;
}

export class ExecutionError extends Error {
  constructor(
    public code: string,
    message: string,
    public metrics?: ExecutionMetrics
  ) {
    super(message);
    this.name = 'ExecutionError';
  }
}

export class BDIHaltingGuards {
  private iterationCount: number = 0;
  private startTime: number = Date.now();
  private accumulatedCost: number = 0;
  private initialMemory: number = 0;
  private goalAchieved: boolean = false;

  private modelCosts: Record<string, number> = {
    'gpt-4': 0.03, // per 1K tokens
    'gpt-4-turbo': 0.01,
    'gpt-3.5-turbo': 0.0005,
    'claude-3-opus': 0.015,
    'claude-3-sonnet': 0.003,
    'gemini-2.0-flash': 0.00005,
    'gemini-1.5-pro': 0.001,
  };

  constructor(private config: ExecutionConfig) {
    this.initialMemory = this.getMemoryUsageMB();
  }

  /**
   * Check if execution should continue
   */
  shouldContinue(): boolean {
    try {
      this.checkGuards();
      return true;
    } catch (error: any) {
      if (error instanceof ExecutionError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check all halting guards
   */
  private checkGuards(): void {
    const metrics = this.getMetrics();

    // Guard 1: Max iterations
    if (this.iterationCount >= this.config.maxIterations) {
      throw new ExecutionError(
        'MAX_ITERATIONS_EXCEEDED',
        `Reached maximum iterations (${this.config.maxIterations})`,
        metrics
      );
    }

    // Guard 2: Max cost
    if (this.accumulatedCost >= this.config.maxCostUSD) {
      throw new ExecutionError(
        'MAX_COST_EXCEEDED',
        `Reached cost limit $${this.config.maxCostUSD}. Current: $${this.accumulatedCost.toFixed(4)}`,
        metrics
      );
    }

    // Guard 3: Max time
    const elapsed = Date.now() - this.startTime;
    if (elapsed >= this.config.maxTimeMs) {
      throw new ExecutionError(
        'TIMEOUT',
        `Execution timeout after ${elapsed}ms (limit: ${this.config.maxTimeMs}ms)`,
        metrics
      );
    }

    // Guard 4: Max memory
    const memoryUsed = this.getMemoryUsageMB() - this.initialMemory;
    if (memoryUsed >= this.config.maxMemoryMB) {
      throw new ExecutionError(
        'MAX_MEMORY_EXCEEDED',
        `Memory usage exceeded ${this.config.maxMemoryMB}MB. Current: ${memoryUsed.toFixed(2)}MB`,
        metrics
      );
    }

    // Guard 5: Goal achievement
    if (this.goalAchieved) {
      throw new ExecutionError(
        'GOAL_ACHIEVED',
        'Goal has been achieved, stopping execution',
        metrics
      );
    }
  }

  /**
   * Increment iteration counter
   */
  incrementIteration(): void {
    this.iterationCount++;
  }

  /**
   * Add cost for API call
   */
  addCost(tokensUsed: number, modelName?: string): void {
    const model = modelName || this.config.modelName || 'gpt-3.5-turbo';
    const costPerToken = this.modelCosts[model] || this.config.costPerToken || 0.001;
    const cost = (tokensUsed / 1000) * costPerToken;

    this.accumulatedCost += cost;

    console.log(
      `💰 Cost: $${cost.toFixed(6)} (Total: $${this.accumulatedCost.toFixed(4)}, Tokens: ${tokensUsed})`
    );
  }

  /**
   * Mark goal as achieved
   */
  markGoalAchieved(): void {
    this.goalAchieved = true;
  }

  /**
   * Get current metrics
   */
  getMetrics(): ExecutionMetrics {
    const elapsedTimeMs = Date.now() - this.startTime;
    const memoryUsedMB = this.getMemoryUsageMB() - this.initialMemory;

    return {
      iterationCount: this.iterationCount,
      accumulatedCost: this.accumulatedCost,
      elapsedTimeMs,
      memoryUsedMB,
      goalAchieved: this.goalAchieved,
    };
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsageMB(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Get execution summary
   */
  getSummary(): string {
    const metrics = this.getMetrics();
    const timeSeconds = (metrics.elapsedTimeMs / 1000).toFixed(2);

    return `
Execution Summary:
  Iterations: ${metrics.iterationCount}/${this.config.maxIterations}
  Cost: $${metrics.accumulatedCost.toFixed(4)}/$${this.config.maxCostUSD}
  Time: ${timeSeconds}s/${(this.config.maxTimeMs / 1000).toFixed(1)}s
  Memory: ${metrics.memoryUsedMB.toFixed(2)}MB/${this.config.maxMemoryMB}MB
  Goal Achieved: ${metrics.goalAchieved}
    `.trim();
  }

  /**
   * Reset guards for new execution
   */
  reset(): void {
    this.iterationCount = 0;
    this.startTime = Date.now();
    this.accumulatedCost = 0;
    this.initialMemory = this.getMemoryUsageMB();
    this.goalAchieved = false;
  }
}

/**
 * Default execution configurations
 */
export const DEFAULT_CONFIGS = {
  STRICT: {
    maxIterations: 5,
    maxCostUSD: 1.0,
    maxTimeMs: 30000, // 30 seconds
    maxMemoryMB: 50,
  } as ExecutionConfig,

  BALANCED: {
    maxIterations: 10,
    maxCostUSD: 5.0,
    maxTimeMs: 60000, // 1 minute
    maxMemoryMB: 100,
  } as ExecutionConfig,

  GENEROUS: {
    maxIterations: 20,
    maxCostUSD: 20.0,
    maxTimeMs: 300000, // 5 minutes
    maxMemoryMB: 500,
  } as ExecutionConfig,

  RESEARCH: {
    maxIterations: 50,
    maxCostUSD: 100.0,
    maxTimeMs: 1800000, // 30 minutes
    maxMemoryMB: 2000,
  } as ExecutionConfig,
};
