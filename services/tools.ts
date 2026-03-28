import { FunctionDeclaration, Type } from "@google/genai";
import { z } from 'zod';
import { ToolArguments } from '../types';
import { saveMemory, retrieveMemory, deleteMemory } from '../lib/firebase_manager';
import { getSensitiveItem } from '../lib/secureStorage';
import { executeCode as executeInSandbox, SandboxResult } from '../lib/codeSandbox';

// --- Validation Schemas ---

const GitHubRepoSchema = z.object({
    name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/),
    description: z.string().max(1000).optional(),
    is_private: z.boolean().default(false)
});

// SECURITY FIX: Proper URL validation - must be exactly github.com
const GitHubPrSchema = z.object({
    pr_url: z.string().url().refine(
        (url) => {
            try {
                const { hostname } = new URL(url);
                return hostname === 'github.com' || hostname === 'api.github.com';
            } catch { return false; }
        },
        { message: 'URL must be on github.com or api.github.com' }
    )
});

const GitHubCommentSchema = GitHubPrSchema.extend({
    comment: z.string().min(1).max(65536)
});

const GitHubMergeSchema = GitHubPrSchema.extend({
    method: z.enum(['merge', 'squash', 'rebase']).default('merge')
});

const GitHubCreateFileSchema = z.object({
    repo_name: z.string().min(1),
    path: z.string().min(1),
    content: z.string(),
    commit_message: z.string().min(1)
});

// SECURITY FIX: Use relative path - same origin, always correct
const BACKEND_URL = (import.meta as any).env?.VITE_CLOUD_ENGINE_URL || (import.meta as any).env?.VITE_BACKEND_URL || '/execute-tool';

// --- Helper Functions ---

/**
 * Get CSRF token from backend
 * SECURITY FIX: No silent bypass - throws on error
 */
