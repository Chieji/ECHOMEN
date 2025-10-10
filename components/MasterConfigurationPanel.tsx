import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { GithubIcon } from './icons/GithubIcon';
import { GoogleIcon } from './icons/GoogleIcon';
import { WebHawkIcon } from './icons/WebHawkIcon';
import { CodeForgeIcon } from './icons/CodeForgeIcon';
import { DocumentMasterIcon } from './icons/DocumentMasterIcon';
import { ServiceConnectionModal, Service } from './ServiceConnectionModal';
import { OpenAiIcon } from './icons/OpenAiIcon';
import { AnthropicIcon } from './icons/AnthropicIcon';
import { ReplicateIcon } from './icons/ReplicateIcon';
import { HuggingFaceIcon } from './icons/HuggingFaceIcon';
import { CohereIcon } from './icons/CohereIcon';
import { SupabaseIcon } from './icons/SupabaseIcon';
import { GenericApiIcon } from './icons/GenericApiIcon';
import { AgentCreationModal } from './AgentCreationModal';
import { CustomAgent, MemoryItem } from '../types';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { BrainIcon } from './icons/BrainIcon';
import { TagIcon } from './icons/TagIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';


interface MasterConfigurationPanelProps {
    onClose: () => void;
}

const initialServices: Service[] = [
    // Core LLM Providers
    { id: 'openai', name: 'OpenAI', icon: <OpenAiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.openai.com/v1' }], status: 'Not Connected' },
    { id: 'anthropic', name: 'Anthropic Claude', icon: <AnthropicIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.anthropic.com' }], status: 'Not Connected' },
    { id: 'google', name: 'Google / Gemini', icon: <GoogleIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIzaSy...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://generativelanguage.googleapis.com' }], status: 'Not Connected' },
    { id: 'cohere', name: 'Cohere API', icon: <CohereIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.cohere.ai' }], status: 'Not Connected' },
    { id: 'groq', name: 'Groq API', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'gsk_...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.groq.com/openai/v1' }], status: 'Not Connected' },
    
    // Model Hosting & Inference
    { id: 'huggingface', name: 'Hugging Face', icon: <HuggingFaceIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Token', type: 'password', placeholder: 'hf_...' }, { id: 'apiUrl', label: 'Inference API URL (Optional)', type: 'text', placeholder: 'https://api-inference.huggingface.co' }], status: 'Not Connected' },
    { id: 'replicate', name: 'Replicate AI', icon: <ReplicateIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Token', type: 'password', placeholder: 'r8_...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.replicate.com/v1' }], status: 'Not Connected' },
    { id: 'together', name: 'Together AI', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.together.ai' }], status: 'Not Connected' },
    { id: 'openrouter', name: 'Open Router', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-or-...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://openrouter.ai/api/v1' }], status: 'Not Connected' },
    { id: 'deepinfra', name: 'DeepInfra', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Token', type: 'password', placeholder: '...' }, { id: 'apiUrl', label: 'API URL (Optional)', type: 'text', placeholder: 'https://api.deepinfra.com' }], status: 'Not Connected' },
    
    // Developer & Data Tools
    { id: 'github', name: 'GitHub', icon: <GithubIcon className="w-6 h-6 fill-current" />, inputs: [{ id: 'apiKey', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...' }, { id: 'apiUrl', label: 'Enterprise API URL (Optional)', type: 'text', placeholder: 'https://api.github.com' }], status: 'Not Connected' },
    { id: 'supabase', name: 'Supabase', icon: <SupabaseIcon className="w-6 h-6" />, inputs: [{ id: 'apiUrl', label: 'Project URL', type: 'text', placeholder: 'https://....supabase.co' }, { id: 'apiKey', label: 'Anon Key', type: 'password', placeholder: 'eyJ...' }], status: 'Not Connected' },
    { id: 'mongodb', name: 'MongoDB Atlas', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'orgId', label: 'Organization ID', type: 'text', placeholder: '...' }, { id: 'publicKey', label: 'Public API Key', type: 'text', placeholder: '...' }, { id: 'privateKey', label: 'Private API Key', type: 'password', placeholder: '...' }], status: 'Not Connected' },
    
    // Search & Agent Tools
    { id: 'tavily', name: 'Tavily', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: 'tvly-...' }], status: 'Not Connected' },
    { id: 'serper', name: 'Serper.dev', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }], status: 'Not Connected' },
    { id: 'notion', name: 'Notion API', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'Integration Token', type: 'password', placeholder: 'secret_...' }], status: 'Not Connected' },
    { id: 'agentops', name: 'Agentops.ai', icon: <GenericApiIcon className="w-6 h-6" />, inputs: [{ id: 'apiKey', label: 'API Key', type: 'password', placeholder: '...' }, { id: 'apiUrl', label: 'Endpoint URL (Optional)', type: 'text', placeholder: 'https://api.agentops.ai' }], status: 'Not Connected' },
];

const mockMemories: MemoryItem[] = [
    { id: 'mem-1', content: 'User prefers Python for scripting tasks and data analysis.', timestamp: new Date(Date.now() - 3600000).toISOString(), label: 'Tech Preference' },
    { id: 'mem-2', content: 'Commonly used tool: CodeForge for React component generation.', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: 'mem-3', content: 'Project "Phoenix" default deployment target is Vercel.', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), label: 'Project Config' },
    { id: 'mem-4', content: 'User asked for concise summaries in previous interactions.', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), isArchived: true },
];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="border-b border-white/10 pb-6 mb-6">
        <h3 className="text-sm font-semibold text-[#00D4FF] tracking-widest uppercase mb-4">{title}</h3>
        {children}
    </div>
);

