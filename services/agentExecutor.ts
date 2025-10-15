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
        
        while (this.tasks.some(t => t.status === 'Queued') && !this.isStopped) {
            const currentTask = this.findNextTask();
            if (currentTask) {
                const success = await this.executeTask(currentTask);
                if (!success && !this.isStopped) {
                    this.callbacks.onFail(`Execution halted: Task "${currentTask.title}" failed after all retries.`);
                    return;
                }
            } else {
                if (this.tasks.some(t => t.status === 'Delegating' || t.status === 'Executing')) {
                    await new Promise(resolve => setTimeout(resolve, 500)); 
                } else {
                    break;
                }
            }
        }

        if (this.isStopped) return;

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
                this.callbacks.onFail(`Could not complete all tasks. ${remainingTasks} tasks remain unresolved.`);
             } else if (!this.tasks.some(t => t.status === 'Error')) {
                // If no tasks are queued and none have errored, it must be a success.
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
    
    private findNextTask(): Task | undefined {
        return this.tasks.find(task => 
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
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (task.retryCount < task.maxRetries) {
                const newRetryCount = task.retryCount + 1;
                this.updateTask(task, { status: 'Queued', retryCount: newRetryCount });
                this.callbacks.onLog({ 
                    status: 'WARN', 
                    message: `[${task.agent.name}] Task '${task.title}' failed. Retrying (${newRetryCount}/${task.maxRetries}). Error: ${errorMessage}` 
                });
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second before retry
                return this.executeTask(this.tasks.find(t => t.id === task.id));
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
        
        // This loop now continues from where it left off if it was delegating.
        while (subSteps.length < MAX_SUB_STEPS) {
             if (this.isStopped || this.tasks.find(t => t.id === task.id)?.status !== 'Executing') {
                return;
            }

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
                    dependencies: [],
                    delegatorTaskId: task.id,
                    logs: [],
                    reviewHistory: [],
                    retryCount: 0,
                    maxRetries: 3,
                };

                const currentSubStep: SubStep = { thought, toolCall, observation: `Paused to delegate task.` };
                subSteps.push(currentSubStep);

                this.updateTask(task, { status: 'Delegating', subSteps: [...subSteps] });
                
                this.tasks.push(newTask);
                this.callbacks.onTasksUpdate([...this.tasks]);
                this.callbacks.onLog({ status: 'INFO', message: `[God Mode] Pausing and delegating task to new agent '${newAgent.name}'.` });
                
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
                        observation = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
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
        
        this.callbacks.onLog({ status: 'WARN', message: `[${task.agent.name}] Task "${task.title}" reached max steps (${MAX_SUB_STEPS}) and will now be finalized.` });
    }

    private async simulateSimpleExecution(task: Task) {
        if (this.isStopped || this.tasks.find(t => t.id === task.id)?.status !== 'Executing') return;
        this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Processing...` });
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
        if (this.isStopped || this.tasks.find(t => t.id === task.id)?.status !== 'Executing') return;
        this.callbacks.onLog({ status: 'SUCCESS', message: `[${task.agent.name}] Processing complete.` });
    }
}