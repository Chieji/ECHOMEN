import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { ModelProviderConfig } from '../types';
import { CpuChipIcon } from './icons/CpuChipIcon';

interface ModelProviderConfigurationModalProps {
    providerConfig: ModelProviderConfig | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (provider: ModelProviderConfig) => void;
}

export const ModelProviderConfigurationModal: React.FC<ModelProviderConfigurationModalProps> = ({ providerConfig, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<ModelProviderConfig>>({});

    useEffect(() => {
        if (isOpen) {
            if (providerConfig) {
                setFormData(providerConfig);
            } else {
                setFormData({
                    id: `model-provider-${Date.now()}`,
                    provider: 'OLLAMA',
                    type: 'LOCAL',
                    integration_layer: 'LANGCHAIN',
                    enabled: true,
                    config: { model_name: '' }
                });
            }
        }
    }, [providerConfig, isOpen]);

    const handleSave = () => {
        if (!formData.config?.model_name?.trim()) return;
        onSave(formData as ModelProviderConfig);
    };
    
    const handleChange = (field: keyof ModelProviderConfig, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleConfigChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            config: { 
                ...(prev.config || { model_name: '' }), 
                [field]: value 
            } as ModelProviderConfig['config']
        }));
    };

    const isEditing = !!providerConfig;
    const title = isEditing ? 'Edit Model Provider' : 'Add New Model Provider';
    const buttonLabel = isEditing ? 'Save Changes' : 'Add Provider';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
                    animate={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full max-w-lg bg-white dark:bg-[#141414] border-2 border-cyan-600/50 dark:border-echo-cyan/50 rounded-xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <header className="flex-shrink-0 flex justify-between items-center mb-6 p-6 pb-0">
                            <div className="flex items-center gap-3">
                                <div className="text-cyan-600 dark:text-echo-cyan"><CpuChipIcon className="w-6 h-6" /></div>
                                <h3 className="text-xl font-bold text-zinc-800 dark:text-white">{title}</h3>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="flex-grow overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Provider</label>
                                    <select value={formData.provider} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('provider', e.target.value)} className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-echo-cyan/50">
                                        <option value="GEMINI">GEMINI</option>
                                        <option value="OLLAMA">OLLAMA</option>
                                        <option value="HUGGING_FACE">HUGGING_FACE</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                                    <select value={formData.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('type', e.target.value)} className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-echo-cyan/50">
                                        <option value="LOCAL">LOCAL</option>
                                        <option value="CLOUD">CLOUD</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Model Name</label>
                                <input
                                    type="text"
                                    value={formData.config?.model_name || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('model_name', e.target.value)}
                                    placeholder="e.g., llama3:8b or gemini-2.5-flash"
                                    className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-echo-cyan/50"
                                />
                            </div>

                             <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
                                    placeholder="A brief summary of the model's purpose."
                                    rows={2}
                                    className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-echo-cyan/50"
                                />
                            </div>

                             <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">API Key Env Var (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.config?.api_key_env_var || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('api_key_env_var', e.target.value)}
                                    placeholder="e.g., GEMINI_API_KEY"
                                    className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-echo-cyan/50"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Base URL (for Local, e.g., Ollama)</label>
                                <input
                                    type="text"
                                    value={formData.config?.base_url || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('base_url', e.target.value)}
                                    placeholder="http://localhost:11434/api/generate"
                                    className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-echo-cyan/50"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Endpoint URL (for Cloud)</label>
                                <input
                                    type="text"
                                    value={formData.config?.endpoint_url || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('endpoint_url', e.target.value)}
                                    placeholder="https://api-inference.huggingface.co/models/..."
                                    className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 dark:focus:ring-echo-cyan/50"
                                />
                            </div>
                        </div>

                        <footer className="flex-shrink-0 mt-2 p-6 pt-0 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={!formData.config?.model_name?.trim()}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-echo-cyan dark:hover:bg-echo-cyan/80 dark:text-black font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
