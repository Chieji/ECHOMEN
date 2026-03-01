import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { GithubIcon } from './icons/GithubIcon';
import { GoogleIcon } from './icons/GoogleIcon';
import { ServiceConnectionModal } from './ServiceConnectionModal';
import { OpenAiIcon } from './icons/OpenAiIcon';
import { AnthropicIcon } from './icons/AnthropicIcon';
import { ReplicateIcon } from './icons/ReplicateIcon';
import { HuggingFaceIcon } from './icons/HuggingFaceIcon';
import { CohereIcon } from './icons/CohereIcon';
import { SupabaseIcon } from './icons/SupabaseIcon';
import { GenericApiIcon } from './icons/GenericApiIcon';
import { AgentCreationModal } from './AgentCreationModal';
import { CustomAgent, Playbook, AgentPreferences, AgentRole, TodoItem, Service, ModelProviderConfig, MemoryMode, PersistenceSettings } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { BrainIcon } from './icons/BrainIcon';
import { AppDeployments } from './AppDeployments';
import { RocketIcon } from './icons/RocketIcon';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { AgentsIcon } from './icons/AgentsIcon';
import { PlugIcon } from './icons/PlugIcon';
import { CpuChipIcon } from './icons/CpuChipIcon';
import { SwatchIcon } from './icons/SwatchIcon';
import { AgentIcon } from './AgentIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { ModelProviderConfigurationModal } from './ModelProviderConfigurationModal';
import { DropboxIcon } from './icons/DropboxIcon';
import { BoxIcon } from './icons/BoxIcon';
import { VercelIcon } from './icons/VercelIcon';
import { SentryIcon } from './icons/SentryIcon';
import { NotionIcon } from './icons/NotionIcon';
import { JsonbinIcon } from './icons/JsonbinIcon';
import { TypeformIcon } from './icons/TypeformIcon';
import { PolygonIcon } from './icons/PolygonIcon';
import { DaytonaIcon } from './icons/DaytonaIcon';
import { CodeSandboxIcon } from './icons/CodeSandboxIcon';
import { ServerIcon } from './icons/ServerIcon';
import { CloudIcon } from './icons/CloudIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { setSecureItem, getSecureItem, isSecureContext, migrateCredentials, removeSecureItem } from '../lib/secureStorage';


interface MasterConfigurationPanelProps {
    onClose: () => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
}

