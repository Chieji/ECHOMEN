import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { CustomAgent } from '../types';
import { AgentsIcon } from './icons/AgentsIcon';
import { AgentIcon, PREDEFINED_ICONS } from './AgentIcon';

interface AgentCreationModalProps {
    agent: CustomAgent | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (agent: CustomAgent) => void;
}

export const AgentCreationModal: React.FC<AgentCreationModalProps> = ({ agent, isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [instructions, setInstructions] = useState('');
    const [icon, setIcon] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (agent) {
                setName(agent.name);
                setDescription(agent.description || '');
                setInstructions(agent.instructions);
                setIcon(agent.icon || '');
            } else {
                setName('');
                setDescription('');
                setInstructions('');
                setIcon('');
            }
        }
    }, [agent, isOpen]);

    const handleSave = () => {
        if (!name.trim() || !instructions.trim()) return;
        
        const agentData: CustomAgent = {
            id: agent?.id || `agent-${Date.now()}`,
            name,
            description,
            instructions,
            icon,
            enabled: agent?.enabled ?? true,
        };
        onSave(agentData);
    };

    const isEditing = !!agent;
    const title = isEditing ? 'Edit Agent' : 'Create New Agent';
    const buttonLabel = isEditing ? 'Save Changes' : 'Create Agent';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                    animate={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
                    exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full max-w-lg bg-[#141414] border-2 border-cyan-600/50 dark:border-[#00D4FF]/50 rounded-xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex-shrink-0 flex justify-between items-center mb-6 p-6 pb-0">
                            <div className="flex items-center gap-3">
                                <div className="text-cyan-600 dark:text-[#00D4FF]"><AgentsIcon className="w-6 h-6" /></div>
                                <h3 className="text-xl font-bold text-white">{title}</h3>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="flex-grow overflow-y-auto p-6 space-y-4">
                            <div>
                                <label htmlFor="agentName" className="block text-sm font-medium text-gray-400 mb-1">Agent Name</label>
                                <input
                                    type="text"
                                    id="agentName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Python Code Generator"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                />
                            </div>

                             <div>
                                <label htmlFor="agentDescription" className="block text-sm font-medium text-gray-400 mb-1">Agent Description</label>
                                <textarea
                                    id="agentDescription"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="A brief summary of the agent's purpose."
                                    rows={2}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                />
                            </div>
                            
                            <div className="flex gap-4">
                                <div className="w-2/3">
                                    <label htmlFor="agentIconUrl" className="block text-sm font-medium text-gray-400 mb-1">Agent Icon</label>
                                    <div className="grid grid-cols-5 gap-2 mb-2">
                                        {Object.keys(PREDEFINED_ICONS).map(iconName => (
                                            <button 
                                                key={iconName}
                                                onClick={() => setIcon(iconName)}
                                                className={`p-2 rounded-lg transition-colors ${icon === iconName ? 'bg-cyan-600/20 ring-2 ring-cyan-600 dark:bg-[#00D4FF]/30 dark:ring-[#00D4FF]' : 'bg-black/40 hover:bg-black/80'}`}
                                            >
                                                <AgentIcon icon={iconName} className="w-6 h-6 mx-auto text-gray-300" />
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        id="agentIconUrl"
                                        value={icon.startsWith('http') ? icon : ''}
                                        onChange={(e) => setIcon(e.target.value)}
                                        placeholder="Or paste image URL..."
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50 text-sm"
                                    />
                                </div>
                                <div className="w-1/3 flex flex-col items-center justify-center bg-black/40 rounded-lg p-2">
                                     <span className="text-sm text-gray-400 mb-2">Preview</span>
                                     <AgentIcon icon={icon} className="w-16 h-16 text-cyan-600 dark:text-[#00D4FF]" />
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="agentInstructions" className="block text-sm font-medium text-gray-400 mb-1">Agent Instructions</label>
                                <textarea
                                    id="agentInstructions"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="Define the agent's purpose, capabilities, and personality..."
                                    rows={6}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-[#00D4FF]/50"
                                />
                            </div>
                        </div>

                        <footer className="flex-shrink-0 mt-2 p-6 pt-0 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={!name.trim() || !instructions.trim()}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-[#00D4FF] dark:hover:bg-[#00b8e6] dark:text-black font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
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