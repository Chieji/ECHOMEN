import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchView } from './SearchView';
import { Artifact, LogEntry } from '../types';
import { Connection } from '../lib/linkParser';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { LinkIcon } from './icons/LinkIcon';
import { BrainIcon } from './icons/BrainIcon';
import { Squares2X2Icon } from './icons/Squares2X2Icon';
import { MemoryPanel } from './MemoryPanel';
import { ContextPanel } from './ContextPanel';
import { Task } from '../types';

interface IntelligenceSidebarProps {
    artifacts: Artifact[];
    logs: LogEntry[];
    backlinks: Connection[];
    tasks: Task[];
    currentNoteTitle?: string;
    onSelectResult: (result: any) => void;
}

/**
 * IntelligenceSidebar - Clean right panel for search and links
 */
export const IntelligenceSidebar: React.FC<IntelligenceSidebarProps> = ({
    artifacts, logs, backlinks, tasks, currentNoteTitle, onSelectResult
}) => {
    const [view, setView] = useState<'search' | 'links' | 'memory' | 'context'>('search');

    return (
        <div className="w-80 h-full bg-echo-surface border-l border-echo-border flex flex-col">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-echo-border">
                <button
                    onClick={() => setView('search')}
                    title="Search"
                    className={`flex-1 py-2.5 flex flex-col items-center gap-1 text-xs transition-colors ${view === 'search' ? 'text-echo-cyan border-b-2 border-echo-cyan' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <MagnifyingGlassIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setView('links')}
                    title="Links"
                    className={`flex-1 py-2.5 flex flex-col items-center gap-1 text-xs transition-colors ${view === 'links' ? 'text-echo-cyan border-b-2 border-echo-cyan' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <LinkIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setView('memory')}
                    title="Memory"
                    className={`flex-1 py-2.5 flex flex-col items-center gap-1 text-xs transition-colors ${view === 'memory' ? 'text-echo-cyan border-b-2 border-echo-cyan' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <BrainIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setView('context')}
                    title="Task Tree"
                    className={`flex-1 py-2.5 flex flex-col items-center gap-1 text-xs transition-colors ${view === 'context' ? 'text-echo-cyan border-b-2 border-echo-cyan' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Squares2X2Icon className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-grow overflow-hidden">
                <AnimatePresence mode="wait">
                    {view === 'search' ? (
                        <motion.div
                            key="search"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col"
                        >
                            <SearchView
                                artifacts={artifacts}
                                logs={logs}
                                onSelect={onSelectResult}
                            />
                        </motion.div>
                    ) : view === 'links' ? (
                        <motion.div
                            key="links"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col p-3"
                        >
                            <header className="mb-3">
                                <h3 className="text-xs font-medium text-gray-400 mb-1">Backlinks</h3>
                                <p className="text-[10px] text-gray-600">
                                    {currentNoteTitle ? `Mentioned in notes` : 'No note selected'}
                                </p>
                            </header>

                            <div className="space-y-2 overflow-y-auto">
                                {backlinks.length > 0 ? (
                                    backlinks.map((link, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-echo-surface-elevated border border-echo-border rounded p-2.5 cursor-pointer hover:border-gray-600 transition-colors"
                                        >
                                            <p className="text-xs font-medium text-gray-300 mb-1">{link.sourceId}</p>
                                            <p className="text-[10px] text-gray-500 line-clamp-2">
                                                {link.context}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-xs text-gray-600">
                                            No links found
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : view === 'memory' ? (
                        <motion.div
                            key="memory"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col"
                        >
                            <MemoryPanel />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="context"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col"
                        >
                            <ContextPanel tasks={tasks} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <footer className="p-3 border-t border-echo-border flex items-center justify-between text-[10px] text-gray-600">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Ready</span>
                </div>
                <span>{artifacts.length + logs.length} items</span>
            </footer>
        </div>
    );
};
