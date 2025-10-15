import { Task, LogEntry, SubStep, ToolCall, Artifact, CustomAgent } from '../types';
import { determineNextStep } from './planner';
import { availableTools } from './tools';

const MAX_SUB_STEPS = 10;

interface AgentExecutorCallbacks {
    onTaskUpdate: (task: Task) => void;
    onTasksUpdate: (tasks: Task[]) => void;
    onLog: (log: Omit<LogEntry, 'timestamp'>) => void;
    onArtifactCreated: (artifact: Omit<Artifact, 'id' | 'createdAt'>) => void;
    onAgentCreated: (agent: CustomAgent) => void;
    onFinish: () => void;
    onFail: (errorMessage: string) => void;
}

export class AgentExecutor {
    private callbacks: AgentExecutorCallbacks;
    private tasks: Task[] = [];
    private isStopped = false;

    constructor(callbacks: AgentExecutorCallbacks) {
        this.callbacks = callbacks;
    }

    public async run(initialTasks: Task[], prompt: string) {
        this.isStopped = false;
        this.tasks = [...initialTasks];
        
        while (this.tasks.some(t => t.status !== 'Done' && t.status !== 'Error') && !this.isStopped) {
            const currentTask = this.findNextTask();
            if (currentTask) {
                const success = await this.executeTask(currentTask);
                if (!success) {
                    this.callbacks.onFail(`Execution halted: Task "${currentTask.title}" failed after all retries.`);
                    return;
                }
            } else {
                if (this.tasks.some(t => t.status === 'Delegating')) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for delegated tasks to complete
                } else {
                    // No runnable tasks and nothing is delegating. We're either done or deadlocked.
                    break; // Exit the loop
                }
            }
        }

        if (this.isStopped) return;

