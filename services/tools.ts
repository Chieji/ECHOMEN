import { FunctionDeclaration, Type } from "@google/genai";
import { Service } from '../types';

// In-memory file system simulation with directory support
const fileSystem: { [key: string]: string } = {
    './index.html': `<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <h1>Welcome</h1>
    <div id="root"></div>
    <script src="./src/index.js"></script>
</body>
</html>`,
    './style.css': `body {
    font-family: sans-serif;
}`,
    './package.json': `{
    "name": "echo-project",
    "version": "1.0.0",
    "dependencies": {
        "react": "^18.0.0"
    }
}`,
    './src/index.js': `console.log('App started');`,
    './src/components/Button.js': `export const Button = () => '<button>Click Me</button>';`,
};

// --- Helper Functions ---
const normalizePath = (path: string): string => {
    // Simple normalization: remove trailing slashes unless it's the root
    if (path.length > 2 && path.endsWith('/')) {
        return path.slice(0, -1);
    }
    return path;
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
    const normPath = normalizePath(path);
    if (fileSystem.hasOwnProperty(normPath)) {
        return fileSystem[normPath];
    }
    throw new Error(`File not found: ${path}`);
};

const writeFile = async (path: string, content: string): Promise<string> => {
    const normPath = normalizePath(path);
    // Ensure parent directories exist
    const parts = normPath.split('/').slice(0, -1);
    let currentPath = '';
    for (const part of parts) {
        if (!part) continue;
        currentPath += (currentPath ? '/' : '') + part;
        // This is a simplified check; in a real FS, you'd distinguish files and dirs
        if (!Object.keys(fileSystem).some(p => p.startsWith(currentPath))) {
             // Creating a placeholder "directory" by adding a file inside it
             // In a more complex simulation, we'd have a separate structure for directories
        }
    }
    fileSystem[normPath] = content;
    return `File ${path} has been written successfully.`;
};

const listFiles = async (path: string): Promise<string[]> => {
    const normPath = normalizePath(path);
    const uniqueEntries = new Set<string>();

    Object.keys(fileSystem).forEach(p => {
        if (p.startsWith(`${normPath}/`)) {
            const relativePath = p.substring(normPath.length + 1);
            const entry = relativePath.split('/')[0];
            uniqueEntries.add(entry);
        }
    });

    if (uniqueEntries.size === 0 && !fileSystem.hasOwnProperty(normPath) && normPath !== '.') {
         throw new Error(`Directory not found: ${path}`);
    }

    return Array.from(uniqueEntries);
};

const executeShellCommand = async (command: string): Promise<string> => {
    const [cmd, ...args] = command.trim().split(/\s+/);
    
    switch (cmd) {
        case 'ls':
            const path = args[0] || '.';
            const files = await listFiles(path);
            return files.join('\n');
        case 'pwd':
            return '/app'; // Simulated current working directory
        case 'echo':
            return args.join(' ');
        case 'mkdir':
            // In our simulation, directories are created implicitly by writeFile.
            // We can just return a success message.
            if (!args[0]) throw new Error('mkdir: missing operand');
            return `Directory ${args[0]} created.`;
        case 'cat':
             if (!args[0]) throw new Error('cat: missing operand');
             return readFile(args[0]);
        default:
            // For other commands, simulate a generic success output
            console.log(`Simulating execution of unknown command: ${command}`);
            return `Command "${command}" executed successfully. (Simulated Output)`;
    }
};

const github_list_repos = async (): Promise<string> => {
    if (!checkAuth('github')) {
        throw new Error("GitHub service is not connected. Please connect it in the settings.");
    }
    // Simulate API call
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
const createArtifact = async (title: string, type: 'code' | 'markdown', content: string): Promise<string> => {
    return `Artifact "${title}" has been marked for creation.`;
};


// --- Tool Definitions and Declarations ---

export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: 'readFile',
        description: 'Reads the content of a file from the virtual file system.',
        parameters: {
            type: Type.OBJECT, properties: { path: { type: Type.STRING, description: 'The path to the file (e.g., "./src/index.js").' } }, required: ['path']
        }
    },
    {
        name: 'writeFile',
        description: 'Writes content to a file in the virtual file system. Creates directories as needed.',
        parameters: {
            type: Type.OBJECT, properties: {
                path: { type: Type.STRING, description: 'The path for the new file (e.g., "./dist/bundle.js").' },
                content: { type: Type.STRING, description: 'The content to write.' }
            }, required: ['path', 'content']
        }
    },
    {
        name: 'listFiles',
        description: 'Lists all files and directories directly within a given path.',
        parameters: {
            type: Type.OBJECT, properties: { path: { type: Type.STRING, description: 'The directory path to inspect (e.g., "./src").' } }, required: ['path']
        }
    },
    {
        name: 'executeShellCommand',
        description: 'Executes a shell command in the simulated environment. Supports `ls`, `pwd`, `echo`, `mkdir`, `cat`.',
        parameters: {
            type: Type.OBJECT, properties: { command: { type: Type.STRING, description: 'The shell command to execute (e.g., "ls -l ./src").' } }, required: ['command']
        }
    },
    {
        name: 'github_list_repos',
        description: 'Lists repositories for the authenticated GitHub user. Requires GitHub to be connected.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
     {
        name: 'createArtifact',
        description: 'Creates an artifact (e.g., a code block, a document) to be displayed to the user as a final output.',
        parameters: {
            type: Type.OBJECT, properties: {
                title: { type: Type.STRING, description: 'A descriptive title for the artifact.' },
                type: { type: Type.STRING, description: 'The type of artifact.', enum: ['code', 'markdown'] },
                content: { type: Type.STRING, description: 'The full content of the artifact.' }
            }, required: ['title', 'type', 'content']
        }
    },
    {
        name: 'askUser',
        description: 'Asks the user a question to get clarification or additional input.',
        parameters: {
            type: Type.OBJECT, properties: { question: { type: Type.STRING, description: 'The question to ask the user.' } }, required: ['question']
        }
    },
    {
        name: 'finish',
        description: 'Signals that the current task is complete and no further actions are needed.',
        parameters: {
            type: Type.OBJECT, properties: { reason: { type: Type.STRING, description: 'A summary of why the task is finished.' } }, required: ['reason']
        }
    }
];

export const availableTools: { [key: string]: (...args: any[]) => Promise<any> } = {
    readFile: (args: { path: string }) => readFile(args.path),
    writeFile: (args: { path: string; content: string }) => writeFile(args.path, args.content),
    listFiles: (args: { path: string }) => listFiles(args.path),
    executeShellCommand: (args: { command: string }) => executeShellCommand(args.command),
    github_list_repos: () => github_list_repos(),
    createArtifact: (args: { title: string, type: 'code' | 'markdown', content: string }) => createArtifact(args.title, args.type, args.content),
    askUser: (args: { question: string }) => askUser(args.question),
};