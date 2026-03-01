import { Task, LogEntry, SubStep, ToolCall, Artifact, CustomAgent, ExecutionError, MemoryMode, PersistenceSettings } from '../types';
import { determineNextStep } from './planner';
import { availableTools } from './tools';

const MAX_SUB_STEPS = 10;
const MAX_PARALLEL_TASKS = 4;
const MAX_LLM_CALLS_PER_RUN = 40;

interface AgentExecutorCallbacks {
    onTaskUpdate: (task: Task) => void;
    onTasksUpdate: (tasks: Task[]) => void;
    onLog: (log: Omit<LogEntry, 'timestamp'>) => void;
    onTokenUpdate: (count: number) => void;
    onArtifactCreated: (artifact: Omit<Artifact, 'id' | 'createdAt'>) => void;
    onAgentCreated: (agent: CustomAgent) => void;
    onFinish: () => void;
    onFail: (error: ExecutionError) => void;
}

const NON_RETRYABLE_ERROR_CODES: ReadonlySet<ExecutionError['details']['code']> = new Set([
    'LLM_BUDGET_EXCEEDED',
    'MAX_SUB_STEPS_REACHED',
    'DEPENDENCY_DEADLOCK',
]);

export class AgentExecutor {
    private callbacks: AgentExecutorCallbacks;
    private tasks: Task[] = [];
    private currentArtifacts: Artifact[] = [];
    private isStopped = false;
    private llmCallCount = 0;

    constructor(callbacks: AgentExecutorCallbacks) {
        this.callbacks = callbacks;
    }

    private getMemoryMode(): MemoryMode {
        try {
            const saved = localStorage.getItem('echo-persistence-settings');
            if (saved) {
                const settings = JSON.parse(saved) as PersistenceSettings;
                return settings.mode;
            }
        } catch (e) {
            console.error("Failed to read memory mode, defaulting to LOCAL", e);
        }
        return MemoryMode.LOCAL;
    }

    public async run(initialTasks: Task[], prompt: string, initialArtifacts: Artifact[]) {
        this.isStopped = false;
        this.tasks = [...initialTasks];
        this.currentArtifacts = [...initialArtifacts];
        this.llmCallCount = 0;

        const memoryMode = this.getMemoryMode();
        this.callbacks.onLog({ 
            status: 'INFO', 
            message: `[System] Agent initialized in ${memoryMode} memory mode.` 
        });

        const activePromises = new Map<string, Promise<boolean>>();

        while (this.tasks.some(t => ['Queued', 'Executing', 'Delegating'].includes(t.status)) && !this.isStopped) {
            // Find ready tasks that are not already being executed
            const readyTasks = this.findReadyTasks();

            // Start executing tasks up to the concurrency limit
            while (activePromises.size < MAX_PARALLEL_TASKS && readyTasks.length > 0) {
                const taskToRun = readyTasks.shift();
                if (taskToRun) {
                    const promise = this.executeTask(taskToRun).finally(() => {
                        activePromises.delete(taskToRun.id);
                    });
                    activePromises.set(taskToRun.id, promise);
                }
            }
            
            // Log waiting tasks
            this.tasks.forEach(task => {
                if (task.status === 'Queued' && !readyTasks.includes(task) && !activePromises.has(task.id)) {
                    const deps = task.dependencies.map(depId => this.tasks.find(t => t.id === depId)?.title || 'Unknown Task').join(', ');
                     if(deps) this.callbacks.onLog({ status: 'INFO', message: `[System] Task "${task.title}" is waiting for: ${deps}` });
                }
            });

            // If there are active tasks, wait for one to complete.
            // If not, check for deadlocks or completion.
            if (activePromises.size > 0) {
                await Promise.race(Array.from(activePromises.values()));
            } else if (this.tasks.some(t => t.status === 'Queued')) {
                // Deadlock check: No tasks running, but some are still queued
                this.callbacks.onFail(new ExecutionError("Execution stalled due to a dependency issue or a cycle in the task graph.", { code: 'DEPENDENCY_DEADLOCK' }));
                this.tasks.forEach(t => {
                    if (t.status === 'Queued') this.updateTask(t, {status: 'Error'});
                });
                break; // Exit the loop on deadlock
            } else {
                // All tasks are done, have failed, or were cancelled.
                break;
            }
        }

        // Wait for any stragglers if execution was stopped.
        if (this.isStopped) {
            await Promise.allSettled(Array.from(activePromises.values()));
            return;
        }
        
        // Final status check
        if (this.tasks.every(t => t.status === 'Done' || t.status === 'Cancelled')) {
            const isFromPlaybook = initialTasks[0]?.id.startsWith('playbook-');
            if(!isFromPlaybook) {
                this.callbacks.onFinish();
            } else {
                 this.callbacks.onLog({ status: 'SUCCESS', message: 'ECHO: Playbook executed successfully.' });
            }
        } else {
             const remainingTasks = this.tasks.filter(t => t.status === 'Queued' || t.status === 'Pending Review').length;
             if (remainingTasks > 0) {
                this.callbacks.onFail(new ExecutionError(
                    `Could not complete all tasks. ${remainingTasks} tasks remain unresolved.`,
                    { code: 'UNKNOWN' },
                ));
             } else if (!this.tasks.some(t => t.status === 'Error')) {
                this.callbacks.onFinish();
             }
        }
    }

