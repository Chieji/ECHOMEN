import { GoogleGenAI, FunctionDeclaration, Type, Chat } from "@google/genai";
import type { Task, AgentRole, ToolCall, AgentPreferences, TodoItem, SubStep, Playbook } from '../types';
import { availableTools, toolDeclarations } from './tools';

const structuredPlanSchema = {
    type: Type.ARRAY,
    description: "An array of task objects that represent the plan.",
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "A short, descriptive title for the task." },
            details: { type: Type.STRING, description: "A detailed description of what this task entails." },
            agentRole: { 
                type: Type.STRING, 
                description: "The role of the agent best suited for this task.",
                enum: ['Planner', 'Executor', 'Reviewer', 'Synthesizer']
            },
        },
        required: ["title", "details", "agentRole"]
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chat: Chat | null = null;

export const clarifyAndCorrectPrompt = async (prompt: string): Promise<string> => {
    const systemInstruction = `You are an AI assistant that refines user prompts. Your goal is to correct any spelling or grammar mistakes, clarify ambiguities, and rephrase the prompt into a clear, actionable command for another AI agent. Do not add any conversational fluff. Only return the refined prompt. If the prompt is already clear and well-defined, return it as-is.

Example 1:
User: "checj my pakage.json file and tell me whats the name"
Assistant: "Check my package.json file and tell me the project name."

Example 2:
User: "make a new react component called header"
Assistant: "Create a new React component named 'Header'. It should have a default export and a basic JSX structure."
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.2, // Be conservative with changes
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error clarifying prompt:", error);
        return prompt; // Return original prompt on error
    }
};

const getAgentNameForRole = (role: AgentRole, preferences: AgentPreferences): string => {
    if (preferences[role]) {
        return preferences[role];
    }

    switch(role) {
        case 'Planner': return 'Gemini Advanced';
        case 'Executor': return 'God Mode';
        case 'Reviewer': return 'Claude Sonnet';
        case 'Synthesizer': return 'Gemini 2.5 Flash';
        default: return 'Gemini 2.5 Flash';
    }
}

const findRelevantPlaybook = async (prompt: string, playbooks: Playbook[]): Promise<Playbook | null> => {
    if (playbooks.length === 0) return null;

    const playbookDescriptions = playbooks.map(p => `ID: ${p.id}, Description: ${p.triggerPrompt}`).join('\n');
    
    const recallPrompt = `
User Prompt: "${prompt}"

Based on the user's prompt, which of the following saved playbooks is the most relevant?
A good match means the playbook's description is very similar in intent to the user's prompt.
If you find a strong match, respond with ONLY the ID of that playbook.
If none are a good match, respond with "NONE".

Available Playbooks:
${playbookDescriptions}
`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: recallPrompt,
        });

        const bestId = response.text.trim();
        if (bestId && bestId !== 'NONE') {
            return playbooks.find(p => p.id === bestId) || null;
        }
    } catch (error) {
        console.error("Error finding relevant playbook:", error);
    }
    
    return null;
}

const rehydrateTasksFromPlaybook = (playbook: Playbook, preferences: AgentPreferences): Task[] => {
    let lastTaskId: string | null = null;
    return playbook.tasks.map((taskTemplate, index) => {
        const taskId = `playbook-${playbook.id}-${Date.now()}-${index}`;
        const task: Task = {
            ...taskTemplate,
            id: taskId,
            status: 'Queued',
            agent: { ...taskTemplate.agent, name: getAgentNameForRole(taskTemplate.agent.role, preferences) },
            dependencies: lastTaskId ? [lastTaskId] : [],
            logs: [],
            reviewHistory: [],
            retryCount: 0,
            maxRetries: 3,
            subSteps: [],
        };
        lastTaskId = taskId;
        return task;
    });
};

export const createInitialPlan = async (prompt: string): Promise<Task[]> => {
    let agentPreferences: AgentPreferences = {};
    let activeTodos: TodoItem[] = [];
    let playbooks: Playbook[] = [];

    try {
        const savedPrefsJSON = localStorage.getItem('echo-agent-preferences');
        if (savedPrefsJSON) agentPreferences = JSON.parse(savedPrefsJSON);
        
        const savedTodosJSON = localStorage.getItem('echo-todo-list');
        if (savedTodosJSON) {
            const allTodos: TodoItem[] = JSON.parse(savedTodosJSON);
            activeTodos = allTodos.filter(todo => !todo.isCompleted);
        }

        const savedPlaybooksJSON = localStorage.getItem('echo-playbooks');
        if (savedPlaybooksJSON) playbooks = JSON.parse(savedPlaybooksJSON);

    } catch (error) {
        console.error("Failed to parse data from localStorage", error);
    }

    const relevantPlaybook = await findRelevantPlaybook(prompt, playbooks);
    if (relevantPlaybook) {
        console.log(`Found relevant playbook: ${relevantPlaybook.name}`);
        return rehydrateTasksFromPlaybook(relevantPlaybook, agentPreferences);
    }
    
    let systemInstruction = "You are a world-class autonomous agent planner. Your job is to receive a user request and break it down into a sequence of logical tasks. A typical sequence is: 1. Planner (for outlining/structuring), 2. Executor (for performing the work), 3. Reviewer (for checking quality), and 4. Synthesizer (for final assembly). Keep tasks high-level. The Executor agent will handle the detailed, step-by-step tool usage. Respond with a JSON array of tasks that adheres to the provided schema.";

    if (activeTodos.length > 0) {
        const todoList = activeTodos.map(todo => `- ${todo.text}`).join('\n');
        const todoContext = `\n\nHigh-Priority To-Do List (consider these for context):\n${todoList}`;
        systemInstruction = todoContext + '\n\n' + systemInstruction;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: structuredPlanSchema,
                systemInstruction: systemInstruction,
            },
        });

        const textResponse = response.text;
        if (!textResponse || !textResponse.trim()) {
            throw new Error("The AI planner returned an empty response.");
        }

        const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("Planner response did not contain a recognizable JSON array.");
        }
        const jsonString = jsonMatch[0];
        const parsedPlan = JSON.parse(jsonString);

        if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
            let lastTaskId: string | null = null;
            const newTasks: Task[] = parsedPlan.map((p: any, index: number) => {
                const taskId = `task-gen-${Date.now()}-${index}`;
                const agentRole: AgentRole = p.agentRole || 'Executor';
                const task: Task = {
                    id: taskId,
                    title: p.title || "Untitled Task",
                    status: "Queued",
                    agent: { role: agentRole, name: getAgentNameForRole(agentRole, agentPreferences) },
                    estimatedTime: "~45s",
                    details: p.details || "No details provided.",
                    dependencies: lastTaskId ? [lastTaskId] : [],
                    logs: [],
                    reviewHistory: [],
                    retryCount: 0,
                    maxRetries: 3,
                    subSteps: [],
                };
                lastTaskId = taskId;
                return task;
            });
            // First task should have no dependencies and start immediately
            if(newTasks.length > 0) {
                newTasks[0].dependencies = [];
            }
            return newTasks;
        }

        throw new Error("The AI planner failed to generate a valid plan.");

    } catch (error) {
        console.error("Error in createInitialPlan:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during planning.";
        throw new Error(`Failed to generate a task plan. Reason: ${errorMessage}`);
    }
};


export const determineNextStep = async (task: Task, subSteps: SubStep[]): Promise<{ thought: string; toolCall: ToolCall } | { isFinished: true; finalThought: string }> => {
    const history = subSteps.map(step => 
        `Thought: ${step.thought}\nAction: ${JSON.stringify(step.toolCall)}\nObservation: ${step.observation}`
    ).join('\n\n');

    const prompt = `
You are an autonomous agent executing a task.
Your high-level objective is: "${task.title} - ${task.details}"

You have access to the following tools: ${toolDeclarations.map(t => t.name).join(', ')}.

Based on the history of your previous actions and observations, decide on the very next step. 
You must think step-by-step and then choose one single tool to use.
When you have a final result, like a block of code or a document, use the 'createArtifact' tool to save it.
Do not guess or assume information; use tools like 'listFiles' or 'readFile' to get the facts.
If you believe the high-level objective is complete, respond with a JSON object: {"isFinished": true, "finalThought": "your concluding thoughts"}.
Otherwise, respond with a JSON object: {"thought": "your reasoning", "toolCall": {"name": "tool_name", "args": {...}}}.

Execution History:
${history || "No actions taken yet."}

What is your next action?
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            systemInstruction: "You are a methodical AI agent executor. Follow the ReAct (Reason-Act) pattern. Your response must be a single, valid JSON object representing your next thought and action, or a finalization signal.",
        },
    });

    try {
        const resultJson = response.text.trim();
        const result = JSON.parse(resultJson);
        if (result.isFinished) {
            return { isFinished: true, finalThought: result.finalThought };
        }
        if (result.thought && result.toolCall && result.toolCall.name && result.toolCall.args) {
            return { thought: result.thought, toolCall: result.toolCall };
        }
        throw new Error("Invalid JSON response from agent brain.");
    } catch (e) {
        console.error("Failed to parse agent's next step:", response.text, e);
        // Fallback or error handling action
        return {
            thought: "I seem to be confused about the next step. I will ask for clarification.",
            toolCall: { name: 'askUser', args: { question: 'I am unable to determine the next step. Can you clarify what I should do?' } }
        };
    }
};

