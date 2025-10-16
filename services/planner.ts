import { GoogleGenAI, FunctionDeclaration, Type, Chat, GenerateContentResponse } from "@google/genai";
import type { Task, AgentRole, ToolCall, AgentPreferences, TodoItem, SubStep, Playbook, CustomAgent, Artifact } from '../types';
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

const actionAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        is_actionable: { 
            type: Type.BOOLEAN, 
            description: "True if the user's message is a command or request to perform a task, false otherwise." 
        },
        suggested_prompt: { 
            type: Type.STRING, 
            description: "If actionable, a refined and clear version of the user's command. Otherwise, an empty string." 
        }
    },
    required: ["is_actionable", "suggested_prompt"]
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chat: Chat | null = null;

const WELCOME_TRIGGERS = ['what can you do', 'help', 'explain yourself', 'what is this', 'hello', 'hi', 'what are you', 'who are you'];

const ECHO_EXPLANATION = `Hello! I am **ECHO**, an autonomous AI agent. My core philosophy is **Action over Conversation**. I'm designed to turn your thoughts into executed reality.

Here's a breakdown of what I can do:

### Modes of Operation
You can switch between two modes using the controls at the bottom:

**1. 💬 Chat Mode (Current Mode)**
*   This is our direct line. You can ask me questions, brainstorm ideas, get complex topics explained, or even get help debugging code.
*   **No actions are taken here.** It's a safe space for conversation and information gathering.

**2. ⚡ Action Mode**
*   This is where the magic happens. You give me a high-level goal, and I execute it.
*   **How it works:**
    *   **You:** "Build a simple React component for a user profile card."
    *   **Planner Agent:** I'll break that down into a logical task pipeline (e.g., \`Create file\`, \`Write component code\`, \`Create CSS file\`, \`Add styles\`). You'll see this pipeline appear on your screen.
    *   **Executor Agent:** My \`God Mode\` agent executes each task, using tools like a file system and shell commands. You can watch its every thought and action in the **Live Terminal**.
    *   **Artifacts:** The final output (like the code for your component) will appear in the **Artifacts panel** (viewable via the archive icon in the header).

### 🧠 The Agent System
ECHO is not a single AI; it's an orchestrator of specialized agents.
*   In the **Settings Panel** (gear icon), you can manage my core agents (\`WebHawk\` for web research, \`CodeForge\` for coding) and even **create your own custom agents** with specific instructions and personalities!
*   You can also assign preferred agents to core roles like Planning and Execution.

### 📚 Learning with Playbooks
I am designed to learn.
*   After a successful task in Action Mode, my **Synthesizer** agent analyzes the plan and saves it as a **"Playbook"**.
*   The next time you ask for a similar task, I can use that playbook to execute it faster and more reliably. You can view and manage learned playbooks in the Settings Panel.

---

My goal is to be your ultimate tool for creation and execution. Give it a try! Switch to **Action Mode** and tell me to \`list all files in the current directory\`.

Your thoughts. My echo. Infinite possibility.`;

const handleApiResponse = (response: GenerateContentResponse, onTokenUpdate: (count: number) => void): string => {
    if (response.usageMetadata?.totalTokenCount) {
        onTokenUpdate(response.usageMetadata.totalTokenCount);
    }
    return response.text;
}

