import { Task, LogEntry, SubStep, ToolCall, Artifact } from '../types';
import { determineNextStep } from './planner';
import { availableTools } from './tools';

const MAX_SUB_STEPS = 10;

interface AgentExecutorCallbacks {
    onTaskUpdate: (task: Task) => void;
    onLog: (log: Omit<LogEntry, 'timestamp'>) => void;
    onArtifactCreated: (artifact: Omit<Artifact, 'id' | 'createdAt'>) => void;
    onFinish: () => void;
    onFail: (errorMessage: string) => void;
}

export class AgentExecutor {
    private callbacks: AgentExecutorCallbacks;
    private tasks: Task[] = [];

    constructor(callbacks: AgentExecutorCallbacks) {
        this.callbacks = callbacks;
    }

    public async run(initialTasks: Task[], prompt: string) {
        this.tasks = [...initialTasks];
        
        // Find the first task with no dependencies to start
        let currentTask = this.findNextTask();
        while (currentTask) {
            const success = await this.executeTask(currentTask);
            if (!success) {
                // If a task definitively fails after retries, we stop.
                if (this.tasks.some(t => t.status === 'Error')) {
                    this.callbacks.onFail("Execution halted due to a task failure after all retries.");
                }
                return;
            }
            currentTask = this.findNextTask();
        }

        if (this.tasks.every(t => t.status === 'Done')) {
            const isFromPlaybook = initialTasks[0]?.id.startsWith('playbook-');
            if(!isFromPlaybook) {
                this.callbacks.onFinish();
            } else {
                 this.callbacks.onLog({ status: 'SUCCESS', message: 'ECHO: Playbook executed successfully.' });
            }
        } else {
             // This case might be reached if there's a dependency cycle or an un-runnable task.
             const remainingTasks = this.tasks.filter(t => t.status === 'Queued').length;
             if (remainingTasks > 0) {
                this.callbacks.onFail(`Could not complete all tasks. ${remainingTasks} tasks remain queued.`);
             }
        }
    }
    
    private findNextTask(): Task | undefined {
        return this.tasks.find(task => 
            task.status === 'Queued' && 
            task.dependencies.every(depId => 
                this.tasks.find(t => t.id === depId)?.status === 'Done'
            )
        );
    }

    private updateTask(task: Task, updates: Partial<Task>) {
        const updatedTask = { ...task, ...updates };
        this.tasks = this.tasks.map(t => t.id === task.id ? updatedTask : t);
        this.callbacks.onTaskUpdate(updatedTask);
    }
    
    private async executeTask(task: Task): Promise<boolean> {
        this.updateTask(task, { status: 'Executing' });
        this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Starting task: ${task.title}` });

        try {
            if (task.agent.role === 'Executor' && task.agent.name === 'God Mode') {
                await this.runReActLoop(task);
            } else {
                await this.simulateSimpleExecution(task);
            }
            this.updateTask(task, { status: 'Done' });
            this.callbacks.onLog({ status: 'SUCCESS', message: `[${task.agent.name}] Finished task: ${task.title}` });
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
                // We return true here to allow the main loop to continue and potentially retry this task later.
                return true; 
            } else {
                this.updateTask(task, { status: 'Error' });
                this.callbacks.onLog({ 
                    status: 'ERROR', 
                    message: `[${task.agent.name}] Task '${task.title}' failed after ${task.maxRetries} retries: ${errorMessage}` 
                });
                // We return false to signal a definitive failure.
                return false; 
            }
        }
    }

    private async runReActLoop(task: Task) {
        let subSteps: SubStep[] = [];
        for (let i = 0; i < MAX_SUB_STEPS; i++) {
            const nextStep = await determineNextStep(task, subSteps);

            if ('isFinished' in nextStep) {
                this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Concluding task with reason: ${nextStep.finalThought}` });
                return; // Task is complete
            }

            const { thought, toolCall } = nextStep;
            this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Thought: ${thought}` });
            
            let observation = '';

            if (toolCall.name === 'createArtifact') {
                this.callbacks.onArtifactCreated({
                    taskId: task.id,
                    title: toolCall.args.title,
                    type: toolCall.args.type,
                    content: toolCall.args.content
                });
                observation = `Artifact "${toolCall.args.title}" created successfully.`;
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
                        // Propagate tool errors to trigger retry logic
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
        this.callbacks.onLog({ status: 'INFO', message: `[${task.agent.name}] Processing...` });
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        this.callbacks.onLog({ status: 'SUCCESS', message: `[${task.agent.name}] Processing complete.` });
    }
}