        if (this.tasks.every(t => t.status === 'Done')) {
            const isFromPlaybook = initialTasks[0]?.id.startsWith('playbook-');
            if(!isFromPlaybook) {
                this.callbacks.onFinish();
            } else {
                 this.callbacks.onLog({ status: 'SUCCESS', message: 'ECHO: Playbook executed successfully.' });
            }
        } else {
             const remainingTasks = this.tasks.filter(t => t.status === 'Queued').length;
             if (remainingTasks > 0) {
                this.callbacks.onFail(`Could not complete all tasks. ${remainingTasks} tasks remain queued.`);
             }
        }
    }

    public stop() {
        this.isStopped = true;
    }
    
    private findNextTask(): Task | undefined {
        return this.tasks.find(task => 
            task.status === 'Queued' && 
            task.dependencies.every(depId => 
                this.tasks.find(t => t.id === depId)?.status === 'Done'
            )
        );
    }

    private updateTask(task: Task, updates: Partial<Task>): Task {
        const updatedTask = { ...task, ...updates };
        this.tasks = this.tasks.map(t => t.id === task.id ? updatedTask : t);
        this.callbacks.onTaskUpdate(updatedTask);
        return updatedTask;
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
            
            // Pop the last sub-step (the delegation call) and update its observation
            const lastSubStep = parentTask.subSteps.pop();
            if (lastSubStep) {
                lastSubStep.observation = observation;
                parentTask.subSteps.push(lastSubStep);
            }
            
            // Reactivate the parent task by putting it back in the queue.
            this.updateTask(parentTask, {
                status: 'Queued',
                subSteps: parentTask.subSteps
            });
        }
    }
    
    private async executeTask(task: Task): Promise<boolean> {
        let currentTask = this.updateTask(task, { status: 'Executing' });
        this.callbacks.onLog({ status: 'INFO', message: `[${currentTask.agent.name}] Starting task: ${currentTask.title}` });

        try {
            if (currentTask.agent.role === 'Executor' && currentTask.agent.name === 'God Mode') {
                await this.runReActLoop(currentTask);
            } else {
                // For non-God Mode executors, including spawned ones, run a simplified execution.
                await this.simulateSimpleExecution(currentTask);
            }

            const finalTaskState = this.tasks.find(t => t.id === task.id);
            if (finalTaskState && finalTaskState.status !== 'Delegating') {
                 const doneTask = this.updateTask(finalTaskState, { status: 'Done' });
                 this.callbacks.onLog({ status: 'SUCCESS', message: `[${task.agent.name}] Finished task: ${task.title}` });
                 this.reactivateDelegatorIfAny(doneTask);
            }
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (task.retryCount < task.maxRetries) {
                const newRetryCount = task.retryCount + 1;
                this.updateTask(task, { status: 'Queued', retryCount: newRetryCount });
                this.callbacks.onLog({ 
                    status: 'WARN', 
                    message: `[${task.agent.name}] Task '${task.title}' failed. Retrying (${newRetryCount}/${task.maxRetries}). Error: ${errorMessage}` 
                });
                return true; 
            } else {
                this.updateTask(task, { status: 'Error' });
                this.callbacks.onLog({ 
                    status: 'ERROR', 
                    message: `[${task.agent.name}] Task '${task.title}' failed after ${task.maxRetries} retries: ${errorMessage}` 
                });
                return false; 
            }
        }
    }

    private async runReActLoop(task: Task) {
        let subSteps: SubStep[] = task.subSteps || [];
        for (let i = 0; i < MAX_SUB_STEPS; i++) {
            if (this.isStopped) return;

            const nextStep = await determineNextStep(task, subSteps);

            if ('isFinished' in nextStep) {
                this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Concluding task with reason: ${nextStep.finalThought}` });
                return;
            }

            const { thought, toolCall } = nextStep;
            this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Thought: ${thought}` });
            
            let observation = '';

            if (toolCall.name === 'create_and_delegate_task_to_new_agent') {
                const { agent_name, agent_instructions, task_description, agent_icon } = toolCall.args;
                
                const newAgent: CustomAgent = {
                    id: `agent-spawn-${Date.now()}`,
                    name: agent_name,
                    instructions: agent_instructions,
                    icon: agent_icon || 'Brain',
                    isCore: false,
                    enabled: true,
                    description: `Spawned by God Mode for: ${task.title}`
                };
                this.callbacks.onAgentCreated(newAgent);

                const newTask: Task = {
                    id: `task-sub-${Date.now()}`,
                    title: `Delegated: ${agent_name}`,
                    details: task_description,
                    status: 'Queued',
                    agent: { role: 'Executor', name: newAgent.name },
                    estimatedTime: '~5m',
                    dependencies: [], // Runs in parallel, unblocking the main pipeline temporarily
                    delegatorTaskId: task.id, // Links back to the parent
                    logs: [],
                    reviewHistory: [],
                    retryCount: 0,
                    maxRetries: 3,
                };

                this.updateTask(task, { status: 'Delegating' });
                this.tasks.push(newTask);
                this.callbacks.onTasksUpdate([...this.tasks]);
                this.callbacks.onLog({ status: 'INFO', message: `[God Mode] Pausing and delegating task to new agent '${newAgent.name}'.` });
                
                // Add the current thought/action to substeps before pausing
                const currentSubStep: SubStep = { thought, toolCall, observation: `Paused to delegate task.` };
                subSteps.push(currentSubStep);
                this.updateTask(task, { subSteps: [...subSteps] });
                
                return; 
            }

            if (toolCall.name === 'createArtifact') {
                this.callbacks.onArtifactCreated({
                    taskId: task.id,
                    title: toolCall.args.title,
                    type: toolCall.args.type,
                    content: toolCall.args.content
                });
                observation = `Artifact "${toolCall.args.title}" created successfully.`;
            } else if (toolCall.name === 'executeCode') {
                const { language, code } = toolCall.args;
                try {
                    const result = await availableTools.executeCode({ language, code });
                    this.callbacks.onArtifactCreated({
                        taskId: task.id,
                        title: `Execution Result: ${language}`,
                        type: 'live-preview',
                        content: JSON.stringify({ code, result })
                    });
                    observation = `Code executed successfully. Result: ${result.substring(0, 200)}...`;
                } catch (e) {
                     const toolError = e instanceof Error ? e.message : String(e);
                     observation = `Error executing code: ${toolError}`;
                     this.callbacks.onLog({ status: 'ERROR', message: `[Tool] ${observation}` });
                     throw new Error(observation);
                }
            } else {
                 const toolImplementation = availableTools[toolCall.name];

                if (toolImplementation) {
                    try {
                        this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Using tool: ${toolCall.name} with args: ${JSON.stringify(toolCall.args)}` });
                        const result = await toolImplementation(toolCall.args);
                        observation = typeof result === 'object' ? JSON.stringify(result) : String(result);
                        this.callbacks.onLog({ status: 'SUCCESS', message: `[Tool] ${toolCall.name} returned: ${observation.substring(0, 100)}...` });
                    } catch (e) {
                        const toolError = e instanceof Error ? e.message : String(e);
                        observation = `Error executing tool ${toolCall.name}: ${toolError}`;
                        this.callbacks.onLog({ status: 'ERROR', message: `[Tool] ${observation}` });
                        throw new Error(observation);
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
        
        throw new Error(`Max steps (${MAX_SUB_STEPS}) reached for task "${task.title}".`);
    }

    private async simulateSimpleExecution(task: Task) {
        if (this.isStopped) return;
        this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Processing...` });
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        if (this.isStopped) return;
        this.callbacks.onLog({ status: 'SUCCESS', message: `[${task.agent.name}] Processing complete.` });
    }
}