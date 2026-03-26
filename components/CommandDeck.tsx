import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandCenter } from './CommandCenter';
import { ExecutionDashboard } from './ExecutionDashboard';
import { ArtifactsPanel } from './ArtifactsPanel';
import { EchoBrain } from './EchoBrain';
import { Task, LogEntry, Artifact, Service, SessionStats, Message } from '../types';
import { Squares2X2Icon } from './icons/Squares2X2Icon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { BrainIcon } from './icons/BrainIcon';
import { IntelligenceSidebar } from './IntelligenceSidebar';
import { NoteEditor } from './NoteEditor';
import { AppDeployments } from './AppDeployments';
import { RocketIcon } from './icons/RocketIcon';
import { TerminalDisplay } from './TerminalDisplay';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { buildBacklinkMap } from '../lib/linkParser';
import { HistoryPanel } from './HistoryPanel';
import { ClockIcon } from './icons/ClockIcon';

interface CommandDeckProps {
    tasks: Task[];
    logs: LogEntry[];
    artifacts: Artifact[];
    services: Service[];
    sessionStats: SessionStats;
    messages: Message[];
    onCommand: (prompt: string) => void;
    onCancelTask: (taskId: string) => void;
    onClearChat: () => void;
}

export const CommandDeck = ({
    tasks, logs, artifacts, services, sessionStats, messages, onCommand, onCancelTask, onClearChat
}: CommandDeckProps): React.ReactElement => {
    const [activeTab, setActiveTab] = useState<'board' | 'artifacts' | 'history' | 'brain' | 'deployments' | 'terminal'>('board');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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
            <div className="flex-grow flex flex-col h-full gap-4 p-4 min-w-0">
                {/* Top Row: The Brain & The Input */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-shrink-0">
                    <div className="xl:col-span-4 h-full">
                        <EchoBrain
                            services={services}
                            activeTasks={tasks}
                            logs={logs}
                            sessionStats={sessionStats}
                        />
                    </div>
                    <div className="xl:col-span-8 flex flex-col justify-center">
                        <div className="echo-surface rounded-lg p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h1 className="text-lg font-semibold text-white">Command</h1>
                                <div className="flex bg-echo-surface-elevated rounded-md p-0.5">
                                    <button
                                        onClick={() => setActiveTab('board')}
                                        className={`px-3 py-1 text-xs rounded transition-colors ${activeTab !== 'brain' ? 'bg-echo-cyan text-black' : 'text-gray-400'}`}
                                    >
                                        Action
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('brain')}
                                        className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'brain' ? 'bg-echo-cyan text-black' : 'text-gray-400'}`}
                                    >
                                        Brain
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">Enter your request...</p>
                            <CommandCenter onSendCommand={onCommand} />
                        </div>
                    </div>
                </div>

                {/* Main Area: Integrated Workspace */}
                <div className="flex-grow flex flex-col min-h-0 bg-echo-surface border border-echo-border rounded-lg overflow-hidden">
                    {/* Navigation Bar */}
                    <nav className="flex items-center justify-between px-4 py-2 border-b border-echo-border bg-echo-surface-elevated" role="tablist" aria-label="Main navigation">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setActiveTab('board')}
                                role="tab"
                                aria-selected={activeTab === 'board'}
                                tabIndex={activeTab === 'board' ? 0 : -1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setActiveTab('board');
                                    }
                                }}
                                className={`flex items-center gap-2 text-xs font-medium transition-colors ${activeTab === 'board' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <Squares2X2Icon className="w-4 h-4" />
                                Execution
                            </button>
                            <button
                                onClick={() => setActiveTab('artifacts')}
                                role="tab"
                                aria-selected={activeTab === 'artifacts'}
                                tabIndex={activeTab === 'artifacts' ? 0 : -1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setActiveTab('artifacts');
                                    }
                                }}
                                className={`flex items-center gap-2 text-xs font-medium transition-colors ${activeTab === 'artifacts' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <ArchiveBoxIcon className="w-4 h-4" />
                                Artifacts ({artifacts.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('brain')}
                                role="tab"
                                aria-selected={activeTab === 'brain'}
                                tabIndex={activeTab === 'brain' ? 0 : -1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setActiveTab('brain');
                                    }
                                }}
                                className={`flex items-center gap-2 text-xs font-medium transition-colors ${activeTab === 'brain' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <BrainIcon className="w-4 h-4" />
                                Notes
                            </button>
                            <button
                                onClick={() => setActiveTab('deployments')}
                                role="tab"
                                aria-selected={activeTab === 'deployments'}
                                tabIndex={activeTab === 'deployments' ? 0 : -1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setActiveTab('deployments');
                                    }
                                }}
                                className={`flex items-center gap-2 text-xs font-medium transition-colors ${activeTab === 'deployments' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <RocketIcon className="w-4 h-4" />
                                Deployments
                            </button>
                            <button
                                onClick={() => setActiveTab('terminal')}
                                role="tab"
                                aria-selected={activeTab === 'terminal'}
                                tabIndex={activeTab === 'terminal' ? 0 : -1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setActiveTab('terminal');
                                    }
                                }}
                                className={`flex items-center gap-2 text-xs font-medium transition-colors ${activeTab === 'terminal' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <CommandLineIcon className="w-4 h-4" />
                                Terminal
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsHistoryOpen(true)}
                                className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
                                aria-label="Open history"
                            >
                                <ClockIcon className="w-4 h-4" />
                                History
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-xs text-gray-500">Ready</span>
                            </div>
                        </div>
                    </nav>

                    {/* Content Container */}
                    <div className="flex-grow overflow-hidden relative">
                        <AnimatePresence mode="wait">
                            {activeTab === 'board' && (
                                <motion.div
                                    key="board"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full"
                                >
                                    <ExecutionDashboard
                                        tasks={tasks}
                                        liveLogs={logs}
                                        onCancelTask={onCancelTask}
                                    />
                                </motion.div>
                            )}
                            {activeTab === 'artifacts' && (
                                <motion.div
                                    key="artifacts"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full p-4"
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
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full p-4"
                                >
                                    <NoteEditor
                                        initialContent={currentNoteContent}
                                        onSave={setCurrentNoteContent}
                                        availableNotes={artifacts.map(a => ({ id: a.id, title: a.title }))}
                                    />
                                </motion.div>
                            )}
                            {activeTab === 'deployments' && (
                                <motion.div
                                    key="deployments"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full p-4 overflow-y-auto"
                                >
                                    <div className="echo-surface border border-echo-border rounded-lg p-4 h-full">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-semibold text-white">App Deployments</h2>
                                            <span className="text-xs text-gray-500">Manage your deployed applications</span>
                                        </div>
                                        <AppDeployments />
                                    </div>
                                </motion.div>
                            )}
                            {activeTab === 'terminal' && (
                                <motion.div
                                    key="terminal"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full p-4 overflow-y-auto"
                                >
                                    <div className="echo-surface border border-echo-border rounded-lg p-4 h-full">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-semibold text-white">Terminal</h2>
                                            <span className="text-xs text-gray-500">Command reference</span>
                                        </div>
                                        <TerminalDisplay />
                                    </div>
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
                tasks={tasks}
                currentNoteTitle="Active Note"
                onSelectResult={(res) => console.log("Selected result:", res)}
            />

            {/* History Panel Modal */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <HistoryPanel
                        tasks={tasks}
                        messages={messages}
                        onClose={() => setIsHistoryOpen(false)}
                        onClearChat={onClearChat}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