    public stop() {
        this.isStopped = true;
        this.tasks.forEach(t => {
            if (t.status === 'Executing' || t.status === 'Queued' || t.status === 'Pending Review' || t.status === 'Delegating') {
                this.updateTask(t, { status: 'Cancelled' });
            }
        });
        this.callbacks.onTasksUpdate([...this.tasks]);
    }
    
    public cancelTask(taskId: string) {
        const taskToCancel = this.tasks.find(t => t.id === taskId);
        if (!taskToCancel) return;

        const cancelledIds: string[] = [];

        const recursivelyCancel = (id: string) => {
            const task = this.tasks.find(t => t.id === id);
            if (task && task.status !== 'Cancelled') {
                this.updateTask(task, { status: 'Cancelled' });
                this.callbacks.onLog({ status: 'WARN', message: `[System] Task "${task.title}" cancelled by user.` });
                cancelledIds.push(id);

                // Find and cancel all tasks that depend on this one
                const dependents = this.tasks.filter(t => t.dependencies.includes(id));
                dependents.forEach(dep => recursivelyCancel(dep.id));
            }
        };

        recursivelyCancel(taskId);
        this.callbacks.onTasksUpdate([...this.tasks]);
    }
    
    private findReadyTasks(): Task[] {
        return this.tasks.filter(task => 
            task.status === 'Queued' && 
            task.dependencies.every(depId => {
                const dep = this.tasks.find(t => t.id === depId);
                return dep?.status === 'Done';
            })
        );
    }

    private updateTask(task: Task, updates: Partial<Task>): Task {
        let wasUpdated = false;
        const updatedTasks = this.tasks.map(t => {
            if (t.id === task.id) {
                wasUpdated = true;
                return { ...t, ...updates };
            }
            return t;
        });

        if (wasUpdated) {
            this.tasks = updatedTasks;
            const updatedTask = this.tasks.find(t => t.id === task.id);
            if(updatedTask) {
                this.callbacks.onTaskUpdate(updatedTask);
                return updatedTask;
            }
        }
        return { ...task, ...updates };
    }