const AgentCard: React.FC<{ icon: React.ReactNode; name: string; description: string; enabled: boolean; }> = ({ icon, name, description, enabled }) => (
     <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
        <div className="flex items-center gap-3">
            <div className="text-[#00D4FF]">{icon}</div>
            <div>
                <p className="font-semibold text-white">{name}</p>
                <p className="text-xs text-gray-400">{description}</p>
            </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked={enabled} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-[#00D4FF]/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00D4FF]"></div>
        </label>
    </div>
);


export const MasterConfigurationPanel: React.FC<MasterConfigurationPanelProps> = ({ onClose }) => {
    const [services, setServices] = useState<Service[]>(initialServices);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [systemInstruction, setSystemInstruction] = useState<string>("You are ECHO, an autonomous AI agent. You are direct, efficient, and action-oriented. Your goal is to execute tasks with ruthless precision.");
    const [customAgents, setCustomAgents] = useState<CustomAgent[]>([
        { id: 'agent-1', name: 'PR Review Agent', instructions: 'You are an expert code reviewer. Analyze the provided code diff and provide concise, actionable feedback focusing on best practices, potential bugs, and clarity.' },
    ]);
    const [memories, setMemories] = useState<MemoryItem[]>(mockMemories);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<CustomAgent | null>(null);

    const handleSaveService = (serviceId: string, values: { [key: string]: string }) => {
        console.log(`Saving service ${serviceId}`, values);
        // Here you would typically encrypt and save the credentials
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
        if (editingAgent) {
            setCustomAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
        } else {
            setCustomAgents(prev => [...prev, { ...agent, id: `agent-${Date.now()}` }]);
        }
        setIsAgentModalOpen(false);
        setEditingAgent(null);
    };

    const handleDeleteAgent = (agentId: string) => {
        setCustomAgents(prev => prev.filter(a => a.id !== agentId));
    };

    const handleDeleteMemory = (id: string) => {
        setMemories(prev => prev.filter(m => m.id !== id));
    };

    const handleArchiveMemory = (id: string) => {
        setMemories(prev => prev.map(m => m.id === id ? { ...m, isArchived: !m.isArchived } : m));
    };

    const handleLabelMemory = (id: string) => {
        const label = window.prompt("Enter a label for this memory:");
        if (label) {
            setMemories(prev => prev.map(m => m.id === id ? { ...m, label } : m));
        }
    };

    const handleClearAllMemory = () => {
        if (window.confirm("Are you sure you want to delete all learned patterns? This action cannot be undone.")) {
            setMemories([]);
        }
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
                    className="w-full max-w-md h-full bg-[#0F0F0F] border-l-2 border-[#FF6B00]/50 shadow-2xl flex flex-col"
                    initial={{ x: '100%' }}
                    animate={{ x: '0%' }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="p-6 flex justify-between items-center border-b border-white/10 flex-shrink-0">
                        <h2 className="text-xl font-bold text-gray-100">Master Configuration</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </header>
                    <div className="p-6 flex-grow overflow-y-auto">
                        <Section title="System Instructions">
                            <textarea
                                value={systemInstruction}
                                onChange={(e) => setSystemInstruction(e.target.value)}
                                placeholder="Define the AI's core behavior, personality, and constraints..."
                                rows={4}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50 text-sm"
                            />
                            <button className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                Save Instructions
                            </button>
                        </Section>
                        
                        <Section title="My Agents">
                             <div className="space-y-2">
                                {customAgents.map(agent => (
                                    <div key={agent.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <UserCircleIcon className="w-6 h-6 text-gray-400" />
                                            <p className="font-semibold text-white">{agent.name}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                             <button onClick={() => handleOpenAgentModal(agent)} className="text-gray-400 hover:text-[#00D4FF]">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteAgent(agent.id)} className="text-gray-400 hover:text-red-500">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                            <button 
                                onClick={() => handleOpenAgentModal()}
                                className="mt-3 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Create New Agent
                            </button>
                        </Section>

                        <Section title="Memory Management">
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {memories.map(memory => (
                                    <div key={memory.id} className={`bg-white/5 p-3 rounded-lg transition-opacity ${memory.isArchived ? 'opacity-50' : 'opacity-100'}`}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className={`text-sm text-white ${memory.isArchived ? 'line-through' : ''}`}>{memory.content}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs text-gray-500">{new Date(memory.timestamp).toLocaleString()}</span>
                                                    {memory.label && (
                                                         <span className="text-xs font-semibold bg-[#8B5CF6]/20 text-[#c0a2f7] px-2 py-0.5 rounded-full">{memory.label}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                                <button onClick={() => handleLabelMemory(memory.id)} title="Label" className="text-gray-400 hover:text-[#00D4FF]"><TagIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleArchiveMemory(memory.id)} title={memory.isArchived ? "Unarchive" : "Archive"} className="text-gray-400 hover:text-yellow-400"><ArchiveBoxIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteMemory(memory.id)} title="Delete" className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleClearAllMemory}
                                className="mt-3 w-full bg-red-900/50 hover:bg-red-900/80 text-red-300 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                            >
                                Clear All Memory
                            </button>
                        </Section>

                         <Section title="Service Connections">
                            <div className="space-y-2">
                                {services.map(service => (
                                    <div key={service.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="text-gray-300">{service.icon}</div>
                                            <p className="font-semibold text-white">{service.name}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-xs font-bold ${service.status === 'Connected' ? 'text-green-400' : 'text-gray-500'}`}>
                                                {service.status}
                                            </span>
                                            <button 
                                                onClick={() => setSelectedService(service)}
                                                className="text-sm font-semibold text-[#00D4FF] hover:text-white transition-colors"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        <Section title="Core Agents">
                            <div className="flex flex-col gap-3">
                                <AgentCard icon={<WebHawkIcon className="w-6 h-6" />} name="WebHawk" description="Autonomous web research agent." enabled={true} />
                                <AgentCard icon={<CodeForgeIcon className="w-6 h-6" />} name="CodeForge" description="Generates and debugs code." enabled={true} />
                                <AgentCard icon={<DocumentMasterIcon className="w-6 h-6" />} name="DocMaster" description="Reads and analyzes documents." enabled={false} />
                            </div>
                        </Section>
                    </div>
                </motion.div>
            </motion.div>
            
            <ServiceConnectionModal
                service={selectedService}
                isOpen={!!selectedService}
                onClose={() => setSelectedService(null)}
                onSave={handleSaveService}
                onDisconnect={handleDisconnectService}
            />

            <AgentCreationModal
                agent={editingAgent}
                isOpen={isAgentModalOpen}
                onClose={() => setIsAgentModalOpen(false)}
                onSave={handleSaveAgent}
            />
        </>
    );
};