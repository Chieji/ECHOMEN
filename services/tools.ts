import { FunctionDeclaration, Type } from "@google/genai";
import { Service, ToolArguments, ToolResult } from '../types';
import { getSecureItem, setSecureItem, isSecureContext } from '../lib/secureStorage';
import { saveMemory, retrieveMemory, deleteMemory } from '../lib/firebase_manager';

const BACKEND_URL = import.meta.env.VITE_CLOUD_ENGINE_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/execute-tool';

// --- Helper Functions ---

/**
 * A centralized function to securely call the ECHO Cloud Execution Engine.
 */
const callBackendTool = async <K extends keyof ToolArguments>(
    toolName: K, 
    args: ToolArguments[K]
): Promise<any> => {
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
 * Standard tool implementations using the hardened backend bridge.
 */
const readFile = (path: string) => callBackendTool('readFile', { path });
const writeFile = (path: string, content: string) => callBackendTool('writeFile', { path, content });
const listFiles = (path: string) => callBackendTool('listFiles', { path });
const executeShellCommand = (command: string) => callBackendTool('executeShellCommand', { command });
const executeCode = (language: 'javascript', code: string) => {
    // Client-side sandboxed execution (already implemented in your file)
    return Promise.resolve("Code execution logic here..."); 
};

// ... (GitHub and Memory helper functions would be typed here as well)

/**
 * Tool Declarations for the AI Brain.
 */
export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: 'readFile',
        description: 'Reads the content of a file from the local filesystem.',
        parameters: {
            type: Type.OBJECT, properties: { path: { type: Type.STRING } }, required: ['path']
        }
    },
    // ... (rest of tool declarations)
];

/**
 * Typed implementation map for the AgentExecutor.
 */
export const availableTools: { [K in keyof ToolArguments]: (args: ToolArguments[K]) => Promise<any> } = {
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