    private reactivateDelegatorIfAny(completedTask: Task) {
        if (!completedTask.delegatorTaskId) {
            return;
        }
        
        const parentTask = this.tasks.find(t => t.id === completedTask.delegatorTaskId);
        
        if (parentTask && parentTask.status === 'Delegating') {
            this.callbacks.onLog({
                status: 'INFO',
                message: `[System] Child task complete. Resuming God Mode to review and continue.`
            });
            
            const observation = `Delegated task '${completedTask.title}' has been completed by the child agent. Review its work (e.g., read created files) and decide the next action.`;
            
            const lastSubStep = parentTask.subSteps ? parentTask.subSteps[parentTask.subSteps.length - 1] : undefined;

            if (lastSubStep) {
                lastSubStep.observation = observation;
                 this.updateTask(parentTask, {
                    status: 'Executing', // Go straight back to executing
                    subSteps: [...parentTask.subSteps]
                });
            } else {
                 this.updateTask(parentTask, { status: 'Executing' });
            }
        }
    }
    
    private async executeTask(task: Task): Promise<boolean> {
        // Double-check status before executing
        if (this.tasks.find(t => t.id === task.id)?.status !== 'Queued') {
            return true; // Already processed by another async path (e.g., cancellation)
        }
        
        let currentTask = this.updateTask(task, { status: 'Executing' });
        this.callbacks.onLog({ status: 'INFO', message: `[${currentTask.agent.name}] Starting task: ${currentTask.title}` });

        try {
            if (currentTask.agent.role === 'Executor' && currentTask.agent.name === 'God Mode') {
                await this.runReActLoop(currentTask);
            } else {
                await this.simulateSimpleExecution(currentTask);
            }

            const finalTaskState = this.tasks.find(t => t.id === task.id);
             if (finalTaskState && finalTaskState.status === 'Executing') {
                 const doneTask = this.updateTask(finalTaskState, { status: 'Done' });
                 this.callbacks.onLog({ status: 'SUCCESS', message: `[${task.agent.name}] Finished task: ${task.title}` });
                 this.reactivateDelegatorIfAny(doneTask);
            }
            return true;
        } catch (error) {
            const normalizedError = this.normalizeExecutionError(error, task.id);
            const errorMessage = normalizedError.message;
            const isRetryableError = !NON_RETRYABLE_ERROR_CODES.has(normalizedError.details.code);

            if (task.retryCount < task.maxRetries && isRetryableError) {
                const newRetryCount = task.retryCount + 1;
                this.updateTask(task, { status: 'Queued', retryCount: newRetryCount });
                this.callbacks.onLog({ 
                    status: 'WARN', 
                    message: `[${task.agent.name}] Task '${task.title}' failed. Retrying (${newRetryCount}/${task.maxRetries}). Error: ${errorMessage}` 
                });
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second before retry
                return this.executeTask(this.tasks.find(t => t.id === task.id)!);
            } else {
                this.updateTask(task, { status: 'Error' });
                this.callbacks.onLog({ 
                    status: 'ERROR', 
                    message: isRetryableError
                        ? `[${task.agent.name}] Task '${task.title}' failed after ${task.maxRetries} retries: ${errorMessage}`
                        : `[${task.agent.name}] Task '${task.title}' failed without retry due to non-retryable error (${normalizedError.details.code}): ${errorMessage}`
                });
                this.callbacks.onFail(normalizedError);
                return false; 
            }
        }
    }

