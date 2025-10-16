import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { BrainIcon } from './icons/BrainIcon';

interface PlaybookCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, description: string) => void;
    suggestedName: string;
    triggerPrompt: string;
}

export const PlaybookCreationModal: React.FC<PlaybookCreationModalProps> = ({ isOpen, onClose, onSave, suggestedName, triggerPrompt }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(suggestedName);
            setDescription(''); // Reset description on open
        }
    }, [isOpen, suggestedName]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim(), description.trim());
        }
    };
    
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
                        className="w-full max-w-lg bg-white/90 dark:bg-[#141414]/90 backdrop-blur-lg border-2 border-[#8B5CF6]/50 rounded-xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex-shrink-0 flex justify-between items-center mb-6 p-6 pb-0">
                            <div className="flex items-center gap-3">
                                <div className="text-[#8B5CF6]"><BrainIcon className="w-6 h-6" /></div>
                                <h3 className="text-xl font-bold text-zinc-800 dark:text-white">Create New Playbook</h3>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="flex-grow overflow-y-auto p-6 space-y-4">
                             <div className="p-3 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">ORIGINAL PROMPT:</p>
                                <p className="text-sm font-medium text-zinc-800 dark:text-white mt-1">"{triggerPrompt}"</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Playbook Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="A short, memorable name for this task"
                                    className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What does this playbook do? (Optional)"
                                    rows={3}
                                    className="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                                />
                            </div>
                        </div>

                        <footer className="flex-shrink-0 mt-2 p-6 pt-0 flex justify-end items-center gap-4">
                            <button
                                onClick={onClose}
                                className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!name.trim()}
                                className="bg-[#8B5CF6] hover:bg-[#7c4ee3] text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Playbook
                            </button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
