import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchView } from './SearchView';
import { Artifact, LogEntry } from '../types';
import { Connection } from '../lib/linkParser';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { LinkIcon } from './icons/LinkIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface IntelligenceSidebarProps {
    artifacts: Artifact[];
    logs: LogEntry[];
    backlinks: Connection[];
    currentNoteTitle?: string;
    onSelectResult: (result: any) => void;
}

/**
 * IntelligenceSidebar Component
 * 
 * The vertical information hub for ECHO. Integrates Global Search
 * and Bidirectional Linking into a persistent sidebar.
 */
export const IntelligenceSidebar: React.FC<IntelligenceSidebarProps> = ({ 
    artifacts, logs, backlinks, currentNoteTitle, onSelectResult 
}) => {
    const [view, setView] = useState<'search' | 'links'>('search');

    return (
        <div className="w-80 h-full bg-[#09090B] border-l border-white/10 flex flex-col shadow-2xl backdrop-blur-3xl">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-white/5 bg-white/5">
                <button 
                    onClick={() => setView('search')}
                    className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${view === 'search' ? 'text-[#00D4FF] bg-white/5' : 'text-gray-500 hover:text-white'}`}
                >
                    <MagnifyingGlassIcon className="w-5 h-5" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Recall</span>
                </button>
                <button 
                    onClick={() => setView('links')}
                    className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${view === 'links' ? 'text-[#00D4FF] bg-white/5' : 'text-gray-500 hover:text-white'}`}
                >
                    <LinkIcon className="w-5 h-5" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Echoes</span>
                </button>
            </div>

            <div className="flex-grow overflow-hidden p-4 relative">
                <AnimatePresence mode="wait">
                    {view === 'search' ? (
                        <motion.div 
                            key="search"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full flex flex-col"
                        >
                            <SearchView 
                                artifacts={artifacts} 
                                logs={logs} 
                                onSelect={onSelectResult} 
                            />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="links"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full flex flex-col"
                        >
                            <header className="mb-6 px-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Backlinks</h3>
                                <p className="text-[10px] text-cyan-500 font-mono italic">
                                    {currentNoteTitle ? `Mentioned in these notes:` : 'No active note selected'}
                                </p>
                            </header>

                            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                {backlinks.length > 0 ? (
                                    backlinks.map((link, idx) => (
                                        <div 
                                            key={idx}
                                            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-[#00D4FF]/30 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <SparklesIcon className="w-3 h-3 text-[#00D4FF]" />
                                                <p className="text-xs font-bold text-gray-200 group-hover:text-[#00D4FF] transition-colors">{link.sourceId}</p>
                                            </div>
                                            <p className="text-[10px] text-gray-500 italic font-mono leading-relaxed">
                                                "{link.context}"
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 px-4">
                                        <p className="text-gray-600 text-xs font-mono italic">
                                            No bidirectional connections found for this entity.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <footer className="p-4 border-t border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Neural Engine Active</span>
                </div>
                <div className="text-[9px] text-gray-600 font-mono">
                    INDEXED: {artifacts.length + logs.length}
                </div>
            </footer>
        </div>
    );
};
