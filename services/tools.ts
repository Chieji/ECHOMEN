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

const github_list_repos = async (): Promise<string> => {
    if (!checkAuth('github')) {
        throw new Error("GitHub service is not connected. Please connect it in the settings.");
    }
    // This would ideally call a backend proxy to use the saved token securely.
    // For now, we'll keep the mock and add a note.
    console.warn("GitHub tool is using simulated data. A backend proxy is required for real API calls.");
    return JSON.stringify([
        { name: 'ECHO-Agent', private: false, stars: 128 },
        { name: 'Project-Orion', private: true, stars: 12 },
    ], null, 2);
}


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
        description: 'Executes a command in a real shell environment on the backend. This is a powerful tool for running commands like `git`, `npm`, `docker`, `python`, etc. Requires the ECHO Execution Engine to be running.',
        parameters: {
            type: Type.OBJECT, properties: { 
                command: { type: Type.STRING, description: 'The shell command to execute (e.g., "npm install" or "docker build -t my-app .").' } 
            }, required: ['command']
        }
    },
     {
        name: 'executeCode',
        description: 'Executes a snippet of JavaScript and HTML code in a secure, sandboxed browser environment to generate a "live-preview" artifact. This is for testing frontend code. For other languages or environments, use `writeFile` and `executeShellCommand`.',
        parameters: {
            type: Type.OBJECT, properties: {
                language: { type: Type.STRING, enum: ['javascript'], description: "The programming language. Must be 'javascript'." },
                code: { type: Type.STRING, description: 'The code to execute. For previews, provide a full HTML document string.' }
            }, required: ['language', 'code']
        }
    },
    {
        name: 'github_list_repos',
        description: 'Lists repositories for the authenticated GitHub user. Requires the GitHub service to be connected in the settings panel.',
        parameters: { type: Type.OBJECT, properties: {} }
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
    },
    {
        name: 'finish',
        description: 'Signals that the current high-level task is fully complete and no further actions are necessary. Use this as the final step in your thought process.',
        parameters: {
            type: Type.OBJECT, properties: { 
                reason: { type: Type.STRING, description: 'A brief summary of why the task is considered finished and what was accomplished.' } 
            }, required: ['reason']
        }
    }
];

export const availableTools: { [key: string]: (...args: any[]) => Promise<any> } = {
    readFile: (args: { path: string }) => readFile(args.path),
    writeFile: (args: { path: string; content: string }) => writeFile(args.path, args.content),
    listFiles: (args: { path: string }) => listFiles(args.path),
    executeShellCommand: (args: { command: string }) => executeShellCommand(args.command),
    executeCode: (args: { language: 'javascript', code: string }) => executeCode(args.language, args.code),
    github_list_repos: () => github_list_repos(),
    createArtifact: (args: { title: string, type: 'code' | 'markdown' | 'live-preview', content: string }) => createArtifact(args.title, args.type, args.content),
    askUser: (args: { question: string }) => askUser(args.question),
};