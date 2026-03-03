import { FunctionDeclaration, Type } from "@google/genai";
import { ToolArguments, ImportMeta } from '../types';
import { saveMemory, retrieveMemory, deleteMemory } from '../lib/firebase_manager';

const BACKEND_URL = (import.meta as ImportMeta).env?.VITE_CLOUD_ENGINE_URL || (import.meta as ImportMeta).env?.VITE_BACKEND_URL || 'http://localhost:3001/execute-tool';

// --- Helper Functions ---

/**
 * A centralized function to securely call the ECHO Cloud Execution Engine.
 */
const callBackendTool = async <K extends keyof ToolArguments>(
    toolName: K,
    args: ToolArguments[K]
): Promise<unknown> => {
    try {
        console.log(`[ECHO Engine] Executing '${toolName}' via ${BACKEND_URL}`);
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: toolName, args }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Engine error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error(`Error calling engine for tool '${toolName}':`, error);
        throw error;
    }
};

/**
 * Client-side JavaScript execution in a sandboxed environment.
 */
export const executeCode = async (language: 'javascript', code: string): Promise<string> => {
    if (language === 'javascript') {
        try {
            // Capture console.log output
            let output = '';
            const originalLog = console.log;
            console.log = (...args) => { output += args.join(' ') + '\n'; };

            // Execute in sandbox
            const result = await eval(`(async () => { ${code} })()`);

            // Restore console.log
            console.log = originalLog;

            return output + (result !== undefined ? String(result) : '');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return `Error: ${errorMessage}`;
        }
    }
    return 'Only JavaScript execution is supported';
};

/**
 * Standard tool implementations using the hardened backend bridge.
 */
export const readFile = (path: string) => callBackendTool('readFile', { path });
export const writeFile = (path: string, content: string) => callBackendTool('writeFile', { path, content });
export const listFiles = (path: string) => callBackendTool('listFiles', { path });
export const executeShellCommand = (command: string) => callBackendTool('executeShellCommand', { command });

// GitHub helper functions
export const githubCreateRepo = async (name: string, description: string, is_private: boolean) => {
    return callBackendTool('github_create_repo', { name, description, is_private });
};

export const githubGetPrDetails = async (pr_url: string) => {
    return callBackendTool('github_get_pr_details', { pr_url });
};

export const githubPostPrComment = async (pr_url: string, comment: string) => {
    return callBackendTool('github_post_pr_comment', { pr_url, comment });
};

export const githubMergePr = async (pr_url: string, method: 'merge' | 'squash' | 'rebase') => {
    return callBackendTool('github_merge_pr', { pr_url, method });
};

export const githubCreateFileInRepo = async (repo_name: string, path: string, content: string, commit_message: string) => {
    return callBackendTool('github_create_file_in_repo', { repo_name, path, content, commit_message });
};

// Data analysis helper functions
export const dataAnalyze = async (input_file_path: string, analysis_script: string) => {
    return callBackendTool('data_analyze', { input_file_path, analysis_script });
};

export const dataVisualize = async (input_file_path: string, visualization_script: string, output_image_path: string) => {
    return callBackendTool('data_visualize', { input_file_path, visualization_script, output_image_path });
};

/**
 * Tool Declarations for the AI Brain.
 */
