/**
 * ECHOMEN Execution Loop - Core Implementation
 * 
 * Implements a formal cognitive architecture with explicit state management,
 * memory lifecycle, and validated decision pipeline.
 */

import { MemoryManager, MemoryScope, WorkingMemory } from './MemoryManager';
import { ToolRegistry, Tool, ToolResult, Context } from './ToolRegistry';
import { DecisionPipeline, Decision, Intent, ActionOption } from './DecisionPipeline';

// ============================================================================
// State Machine
// ============================================================================

export type LoopState = 
  | 'IDLE'
  | 'PERCEIVE'
  | 'REASON'
  | 'ACT'
  | 'OBSERVE'
  | 'REFLECT'
  | 'ERROR'
  | 'RECOVERY';

export enum LoopEvent {
  GOAL_RECEIVED = 'goal_received',
  PERCEPTION_COMPLETE = 'perception_complete',
  DECISION_MADE = 'decision_made',
  ACTION_COMPLETE = 'action_complete',
  OBSERVATION_RECORDED = 'observation_recorded',
  REFLECTION_COMPLETE = 'reflection_complete',
  ERROR = 'error',
  RECOVERY_COMPLETE = 'recovery_complete'
}

export interface Goal {
  id: string;
  type: 'query' | 'action' | 'create' | 'analyze' | 'browse';
  description: string;
  constraints?: string[];
  priority?: number;
  deadline?: number;
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  actions: number;
  duration: number;
  learning?: any;
}

// ============================================================================
// Execution Loop
// ============================================================================

export class ExecutionLoop {
  private state: LoopState = 'IDLE';
  private memory: MemoryManager;
  private toolRegistry: ToolRegistry;
  private decisionPipeline: DecisionPipeline;
  private eventListeners: Map<LoopEvent, Array<(data: any) => void>> = new Map();
  
  // Loop control
  private currentGoal: Goal | null = null;
  private actionCount = 0;
  private maxActions = 20;
  private startTime = 0;
  
  constructor(
    memory: MemoryManager,
    toolRegistry: ToolRegistry,
    decisionPipeline: DecisionPipeline
  ) {
    this.memory = memory;
    this.toolRegistry = toolRegistry;
    this.decisionPipeline = decisionPipeline;
  }
  
  // ============================================================================
  // Public API
  // ============================================================================
  
  async run(goal: Goal): Promise<ExecutionResult> {
    this.startTime = Date.now();
    this.currentGoal = goal;
    this.actionCount = 0;
    
    try {
      await this.emit(LoopEvent.GOAL_RECEIVED, { goal });
      
      // Main execution loop
      while (this.actionCount < this.maxActions) {
        const result = await this.executeLoop();
        
        if (result.goalAchieved || result.shouldTerminate) {
          await this.transitionTo('IDLE');
          return {
            success: result.goalAchieved,
            output: result.output,
            actions: this.actionCount,
            duration: Date.now() - this.startTime,
            learning: result.learning
          };
        }
      }
      
      // Max actions reached
      return {
        success: false,
        error: 'Maximum actions reached without achieving goal',
        actions: this.actionCount,
        duration: Date.now() - this.startTime
      };
      
    } catch (error: any) {
      return await this.handleError(error);
    } finally {
      await this.memory.clear('working');
      this.currentGoal = null;
    }
  }
  
