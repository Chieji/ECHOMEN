import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BrainIcon } from './icons/BrainIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';

interface CommandAction {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    shortcut?: string;
    handler: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onAction: (id: string) => void;
}

/**
 * CommandPalette Component (ECHO-P)
 * 
 * The elite keyboard-driven command interface.
 * Provides instant access to tools, modes, and global search.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onAction }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const actions: CommandAction[] = useMemo(() => [
        { id: 'mode-action', title: 'Switch to Action Mode', description: 'Focus on task execution and agent logs', icon: <CommandLineIcon className="w-4 h-4" />, shortcut: 'A', handler: () => onAction('mode-action') },
        { id: 'mode-brain', title: 'Switch to Brain Mode', description: 'Open the Second Brain editor and wiki-links', icon: <BrainIcon className="w-4 h-4" />, shortcut: 'B', handler: () => onAction('mode-brain') },
        { id: 'spawn-agent', title: 'Spawn Specialist Agent', description: 'Create a new sub-agent for a specific task', icon: <SparklesIcon className="w-4 h-4" />, shortcut: 'S', handler: () => onAction('spawn-agent') },
        { id: 'open-settings', title: 'Open System Settings', description: 'Manage API keys, memory, and MCPs', icon: <Cog6ToothIcon className="w-4 h-4" />, shortcut: ',', handler: () => onAction('open-settings') },
    ], [onAction]);

    const filteredActions = useMemo(() => {
        return actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()) || a.description.toLowerCase().includes(query.toLowerCase()));
    }, [actions, query]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredActions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                filteredActions[selectedIndex]?.handler();
                onClose();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredActions, selectedIndex, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="relative w-full max-w-2xl bg-[#18181B] border border-white/10 rounded-2xl shadow-4xl overflow-hidden"
                    >
                        <div className="p-4 border-b border-white/5 flex items-center gap-4">
                            <MagnifyingGlassIcon className="w-6 h-6 text-gray-500" />
                            <input 
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Execute a command or search brain..."
                                className="w-full bg-transparent text-white placeholder-gray-600 focus:outline-none text-lg"
                            />
                            <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-gray-500 font-mono">ESC</div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto p-2">
                            {filteredActions.map((action, idx) => (
                                <div 
                                    key={action.id}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    onClick={() => { action.handler(); onClose(); }}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${idx === selectedIndex ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/20' : 'border border-transparent hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${idx === selectedIndex ? 'text-[#00D4FF]' : 'text-gray-500'}`}>
                                            {action.icon}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${idx === selectedIndex ? 'text-white' : 'text-gray-300'}`}>{action.title}</p>
                                            <p className="text-xs text-gray-500">{action.description}</p>
                                        </div>
                                    </div>
                                    {action.shortcut && (
                                        <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-gray-500 font-mono group-hover:text-white transition-colors">
                                            {action.shortcut}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {filteredActions.length === 0 && (
                                <div className="py-12 text-center">
                                    <p className="text-gray-600 font-mono italic">No matching commands found.</p>
                                </div>
                            )}
                        </div>

                        <footer className="p-3 bg-white/5 border-t border-white/5 flex items-center justify-center gap-6">
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-gray-400">↑↓</span> to navigate
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-gray-400">ENTER</span> to select
                            </div>
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
