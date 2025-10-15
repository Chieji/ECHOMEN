import React from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { Task, AgentStatus } from '../types';
import { SystemStatusIndicator } from './SystemStatusIndicator';

interface HeaderProps {
    onSettingsClick: () => void;
    onHistoryClick: () => void;
    onArtifactsClick: () => void;
    tasks: Task[];
    agentStatus: AgentStatus;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick, onHistoryClick, onArtifactsClick, tasks, agentStatus }) => {
    return (
        <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-lg border-b border-black/10 dark:border-white/10 p-4 flex justify-between items-center z-50">
            <div className="flex items-center gap-3">
                <LogoIcon className="w-8 h-8 text-cyan-600 dark:text-[#00D4FF]" />
                <h1 className="text-xl font-bold tracking-wider text-zinc-800 dark:text-gray-100">ECHO</h1>
                
                <div className="h-6 w-px bg-black/20 dark:bg-white/20 ml-2"></div>
                
                <button onClick={onArtifactsClick} title="View Artifacts" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <ArchiveBoxIcon className="w-5 h-5" />
                </button>
                <button onClick={onHistoryClick} title="View History" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <DocumentTextIcon className="w-5 h-5" />
                </button>
                <button onClick={onSettingsClick} title="Open Settings" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <SettingsIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex items-center gap-4">
                 <SystemStatusIndicator tasks={tasks} agentStatus={agentStatus} />
                <img
                    src="https://picsum.photos/100/100"
                    alt="User Avatar"
                    className="w-9 h-9 rounded-full border-2 border-cyan-600/50 dark:border-[#00D4FF]/50"
                />
            </div>
        </header>
    );
};