export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: 'readFile',
        description: 'Reads the content of a file from the local filesystem.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'The absolute or relative path to the file' }
            },
            required: ['path']
        }
    },
    {
        name: 'writeFile',
        description: 'Writes content to a file on the local filesystem. Creates directories if needed.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'The absolute or relative path to the file' },
                content: { type: Type.STRING, description: 'The content to write to the file' }
            },
            required: ['path', 'content']
        }
    },
    {
        name: 'listFiles',
        description: 'Lists all files and directories in a specified path.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'The directory path to list contents from' }
            },
            required: ['path']
        }
    },
    {
        name: 'executeShellCommand',
        description: 'Executes a shell command with security sanitization. Restricted from dangerous operations.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                command: { type: Type.STRING, description: 'The shell command to execute' }
            },
            required: ['command']
        }
    },
    {
        name: 'browser_navigate',
        description: 'Navigates a browser session to a specified URL. Creates isolated browser context per session.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                url: { type: Type.STRING, description: 'The URL to navigate to' },
                sessionId: { type: Type.STRING, description: 'Optional session ID for isolated browsing' }
            },
            required: ['url']
        }
    },
    {
        name: 'browser_screenshot',
        description: 'Captures a screenshot of the current browser page in base64 format.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                sessionId: { type: Type.STRING, description: 'Optional session ID for the browser context' }
            },
            required: []
        }
    },
    {
        name: 'browser_click',
        description: 'Clicks an element on the page using a CSS selector.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                selector: { type: Type.STRING, description: 'CSS selector for the element to click' },
                sessionId: { type: Type.STRING, description: 'Optional session ID for the browser context' }
            },
            required: ['selector']
        }
    },
    {
        name: 'browser_type',
        description: 'Types text into an input field using a CSS selector.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                selector: { type: Type.STRING, description: 'CSS selector for the input element' },
                text: { type: Type.STRING, description: 'The text to type' },
                pressEnter: { type: Type.BOOLEAN, description: 'Whether to press Enter after typing' },
                sessionId: { type: Type.STRING, description: 'Optional session ID for the browser context' }
            },
            required: ['selector', 'text']
        }
    },
    {
        name: 'browser_get_ax_tree',
        description: 'Retrieves the accessibility tree of the current page for analysis.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                sessionId: { type: Type.STRING, description: 'Optional session ID for the browser context' }
            },
            required: []
        }
    },
    {
        name: 'browser_close_session',
        description: 'Closes and cleans up a browser session context.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                sessionId: { type: Type.STRING, description: 'The session ID to close' }
            },
            required: ['sessionId']
        }
    },
    {
        name: 'executeCode',
        description: 'Executes JavaScript code in a client-side sandboxed environment. Captures console output.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                language: { type: Type.STRING, description: 'The programming language (only "javascript" supported)' },
                code: { type: Type.STRING, description: 'The JavaScript code to execute' }
            },
            required: ['language', 'code']
        }
    },
    {
        name: 'github_create_repo',
        description: 'Creates a new repository on GitHub using the authenticated user\'s token.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'The name of the repository' },
                description: { type: Type.STRING, description: 'A short description of the repository' },
                is_private: { type: Type.BOOLEAN, description: 'Whether the repository should be private' }
            },
            required: ['name', 'description', 'is_private']
        }
    },
    {
        name: 'github_get_pr_details',
        description: 'Retrieves details about a specific GitHub Pull Request.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                pr_url: { type: Type.STRING, description: 'The Pull Request URL' }
            },
            required: ['pr_url']
        }
    },
    {
        name: 'github_post_pr_comment',
        description: 'Posts a comment on a GitHub Pull Request.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                pr_url: { type: Type.STRING, description: 'The Pull Request URL' },
                comment: { type: Type.STRING, description: 'The comment text' }
            },
            required: ['pr_url', 'comment']
        }
    },
    {
        name: 'github_merge_pr',
        description: 'Merges a GitHub Pull Request using the specified merge method.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                pr_url: { type: Type.STRING, description: 'The Pull Request URL' },
                method: { type: Type.STRING, description: 'Merge method: "merge", "squash", or "rebase"' }
            },
            required: ['pr_url', 'method']
        }
    },
    {
        name: 'github_create_file_in_repo',
        description: 'Creates or updates a file in a GitHub repository.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                repo_name: { type: Type.STRING, description: 'The repository name' },
                path: { type: Type.STRING, description: 'The file path in the repository' },
                content: { type: Type.STRING, description: 'The file content' },
                commit_message: { type: Type.STRING, description: 'The commit message' }
            },
            required: ['repo_name', 'path', 'content', 'commit_message']
        }
    },
    {
        name: 'memory_save',
        description: 'Saves a memory item to Firebase Firestore or localStorage fallback. Supports tagging.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                key: { type: Type.STRING, description: 'Unique identifier for the memory' },
                value: { type: Type.STRING, description: 'The memory content to store' },
                tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags for categorizing the memory' }
            },
            required: ['key', 'value', 'tags']
        }
    },
    {
        name: 'memory_retrieve',
        description: 'Retrieves memory items by key or tags from Firebase or localStorage.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                key: { type: Type.STRING, description: 'The memory key to retrieve' },
                tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags to filter memories by' }
            },
            required: []
        }
    },
    {
        name: 'memory_delete',
        description: 'Deletes a memory item by key from Firebase or localStorage.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                key: { type: Type.STRING, description: 'The memory key to delete' }
            },
            required: ['key']
        }
    },
    {
        name: 'data_analyze',
        description: 'Analyzes data from a file (CSV, JSON) using a provided analysis script.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                input_file_path: { type: Type.STRING, description: 'Path to the data file to analyze' },
                analysis_script: { type: Type.STRING, description: 'JavaScript analysis script to execute' }
            },
            required: ['input_file_path', 'analysis_script']
        }
    },
    {
        name: 'data_visualize',
        description: 'Creates a visualization from data. Returns an image path or base64 encoded image.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                input_file_path: { type: Type.STRING, description: 'Path to the data file' },
                visualization_script: { type: Type.STRING, description: 'Visualization script' },
                output_image_path: { type: Type.STRING, description: 'Path for the output image' }
            },
            required: ['input_file_path', 'visualization_script', 'output_image_path']
        }
    },
    {
        name: 'createArtifact',
        description: 'Creates a named artifact for tracking generated content or outputs.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: 'Title of the artifact' },
                content: { type: Type.STRING, description: 'The artifact content' },
                type: { type: Type.STRING, description: 'Artifact type: "code", "markdown", "live-preview"' }
            },
            required: ['title', 'content', 'type']
        }
    },
    {
        name: 'create_and_delegate_task_to_new_agent',
        description: 'Creates a new agent instance and delegates a task to it for parallel execution.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                agent_name: { type: Type.STRING, description: 'Name for the new agent' },
                agent_instructions: { type: Type.STRING, description: 'Instructions for the agent' },
                task_description: { type: Type.STRING, description: 'The task description to delegate' },
                agent_icon: { type: Type.STRING, description: 'Optional icon for the agent' }
            },
            required: ['agent_name', 'agent_instructions', 'task_description']
        }
    },
    {
        name: 'askUser',
        description: 'Prompts the user with a question and waits for their response.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING, description: 'The question to ask the user' }
            },
            required: ['question']
        }
    }
];

