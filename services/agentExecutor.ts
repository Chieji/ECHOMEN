import { Task, LogEntry, SubStep, Artifact, CustomAgent, ExecutionError, MemoryMode, PersistenceSettings, ToolCall } from '../types';
import { determineNextStep } from './planner';
import { availableTools } from './tools';

const MAX_SUB_STEPS = 10;
const MAX_PARALLEL_TASKS = 4;

// Security Guard: Tools that require explicit human approval
const PRIVILEGED_TOOLS = [
    'executeShellCommand',
    'writeFile',
    'memory_delete',
    'github_merge_pr'
];

interface ToolCallWithApproval extends ToolCall {
    requiresApproval?: boolean;
}

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

    public async run(initialTasks: Task[], _prompt: string, initialArtifacts: Artifact[]) {
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

        while (this.tasks.some(t => ['Queued', 'Executing', 'Delegating', 'AwaitingApproval'].includes(t.status)) && !this.isStopped) {
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
            
            if (activePromises.size > 0) {
                await Promise.race(Array.from(activePromises.values()));
            } else if (this.tasks.some(t => t.status === 'Queued')) {
                this.callbacks.onFail(new ExecutionError("Execution stalled due to a dependency issue.", { code: 'DEPENDENCY_DEADLOCK' }));
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

    private updateTask(task: Task, updates: Partial<Task>) {
        const updatedTask = { ...task, ...updates };
        this.tasks = this.tasks.map(t => t.id === task.id ? updatedTask : t);
        this.callbacks.onTaskUpdate(updatedTask);
        this.callbacks.onTasksUpdate([...this.tasks]);
    }

    private async executeTask(task: Task): Promise<boolean> {
        this.updateTask(task, { status: 'Executing' });
        try {
            await this.runReActLoop(task);
            if (task.status !== 'AwaitingApproval') {
                this.updateTask(task, { status: 'Done' });
            }
            return true;
        } catch (error) {
            console.error("Task failed:", error);
            this.updateTask(task, { status: 'Error' });
            return false;
        }
    }

    private async runReActLoop(task: Task) {
        let subSteps: SubStep[] = task.subSteps || [];
        let observation = '';
        let currentDepth = this.calculateDepth(task);

        while (subSteps.length < MAX_SUB_STEPS) {
            if (this.isStopped || this.tasks.find(t => t.id === task.id)?.status !== 'Executing') return;

            this.llmCallCount += 1;
            const nextStep = await determineNextStep(task, subSteps, this.currentArtifacts, this.callbacks.onTokenUpdate);

            if ('isFinished' in nextStep) {
                this.callbacks.onLog({ status: 'SUCCESS', message: `[${task.agent.name}] Task complete.` });
                return;
            }

            const { thought, toolCall } = nextStep;

            // --- Security Gate: Human-in-the-Loop ---
            if (PRIVILEGED_TOOLS.includes(toolCall.name)) {
                this.callbacks.onLog({
                    status: 'WARN',
                    message: `[Security] Tool '${toolCall.name}' is PRIVILEGED. Awaiting human approval...`
                });

                this.updateTask(task, {
                    status: 'AwaitingApproval',
                    pendingAction: { ...toolCall, requiresApproval: true } as any
                });

                return; // PAUSE THE LOOP
            }

            try {
                if (toolCall.name === 'create_and_delegate_task_to_new_agent') {
                    const { agent_name, agent_instructions, task_description, agent_icon } = toolCall.args as {
                        agent_name: string;
                        agent_instructions: string;
                        task_description: string;
                        agent_icon?: string;
                    };

                    const MAX_AGENT_DEPTH = 3;

                    if (currentDepth >= MAX_AGENT_DEPTH) {
                        observation = `Error: Maximum agent depth reached (${MAX_AGENT_DEPTH}). Cannot spawn further sub-agents.`;
                        this.callbacks.onLog({
                            status: 'WARN',
                            message: `[${task.agent.name}] Maximum recursion depth reached`
                        });
                    } else {
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

                        this.updateTask(task, { status: 'Delegating' });
                        this.tasks.push(newTask);
                        this.callbacks.onTasksUpdate([...this.tasks]);
                        this.callbacks.onLog({
                            status: 'INFO',
                            message: `[${task.agent.name}] 🚀 Spawning recursive sub-agent '${agent_name}' at depth ${currentDepth + 1}`
                        });
                        return; // PAUSE PARENT
                    }
                } else {
                    // Execute regular tool
                    const tool = (availableTools as Record<string, any>)[toolCall.name];
                    if (!tool) {
                        throw new Error(`Tool '${toolCall.name}' not found. Available tools: ${Object.keys(availableTools).join(', ')}`);
                    }
                    const result = await tool(toolCall.args);
                    observation = typeof result === 'string' ? result : JSON.stringify(result);
                }
            } catch (err: any) {
                observation = `Error executing tool '${toolCall.name}': ${err.message || 'Unknown error'}`;
                this.callbacks.onLog({
                    status: 'ERROR',
                    message: `[${task.agent.name}] Tool execution failed: ${observation}`
                });
            }

            subSteps.push({ thought, toolCall, observation });
            this.updateTask(task, { subSteps: [...subSteps] });
            
            // Reset observation for next iteration
            observation = '';
        }

        this.callbacks.onLog({
            status: 'WARN',
            message: `[${task.agent.name}] Maximum sub-steps reached (${MAX_SUB_STEPS})`
        });
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

    public stop() {
        this.isStopped = true;
    }

    public cancelTask(taskId: string) {
        this.tasks = this.tasks.map(t => t.id === taskId ? { ...t, status: 'Cancelled' } : t);
        this.callbacks.onTasksUpdate([...this.tasks]);
    }
}