  on(event: LoopEvent, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
  
  getState(): LoopState {
    return this.state;
  }
  
  // ============================================================================
  // Loop Implementation
  // ============================================================================
  
  private async executeLoop(): Promise<LoopResult> {
    try {
      // PERCEIVE
      await this.transitionTo('PERCEIVE');
      const perception = await this.perceive();
      await this.emit(LoopEvent.PERCEPTION_COMPLETE, perception);
      
      // REASON
      await this.transitionTo('REASON');
      const decision = await this.reason(perception);
      await this.emit(LoopEvent.DECISION_MADE, decision);
      
      // ACT
      await this.transitionTo('ACT');
      const observation = await this.act(decision);
      this.actionCount++;
      await this.emit(LoopEvent.ACTION_COMPLETE, observation);
      
      // OBSERVE
      await this.transitionTo('OBSERVE');
      const feedback = await this.observe(observation);
      await this.emit(LoopEvent.OBSERVATION_RECORDED, feedback);
      
      // REFLECT
      await this.transitionTo('REFLECT');
      const reflection = await this.reflect(feedback, decision, perception);
      await this.emit(LoopEvent.REFLECTION_COMPLETE, reflection);
      
      return reflection;
      
    } catch (error: any) {
      await this.emit(LoopEvent.ERROR, { error, state: this.state });
      throw error;
    }
  }
  
  private async perceive(): Promise<Perception> {
    if (!this.currentGoal) {
      throw new Error('No goal to perceive');
    }
    
    // Write goal to working memory
    await this.memory.write('working', 'goal', this.currentGoal);
    await this.memory.write('working', 'startTime', Date.now());
    
    // Retrieve relevant context
    const playbooks = await this.memory.search(
      'longterm',
      this.currentGoal.type,
      5
    );
    
    const similarCases = await this.memory.search(
      'episodic',
      this.currentGoal.description,
      3
    );
    
    const sessionContext = await this.memory.read('shortterm', 'session_context');
    
    return {
      goal: this.currentGoal,
      context: {
        playbooks,
        similarCases,
        session: sessionContext
      }
    };
  }
  
  private async reason(perception: Perception): Promise<Decision> {
    // Use decision pipeline
    const decision = await this.decisionPipeline.makeDecision(
      perception.goal,
      perception.context
    );
    
    // Store decision in working memory
    await this.memory.write('working', 'decision', decision);
    
    return decision;
  }
  
  private async act(decision: Decision): Promise<Observation> {
    // Validate preconditions
    const preconditionsMet = await this.toolRegistry.validatePreconditions(
      decision.tool,
      decision.args
    );
    
    if (!preconditionsMet) {
      // Request human approval if needed
      if (decision.tool.requiresApproval) {
        const approved = await this.requestHumanApproval(decision);
        if (!approved) {
          throw new Error('Action not approved by human');
        }
      }
    }
    
    // Execute tool with timeout
    const timeout = decision.tool.timeout || 60000;
    const result = await Promise.race([
      this.toolRegistry.execute(decision.tool, decision.args),
      this.timeout(timeout)
    ]);
    
    return {
      tool: decision.tool.name,
      args: decision.args,
      result,
      success: result.success,
      duration: result.duration || 0
    };
  }
  
  private async observe(observation: Observation): Promise<Feedback> {
    // Write to episodic memory
    await this.memory.write('episodic', `action_${Date.now()}`, {
      tool: observation.tool,
      args: observation.args,
      result: observation.result,
      success: observation.success,
      duration: observation.duration
    });
    
    // Update working memory
    await this.memory.write('working', 'lastObservation', observation);
    
    return {
      success: observation.success,
      output: observation.result.output,
      error: observation.result.error
    };
  }
  
  private async reflect(
    feedback: Feedback,
    decision: Decision,
    perception: Perception
  ): Promise<LoopResult> {
    // Evaluate outcome
    const goalAchieved = this.evaluateGoalAchievement(
      perception.goal,
      feedback
    );
    
    // Extract learning
    if (feedback.success) {
      // Save successful pattern
      await this.memory.write('longterm', `pattern_${Date.now()}`, {
        goalType: perception.goal.type,
        actions: [decision.tool.name],
        outcome: 'success',
        timestamp: Date.now()
      });
    } else {
      // Save failure pattern
      await this.memory.write('longterm', `antipattern_${Date.now()}`, {
        goalType: perception.goal.type,
        actions: [decision.tool.name],
        failure: feedback.error,
        lesson: this.extractLesson(feedback.error),
        timestamp: Date.now()
      });
    }
    
    // Decide: continue or terminate
    const shouldTerminate = 
      goalAchieved || 
      this.actionCount >= this.maxActions ||
      !feedback.success;
    
    return {
      goalAchieved,
      shouldTerminate,
      output: feedback.output,
      learning: {
        success: feedback.success,
        pattern: feedback.success ? 'saved' : 'antipattern_saved'
      }
    };
  }
  
  // ============================================================================
  // Error Handling
  // ============================================================================
  
  private async handleError(error: any): Promise<ExecutionResult> {
    await this.transitionTo('ERROR');
    
    // Attempt recovery
    try {
      const recoveryAction = await this.determineRecovery(error);
      
      if (recoveryAction === 'retry') {
        await this.transitionTo('REASON');
        // Retry from reason state
        return await this.executeLoop();
      } else if (recoveryAction === 'fallback') {
        // Use safe default
        await this.memory.write('working', 'usingFallback', true);
        await this.transitionTo('REASON');
        return await this.executeLoop();
      }
    } catch (recoveryError) {
      // Recovery failed - abort
      await this.transitionTo('IDLE');
      return {
        success: false,
        error: `Unrecoverable error: ${error.message}`,
        actions: this.actionCount,
        duration: Date.now() - this.startTime
      };
    }
    
    await this.transitionTo('IDLE');
    return {
      success: false,
      error: error.message,
      actions: this.actionCount,
      duration: Date.now() - this.startTime
    };
  }
  
  private async determineRecovery(error: any): Promise<'retry' | 'fallback' | 'abort'> {
    // Classify error
    if (error.message.includes('timeout')) {
      return 'retry';
    }
    
    if (error.message.includes('rate_limit')) {
      return 'retry';
    }
    
    if (error.message.includes('network')) {
      return 'retry';
    }
    
    if (error.message.includes('precondition')) {
      return 'fallback';
    }
    
    // Default: abort
    return 'abort';
  }
  
  // ============================================================================
  // Utilities
  // ============================================================================
  
  private async transitionTo(newState: LoopState): Promise<void> {
    const oldState = this.state;
    this.state = newState;
    
    console.log(`[ExecutionLoop] ${oldState} → ${newState}`);
    
    await this.memory.write('working', 'state', newState);
  }
  
  private async emit(event: LoopEvent, data: any): Promise<void> {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        await listener(data);
      }
    }
  }
  
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
  }
  
  private evaluateGoalAchievement(goal: Goal, feedback: Feedback): boolean {
    // Simple heuristic - can be made more sophisticated
    return feedback.success;
  }
  
  private extractLesson(error: string): string {
    // Extract lesson from error - can be enhanced with ML
    return `Avoid: ${error}`;
  }
  
  private async requestHumanApproval(decision: Decision): Promise<boolean> {
    // Placeholder for HITL integration
    console.log('[ExecutionLoop] Requesting human approval for:', decision.tool.name);
    return true; // Assume approved for now
  }
}

// ============================================================================
// Types
// ============================================================================

interface Perception {
  goal: Goal;
  context: {
    playbooks: any[];
    similarCases: any[];
    session: any;
  };
}

interface Observation {
  tool: string;
  args: any;
  result: ToolResult;
  success: boolean;
  duration: number;
}

interface Feedback {
  success: boolean;
  output?: any;
  error?: string;
}

interface LoopResult {
  goalAchieved: boolean;
  shouldTerminate: boolean;
  output?: any;
  learning?: any;
}
