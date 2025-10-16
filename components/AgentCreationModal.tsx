import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { CustomAgent, ModelProviderConfig, ChildAgentTemplate } from '../types';
import { AgentsIcon } from './icons/AgentsIcon';
import { AgentIcon, PREDEFINED_ICONS } from './AgentIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface AgentCreationModalProps {
    agent: CustomAgent | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (agent: CustomAgent) => void;
    modelProviders: ModelProviderConfig[];
}

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-black/10 dark:border-white/10 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 bg-black/5 dark:bg-white/5"
            >
                <h4 className="font-semibold text-zinc-800 dark:text-white">{title}</h4>
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
                        <div className="p-4 border-t border-black/10 dark:border-white/10">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const AgentCreationModal: React.FC<AgentCreationModalProps> = ({ agent, isOpen, onClose, onSave, modelProviders }) => {
    const [formData, setFormData] = useState<Partial<CustomAgent>>({});
    const [childTemplateJson, setChildTemplateJson] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (agent) {
                setFormData(agent);
                if (agent.child_agent_template) {
                    setChildTemplateJson(JSON.stringify(agent.child_agent_template, null, 2));
                } else {
                    setChildTemplateJson('');
                }
            } else {
                setFormData({
                    id: `agent-${Date.now()}`,
                    name: '',
                    description: '',
                    instructions: '',
                    icon: 'UserCircle',
                    enabled: true,
                    delegation_enabled: false,
                    capabilities: [],
                    enabled_tools: [],
                });
                setChildTemplateJson('');
            }
            setJsonError(null);
        }
    }, [agent, isOpen]);

    const handleSave = () => {
        if (!formData.name?.trim() || !formData.instructions?.trim()) return;
        
        let finalData = { ...formData };

        if (childTemplateJson.trim()) {
            try {
                const parsedTemplate = JSON.parse(childTemplateJson);
                finalData.child_agent_template = parsedTemplate;
                setJsonError(null);
            } catch (e) {
                setJsonError("Invalid JSON in Child Agent Template.");
                return;
            }
        } else {
            delete finalData.child_agent_template;
        }

        onSave(finalData as CustomAgent);
    };

    const handleFormChange = (field: keyof CustomAgent, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleListChange = (field: 'capabilities' | 'enabled_tools', value: string) => {
        const list = value.split(',').map(item => item.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, [field]: list }));
    };

    const isEditing = !!agent;
    const title = isEditing ? 'Edit Agent Configuration' : 'Create New Agent';
    const buttonLabel = isEditing ? 'Save Changes' : 'Create Agent';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                    animate={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
                    exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full max-w-2xl bg-white/90 dark:bg-[#141414]/90 backdrop-blur-lg border-2 border-cyan-600/50 dark:border-[#00D4FF]/50 rounded-xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex-shrink-0 flex justify-between items-center mb-6 p-6 pb-0">
                            <div className="flex items-center gap-3">
                                <div className="text-cyan-600 dark:text-[#00D4FF]"><AgentsIcon className="w-6 h-6" /></div>
                                <h3 className="text-xl font-bold text-zinc-800 dark:text-white">{title}</h3>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="flex-grow overflow-y-auto p-6 space-y-4">
                            <Accordion title="Basic Information" defaultOpen={true}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Agent Name</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => handleFormChange('name', e.target.value)}
                                            placeholder="e.g., Python Code Generator"
                                            className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Agent Icon</label>
                                        <div className="grid grid-cols-6 gap-2 bg-black/5 dark:bg-black/40 p-2 rounded-lg border border-black/10 dark:border-white/10">
                                            {Object.keys(PREDEFINED_ICONS).filter(key => !['GEMINI', 'OLLAMA', 'HUGGING_FACE'].includes(key)).map(iconName => (
                                                <button 
                                                    key={iconName}
                                                    onClick={() => handleFormChange('icon', iconName)}
                                                    className={`p-2 rounded-lg transition-colors ${formData.icon === iconName ? 'bg-cyan-600/20 ring-2 ring-cyan-600 dark:bg-[#00D4FF]/30 dark:ring-[#00D4FF]' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
                                                >
                                                    <AgentIcon icon={iconName} className="w-6 h-6 mx-auto text-gray-500 dark:text-gray-300" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Agent Description</label>
                                        <textarea
                                            value={formData.description || ''}
                                            onChange={(e) => handleFormChange('description', e.target.value)}
                                            placeholder="A brief summary of the agent's purpose."
                                            rows={2}
                                            className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                        />
                                    </div>
                                </div>
                            </Accordion>
                             <Accordion title="Core Configuration" defaultOpen={true}>
                                <div className="space-y-4">
                                     <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Language Model Profile</label>
                                        <select 
                                            value={formData.llm_profile_id || ''}
                                            onChange={(e) => handleFormChange('llm_profile_id', e.target.value)}
                                            className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                        >
                                            <option value="">-- Select a Model --</option>
                                            {modelProviders.filter(p => p.enabled).map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.config.model_name} ({p.provider})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Agent Instructions / Initial Prompt</label>
                                        <textarea
                                            value={formData.instructions || ''}
                                            onChange={(e) => handleFormChange('instructions', e.target.value)}
                                            placeholder="Define the agent's purpose, capabilities, and personality..."
                                            rows={6}
                                            className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50 font-mono text-sm"
                                        />
                                    </div>
                                </div>
                             </Accordion>
                            <Accordion title="Capabilities & Tools">
                                 <div className="space-y-4">
                                     <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Capabilities (comma-separated)</label>
                                        <input
                                            type="text"
                                            value={(formData.capabilities || []).join(', ')}
                                            onChange={(e) => handleListChange('capabilities', e.target.value)}
                                            placeholder="e.g., PLANNING, CODE_EXECUTION"
                                            className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Enabled Tools (comma-separated)</label>
                                        <input
                                            type="text"
                                            value={(formData.enabled_tools || []).join(', ')}
                                            onChange={(e) => handleListChange('enabled_tools', e.target.value)}
                                            placeholder="e.g., CODE_INTERPRETER, GOOGLE_SEARCH"
                                            className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                        />
                                    </div>
                                 </div>
                            </Accordion>
                            <Accordion title="Delegation & Learning">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-3 rounded-lg">
                                        <label className="font-semibold text-zinc-800 dark:text-white">Enable Delegation</label>
                                        <input
                                            type="checkbox"
                                            checked={!!formData.delegation_enabled}
                                            onChange={(e) => handleFormChange('delegation_enabled', e.target.checked)}
                                            className="w-5 h-5 rounded bg-zinc-300 dark:bg-zinc-700 border-zinc-400 dark:border-zinc-600 text-cyan-600 dark:text-[#00D4FF] focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                        />
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Review Policy</label>
                                        <input
                                            type="text"
                                            value={formData.review_policy || ''}
                                            onChange={(e) => handleFormChange('review_policy', e.target.value)}
                                            placeholder="e.g., CRITIQUE_DEBUG_AND_REFINE"
                                            className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Child Agent Template (JSON)</label>
                                        <textarea
                                            value={childTemplateJson}
                                            onChange={(e) => setChildTemplateJson(e.target.value)}
                                            placeholder={'{\n  "llm_profile_id": "ollama-llama3-8b",\n  "default_tools": ["CODE_INTERPRETER"]\n}'}
                                            rows={8}
                                            className={`w-full bg-black/5 dark:bg-black/40 border rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 font-mono text-sm ${jsonError ? 'border-red-500 focus:ring-red-500' : 'border-black/10 dark:border-white/10 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50'}`}
                                        />
                                        {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
                                    </div>
                                </div>
                            </Accordion>
                        </div>

                        <footer className="flex-shrink-0 mt-2 p-6 pt-0 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={!formData.name?.trim() || !formData.instructions?.trim()}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-[#00D4FF] dark:hover:bg-[#00b8e6] dark:text-black font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {buttonLabel}
                            </button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};