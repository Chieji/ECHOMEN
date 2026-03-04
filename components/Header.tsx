import React from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { Task, AgentStatus, SessionStats } from '../types';
import { SystemStatusIndicator } from './SystemStatusIndicator';
import { TokenUsageIndicator } from './TokenUsageIndicator';

interface HeaderProps {
    onSettingsClick: () => void;
    onHistoryClick: () => void;
    onArtifactsClick: () => void;
    tasks: Task[];
    agentStatus: AgentStatus;
    sessionStats: SessionStats;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick, onHistoryClick, onArtifactsClick, tasks, agentStatus, sessionStats }) => {
    return (
        <header className="flex-none h-14 bg-echo-surface border-b border-echo-border px-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <LogoIcon className="w-6 h-6 text-echo-cyan" />
                <h1 className="text-base font-semibold text-white">ECHO</h1>

                <div className="h-5 w-px bg-echo-border mx-1"></div>

                <button onClick={onArtifactsClick} title="View Artifacts" className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-echo-surface-elevated transition-colors">
                    <ArchiveBoxIcon className="w-5 h-5" />
                </button>
                <button onClick={onHistoryClick} title="View History" className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-echo-surface-elevated transition-colors">
                    <DocumentTextIcon className="w-5 h-5" />
                </button>
                <button onClick={onSettingsClick} title="Open Settings" className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-echo-surface-elevated transition-colors">
                    <SettingsIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex items-center gap-3">
                 <SystemStatusIndicator tasks={tasks} agentStatus={agentStatus} />
                 <div className="h-5 w-px bg-echo-border"></div>
                 <TokenUsageIndicator stats={sessionStats} />
                <img
                    src="https://picsum.photos/100/100"
                    alt="User"
                    className="w-8 h-8 rounded-full border border-echo-border"
                />
            </div>
        </header>
    );
};