const initialServices: Service[] = [
    // Sandbox Environments
    { id: 'daytona', name: 'Daytona', icon: <DaytonaIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'dt...' }], status: 'Not Connected' },
    { id: 'codesandbox', name: 'CodeSandbox', icon: <CodeSandboxIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'csb...' }], status: 'Not Connected' },
    
    // Core Infrastructure
    { id: 'firebase', name: 'Firebase Cloud Brain', icon: <CloudIcon className="w-6 h-6" />, inputs: [
        { id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...' },
        { id: 'authDomain', label: 'Auth Domain', type: 'text', placeholder: 'echo-agent.firebaseapp.com' },
        { id: 'projectId', label: 'Project ID', type: 'text', placeholder: 'echo-agent-123' }
    ], status: 'Not Connected' },

    // Core LLM Providers
    { id: 'openai', name: 'OpenAI', icon: <OpenAiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.openai.com/v1' }], status: 'Not Connected' },
    { id: 'anthropic', name: 'Anthropic Claude', icon: <AnthropicIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.anthropic.com' }], status: 'Not Connected' },
    { id: 'google', name: 'Google / Gemini', icon: <GoogleIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIzaSy...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://generativelanguage.googleapis.com' }], status: 'Not Connected' },
    { id: 'cohere', name: 'Cohere API', icon: <CohereIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.cohere.ai' }], status: 'Not Connected' },
    { id: 'groq', name: 'Groq API', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'gsk_...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.groq.com/openai/v1' }], status: 'Not Connected' },
    { id: 'minimax', name: 'Minimax AI', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'groupId', label: 'Group ID', type: 'text', placeholder: '...' }, { id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], status: 'Not Connected' },
    
    // Model Hosting & Inference
    { id: 'huggingface', name: 'Hugging Face', icon: <HuggingFaceIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Token', type: 'password', placeholder: 'hf_...' }, { id: 'apiUrl', label: 'Inference API URL (Optional)', type: 'text', placeholder: 'https://api-inference.huggingface.co' }], status: 'Not Connected' },
    { id: 'replicate', name: 'Replicate AI', icon: <ReplicateIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Token', type: 'password', placeholder: 'r8_...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.replicate.com/v1' }], status: 'Not Connected' },
    { id: 'together', name: 'Together AI', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.together.ai' }], status: 'Not Connected' },
    { id: 'openrouter', name: 'Open Router', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-or-...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://openrouter.ai/api/v1' }], status: 'Not Connected' },
    { id: 'deepinfra', name: 'DeepInfra', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Token', type: 'password', placeholder: '...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.deepinfra.com' }], status: 'Not Connected' },
    { id: 'heygen', name: 'HeyGen API', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], status: 'Not Connected' },
    
    // Developer & Data Tools
    { id: 'github', name: 'GitHub', icon: <GithubIcon className="w-6 h-6 fill-current" />, inputs: [{ id: 'apiKey', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...' }, { id: 'apiUrl', label: 'Enterprise API URL (Optional)', type: 'text', placeholder: 'https://api.github.com' }], status: 'Not Connected' },
    { id: 'supabase', name: 'Supabase', icon: <SupabaseIcon className="w-6 h-6" />, inputs: [{ id: 'apiUrl', label: 'Project URL', type: 'text', placeholder: 'https://....supabase.co' }, { id: 'apiKey', label: 'Anon Key', type: 'password', placeholder: 'eyJ...' }], status: 'Not Connected' },
    { id: 'mongodb', name: 'MongoDB Atlas', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'orgId', label: 'Organization ID', type: 'text', placeholder: '...' }, { id: 'publicKey', label: 'Public API Key', type: 'text', placeholder: '...' }, { id: 'privateKey', label: 'Private API Key', type: 'password', placeholder: '...' }], status: 'Not Connected' },
    { id: 'vercel', name: 'Vercel', icon: <VercelIcon className="w-6 h-6" />, inputs: [{ id: 'apiToken', label: 'API Token', type: 'password', placeholder: '...' }], status: 'Not Connected' },
    { id: 'sentry', name: 'Sentry', icon: <SentryIcon className="w-6 h-6" />, inputs: [{ id: 'authToken', label: 'Auth Token', type: 'password', placeholder: '...' }, { id: 'orgSlug', label: 'Organization Slug', type: 'text', placeholder: 'my-org' }], status: 'Not Connected' },
    { id: 'polygon', name: 'Polygon.io', icon: <PolygonIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], status: 'Not Connected' },
    
    // Cloud Storage
    { id: 'dropbox', name: 'Dropbox', icon: <DropboxIcon className="w-6 h-6" />, inputs: [{ id: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'sl...' }], status: 'Not Connected' },
    { id: 'box', name: 'Box.com', icon: <BoxIcon className="w-6 h-6" />, inputs: [{ id: 'developerToken', label: 'Developer Token', type: 'password', placeholder: '...' }], status: 'Not Connected' },
    { id: 'jsonbin', name: 'Jsonbin.io', icon: <JsonbinIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '$2b$...' }], status: 'Not Connected' },

    // Productivity & Agent Tools
    { id: 'notion', name: 'Notion', icon: <NotionIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'Integration Token', type: 'password', placeholder: 'secret_...' }], status: 'Not Connected' },
    { id: 'n8n', name: 'n8n', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'instanceUrl', label: 'Instance URL', type: 'text', placeholder: 'https://...n8n.cloud' }, { id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], status: 'Not Connected' },
    { id: 'typeform', name: 'Typeform', icon: <TypeformIcon className="w-6 h-6" />, inputs: [{ id: 'apiToken', label: 'Personal Access Token', type: 'password', placeholder: 'tfp_' }], status: 'Not Connected' },
    { id: 'tavily', name: 'Tavily', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'tvly-...' }], status: 'Not Connected' },
    { id: 'serper', name: 'Serper.dev', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], status: 'Not Connected' },
    { id: 'agentops', name: 'Agentops.ai', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }, { id: 'apiUrl', label: 'Endpoint URL (Optional)', type: 'text', placeholder: 'https://api.agentops.ai' }], status: 'Not Connected' },
];

const advancedWorkflows = [
  {
    "id": "PR_REVIEW_STANDARD",
    "name": "Standard Pull Request Review and Merge",
    "description": "Automatically reviews a GitHub Pull Request (PR) for quality, runs security checks, provides a summary, and merges the PR if all checks pass.",
    "prompt": "Review the pull request at https://github.com/user/repo/pull/123. Analyze the code for quality and security, post the findings as a comment, and if there are no major issues, merge it using the squash method."
  },
  {
    "id": "PROJECT_SETUP_INITIALIZE",
    "name": "Initialize New GitHub Project Repository",
    "description": "Sets up a new GitHub repository, creates a standard file structure (README, .gitignore, license), and pushes the initial commit.",
    "prompt": "Initialize a new private GitHub project repository named 'awesome-api-v2'. The project uses TypeScript with Node.js. The description is 'A short, descriptive summary of the project.' Create a README.md and a .gitignore file and commit them to the new repository."
  }
];

