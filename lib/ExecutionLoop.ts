/**
 * ECHOMEN Execution Loop - Core Implementation
 * 
 * Implements a formal cognitive architecture with explicit state management,
 * memory lifecycle, and validated decision pipeline.
 * 
 * SECURITY FIX 1.5: Real HITL (Human-in-the-Loop) approval system
 */

import { MemoryManager } from './MemoryManager';
import { ToolRegistry, ToolResult, Context } from './ToolRegistry';
import { DecisionPipeline, Decision } from './DecisionPipeline';
import { BDIHaltingGuards, DEFAULT_CONFIGS } from './BDIHaltingGuards';
import { logger } from './Logger';

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
  RECOVERY_COMPLETE = 'recovery_complete',
  APPROVAL_REQUIRED = 'approval_required',
  APPROVAL_RECEIVED = 'approval_received'
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
// HITL (Human-in-the-Loop) Manager
// ============================================================================

export interface ApprovalRequest {
  id: string;
  sessionId: string;
  toolName: string;
  toolArgs: any;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  respondedAt?: number;
}

/**
 * SECURITY FIX 1.5: Real HITL implementation
 * Manages approval requests for privileged operations
 */
class HITLManager {
  private pendingApprovals = new Map<string, ApprovalRequest>();
  private approvalCallbacks = new Map<string, (approved: boolean) => void>();
  private approvalTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly APPROVAL_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  /**
   * Request human approval for a tool execution
   */
  async requestApproval(
    sessionId: string,
    toolName: string,
    toolArgs: any
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const id = `${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      const request: ApprovalRequest = {
        id,
        sessionId,
        toolName,
        toolArgs,
        timestamp: Date.now(),
        status: 'pending',
      };

      this.pendingApprovals.set(id, request);

      // Emit approval required event (for UI/frontend to handle)
      console.log(`[HITL] Approval required for tool: ${toolName}`);
      console.log(`[HITL] Request ID: ${id}`);
      console.log(`[HITL] Arguments: ${JSON.stringify(toolArgs, null, 2)}`);

      // Set timeout - auto-reject after 5 minutes
      const timeout = setTimeout(() => {
        if (this.pendingApprovals.has(id)) {
          const req = this.pendingApprovals.get(id)!;
          req.status = 'timeout';
          req.respondedAt = Date.now();
          this.pendingApprovals.delete(id);
          this.approvalCallbacks.delete(id);
          this.approvalTimeouts.delete(id);
          reject(new Error('Approval request timed out after 5 minutes'));
        }
      }, this.APPROVAL_TIMEOUT);

      this.approvalTimeouts.set(id, timeout);

      // Store callback for when approval response comes in
      this.approvalCallbacks.set(id, (approved: boolean) => {
        clearTimeout(timeout);
        this.approvalTimeouts.delete(id);
        
        const req = this.pendingApprovals.get(id);
        if (req) {
          req.status = approved ? 'approved' : 'rejected';
          req.respondedAt = Date.now();
          this.pendingApprovals.delete(id);
        }
        
        resolve(approved);
      });
    });
  }

  /**
   * Respond to an approval request
   */
  respondToApproval(approvalId: string, approved: boolean): void {
    const callback = this.approvalCallbacks.get(approvalId);
    if (!callback) {
      throw new Error('Approval request not found or expired');
    }
    
    callback(approved);
  }

  /**
   * Get all pending approvals for a session
   */
  getPendingApprovals(sessionId: string): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values())
      .filter(r => r.sessionId === sessionId && r.status === 'pending');
  }

  /**
   * Get approval request by ID
   */
  getApprovalRequest(id: string): ApprovalRequest | undefined {
    return this.pendingApprovals.get(id);
  }
}

const hitlManager = new HITLManager();

// ============================================================================
// Execution Loop
// ============================================================================

export class ExecutionLoop {
  private state: LoopState = 'IDLE';
  private memory: MemoryManager;
  private toolRegistry: ToolRegistry;
  private decisionPipeline: DecisionPipeline;
  private eventListeners: Map<LoopEvent, Array<(data: any) => void>> = new Map();
  private guards: BDIHaltingGuards;
  
  // Loop control
  private currentGoal: Goal | null = null;
  private actionCount = 0;
  private maxActions = 20;
  private startTime = 0;
  private sessionId: string;
  
  constructor(
    memory: MemoryManager,
    toolRegistry: ToolRegistry,
    decisionPipeline: DecisionPipeline,
    sessionId?: string
  ) {
    this.memory = memory;
    this.toolRegistry = toolRegistry;
    this.decisionPipeline = decisionPipeline;
    this.sessionId = sessionId || `session_${Date.now()}`;
    this.guards = new BDIHaltingGuards(DEFAULT_CONFIGS.BALANCED);
    logger.setContext({ sessionId: this.sessionId });
  }
  
  // ============================================================================
  // Public API
  // ============================================================================
  
  async run(goal: Goal): Promise<ExecutionResult> {
    this.startTime = Date.now();
    this.currentGoal = goal;
    this.actionCount = 0;
    this.guards.reset();

    logger.info('Starting execution for goal', { goal });
    
    try {
      await this.emit(LoopEvent.GOAL_RECEIVED, { goal });
      
      // Main execution loop
      while (this.guards.shouldContinue()) {
        const result = await this.executeLoop();
        
        if (result.goalAchieved || result.shouldTerminate) {
          await this.transitionTo('IDLE');
          logger.info('Goal achieved or termination requested', { result });
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

  /**
   * Respond to HITL approval request
   */
  respondToApproval(approvalId: string, approved: boolean): void {
    hitlManager.respondToApproval(approvalId, approved);
    this.emit(LoopEvent.APPROVAL_RECEIVED, { approvalId, approved });
  }

  /**
   * Get pending approvals for this session
   */
  getPendingApprovals(): ApprovalRequest[] {
    return hitlManager.getPendingApprovals(this.sessionId);
  }
  
  // ============================================================================
  // Loop Implementation
  // ============================================================================
  
  private async executeLoop(): Promise<LoopResult> {
    try {
      this.guards.incrementIteration();

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

      if (reflection.goalAchieved) {
        this.guards.markGoalAchieved();
      }
      
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
    const tool = this.toolRegistry.get(decision.tool.name);
    if (!tool) {
        throw new Error(`Tool ${decision.tool.name} not found`);
    }

    logger.logToolExecution(tool.name, 'start', { args: decision.args });

    const context: Context = {
        sessionId: this.sessionId,
        permissions: ['read', 'write', 'execute'],
        resources: new Map(),
    };

    // Validate preconditions
    const preconditionsMet = await this.toolRegistry.validatePreconditions(
      tool,
      decision.args,
      context
    );
    
    // SECURITY FIX 1.5: Real HITL approval check
    if (!preconditionsMet || tool.requiresApproval) {
      logger.info('Privileged tool requires approval', { toolName: tool.name });
      const approved = await this.requestHumanApproval(decision);
      if (!approved) {
        logger.warn('Action not approved by human', { toolName: tool.name });
        throw new Error('Action not approved by human');
      }
    }
    
    // Execute tool with timeout
    const timeout = tool.timeout || 60000;
    try {
      const result = await Promise.race([
        this.toolRegistry.execute(tool.name, decision.args, context),
        this.timeout(timeout)
      ]);

      logger.logToolExecution(tool.name, result.success ? 'success' : 'error', {
        duration: result.duration,
        error: result.error
      });

      return {
        tool: tool.name,
        args: decision.args,
        result,
        success: result.success,
        duration: result.duration || 0
      };
    } catch (error: any) {
      logger.error(`Error executing tool: ${tool.name}`, error);
      throw error;
    }
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
    const goalAchieved = this.evaluateGoalAchievement(feedback);
    
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
        lesson: this.extractLesson(feedback.error || 'Unknown error'),
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
        const result = await this.executeLoop();
        return {
            success: result.goalAchieved,
            output: result.output,
            actions: this.actionCount,
            duration: Date.now() - this.startTime,
            learning: result.learning
        };
      } else if (recoveryAction === 'fallback') {
        // Use safe default
        await this.memory.write('working', 'usingFallback', true);
        await this.transitionTo('REASON');
        const result = await this.executeLoop();
        return {
            success: result.goalAchieved,
            output: result.output,
            actions: this.actionCount,
            duration: Date.now() - this.startTime,
            learning: result.learning
        };
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
    
    logger.info(`Cognitive Transition: ${oldState} → ${newState}`);
    
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
  
  private evaluateGoalAchievement(feedback: Feedback): boolean {
    // Simple heuristic - can be made more sophisticated
    return feedback.success;
  }
  
  private extractLesson(error: string): string {
    // Extract lesson from error - can be enhanced with ML
    return `Avoid: ${error}`;
  }
  
  /**
   * SECURITY FIX 1.5: Real HITL approval request
   * Waits for human approval before executing privileged tools
   */
  private async requestHumanApproval(decision: Decision): Promise<boolean> {
    console.log(`[ExecutionLoop] Requesting human approval for: ${decision.tool.name}`);
    
    try {
      const approved = await hitlManager.requestApproval(
        this.sessionId,
        decision.tool.name,
        decision.args
      );
      
      await this.emit(LoopEvent.APPROVAL_RECEIVED, { 
        toolName: decision.tool.name,
        approved 
      });
      
      return approved;
    } catch (error) {
      console.error('[ExecutionLoop] HITL approval error:', error);
      return false;
    }
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

// Export HITL manager for external access
export { hitlManager, HITLManager };