    private async runReActLoop(task: Task) {
        let subSteps: SubStep[] = task.subSteps || [];
        
        // This loop now continues from where it left off if it was delegating.
        while (subSteps.length < MAX_SUB_STEPS) {
             if (this.isStopped || this.tasks.find(t => t.id === task.id)?.status !== 'Executing') {
                return;
            }

            if (this.llmCallCount >= MAX_LLM_CALLS_PER_RUN) {
                throw new ExecutionError(
                    `LLM budget exceeded (${MAX_LLM_CALLS_PER_RUN} calls) for this run.`,
                    { code: 'LLM_BUDGET_EXCEEDED', taskId: task.id }
                );
            }

            this.llmCallCount += 1;
            const nextStep = await determineNextStep(task, subSteps, this.currentArtifacts, this.callbacks.onTokenUpdate);

            if ('isFinished' in nextStep) {
                this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Concluding task with reason: ${nextStep.finalThought}` });
                return;
            }

            const { thought, toolCall } = nextStep;
            this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Thought: ${thought}` });
            
            let observation = '';

            if (toolCall.name === 'create_and_delegate_task_to_new_agent') {
                const { agent_name, agent_instructions, task_description, agent_icon } = toolCall.args;
                
                // Real implementation: Create the custom agent and task
                const currentDepth = this.calculateDepth(task);
                const MAX_AGENT_DEPTH = 3;

                if (currentDepth >= MAX_AGENT_DEPTH) {
                    observation = `Error: Maximum agent depth reached. Cannot spawn further sub-agents.`;
                    subSteps.push({ thought, toolCall, observation });
                    this.updateTask(task, { subSteps: [...subSteps] });
                    return;
                }

                const newAgentId = `agent-spawn-${Date.now()}`;
                const newAgent: CustomAgent = {
                    id: newAgentId,
                    name: agent_name,
                    instructions: agent_instructions,
                    icon: agent_icon || 'Brain',
                    isCore: false,
                    enabled: true,
                    description: `Spawned by ${task.agent.name} for: ${task.title}`
                };

                // Notify UI to add the new agent
                this.callbacks.onAgentCreated(newAgent);

                const newTask: Task = {
                    id: `task-sub-${Date.now()}`,
                    title: `[Level ${currentDepth + 1}] ${agent_name}`,
                    details: task_description,
                    status: 'Queued',
                    agent: { role: 'Executor', name: newAgent.name },
                    estimatedTime: '~5m',
                    dependencies: [],
                    delegatorTaskId: task.id,
                    logs: [],
                    reviewHistory: [],
                    retryCount: 0,
                    maxRetries: 3,
                    subSteps: []
                };

                const currentSubStep: SubStep = { 
                    thought, 
                    toolCall, 
                    observation: `Task delegated to specialist agent '${agent_name}' (Depth: ${currentDepth + 1}).` 
                };
                subSteps.push(currentSubStep);

                // Update parent task to 'Delegating' and wait
                this.updateTask(task, { status: 'Delegating', subSteps: [...subSteps] });
                
                // Add the new task to the queue and re-trigger the executor loop
                this.tasks.push(newTask);
                this.callbacks.onTasksUpdate([...this.tasks]);
                this.callbacks.onLog({ 
                    status: 'INFO', 
                    message: `[${task.agent.name}] 🚀 Spawning recursive sub-agent '${agent_name}'` 
                });
                
                return; 
            }

    private calculateDepth(task: Task): number {
        let depth = 0;
        let currentTask = task;
        while (currentTask.delegatorTaskId) {
            const parent = this.tasks.find(t => t.id === currentTask.delegatorTaskId);
            if (!parent) break;
            depth++;
            currentTask = parent;
        }
        return depth;
    }

            if (toolCall.name === 'createArtifact') {
                const { title, type, content } = toolCall.args;
                
                // Real implementation: Create the artifact object and persist to filesystem
                const newArtifactData: Omit<Artifact, 'id' | 'createdAt'> = {
                    taskId: task.id,
                    title: title,
                    type: type,
                    content: content
                };

                // Notify UI to add to the artifacts panel
                this.callbacks.onArtifactCreated(newArtifactData);

                // Persist the artifact to the outputs/ directory as a file
                const fileExtension = type === 'code' ? 'txt' : (type === 'markdown' ? 'md' : 'json');
                const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const artifactPath = `./outputs/artifact_${safeTitle}_${Date.now()}.${fileExtension}`;
                
                try {
                    await availableTools.writeFile({ path: artifactPath, content: content });
                    observation = `Artifact "${title}" created successfully and saved to ${artifactPath}.`;
                    this.callbacks.onLog({ status: 'SUCCESS', message: `[Executor] ${observation}` });
                } catch (error) {
                    const writeError = error instanceof Error ? error.message : String(error);
                    observation = `Artifact created in memory, but failed to save to disk: ${writeError}`;
                    this.callbacks.onLog({ status: 'WARN', message: `[Executor] ${observation}` });
                }

                this.currentArtifacts.push({
                    ...newArtifactData,
                    id: `artifact-${Date.now()}`,
                    createdAt: new Date().toISOString()
                });
            } else if (toolCall.name === 'executeCode') {
                const { language, code } = toolCall.args;
                try {
                    const result = await availableTools.executeCode({ language, code });
                     const newArtifactData = {
                        taskId: task.id,
                        title: `Execution Result: ${language}`,
                        type: 'live-preview' as const,
                        content: JSON.stringify({ code, result })
                    };
                    this.callbacks.onArtifactCreated(newArtifactData);
                    this.currentArtifacts.push({
                        ...newArtifactData,
                        id: `artifact-${Date.now()}`,
                        createdAt: new Date().toISOString()
                    });
                    observation = `Code executed successfully. Result: ${result.substring(0, 200)}...`;
                } catch (e) {
                     const toolError = e instanceof Error ? e.message : String(e);
                     observation = `Error executing code: ${toolError}`;
                     this.callbacks.onLog({ status: 'ERROR', message: `[Tool] ${observation}` });
                     throw new ExecutionError(observation, { code: 'TOOL_EXECUTION_FAILED', taskId: task.id, toolName: toolCall.name, cause: e });
                }
            } else {
                 const toolImplementation = availableTools[toolCall.name];

                if (toolImplementation) {
                    try {
                        this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Using tool: ${toolCall.name} with args: ${JSON.stringify(toolCall.args)}` });
                        const result = await toolImplementation(toolCall.args);
                        observation = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
                        this.callbacks.onLog({ status: 'SUCCESS', message: `[Tool] ${toolCall.name} returned: ${observation.substring(0, 100)}...` });
                    } catch (e) {
                        const toolError = e instanceof Error ? e.message : String(e);
                        observation = `Error executing tool ${toolCall.name}: ${toolError}`;
                        this.callbacks.onLog({ status: 'ERROR', message: `[Tool] ${observation}` });
                        throw new ExecutionError(observation, { code: 'TOOL_EXECUTION_FAILED', taskId: task.id, toolName: toolCall.name, cause: e });
                    }
                } else {
                    observation = `Tool '${toolCall.name}' not found.`;
                    this.callbacks.onLog({ status: 'WARN', message: `[${task.agent.name}] ${observation}` });
                }
            }

            const newSubStep: SubStep = { thought, toolCall, observation };
            subSteps.push(newSubStep);
            
            this.updateTask(task, { subSteps: [...subSteps] });
        }
        
        this.callbacks.onLog({ status: 'WARN', message: `[${task.agent.name}] Task "${task.title}" reached max steps (${MAX_SUB_STEPS}) and will now be finalized.` });
        throw new ExecutionError(`Task reached max step budget (${MAX_SUB_STEPS}).`, { code: 'MAX_SUB_STEPS_REACHED', taskId: task.id });
    }



    private normalizeExecutionError(error: unknown, taskId?: string): ExecutionError {
        if (error instanceof ExecutionError) {
            return error;
        }

        if (error instanceof Error) {
            return new ExecutionError(error.message, { code: 'UNKNOWN', taskId, cause: error });
        }

        return new ExecutionError(String(error), { code: 'UNKNOWN', taskId, cause: error });
    }

    private async simulateSimpleExecution(task: Task) {
        if (this.isStopped || this.tasks.find(t => t.id === task.id)?.status !== 'Executing') return;
        this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Processing...` });
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
        if (this.isStopped || this.tasks.find(t => t.id === task.id)?.status !== 'Executing') return;
        this.callbacks.onLog({ status: 'SUCCESS', message: `[${task.agent.name}] Processing complete.` });
    }
}
