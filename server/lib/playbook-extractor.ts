/**
 * Playbook Extraction System
 * 
 * Analyzes completed task executions and extracts reusable patterns
 * Ported from ECHOMEN with enhancements
 */

import { Task } from './agent-executor';

export interface PlaybookPattern {
  trigger: string;
  steps: Array<{
    type: string;
    description: string;
    tool?: string;
  }>;
  successCriteria: string[];
}

export interface ExtractedPlaybook {
  name: string;
  description: string;
  pattern: PlaybookPattern;
  confidence: number; // 0-1 based on execution success
}

/**
 * Analyze completed tasks and extract playbook pattern
 */
export function extractPlaybookFromExecution(
  tasks: Task[],
  prompt: string,
  success: boolean
): ExtractedPlaybook | null {
  if (tasks.length === 0 || !success) {
    return null;
  }

  // Analyze task sequence for patterns
  const steps = tasks.map(task => ({
    type: task.type,
    description: task.description,
    dependencies: task.dependencies,
  }));

  // Generate playbook name from first task
  const name = generatePlaybookName(prompt, tasks);
  
  // Extract success criteria from completed tasks
  const successCriteria = extractSuccessCriteria(tasks);

  // Calculate confidence based on execution metrics
  const confidence = calculateConfidence(tasks, success);

  return {
    name,
    description: `Automatically generated from successful execution: "${prompt.substring(0, 100)}"`,
    pattern: {
      trigger: prompt.toLowerCase(),
      steps: steps.map(s => ({
        type: s.type,
        description: s.description,
      })),
      successCriteria,
    },
    confidence,
  };
}

/**
 * Generate descriptive playbook name
 */
function generatePlaybookName(prompt: string, tasks: Task[]): string {
  // Extract key action from prompt
  const actionWords = prompt.match(/\b(build|create|make|write|generate|analyze|test|deploy)\b/i);
  const action = actionWords ? actionWords[1].toLowerCase() : 'process';
  
  // Extract target from tasks
  const codeTasks = tasks.filter(t => t.type === 'code');
  const target = codeTasks.length > 0 
    ? 'Code Component' 
    : tasks[0]?.type === 'research' 
      ? 'Research Task'
      : 'Task';
  
  return `${capitalize(action)} ${target}`;
}

/**
 * Extract success criteria from completed tasks
 */
function extractSuccessCriteria(tasks: Task[]): string[] {
  const criteria: string[] = [];
  
  const completedTasks = tasks.filter(t => t.status === 'Done');
  
  if (completedTasks.length === tasks.length) {
    criteria.push('All tasks completed successfully');
  }
  
  const codeTasks = completedTasks.filter(t => t.type === 'code');
  if (codeTasks.length > 0) {
    criteria.push('Code artifacts generated');
  }
  
  const validationTasks = completedTasks.filter(t => t.type === 'validation');
  if (validationTasks.length > 0) {
    criteria.push('Validation passed');
  }
  
  return criteria;
}

/**
 * Calculate confidence score based on execution metrics
 */
function calculateConfidence(tasks: Task[], success: boolean): number {
  if (!success) {
    return 0;
  }
  
  let confidence = 1.0;
  
  // Reduce confidence for failed tasks
  const failedTasks = tasks.filter(t => t.status === 'Failed');
  if (failedTasks.length > 0) {
    confidence -= (failedTasks.length / tasks.length) * 0.5;
  }
  
  // Reduce confidence for long executions (many tasks)
  if (tasks.length > 10) {
    confidence -= 0.1;
  }
  
  return Math.max(0.1, confidence);
}

/**
 * Match prompt against existing playbooks
 */
export function matchPlaybook(prompt: string, playbooks: Array<{ 
  pattern: PlaybookPattern; 
  name: string;
}>): Array<{ playbook: typeof playbooks[0]; score: number }> {
  const promptLower = prompt.toLowerCase();
  
  return playbooks
    .map(playbook => {
      const trigger = playbook.pattern.trigger.toLowerCase();
      
      // Calculate match score
      let score = 0;
      
      // Exact trigger match
      if (promptLower.includes(trigger)) {
        score += 0.5;
      }
      
      // Keyword overlap
      const promptWords = new Set(promptLower.split(/\s+/));
      const triggerWords = trigger.split(/\s+/);
      const overlap = triggerWords.filter(w => promptWords.has(w)).length;
      score += (overlap / triggerWords.length) * 0.3;
      
      // Step type matching
      const hasMatchingSteps = playbook.pattern.steps.some(step => 
        promptLower.includes(step.type.toLowerCase())
      );
      if (hasMatchingSteps) {
        score += 0.2;
      }
      
      return { playbook, score };
    })
    .filter(result => result.score > 0.3)
    .sort((a, b) => b.score - a.score);
}

/**
 * String capitalization helper
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