const initialModelProviders: ModelProviderConfig[] = [
  {
    id: 'gemini-flash-main',
    provider: 'GEMINI',
    type: 'CLOUD',
    description: 'Primary high-speed, multi-modal model for core reasoning and tool use.',
    config: {
      model_name: 'gemini-2.5-flash',
      api_key_env_var: 'GEMINI_API_KEY'
    },
    integration_layer: 'NATIVE',
    enabled: true
  },
  {
    id: 'ollama-llama3-8b',
    provider: 'OLLAMA',
    type: 'LOCAL',
    description: 'Local Llama 3 8B model hosted via Ollama for code generation and internal critique.',
    config: {
      model_name: 'llama3:8b',
      base_url: 'http://localhost:11434/api/generate'
    },
    integration_layer: 'LANGCHAIN',
    enabled: true
  },
  {
    id: 'hf-mixtral-8x7b',
    provider: 'HUGGING_FACE',
    type: 'CLOUD',
    description: 'Mixtral 8x7B for complex reasoning tasks and detailed debugging reports.',
    config: {
      model_name: 'mixtral-8x7b-instruct-v0.1',
      api_key_env_var: 'HF_API_KEY',
      endpoint_url: 'https://api-inference.huggingface.co/models/...'
    },
    integration_layer: 'LANGCHAIN',
    enabled: false
  }
];

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-black/10 dark:border-white/10 pb-6 mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center mb-4"
            >
                <h3 className="flex items-center gap-2 text-sm font-semibold text-cyan-600 dark:text-[#00D4FF] tracking-widest uppercase">
                    {icon}
                    <span>{title}</span>
                </h3>
                 <ChevronDownIcon className={`w-5 h-5 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                     <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const coreAgents: CustomAgent[] = [
    {
        id: 'ECHOMEN_PARENT_AGENT',
        name: 'ECHOMEN | Orchestrator',
        description: 'Primary self-improving orchestrator.',
        instructions: "You are ECHOMEN, the master orchestrator. Your first step is always to analyze the request. If the task is complex, delegate it to a 'CHILD_TASK_AGENT'. If delegation is used, you MUST review the child's output according to the CRITIQUE_DEBUG_AND_REFINE policy before reporting back to the user.",
        isCore: true,
        enabled: true,
        icon: 'Brain',
        llm_profile_id: 'gemini-flash-main',
        delegation_enabled: true,
        review_policy: 'CRITIQUE_DEBUG_AND_REFINE',
        capabilities: ['DECOMPOSITION', 'PLANNING', 'DELEGATION', 'CODE_EXECUTION', 'SELF_CORRECTION', 'LEARNING'],
        enabled_tools: ['CODE_INTERPRETER', 'GOOGLE_SEARCH_GROUNDING', 'MONGODB_CLIENT', 'GOOGLE_DRIVE_MANAGER'],
        child_agent_template: {
            id_prefix: 'CHILD_TASK_',
            llm_profile_id: 'ollama-llama3-8b',
            default_tools: ['CODE_INTERPRETER', 'GOOGLE_SEARCH_GROUNDING'],
            timeout_seconds: 300,
            max_retries: 2,
        },
    },
    { id: 'core-webhawk', name: 'WebHawk', instructions: 'Autonomous web research agent.', isCore: true, enabled: true, icon: 'WebHawk', description: "Autonomous web research agent." },
    { id: 'core-codeforge', name: 'CodeForge', instructions: 'Generates and debugs code.', isCore: true, enabled: true, icon: 'CodeForge', description: "Generates and debugs code." },
    { id: 'core-docmaster', name: 'DocMaster', instructions: 'Reads and analyzes documents.', isCore: true, enabled: false, icon: 'DocumentMaster', description: "Reads and analyzes documents." }
];

const defaultAgentModels = [
    'ECHOMEN | Orchestrator',
    'Gemini Advanced',
    'GPT-4',
    'Claude Sonnet',
    'Gemini 2.5 Flash',
    'WebHawk'
];

export const MasterConfigurationPanel: React.FC<MasterConfigurationPanelProps> = ({ onClose, theme, setTheme }) => {
    const [services, setServices] = useState<Service[]>(initialServices);
    const [modelProviders, setModelProviders] = useState<ModelProviderConfig[]>(initialModelProviders);

    // Async data loading for secure credentials
    useEffect(() => {
        const loadSecureData = async () => {
            try {
                // First try secure storage for credentials
                const secureServicesStr = await getSecureItem('echo-services');
                if (secureServicesStr) {
                    const savedServices = JSON.parse(secureServicesStr);
                    setServices(prev => prev.map(is => {
                        const saved = savedServices.find((ss: Service) => ss.id === is.id);
                        return saved ? { ...is, status: saved.status, inputs: saved.inputs || is.inputs } : is;
                    }));
                } else {
                    // Fallback to localStorage for legacy data
                    const savedServicesJSON = localStorage.getItem('echo-services');
                    if (savedServicesJSON) {
                        const savedServices = JSON.parse(savedServicesJSON);
                        setServices(prev => prev.map(is => {
                            const saved = savedServices.find((ss: Service) => ss.id === is.id);
                            return saved ? { ...is, status: saved.status } : is;
                        }));
                    }
                }
            } catch (error) {
                console.error("Failed to load secure services:", error);
            }
        };
        loadSecureData();
    }, []);

    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [systemInstruction, setSystemInstruction] = useState<string>("You are ECHO, an autonomous AI agent. You are direct, efficient, and action-oriented. Your goal is to execute tasks with ruthless precision.");
    const [agentPreferences, setAgentPreferences] = useState<AgentPreferences>({});
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [newTodoText, setNewTodoText] = useState('');
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<ModelProviderConfig | null>(null);

    const [agents, setAgents] = useState<CustomAgent[]>(() => {
        let savedAgents: CustomAgent[] = [];
        try {
            const savedAgentsJSON = localStorage.getItem('echo-custom-agents');
            if (savedAgentsJSON) {
                savedAgents = JSON.parse(savedAgentsJSON) as CustomAgent[];
            } else {
                savedAgents = [{ id: 'agent-1', name: 'PR Review Agent', instructions: 'You are an expert code reviewer. Analyze the provided code diff and provide concise, actionable feedback focusing on best practices, potential bugs, and clarity.', icon: 'Pencil', description: 'Specializes in GitHub PR reviews.' }];
            }
        } catch (error) {
            console.error("Failed to parse custom agents from localStorage", error);
            savedAgents = [{ id: 'agent-1', name: 'PR Review Agent', instructions: 'You are an expert code reviewer. Analyze the provided code diff and provide concise, actionable feedback focusing on best practices, potential bugs, and clarity.', icon: 'Pencil', description: 'Specializes in GitHub PR reviews.' }];
        }
        return [...coreAgents, ...savedAgents];
    });

    useEffect(() => {
        try {
            const userAgents = agents.filter(agent => !agent.isCore);
            localStorage.setItem('echo-custom-agents', JSON.stringify(userAgents));
        } catch (error) {
            console.error("Failed to save custom agents to localStorage", error);
        }
    }, [agents]);

     useEffect(() => {
        try {
            const savedPrefsJSON = localStorage.getItem('echo-agent-preferences');
            if (savedPrefsJSON) {
                setAgentPreferences(JSON.parse(savedPrefsJSON));
            }
        } catch (error) {
            console.error("Failed to parse agent preferences from localStorage", error);
        }

        try {
            const savedTodosJSON = localStorage.getItem('echo-todo-list');
            if(savedTodosJSON) {
                setTodos(JSON.parse(savedTodosJSON));
            }
        } catch (error) {
             console.error("Failed to parse todos from localStorage", error);
        }
        
        try {
            const savedPlaybooksJSON = localStorage.getItem('echo-playbooks');
            if (savedPlaybooksJSON) {
                const parsed = JSON.parse(savedPlaybooksJSON);
                if (Array.isArray(parsed)) {
                    setPlaybooks(parsed as Playbook[]);
                }
            }
        } catch (error) {
            console.error("Failed to parse playbooks from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('echo-agent-preferences', JSON.stringify(agentPreferences));
        } catch (error) {
            console.error("Failed to save agent preferences to localStorage", error);
        }
    }, [agentPreferences]);

    useEffect(() => {
        try {
            localStorage.setItem('echo-todo-list', JSON.stringify(todos));
        } catch(error) {
            console.error("Failed to save todos to localStorage", error);
        }
    }, [todos]);
    
    useEffect(() => {
        try {
            localStorage.setItem('echo-playbooks', JSON.stringify(playbooks));
        } catch(error) {
            console.error("Failed to save playbooks to localStorage", error);
        }
    }, [playbooks]);
    
    useEffect(() => {
        try {
            const servicesToSave = services.map(({ id, status }) => ({ id, status }));
            localStorage.setItem('echo-services', JSON.stringify(servicesToSave));
        } catch(error) {
            console.error("Failed to save services to localStorage", error);
        }
    }, [services]);

    useEffect(() => {
        try {
            localStorage.setItem('echo-model-providers', JSON.stringify(modelProviders));
        } catch (e) { console.error(e); }
    }, [modelProviders]);

    const availableAgentNames = useMemo(() => {
        const customAgentNames = agents.filter(a => !a.isCore).map(a => a.name);
        return [...new Set([...defaultAgentModels, ...customAgentNames])];
    }, [agents]);

    const categorizedServices = useMemo(() => {
        const categories: Record<string, Service[]> = {
            "Sandbox Environments": [],
            "Core LLM Providers": [],
            "Model Hosting & Inference": [],
            "Developer & Data Tools": [],
            "Cloud Storage": [],
            "Productivity & Agent Tools": []
        };
        services.forEach(service => {
            if (['daytona', 'codesandbox'].includes(service.id)) {
                categories["Sandbox Environments"].push(service);
            } else if (['openai', 'anthropic', 'google', 'cohere', 'groq', 'minimax'].includes(service.id)) {
                categories["Core LLM Providers"].push(service);
            } else if (['huggingface', 'replicate', 'together', 'openrouter', 'deepinfra', 'heygen'].includes(service.id)) {
                categories["Model Hosting & Inference"].push(service);
            } else if (['github', 'supabase', 'mongodb', 'vercel', 'sentry', 'polygon'].includes(service.id)) {
                categories["Developer & Data Tools"].push(service);
            } else if (['dropbox', 'box', 'jsonbin'].includes(service.id)) {
                categories["Cloud Storage"].push(service);
            } else {
                categories["Productivity & Agent Tools"].push(service);
            }
        });
        return categories;
    }, [services]);

    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<CustomAgent | null>(null);

    const handleSaveService = (serviceId: string, values: { [key: string]: string }) => {
        console.log(`Saving service ${serviceId}`, values);
        setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: 'Connected' } : s));
        setSelectedService(null);
    };
    
    const handleDisconnectService = (serviceId: string) => {
        console.log(`Disconnecting service ${serviceId}`);
        setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: 'Not Connected' } : s));
        setSelectedService(null);
    };

    const handleOpenAgentModal = (agent: CustomAgent | null = null) => {
        setEditingAgent(agent);
        setIsAgentModalOpen(true);
    };

    const handleSaveAgent = (agent: CustomAgent) => {
        setAgents(prev => {
            const existing = prev.find(a => a.id === agent.id);
            if (existing) {
                return prev.map(a => a.id === agent.id ? agent : a);
            }
            return [...prev, agent];
        });
        setIsAgentModalOpen(false);
        setEditingAgent(null);
    };

    const handleDeleteAgent = (agentId: string) => {
        setAgents(prev => prev.filter(a => a.id !== agentId));
    };

    const handleToggleAgent = (agentId: string) => {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, enabled: !a.enabled } : a));
    };
    
    const handlePreferenceChange = (role: AgentRole, agentName: string) => {
        setAgentPreferences(prev => ({
            ...prev,
            [role]: agentName,
        }));
    };
    
    const handleDeletePlaybook = (id: string) => {
        setPlaybooks(prev => prev.filter(p => p.id !== id));
    };

    const handleClearAllPlaybooks = () => {
        if (window.confirm("Are you sure you want to delete all learned playbooks? This action cannot be undone.")) {
            setPlaybooks([]);
        }
    };

    const handleAddTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTodoText.trim()) {
            const newTodo: TodoItem = {
                id: `todo-${Date.now()}`,
                text: newTodoText.trim(),
                isCompleted: false,
                createdAt: new Date().toISOString(),
            };
            setTodos(prev => [newTodo, ...prev]);
            setNewTodoText('');
        }
    };

    const handleToggleTodo = (id: string) => {
        setTodos(prev => prev.map(todo => 
            todo.id === id ? { ...todo, isCompleted: !todo.isCompleted } : todo
        ));
    };

    const handleDeleteTodo = (id: string) => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
    };
    
    const handleCopyPrompt = (workflowId: string, prompt: string) => {
        navigator.clipboard.writeText(prompt);
        setCopiedPromptId(workflowId);
        setTimeout(() => setCopiedPromptId(null), 2000);
    };

    const handleOpenModelModal = (provider: ModelProviderConfig | null = null) => {
        setEditingModel(provider);
        setIsModelModalOpen(true);
    };

    const handleSaveModel = (provider: ModelProviderConfig) => {
        setModelProviders(prev => {
            const existing = prev.find(p => p.id === provider.id);
            if (existing) {
                return prev.map(p => p.id === provider.id ? provider : p);
            }
            return [...prev, provider];
        });
        setIsModelModalOpen(false);
    };

    const handleDeleteModel = (providerId: string) => {
        setModelProviders(prev => prev.filter(p => p.id !== providerId));
    };

    const handleToggleModel = (providerId: string) => {
        setModelProviders(prev => prev.map(p => p.id === providerId ? { ...p, enabled: !p.enabled } : p));
    };

    const [persistence, setPersistence] = useState<PersistenceSettings>(() => {
        try {
            const saved = localStorage.getItem('echo-persistence-settings');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error(e); }
        return { mode: MemoryMode.LOCAL, isCloudConnected: false };
    });

    useEffect(() => {
        localStorage.setItem('echo-persistence-settings', JSON.stringify(persistence));
    }, [persistence]);

    const handleToggleMemoryMode = () => {
        setPersistence(prev => ({
            ...prev,
            mode: prev.mode === MemoryMode.LOCAL ? MemoryMode.CLOUD : MemoryMode.LOCAL
        }));
    };

    return (
        <>
            <motion.div
                className="fixed inset-0 z-50 flex justify-end"
                initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
                animate={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-md h-full bg-white dark:bg-[#0F0F0F] border-l-2 border-[#FF6B00]/50 shadow-2xl flex flex-col"
                    initial={{ x: '100%' }}
                    animate={{ x: '0%' }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="p-6 flex justify-between items-center border-b border-black/10 dark:border-white/10 flex-shrink-0">
                        <h2 className="text-xl font-bold text-zinc-800 dark:text-gray-100">Settings</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </header>
                    <div className="p-6 flex-grow overflow-y-auto">
                         <Section title="Appearance" icon={<SwatchIcon className="w-5 h-5" />}>
                            <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-3 rounded-lg">
                                <label htmlFor="theme-toggle" className="font-semibold text-zinc-800 dark:text-white">Theme</label>
                                <div className="flex items-center gap-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 p-1">
                                    <button onClick={() => setTheme('light')} className={`px-3 py-1 text-sm rounded-md ${theme === 'light' ? 'bg-white dark:bg-zinc-600 shadow' : ''}`}>Light</button>
                                    <button onClick={() => setTheme('dark')} className={`px-3 py-1 text-sm rounded-md ${theme === 'dark' ? 'bg-white dark:bg-zinc-600 shadow' : ''}`}>Dark</button>
                                </div>
                            </div>
                        </Section>

                        <Section title="Memory & Persistence" icon={<DatabaseIcon className="w-5 h-5" />}>
                            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/10 dark:border-white/10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-zinc-800 dark:text-white">Memory Storage Mode</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Current: {persistence.mode}</p>
                                    </div>
                                    <button 
                                        onClick={handleToggleMemoryMode}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${persistence.mode === MemoryMode.LOCAL ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600' : 'bg-echo-cyan text-black shadow-neon'}`}
                                    >
                                        Switch to {persistence.mode === MemoryMode.LOCAL ? 'Cloud' : 'Local'}
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-black/5 dark:border-white/5">
                                    <p className="text-sm font-bold text-zinc-800 dark:text-white mb-2 italic flex items-center gap-2">
                                        <BrainIcon className="w-4 h-4 text-echo-cyan" />
                                        Obsidian / Google RAG Link
                                    </p>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">File Search Store ID</label>
                                        <input 
                                            type="text" 
                                            value={persistence.fileSearchStoreId || ''}
                                            onChange={(e) => setPersistence(prev => ({ ...prev, fileSearchStoreId: e.target.value }))}
                                            placeholder="fileSearchStores/store_..."
                                            className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-echo-cyan/50 text-xs font-mono"
                                        />
                                        <p className="text-[9px] text-gray-500 leading-relaxed italic">
                                            Paste your Obsidian Gemini Store ID here to sync ECHO with your vault's cloud memory.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Section>

                        <Section title="MCP Tool Expansion" icon={<PlugIcon className="w-5 h-5" />}>
                            <div className="space-y-4">
                                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-widest">Connected Protocols</p>
                                {[
                                    { name: 'Git Protocol', url: 'http://localhost:3002', status: 'Connected' },
                                    { name: 'WebHawk (Playwright)', url: 'http://localhost:3003', status: 'Connected' },
                                    { name: 'Sequential Thinking', url: 'http://localhost:3004', status: 'Connected' }
                                ].map((mcp, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-black/5 dark:bg-white/5 px-4 py-3 rounded-xl border border-black/5 dark:border-white/5">
                                        <div>
                                            <p className="text-sm font-bold text-zinc-800 dark:text-white">{mcp.name}</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{mcp.url}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-green-500 uppercase">ONLINE</span>
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        </div>
                                    </div>
                                ))}
                                <button className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-xs font-bold text-gray-500 hover:text-white hover:border-[#00D4FF]/50 transition-all flex items-center justify-center gap-2">
                                    <PlusIcon className="w-4 h-4" />
                                    ADD NEW MCP ENDPOINT
                                </button>
                            </div>
                        </Section>

                        
                        <Section title="System Instructions" icon={<CommandLineIcon className="w-5 h-5" />}>
                            <textarea
                                value={systemInstruction}
                                onChange={(e) => setSystemInstruction(e.target.value)}
                                placeholder="Define the AI's core behavior, personality, and constraints..."
                                rows={4}
                                className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50 text-sm"
                            />
                            <button className="mt-3 w-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-zinc-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                Save Instructions
                            </button>
                        </Section>

                         <Section title="Agent To-Do List" icon={<ClipboardCheckIcon className="w-5 h-5" />}>
                            <form onSubmit={handleAddTodo} className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newTodoText}
                                    onChange={(e) => setNewTodoText(e.target.value)}
                                    placeholder="Add a new objective..."
                                    className="flex-grow bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50 text-sm"
                                />
                                <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-[#00D4FF] dark:hover:bg-[#00b8e6] dark:text-black rounded-lg px-3 py-1.5 flex-shrink-0">
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </form>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                <AnimatePresence>
                                {todos.map(todo => (
                                    <motion.div 
                                        key={todo.id}
                                        layout
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                                        className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-3 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                checked={todo.isCompleted}
                                                onChange={() => handleToggleTodo(todo.id)}
                                                className="w-5 h-5 rounded bg-zinc-300 dark:bg-zinc-700 border-zinc-400 dark:border-zinc-600 text-cyan-600 dark:text-[#00D4FF] focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                            />
                                            <p className={`text-sm text-zinc-800 dark:text-white ${todo.isCompleted ? 'line-through opacity-50' : ''}`}>
                                                {todo.text}
                                            </p>
                                        </div>
                                        <button onClick={() => handleDeleteTodo(todo.id)} className="text-gray-500 dark:text-gray-400 hover:text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                                </AnimatePresence>
                                {todos.length === 0 && <p className="text-sm text-center text-gray-500 py-2">No active to-dos.</p>}
                            </div>
                        </Section>
                        
                        <Section title="Cognitive Core: Learned Playbooks" icon={<BrainIcon className="w-5 h-5" />}>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {Array.isArray(playbooks) && playbooks.map(playbook => (
                                    <div key={playbook.id} className="bg-black/5 dark:bg-white/5 p-3 rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-semibold text-zinc-800 dark:text-white">{playbook.name}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{playbook.description}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">Learned from: "{playbook.triggerPrompt}"</p>
                                                 <p className="text-xs text-gray-500 mt-2">{new Date(playbook.createdAt).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                                <button onClick={() => handleDeletePlaybook(playbook.id)} title="Delete" className="text-gray-500 dark:text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {Array.isArray(playbooks) && playbooks.length === 0 && <p className="text-sm text-center text-gray-500 py-2">No playbooks learned yet.</p>}
                            </div>
                            <button
                                onClick={handleClearAllPlaybooks}
                                disabled={!Array.isArray(playbooks) || playbooks.length === 0}
                                className="mt-3 w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:bg-red-900/50 dark:hover:bg-red-900/80 dark:text-red-300 font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear All Playbooks
                            </button>
                        </Section>
                        
                         <Section title="Agent Management" icon={<AgentsIcon className="w-5 h-5" />}>
                             <div className="space-y-2">
                                {agents.map(agent => (
                                    <div key={agent.id} className={`bg-black/5 dark:bg-white/5 p-3 rounded-lg transition-opacity ${!agent.enabled ? 'opacity-50' : ''}`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3 flex-grow overflow-hidden">
                                                <div className="text-cyan-600 dark:text-[#00D4FF] flex-shrink-0 mt-1">
                                                    <AgentIcon icon={agent.icon} className="w-6 h-6" />
                                                </div>
                                                <div className="flex-grow overflow-hidden">
                                                    <p className="font-semibold text-zinc-800 dark:text-white truncate">{agent.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{agent.description || 'No description'}</p>
                                                    {agent.llm_profile_id && (
                                                        <div className="text-xs text-violet-500 dark:text-violet-400 mt-1 font-mono bg-violet-500/10 dark:bg-violet-500/20 px-2 py-0.5 rounded-full w-fit">
                                                            Model: {modelProviders.find(m => m.id === agent.llm_profile_id)?.config.model_name || 'N/A'}
                                                        </div>
                                                    )}
                                                     {agent.capabilities && agent.capabilities.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {agent.capabilities.slice(0, 4).map(cap => (
                                                                <span key={cap} className="text-[10px] font-mono bg-zinc-500/10 dark:bg-zinc-200/10 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                                                                    {cap}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                                {!agent.isCore && (
                                                    <>
                                                        <button onClick={() => handleOpenAgentModal(agent)} className="text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-[#00D4FF]" title="Edit Agent">
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteAgent(agent.id)} className="text-gray-500 dark:text-gray-400 hover:text-red-500" title="Delete Agent">
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={agent.enabled} onChange={() => handleToggleAgent(agent.id)} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-gray-400 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-600/50 dark:peer-focus:ring-[#00D4FF]/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 dark:peer-checked:bg-[#00D4FF]"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                            <button 
                                onClick={() => handleOpenAgentModal()}
                                className="mt-3 w-full flex items-center justify-center gap-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-zinc-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Create New Agent
                            </button>
                        </Section>
                         <Section title="Primary Agent Configuration" icon={<CpuChipIcon className="w-5 h-5" />}>
                            <div className="space-y-3">
                                {(['Planner', 'Executor', 'Reviewer', 'Synthesizer'] as AgentRole[]).map(role => (
                                    <div key={role} className="flex items-center justify-between">
                                        <label htmlFor={`agent-pref-${role}`} className="font-semibold text-zinc-800 dark:text-white text-sm">{role} Role</label>
                                        <select
                                            id={`agent-pref-${role}`}
                                            value={agentPreferences[role] || ''}
                                            onChange={(e) => handlePreferenceChange(role, e.target.value)}
                                            className="bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-1 text-zinc-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50 text-sm w-48"
                                        >
                                            <option value="">Default</option>
                                            {availableAgentNames.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </Section>
                        
                        <Section title="AI Core: Model Providers" icon={<CpuChipIcon className="w-5 h-5" />}>
                            <div className="space-y-2">
                                {modelProviders.map(provider => (
                                    <div key={provider.id} className={`bg-black/5 dark:bg-white/5 p-3 rounded-lg transition-opacity ${!provider.enabled ? 'opacity-50' : ''}`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3 flex-grow overflow-hidden">
                                                <AgentIcon icon={provider.provider} className="w-6 h-6 flex-shrink-0 text-gray-500" />
                                                <div className="flex-grow overflow-hidden">
                                                    <p className="font-semibold text-zinc-800 dark:text-white truncate" title={provider.config.model_name}>{provider.config.model_name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{provider.description}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${provider.type === 'CLOUD' ? 'bg-sky-500/20 text-sky-400' : 'bg-green-500/20 text-green-400'}`}>{provider.type}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${provider.integration_layer === 'NATIVE' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>{provider.integration_layer}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                                <button onClick={() => handleOpenModelModal(provider)} className="text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-[#00D4FF]" title="Edit Provider">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteModel(provider.id)} className="text-gray-500 dark:text-gray-400 hover:text-red-500" title="Delete Provider">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={provider.enabled} onChange={() => handleToggleModel(provider.id)} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-gray-400 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-600/50 dark:peer-focus:ring-[#00D4FF]/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 dark:peer-checked:bg-[#00D4FF]"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={() => handleOpenModelModal()}
                                className="mt-3 w-full flex items-center justify-center gap-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-zinc-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Add New Provider
                            </button>
                        </Section>
                        
                        {Object.entries(categorizedServices).map(([category, serviceList]) => serviceList.length > 0 && (
                            <Section 
                                key={category}
                                title={category} 
                                icon={category === 'Sandbox Environments' ? <ServerIcon className="w-5 h-5" /> : <PlugIcon className="w-5 h-5" />}
                                defaultOpen={category === 'Sandbox Environments'}
                            >
                                <div className="space-y-2">
                                    {serviceList.map(service => (
                                        <div key={service.id} className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-3 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="text-gray-700 dark:text-gray-300">{service.icon}</div>
                                                <p className="font-semibold text-zinc-800 dark:text-white">{service.name}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`text-xs font-bold ${service.status === 'Connected' ? 'text-green-500 dark:text-green-400' : 'text-gray-500'}`}>
                                                    {service.status}
                                                </span>
                                                <button 
                                                    onClick={() => setSelectedService(service)}
                                                    className="text-sm font-semibold text-cyan-600 dark:text-[#00D4FF] hover:text-black dark:hover:text-white transition-colors"
                                                >
                                                    Manage
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        ))}

                        <Section title="Advanced Workflows" icon={<GithubIcon className="w-5 h-5" />}>
                            <div className="space-y-3">
                                {advancedWorkflows.map(workflow => (
                                    <div key={workflow.id} className="bg-black/5 dark:bg-white/5 p-4 rounded-lg">
                                        <p className="font-bold text-zinc-800 dark:text-white">{workflow.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{workflow.description}</p>
                                        <button 
                                            onClick={() => handleCopyPrompt(workflow.id, workflow.prompt)}
                                            className={`mt-3 w-full text-sm font-semibold py-2 px-4 rounded-lg transition-colors ${copiedPromptId === workflow.id ? 'bg-green-500/20 text-green-400' : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-zinc-800 dark:text-white'}`}
                                        >
                                            {copiedPromptId === workflow.id ? 'Copied to Clipboard!' : 'Copy Example Prompt'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        <Section title="App Deployments" icon={<RocketIcon className="w-5 h-5" />}>
                            <AppDeployments />
                        </Section>
                    </div>
                </motion.div>
            </motion.div>
            
            <AnimatePresence>
                {selectedService && (
                     <ServiceConnectionModal
                        service={selectedService}
                        isOpen={!!selectedService}
                        onClose={() => setSelectedService(null)}
                        onSave={handleSaveService}
                        onDisconnect={handleDisconnectService}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isAgentModalOpen && (
                    <AgentCreationModal
                        agent={editingAgent}
                        isOpen={isAgentModalOpen}
                        onClose={() => setIsAgentModalOpen(false)}
                        onSave={handleSaveAgent}
                        modelProviders={modelProviders}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isModelModalOpen && (
                    <ModelProviderConfigurationModal
                        providerConfig={editingModel}
                        isOpen={isModelModalOpen}
                        onClose={() => setIsModelModalOpen(false)}
                        onSave={handleSaveModel}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