const getCsrfToken = async (): Promise<string> => {
    const response = await fetch('/api/csrf-token', {
        method: 'GET',
        headers: { 'X-Session-ID': 'echomen-frontend' },
    });
    if (!response.ok) {
        throw new Error(`[ECHO] CSRF token request failed: HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data?.token) throw new Error('[ECHO] CSRF token missing from response');
    return data.token;
};

/**
 * A centralized function to securely call the ECHO Cloud Execution Engine.
 * SECURITY: Now includes CSRF token and API key authentication
 */
const callBackendTool = async <K extends keyof ToolArguments>(
    toolName: K,
    args: ToolArguments[K]
): Promise<unknown> => {
    try {
        if (!toolName) {
            throw new Error('Tool name is required');
        }
        console.log(`[ECHO Engine] Executing '${toolName}' via ${BACKEND_URL}`);

        // Get CSRF token for CSRF protection - will throw on error (no silent bypass)
        const csrfToken = await getCsrfToken();

        // Get API key from secure storage - NO hardcoded fallback
        const apiKey = (import.meta as any).env?.VITE_API_KEY ||
                      await getSensitiveItem('echo-api-key');

        if (!apiKey) {
            throw new Error('[ECHO Engine] API key not configured. Set VITE_API_KEY or configure in settings.');
        }

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
                'Authorization': `Bearer ${apiKey}`,
                'X-Session-ID': 'echomen-frontend'
            },
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
 * SECURITY FIX: 3-Tier Code Execution Sandbox
 * 
 * Tier 1 (Pure): Web Worker - auto-execute for math/data operations
 * Tier 2 (DOM): iframe sandbox - auto-execute for DOM manipulation
 * Tier 3 (Full): Backend execution - requires user confirmation
 * 
 * The AI can freely use Tier 1/2, but Tier 3 needs human approval
 */
export const executeCode = async (language: 'javascript', code: string): Promise<string> => {
    if (language !== 'javascript') {
        return 'Only JavaScript execution is supported';
    }
    
    try {
        // Execute with automatic tier selection
        const result: SandboxResult = await executeInSandbox(code);
        
        // Tier 3 requires user confirmation
        if (result.error === 'TIER_3_REQUIRES_APPROVAL') {
            return `[SECURITY] This code requires full execution (Tier 3) which needs user approval.\n\n` +
                   `The code contains potentially dangerous operations like:\n` +
                   `- File system access (fs module)\n` +
                   `- Network requests (fetch, XMLHttpRequest)\n` +
                   `- Child process execution\n` +
                   `- Node.js internals (require, process, Buffer)\n\n` +
                   `Please switch to YOLO mode or confirm execution in the backend.`;
        }
        
        if (result.success) {
            return result.output || 'Code executed successfully (no output)';
        } else {
            return `Error: ${result.error}`;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return `Error: ${errorMessage}`;
    }
};

/**
 * Standard tool implementations using the hardened backend bridge.
 */
export const readFile = (path: string) => callBackendTool('readFile', { path });
export const writeFile = (path: string, content: string) => callBackendTool('writeFile', { path, content });
export const listFiles = (path: string) => callBackendTool('listFiles', { path });
export const executeShellCommand = (command: string) => callBackendTool('executeShellCommand', { command });

// GitHub helper functions
export const githubCreateRepo = async (name: string, description: string | undefined, is_private: boolean) => {
    const validated = GitHubRepoSchema.parse({ name, description, is_private });
    return callBackendTool('github_create_repo', validated);
};

export const githubGetPrDetails = async (pr_url: string) => {
    const validated = GitHubPrSchema.parse({ pr_url });
    return callBackendTool('github_get_pr_details', validated);
};

export const githubPostPrComment = async (pr_url: string, comment: string) => {
    const validated = GitHubCommentSchema.parse({ pr_url, comment });
    return callBackendTool('github_post_pr_comment', validated);
};

export const githubMergePr = async (pr_url: string, method: 'merge' | 'squash' | 'rebase') => {
    const validated = GitHubMergeSchema.parse({ pr_url, method });
    return callBackendTool('github_merge_pr', validated);
};

export const githubCreateFileInRepo = async (repo_name: string, path: string, content: string, commit_message: string) => {
    const validated = GitHubCreateFileSchema.parse({ repo_name, path, content, commit_message });
    return callBackendTool('github_create_file_in_repo', validated);
};

// Data analysis helper functions
export const dataAnalyze = async (input_file_path: string, analysis_script: string) => {
    return callBackendTool('data_analyze', { input_file_path, analysis_script });
};

export const dataVisualize = async (input_file_path: string, visualization_script: string, output_image_path: string) => {
    return callBackendTool('data_visualize', { input_file_path, visualization_script, output_image_path });
};

export const availableTools = {
    readFile,
    writeFile,
    listFiles,
    executeShellCommand,
    githubCreateRepo,
    githubGetPrDetails,
    githubPostPrComment,
    githubMergePr,
    githubCreateFileInRepo,
    dataAnalyze,
    dataVisualize,
    executeCode,
    memory_save: saveMemory,
    memory_retrieve: retrieveMemory,
    memory_delete: deleteMemory
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
        description: 'Executes JavaScript code in a secure backend-sandboxed environment. Captures console output.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                language: { type: Type.STRING, description: 'The programming language (only "javascript" supported)' },
                code: { type: Type.STRING, description: 'The code to execute' }
            },
            required: ['language', 'code']
        }
    },
    {
        name: 'github_create_repo',
        description: 'Creates a new GitHub repository.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'Repository name' },
                description: { type: Type.STRING, description: 'Repository description' },
                is_private: { type: Type.BOOLEAN, description: 'Whether the repository should be private' }
            },
            required: ['name']
        }
    },
    {
        name: 'github_get_pr_details',
        description: 'Gets details about a GitHub pull request.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                pr_url: { type: Type.STRING, description: 'The URL of the pull request' }
            },
            required: ['pr_url']
        }
    },
    {
        name: 'github_post_pr_comment',
        description: 'Posts a comment on a GitHub pull request.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                pr_url: { type: Type.STRING, description: 'The URL of the pull request' },
                comment: { type: Type.STRING, description: 'The comment text' }
            },
            required: ['pr_url', 'comment']
        }
    },
    {
        name: 'github_merge_pr',
        description: 'Merges a GitHub pull request.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                pr_url: { type: Type.STRING, description: 'The URL of the pull request' },
                method: { type: Type.STRING, description: 'Merge method: merge, squash, or rebase' }
            },
            required: ['pr_url']
        }
    },
    {
        name: 'github_create_file_in_repo',
        description: 'Creates a file in a GitHub repository.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                repo_name: { type: Type.STRING, description: 'Repository name' },
                path: { type: Type.STRING, description: 'File path in the repository' },
                content: { type: Type.STRING, description: 'File content' },
                commit_message: { type: Type.STRING, description: 'Commit message' }
            },
            required: ['repo_name', 'path', 'content', 'commit_message']
        }
    },
    {
        name: 'data_analyze',
        description: 'Analyzes data from a file using a provided analysis script.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                input_file_path: { type: Type.STRING, description: 'Path to the data file' },
                analysis_script: { type: Type.STRING, description: 'JavaScript analysis script' }
            },
            required: ['input_file_path']
        }
    },
    {
        name: 'data_visualize',
        description: 'Creates a visualization from data in a file.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                input_file_path: { type: Type.STRING, description: 'Path to the data file' },
                visualization_script: { type: Type.STRING, description: 'Visualization script' },
                output_image_path: { type: Type.STRING, description: 'Output image path' }
            },
            required: ['input_file_path']
        }
    }
];
