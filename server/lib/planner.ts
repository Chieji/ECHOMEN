/**
 * Task Planner for ECHO Multi-Agent System
 * 
 * Decomposes high-level goals into executable task pipelines.
 * Ported from ECHOMEN with tRPC integration.
 */

import { Task } from './agent-executor';

/**
 * Task types for routing to optimal AI providers
 */
export type TaskType = 'research' | 'code' | 'shell' | 'file' | 'chat' | 'validation';

/**
 * Analyze user prompt and determine if it's actionable
 */
export async function analyzeIntent(
  prompt: string,
  onTokenUpdate?: (count: number) => void
): Promise<{ is_actionable: boolean; suggested_prompt: string }> {
  // In production, this calls LLM for intent classification
  // For now, use heuristic analysis
  
  const actionableKeywords = [
    'build', 'create', 'make', 'write', 'generate',
    'delete', 'remove', 'run', 'execute', 'test',
    'install', 'deploy', 'fix', 'update', 'change'
  ];
  
  const isActionable = actionableKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword)
  );
  
  if (onTokenUpdate) {
    onTokenUpdate(prompt.length / 4); // Rough token estimate
  }
  
  return {
    is_actionable: isActionable,
    suggested_prompt: prompt.trim()
  };
}

/**
 * Create initial task plan from user prompt
 * 
 * In production, this uses LLM to decompose goals into tasks.
 * For Phase 2, we use template-based decomposition.
 */
export async function createInitialPlan(
  prompt: string,
  isActionable: boolean,
  _context?: {
    connectedServices?: string[];
    customAgents?: any[];
    activeTodos?: any[];
  },
  onTokenUpdate?: (count: number) => void
): Promise<Task[]> {
  if (!isActionable) {
    // Non-actionable prompts get a single chat task
    return [{
      id: `task-${Date.now()}`,
      type: 'chat',
      description: `Respond to: "${prompt.substring(0, 100)}"`,
      status: 'Queued',
      dependencies: []
    }];
  }
  
  // Template-based task decomposition
  const tasks: Task[] = [];
  const baseId = Date.now();
  
  // Detect task type from prompt
  if (prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('function') || prompt.toLowerCase().includes('component')) {
    // Code generation pipeline
    tasks.push(
      {
        id: `task-${baseId}-1`,
        type: 'research',
        description: 'Research requirements and best practices',
        status: 'Queued',
        dependencies: []
      },
      {
        id: `task-${baseId}-2`,
        type: 'code',
        description: 'Write code implementation',
        status: 'Queued',
        dependencies: [`task-${baseId}-1`]
      },
      {
        id: `task-${baseId}-3`,
        type: 'validation',
        description: 'Review and test code quality',
        status: 'Queued',
        dependencies: [`task-${baseId}-2`]
      }
    );
  } else if (prompt.toLowerCase().includes('file') || prompt.toLowerCase().includes('document')) {
    // File operation pipeline
    tasks.push({
      id: `task-${baseId}-1`,
      type: 'file',
      description: `Create or modify file: ${prompt.substring(0, 50)}`,
      status: 'Queued',
      dependencies: []
    });
  } else if (prompt.toLowerCase().includes('command') || prompt.toLowerCase().includes('run') || prompt.toLowerCase().includes('execute')) {
    // Shell command pipeline
    tasks.push({
      id: `task-${baseId}-1`,
      type: 'shell',
      description: `Execute shell command: ${prompt.substring(0, 50)}`,
      status: 'Queued',
      dependencies: []
    });
  } else {
    // Generic task
    tasks.push({
      id: `task-${baseId}-1`,
      type: 'research',
      description: `Process request: ${prompt.substring(0, 50)}`,
      status: 'Queued',
      dependencies: []
    });
  }
  
  if (onTokenUpdate) {
    onTokenUpdate(prompt.length / 4);
  }
  
  return tasks;
}

/**
 * Determine next step in execution flow
 */
export async function determineNextStep(
  _completedTask: Task,
  allTasks: Task[],
  onTokenUpdate?: (count: number) => void
): Promise<{
  nextSteps: string[];
  isComplete: boolean;
  artifacts?: any[];
}> {
  // In production, this uses LLM to evaluate progress
  // For now, use simple dependency-based logic
  
  const remainingTasks = allTasks.filter(t => t.status === 'Queued');
  const isComplete = remainingTasks.length === 0;
  
  if (onTokenUpdate) {
    onTokenUpdate(50); // Fixed cost for evaluation
  }
  
  return {
    nextSteps: remainingTasks.map(t => t.description),
    isComplete,
    artifacts: []
  };
}

/**
 * Clarify and correct user prompt using LLM
 */
export async function clarifyAndCorrectPrompt(
  prompt: string,
  onTokenUpdate?: (count: number) => void
): Promise<string> {
  // In production, this uses LLM to clarify ambiguous requests
  // For now, return as-is with minimal processing
  
  const corrected = prompt.trim();
  
  if (onTokenUpdate) {
    onTokenUpdate(corrected.length / 4);
  }
  
  return corrected;
}