export const analyzeChatMessageForAction = async (prompt: string, onTokenUpdate: (count: number) => void): Promise<{ is_actionable: boolean; suggested_prompt: string }> => {
    const systemInstruction = `You are an intent-recognition AI. Your task is to analyze a user's chat message and determine if it contains an actionable command (e.g., "build this", "create a file", "run this command", "can you write a script for...") versus a conversational query (e.g., "how does this work?", "what is...", "explain...").
- If it's an actionable command, set 'is_actionable' to true and rephrase the command into a clear, concise prompt for another AI agent.
- If it's conversational, set 'is_actionable' to false.
Your response MUST be a valid JSON object adhering to the provided schema.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: actionAnalysisSchema,
                systemInstruction: systemInstruction,
            },
        });
        const resultJson = handleApiResponse(response, onTokenUpdate).trim();
        const result = JSON.parse(resultJson);
        return result;
    } catch (error) {
        console.error("Error analyzing chat message for action:", error);
        return { is_actionable: false, suggested_prompt: '' }; // Default to non-actionable on error
    }
};

export const clarifyAndCorrectPrompt = async (prompt: string, onTokenUpdate: (count: number) => void): Promise<string> => {
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
        return handleApiResponse(response, onTokenUpdate).trim();
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

const findRelevantPlaybook = async (prompt: string, playbooks: Playbook[], onTokenUpdate: (count: number) => void): Promise<Playbook | null> => {
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

        const bestId = handleApiResponse(response, onTokenUpdate).trim();
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

interface ExecutionContext {
    connectedServices: string[];
    playbooks: Playbook[];
    customAgents: CustomAgent[];
    activeTodos: TodoItem[];
}

export const createInitialPlan = async (
    prompt: string,
    isWebToolActive: boolean,
    context: ExecutionContext,
    onTokenUpdate: (count: number) => void
): Promise<Task[]> => {
    let agentPreferences: AgentPreferences = {};

    try {
        const savedPrefsJSON = localStorage.getItem('echo-agent-preferences');
        if (savedPrefsJSON) agentPreferences = JSON.parse(savedPrefsJSON);
    } catch (error) {
        console.error("Failed to parse agent preferences from localStorage", error);
    }

    if (!isWebToolActive) {
        const relevantPlaybook = await findRelevantPlaybook(prompt, context.playbooks, onTokenUpdate);
        if (relevantPlaybook) {
            console.log(`Found relevant playbook: ${relevantPlaybook.name}`);
            return rehydrateTasksFromPlaybook(relevantPlaybook, agentPreferences);
        }
    }
    
    let systemInstruction = "You are a world-class autonomous agent planner. Your job is to receive a user request and break it down into a sequence of logical tasks. A typical sequence is: 1. Planner (for outlining/structuring), 2. Executor (for performing the work), 3. Reviewer (for checking quality), and 4. Synthesizer (for final assembly). Keep tasks high-level. The Executor agent will handle the detailed, step-by-step tool usage. Respond with a JSON array of tasks that adheres to the provided schema.";
    
    let contextPreamble = `
[SYSTEM CONTEXT]
- Connected Services: ${context.connectedServices.length > 0 ? context.connectedServices.join(', ') : 'None'}
- Available Custom Agents: ${context.customAgents.length > 0 ? context.customAgents.map(a => a.name).join(', ') : 'None'}
- Learned Playbooks: ${context.playbooks.length}
- High-Priority To-Dos: ${context.activeTodos.length > 0 ? context.activeTodos.map(t => t.text).join('; ') : 'None'}
This context is for your awareness. Use it to create a more effective and informed plan.
`;

    systemInstruction = contextPreamble + "\n---\n" + systemInstruction;

    if (isWebToolActive) {
        const webPreamble = "CRITICAL: The user has activated the Web Tool. The request is web-focused. You MUST prioritize using the `browse_web` tool. The primary agent for the execution task should be `WebHawk`.";
        systemInstruction = `${webPreamble}\n\n${systemInstruction}`;
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
        
        const textResponse = handleApiResponse(response, onTokenUpdate);

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
                let agentRole: AgentRole = p.agentRole || 'Executor';
                let agentName = getAgentNameForRole(agentRole, agentPreferences);
                
                if (isWebToolActive && agentRole === 'Executor') {
                    agentName = 'WebHawk';
                }

                const task: Task = {
                    id: taskId,
                    title: p.title || "Untitled Task",
                    status: "Queued",
                    agent: { role: agentRole, name: agentName },
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


export const determineNextStep = async (task: Task, subSteps: SubStep[], currentArtifacts: Artifact[], onTokenUpdate: (count: number) => void): Promise<{ thought: string; toolCall: ToolCall } | { isFinished: true; finalThought: string }> => {
    const history = subSteps.map(step => 
        `Thought: ${step.thought}\nAction: ${JSON.stringify(step.toolCall)}\nObservation: ${step.observation}`
    ).join('\n\n');
    
    const artifactList = currentArtifacts.map(a => `- ${a.title} (${a.type})`).join('\n');

    const prompt = `
You are an autonomous agent executing a task.
Your high-level objective is: "${task.title} - ${task.details}"

You have access to the following tools: ${toolDeclarations.map(t => t.name).join(', ')}.

[CURRENT CONTEXT]
- Artifacts created so far:
${artifactList.length > 0 ? artifactList : "None"}

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
    
    const resultJson = handleApiResponse(response, onTokenUpdate).trim();

    try {
        const result = JSON.parse(resultJson);
        if (result.isFinished) {
            return { isFinished: true, finalThought: result.finalThought };
        }
        if (result.thought && result.toolCall && result.toolCall.name && result.toolCall.args) {
            return { thought: result.thought, toolCall: result.toolCall };
        }
        throw new Error("Invalid JSON response from agent brain.");
    } catch (e) {
        console.error("Failed to parse agent's next step:", resultJson, e);
        // Fallback or error handling action
        return {
            thought: "I seem to be confused about the next step. I will ask for clarification.",
            toolCall: { name: 'askUser', args: { question: 'I am unable to determine the next step. Can you clarify what I should do?' } }
        };
    }
};

export const getChatResponse = async (prompt: string, onTokenUpdate: (count: number) => void): Promise<string> => {
    // Check for welcome triggers
    const lowerCasePrompt = prompt.toLowerCase().trim().replace(/[.,?_]/g, "");
    if (WELCOME_TRIGGERS.some(trigger => lowerCasePrompt.includes(trigger))) {
        return ECHO_EXPLANATION;
    }

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
        return handleApiResponse(response, onTokenUpdate);
    } catch (error) {
        console.error("Error getting chat response:", error);
        if (error instanceof Error) {
            return `Sorry, I encountered an error: ${error.message}`;
        }
        return "Sorry, I encountered an unknown error. Please try again.";
    }
};


export const suggestPlaybookName = async (prompt: string, tasks: Task[], onTokenUpdate: (count: number) => void): Promise<string> => {
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

        return handleApiResponse(response, onTokenUpdate).trim().replace(/"/g, '');
    } catch (error) {
        console.error("Error suggesting playbook name:", error);
        throw new Error("Could not suggest a name for the completed plan.");
    }
};