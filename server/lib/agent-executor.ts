/**
 * Multi-Agent Execution Engine for ECHO
 * 
 * Ported from ECHOMEN with enhancements:
 * - tRPC integration for real-time updates
 * - HITL gates for privileged operations
 * - Echoctl CLI bridge for tool execution
 */

import { EventEmitter } from 'events';

export interface Task {
  id: string;
  type: 'research' | 'code' | 'shell' | 'file' | 'chat' | 'validation';
  description: string;
  status: 'Queued' | 'Executing' | 'Done' | 'Failed' | 'Cancelled' | 'AwaitingApproval';
  dependencies: string[];
  result?: string;
  error?: string;
  approved?: boolean;
}

export interface LogEntry {
  status: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  timestamp?: string;
}

export interface Artifact {
  id: string;
  type: 'code' | 'document' | 'image' | 'data';
  title: string;
  content: string;
  language?: string;
}

export interface ExecutionError {
  message: string;
  code?: string;
  stack?: string;
}

const MAX_PARALLEL_TASKS = 4;

// Security Guard: Tools that require explicit human approval
const PRIVILEGED_TOOLS = [
  'executeShellCommand',
  'writeFile',
  'deleteFile',
  'memory_delete',
  'github_merge_pr'
];

interface AgentExecutorCallbacks {
  onTaskUpdate: (task: Task) => void;
  onTasksUpdate: (tasks: Task[]) => void;
  onLog: (log: Omit<LogEntry, 'timestamp'>) => void;
  onTokenUpdate: (count: number) => void;
  onArtifactCreated: (artifact: Omit<Artifact, 'id' | 'createdAt'>) => void;
  onFinish: () => void;
  onFail: (error: ExecutionError) => void;
  onApprovalRequired: (task: Task, toolName: string) => Promise<boolean>;
}

export class AgentExecutor extends EventEmitter {
  private callbacks: AgentExecutorCallbacks;
  private tasks: Task[] = [];
  private currentArtifacts: Artifact[] = [];
  private isStopped = false;
  private _llmCallCount = 0;
  private activePromises: Map<string, Promise<boolean>> = new Map();

  constructor(callbacks: AgentExecutorCallbacks) {
    super();
    this.callbacks = callbacks;
  }

  public async run(initialTasks: Task[], _prompt: string, initialArtifacts: Artifact[]) {
    this.isStopped = false;
    this.tasks = [...initialTasks];
    this.currentArtifacts = [...initialArtifacts];
    this.llmCallCount = 0;

    this.callbacks.onLog({
      status: 'INFO',
      message: `[System] Agent initialized. Ready to execute ${initialTasks.length} task(s).`
    });

    while (this.tasks.some(t => ['Queued', 'Executing', 'AwaitingApproval'].includes(t.status)) && !this.isStopped) {
      const readyTasks = this.findReadyTasks();

      // Start executing tasks up to concurrency limit
      while (this.activePromises.size < MAX_PARALLEL_TASKS && readyTasks.length > 0) {
        const taskToRun = readyTasks.shift();
        if (taskToRun) {
          const promise = this.executeTask(taskToRun).finally(() => {
            this.activePromises.delete(taskToRun.id);
          });
          this.activePromises.set(taskToRun.id, promise);
        }
      }

      if (this.activePromises.size > 0) {
        await Promise.race(Array.from(this.activePromises.values()));
      } else if (this.tasks.some(t => t.status === 'Queued')) {
        this.callbacks.onFail(new Error('Execution stalled due to dependency AwaitingApproval or dependencies.'));
        break;
      } else {
        break;
      }
    }

    if (this.tasks.every(t => t.status === 'Done' || t.status === 'Cancelled')) {
      this.callbacks.onFinish();
    }
  }

  private findReadyTasks(): Task[] {
    return this.tasks.filter(task => {
      if (task.status !== 'Queued') return false;
      return task.dependencies.every(depId => {
        const dep = this.tasks.find(t => t.id === depId);
        return dep && dep.status === 'Done';
      });
    });
  }

  private async executeTask(task: Task): Promise<boolean> {
    try {
      task.status = 'Executing';
      this.callbacks.onTaskUpdate(task);
      this.callbacks.onLog({ status: 'INFO', message: `Executing: ${task.description}` });

      // Check if task requires approval
      if (this.requiresApproval(task)) {
        task.status = 'AwaitingApproval';
        this.callbacks.onTaskUpdate(task);
        
        const approved = await this.callbacks.onApprovalRequired(task, this.getToolName(task));
        
        if (!approved) {
          task.status = 'Cancelled';
          task.error = 'Human rejected privileged operation';
          this.callbacks.onTaskUpdate(task);
          this.callbacks.onLog({ status: 'WARN', message: `Task cancelled by user: ${task.description}` });
          return false;
        }
        
        task.status = 'Executing';
        task.approved = true;
        this.callbacks.onTaskUpdate(task);
      }

      // Simulate task execution (in real implementation, this calls Echoctl tools)
      await this.simulateTaskExecution(task);

      task.status = 'Done';
      task.result = 'Completed successfully';
      this.callbacks.onTaskUpdate(task);
      this.callbacks.onLog({ status: 'SUCCESS', message: `Completed: ${task.description}` });

      return true;
    } catch (error) {
      task.status = 'Failed';
      task.error = error instanceof Error ? error.message : String(error);
      this.callbacks.onTaskUpdate(task);
      this.callbacks.onLog({ 
        status: 'ERROR', 
        message: `Failed: ${task.description} - ${task.error}` 
      });
      return false;
    }
  }

  private requiresApproval(task: Task): boolean {
    // Check if task uses privileged tools
    return PRIVILEGED_TOOLS.some(tool => 
      task.description.toLowerCase().includes(tool.toLowerCase())
    );
  }

  private getToolName(task: Task): string {
    for (const tool of PRIVILEGED_TOOLS) {
      if (task.description.toLowerCase().includes(tool.toLowerCase())) {
        return tool;
      }
    }
    return 'Unknown';
  }

  private async simulateTaskExecution(task: Task): Promise<void> {
    // In real implementation, this dispatches to Echoctl tools
    // For now, simulate with delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate artifact creation for code tasks
    if (task.type === 'code') {
      this.callbacks.onArtifactCreated({
        type: 'code',
        title: `Result: ${task.description}`,
        content: '// Generated code artifact\nconsole.log("Task completed");',
        language: 'typescript'
      });
    }
  }

  public cancelTask(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && ['Queued', 'Executing'].includes(task.status)) {
      task.status = 'Cancelled';
      this.callbacks.onTaskUpdate(task);
      this.callbacks.onLog({ status: 'WARN', message: `Task cancelled: ${task.description}` });
    }
  }

  public stop(): void {
    this.isStopped = true;
    this.callbacks.onLog({ status: 'WARN', message: 'Execution stopped by user' });
  }

  public getTasks(): Task[] {
    return this.tasks;
  }

  public getArtifacts(): Artifact[] {
    return this.currentArtifacts;
  }
}
