import { FunctionDeclaration, Type } from "@google/genai";
import { Service } from '../types';

const BACKEND_URL = 'http://localhost:3001/execute-tool';

// --- Helper Functions ---

/**
 * A centralized function to securely call the backend execution engine.
 * @param toolName The name of the tool to execute.
 * @param args The arguments for the tool.
 * @returns The result from the backend.
 * @throws An error if the backend call fails.
 */
const callBackendTool = async (toolName: string, args: object): Promise<any> => {
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tool: toolName, args }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Backend error: ${response.statusText}`);
        }

        const result = await response.json();
        return result.result;
    } catch (error) {
        console.error(`Error calling backend for tool '${toolName}':`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to execute '${toolName}': ${error.message}. Is the ECHO Execution Engine running?`);
        }
        throw new Error(`An unknown error occurred while executing '${toolName}'.`);
    }
};


const checkAuth = (serviceId: string): boolean => {
    try {
        const savedServicesJSON = localStorage.getItem('echo-services');
        if (savedServicesJSON) {
            const services: Partial<Service>[] = JSON.parse(savedServicesJSON);
            const service = services.find(s => s.id === serviceId);
            return service?.status === 'Connected';
        }
    } catch (e) {
        console.error("Could not check auth status", e);
    }
    return false;
}


// --- Tool Implementations ---

const readFile = async (path: string): Promise<string> => {
    return callBackendTool('readFile', { path });
};

const writeFile = async (path: string, content: string): Promise<string> => {
    return callBackendTool('writeFile', { path, content });
};

const listFiles = async (path: string): Promise<string[]> => {
    return callBackendTool('listFiles', { path });
};

const executeShellCommand = async (command: string): Promise<string> => {
    return callBackendTool('executeShellCommand', { command });
};