export const getChatResponse = async (prompt: string): Promise<string> => {
    if (!chat) {
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are ECHO, a helpful AI assistant. You are direct, efficient, and concise in your responses.',
            },
        });
    }
    try {
        const response = await chat.sendMessage({ message: prompt });
        return response.text;
    } catch (error) {
        console.error("Error getting chat response:", error);
        if (error instanceof Error) {
            return `Sorry, I encountered an error: ${error.message}`;
        }
        return "Sorry, I encountered an unknown error. Please try again.";
    }
};


export const summarizePlanIntoPlaybook = async (prompt: string, tasks: Task[]): Promise<Playbook> => {
    const taskSummary = tasks.map((t, i) => `${i + 1}. [${t.agent.role}] ${t.title}`).join('\n');
    
    const summarizationPrompt = `
Original User Prompt: "${prompt}"

Successful Task Plan:
${taskSummary}

Based on the original prompt and the successful plan, create a short, descriptive, and memorable name for this entire procedure. For example, "Deploy React App to Vercel" or "Analyze Quarterly Sales Data". Respond with ONLY the name.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: summarizationPrompt,
        });

        const playbookName = response.text.trim().replace(/"/g, ''); // Clean up quotes

        const taskTemplates = tasks.map(({ id, status, dependencies, logs, reviewHistory, retryCount, maxRetries, subSteps, ...rest }) => rest);

        return {
            id: `playbook-${Date.now()}`,
            name: playbookName,
            triggerPrompt: prompt,
            tasks: taskTemplates,
            createdAt: new Date().toISOString(),
        };

    } catch (error) {
        console.error("Error summarizing plan:", error);
        throw new Error("Could not synthesize playbook from the completed plan.");
    }
};