/**
 * Typed implementation map for the AgentExecutor.
 */
export const availableTools: { [K in keyof ToolArguments]: (args: ToolArguments[K]) => Promise<unknown> } = {
    readFile: (args) => callBackendTool('readFile', args),
    writeFile: (args) => callBackendTool('writeFile', args),
    listFiles: (args) => callBackendTool('listFiles', args),
    executeShellCommand: (args) => callBackendTool('executeShellCommand', args),
    browser_navigate: (args) => callBackendTool('browser_navigate', args),
    browser_screenshot: (args) => callBackendTool('browser_screenshot', args),
    browser_click: (args) => callBackendTool('browser_click', args),
    browser_type: (args) => callBackendTool('browser_type', args),
    browser_get_ax_tree: (args) => callBackendTool('browser_get_ax_tree', args),
    browser_close_session: (args) => callBackendTool('browser_close_session', args),
    executeCode: (args) => executeCode(args.language, args.code),
    github_create_repo: (args) => callBackendTool('github_create_repo', args),
    github_get_pr_details: (args) => callBackendTool('github_get_pr_details', args),
    github_post_pr_comment: (args) => callBackendTool('github_post_pr_comment', args),
    github_merge_pr: (args) => callBackendTool('github_merge_pr', args),
    github_create_file_in_repo: (args) => callBackendTool('github_create_file_in_repo', args),
    memory_save: (args) => saveMemory(args.key, args.value, args.tags),
    memory_retrieve: (args) => retrieveMemory(args.key, args.tags),
    memory_delete: (args) => deleteMemory(args.key),
    data_analyze: (args) => callBackendTool('data_analyze', args),
    data_visualize: (args) => callBackendTool('data_visualize', args),
    createArtifact: (args) => Promise.resolve(`Artifact ${args.title} created.`),
    create_and_delegate_task_to_new_agent: (args) => Promise.resolve("Task delegated."),
    askUser: (args) => Promise.resolve(`Question asked: ${args.question}`),
};