const executeCode = async (language: 'javascript', code: string): Promise<string> => {
    if (language !== 'javascript') {
        return Promise.reject(new Error(`Unsupported language: ${language}. Only 'javascript' is available in the browser sandbox. For other languages, write to a file and use 'executeShellCommand'.`));
    }

    // This tool remains client-side as it's for sandboxed web snippets.
    return new Promise((resolve, reject) => {
        const workerCode = `
            self.onmessage = function(e) {
                try {
                    const result = eval(e.data);
                    self.postMessage({ success: true, result: result });
                } catch (error) {
                    self.postMessage({ success: false, error: error.message });
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));

        const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error('Code execution timed out after 5 seconds.'));
        }, 5000);

        worker.onmessage = (e) => {
            clearTimeout(timeout);
            worker.terminate();
            if (e.data.success) {
                resolve(JSON.stringify(e.data.result, null, 2) || 'undefined');
            } else {
                reject(new Error(e.data.error));
            }
        };

        worker.onerror = (e) => {
            clearTimeout(timeout);
            worker.terminate();
            reject(new Error(e.message));
        };

        worker.postMessage(code);
    });
};

// --- GitHub Tools ---

const github_create_repo = async (name: string, description: string, is_private: boolean): Promise<any> => {
    if (!checkAuth('github')) throw new Error("GitHub service not connected.");
    return callBackendTool('github_create_repo', { name, description, is_private });
};

const github_get_pr_details = async (pr_url: string): Promise<any> => {
    if (!checkAuth('github')) throw new Error("GitHub service not connected.");
    return callBackendTool('github_get_pr_details', { pr_url });
};

const github_post_pr_comment = async (pr_url: string, comment: string): Promise<any> => {
    if (!checkAuth('github')) throw new Error("GitHub service not connected.");
    return callBackendTool('github_post_pr_comment', { pr_url, comment });
};

const github_merge_pr = async (pr_url: string, method: 'merge' | 'squash' | 'rebase'): Promise<any> => {
    if (!checkAuth('github')) throw new Error("GitHub service not connected.");
    return callBackendTool('github_merge_pr', { pr_url, method });
};

const github_create_file_in_repo = async (repo_name: string, path: string, content: string, commit_message: string): Promise<any> => {
    if (!checkAuth('github')) throw new Error("GitHub service not connected.");
    return callBackendTool('github_create_file_in_repo', { repo_name, path, content, commit_message });
};


const askUser = async (question: string): Promise<string> => {
    return new Promise((resolve) => {
        const answer = window.prompt(question);
        resolve(answer || "User provided no input.");
    });
};

// This is a placeholder. The actual logic is handled by the AgentExecutor.
const createArtifact = async (title: string, type: 'code' | 'markdown' | 'live-preview', content: string): Promise<string> => {
    return `Artifact "${title}" has been marked for creation.`;
};

// This is a placeholder. The actual logic is handled by the AgentExecutor.
const create_and_delegate_task_to_new_agent = async (agent_name: string, agent_instructions: string, task_description: string, agent_icon: string): Promise<string> => {
    return `Signal received to create agent "${agent_name}" and delegate task: "${task_description}". The executor will handle this process.`;
};


// --- Tool Definitions and Declarations ---

export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: 'readFile',
        description: 'Reads the entire content of a specified file from the real file system via the ECHO Execution Engine.',
        parameters: {
            type: Type.OBJECT, properties: { 
                path: { type: Type.STRING, description: 'The full path to the file (e.g., "./src/index.js").' } 
            }, required: ['path']
        }
    },
    {
        name: 'writeFile',
        description: 'Writes or overwrites content to a file on the real file system. If the file or its parent directories do not exist, they will be created.',
        parameters: {
            type: Type.OBJECT, properties: {
                path: { type: Type.STRING, description: 'The path for the file to be written (e.g., "./components/NewComponent.js").' },
                content: { type: Type.STRING, description: 'The complete content to write to the file.' }
            }, required: ['path', 'content']
        }
    },
    {
        name: 'listFiles',
        description: 'Lists all files and subdirectories directly within a given directory path on the real file system.',
        parameters: {
            type: Type.OBJECT, properties: { 
                path: { type: Type.STRING, description: 'The directory path to inspect (e.g., "./src" or "." for the root).' } 
            }, required: ['path']
        }
    },
    {
        name: 'executeShellCommand',
        description: 'Executes a command in a real shell environment. This is a powerful tool for using system commands, developer tools, and scripts. Examples: `npm install`, `git clone <url>`, `docker build -t my-app .`, `python my_script.py`. Requires the ECHO Execution Engine to be running.',
        parameters: {
            type: Type.OBJECT, properties: { 
                command: { type: Type.STRING, description: 'The shell command to execute.' } 
            }, required: ['command']
        }
    },
    {
        name: 'github_create_repo',
        description: 'Creates a new repository on GitHub. Requires GitHub service connection.',
        parameters: {
            type: Type.OBJECT, properties: {
                name: { type: Type.STRING, description: 'The name of the repository.' },
                description: { type: Type.STRING, description: 'A short description for the repository.' },
                is_private: { type: Type.BOOLEAN, description: 'Whether the repository should be private.' }
            }, required: ['name', 'description', 'is_private']
        }
    },
    {
        name: 'github_get_pr_details',
        description: 'Fetches details for a GitHub Pull Request, including title, description, and changed files. Requires GitHub service connection.',
        parameters: {
            type: Type.OBJECT, properties: {
                pr_url: { type: Type.STRING, description: 'The full URL of the pull request.' }
            }, required: ['pr_url']
        }
    },
    {
        name: 'github_post_pr_comment',
        description: 'Posts a comment on a GitHub Pull Request. Requires GitHub service connection.',
        parameters: {
            type: Type.OBJECT, properties: {
                pr_url: { type: Type.STRING, description: 'The full URL of the pull request.' },
                comment: { type: Type.STRING, description: 'The content of the comment to post.' }
            }, required: ['pr_url', 'comment']
        }
    },
    {
        name: 'github_merge_pr',
        description: 'Merges a GitHub Pull Request. Requires GitHub service connection.',
        parameters: {
            type: Type.OBJECT, properties: {
                pr_url: { type: Type.STRING, description: 'The full URL of the pull request to merge.' },
                method: { type: Type.STRING, enum: ['merge', 'squash', 'rebase'], description: 'The merge method to use.' }
            }, required: ['pr_url', 'method']
        }
    },
    {
        name: 'github_create_file_in_repo',
        description: 'Creates or updates a file directly in a GitHub repository. Requires GitHub service connection.',
        parameters: {
            type: Type.OBJECT, properties: {
                repo_name: { type: Type.STRING, description: 'The name of the repository in "owner/repo" format.' },
                path: { type: Type.STRING, description: 'The full path of the file within the repository.' },
                content: { type: Type.STRING, description: 'The content of the file.' },
                commit_message: { type: Type.STRING, description: 'The commit message for the file creation/update.' }
            }, required: ['repo_name', 'path', 'content', 'commit_message']
        }
    },
    {
        name: 'create_and_delegate_task_to_new_agent',
        description: 'A meta-tool for agent proliferation. When a task is too complex or requires a specialist, use this to create a new, temporary agent with specific instructions and delegate a sub-task to it. The current task will pause until the new agent completes its work.',
        parameters: {
            type: Type.OBJECT, properties: {
                agent_name: { type: Type.STRING, description: 'A descriptive name for the new specialist agent (e.g., "DB Schema Designer").' },
                agent_instructions: { type: Type.STRING, description: 'The full system prompt or instructions for the new agent, defining its role, capabilities, and constraints.' },
                task_description: { type: Type.STRING, description: 'The specific, detailed task to be delegated to this new agent.' },
                agent_icon: { type: Type.STRING, description: 'Optional. An icon name from the predefined list (e.g., "CodeForge", "Brain") for the agent\'s UI representation.' },
            }, required: ['agent_name', 'agent_instructions', 'task_description']
        }
    },
    {
        name: 'createArtifact',
        description: 'Creates a final output artifact to be displayed to the user. Use this when you have generated a complete piece of code, a document, or other final result.',
        parameters: {
            type: Type.OBJECT, properties: {
                title: { type: Type.STRING, description: 'A short, descriptive title for the artifact (e.g., "React Button Component").' },
                type: { type: Type.STRING, description: 'The type of artifact.', enum: ['code', 'markdown', 'live-preview'] },
                content: { type: Type.STRING, description: 'The full content of the artifact. For `live-preview`, this should be a JSON string containing both the source code and the execution result.' }
            }, required: ['title', 'type', 'content']
        }
    },
    {
        name: 'askUser',
        description: 'Asks the user a clarifying question when you are stuck or need more information to proceed with the task. The user\'s response will be returned as the observation.',
        parameters: {
            type: Type.OBJECT, properties: { 
                question: { type: Type.STRING, description: 'The question to ask the user.' } 
            }, required: ['question']
        }
    }
];

export const availableTools: { [key: string]: (...args: any[]) => Promise<any> } = {
    readFile: (args: { path: string }) => readFile(args.path),
    writeFile: (args: { path: string; content: string }) => writeFile(args.path, args.content),
    listFiles: (args: { path: string }) => listFiles(args.path),
    executeShellCommand: (args: { command: string }) => executeShellCommand(args.command),
    executeCode: (args: { language: 'javascript', code: string }) => executeCode(args.language, args.code),
    github_create_repo: (args: { name: string, description: string, is_private: boolean }) => github_create_repo(args.name, args.description, args.is_private),
    github_get_pr_details: (args: { pr_url: string }) => github_get_pr_details(args.pr_url),
    github_post_pr_comment: (args: { pr_url: string, comment: string }) => github_post_pr_comment(args.pr_url, args.comment),
    github_merge_pr: (args: { pr_url: string, method: 'merge' | 'squash' | 'rebase' }) => github_merge_pr(args.pr_url, args.method),
    github_create_file_in_repo: (args: { repo_name: string, path: string, content: string, commit_message: string }) => github_create_file_in_repo(args.repo_name, args.path, args.content, args.commit_message),
    createArtifact: (args: { title: string, type: 'code' | 'markdown' | 'live-preview', content: string }) => createArtifact(args.title, args.type, args.content),
    create_and_delegate_task_to_new_agent: (args: { agent_name: string, agent_instructions: string, task_description: string, agent_icon: string }) => create_and_delegate_task_to_new_agent(args.agent_name, args.agent_instructions, args.task_description, args.agent_icon),
    askUser: (args: { question: string }) => askUser(args.question),
};