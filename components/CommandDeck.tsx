import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandCenter } from './CommandCenter';
import { ExecutionDashboard } from './ExecutionDashboard';
import { ArtifactsPanel } from './ArtifactsPanel';
import { HistoryPanel } from './HistoryPanel';
import { EchoBrain } from './EchoBrain';
import { Task, LogEntry, Artifact, Service, SessionStats } from '../types';
import { Squares2X2Icon } from './icons/Squares2X2Icon';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { ClockIcon } from './icons/ClockIcon';
import { BrainIcon } from './icons/BrainIcon';
import { IntelligenceSidebar } from './IntelligenceSidebar';
import { NoteEditor } from './NoteEditor';
import { buildBacklinkMap, Connection } from '../lib/linkParser';

interface CommandDeckProps {
    tasks: Task[];
    logs: LogEntry[];
    artifacts: Artifact[];
    services: Service[];
    sessionStats: SessionStats;
    onCommand: (prompt: string) => void;
    onCancelTask: (taskId: string) => void;
}

export const CommandDeck: React.FC<CommandDeckProps> = ({ 
    tasks, logs, artifacts, services, sessionStats, onCommand, onCancelTask 
}) => {
    const [activeTab, setActiveTab] = useState<'board' | 'artifacts' | 'history' | 'brain'>('board');
    const [currentNoteContent, setCurrentNoteContent] = useState('');
    
    // Neural Link: Calculate backlinks in real-time
    const backlinkMap = useMemo(() => {
        const items = artifacts.map(a => ({ id: a.title, content: a.content }));
        // Add current note to the map
        items.push({ id: 'Active Note', content: currentNoteContent });
        return buildBacklinkMap(items);
    }, [artifacts, currentNoteContent]);

    const activeBacklinks = backlinkMap['Active Note'] || [];

    return (
        <div className="flex h-full w-full bg-echo-void overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-grow flex flex-col h-full gap-6 p-6 min-w-0">
                {/* Top Row: The Brain & The Input */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-shrink-0">
                    <div className="xl:col-span-4 h-full">
                        <EchoBrain 
                            services={services} 
                            activeTasks={tasks} 
                            logs={logs} 
                            sessionStats={sessionStats} 
                        />
                    </div>
                    <div className="xl:col-span-8 flex flex-col justify-center">
                        <div className="echo-glass rounded-2xl p-8 shadow-neon">
                            <div className="flex items-center justify-between mb-2">
                                <h1 className="text-2xl font-bold text-white tracking-tight">System Command</h1>
                                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                                    <button 
                                        onClick={() => setActiveTab('board')}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab !== 'brain' ? 'bg-echo-cyan text-black shadow-neon' : 'text-gray-500'}`}
                                    >
                                        ACTION
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('brain')}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab === 'brain' ? 'bg-echo-cyan text-black shadow-neon' : 'text-gray-500'}`}
                                    >
                                        BRAIN
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mb-6 font-mono uppercase tracking-widest">Awaiting high-priority objectives...</p>
                            <CommandCenter onSendCommand={onCommand} />
                        </div>
                    </div>
                </div>

                {/* Main Area: Integrated Workspace */}
                <div className="flex-grow flex flex-col min-h-0 bg-echo-void border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Navigation Bar */}
                    <nav className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/5">
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={() => setActiveTab('board')}
                                className={`flex items-center gap-2 text-xs font-bold transition-all ${activeTab === 'board' ? 'text-echo-cyan' : 'text-gray-500 hover:text-white'}`}
                            >
                                <Squares2X2Icon className="w-4 h-4" />
                                EXECUTION BOARD
                            </button>
                            <button 
                                onClick={() => setActiveTab('artifacts')}
                                className={`flex items-center gap-2 text-xs font-bold transition-all ${activeTab === 'artifacts' ? 'text-echo-cyan' : 'text-gray-500 hover:text-white'}`}
                            >
                                <ArchiveBoxIcon className="w-4 h-4" />
                                ARTIFACTS ({artifacts.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('brain')}
                                className={`flex items-center gap-2 text-xs font-bold transition-all ${activeTab === 'brain' ? 'text-echo-cyan' : 'text-gray-500 hover:text-white'}`}
                            >
                                <BrainIcon className="w-4 h-4" />
                                SECOND BRAIN
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-neon" />
                            <span className="text-[10px] text-gray-400 font-mono uppercase">Neural Link: Stable</span>
                        </div>
                    </nav>

                    {/* Content Container */}
                    <div className="flex-grow overflow-hidden relative">
                        <AnimatePresence mode="wait">
                            {activeTab === 'board' && (
                                <motion.div 
                                    key="board"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="h-full"
                                >
                                    <ExecutionDashboard 
                                        tasks={tasks} 
                                        logs={logs} 
                                        onCancelTask={onCancelTask} 
                                    />
                                </motion.div>
                            )}
                            {activeTab === 'artifacts' && (
                                <motion.div 
                                    key="artifacts"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.02 }}
                                    className="h-full p-6"
                                >
                                    <ArtifactsPanel 
                                        artifacts={artifacts} 
                                        onClose={() => setActiveTab('board')} 
                                    />
                                </motion.div>
                            )}
                            {activeTab === 'brain' && (
                                <motion.div 
                                    key="brain"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="h-full p-6"
                                >
                                    <NoteEditor 
                                        initialContent={currentNoteContent}
                                        onSave={setCurrentNoteContent}
                                        availableNotes={artifacts.map(a => ({ id: a.id, title: a.title }))}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Persistence Sidebar */}
            <IntelligenceSidebar 
                artifacts={artifacts}
                logs={logs}
                backlinks={activeBacklinks}
                currentNoteTitle="Active Note"
                onSelectResult={(res) => console.log("Selected result:", res)}
            />
        </div>
    );
};
