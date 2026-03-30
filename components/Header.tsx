import React, { ReactNode } from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { MessageBubbleIcon } from './icons/MessageBubbleIcon';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { Task, AgentStatus, SessionStats, AgentMode } from '../types';
import { SystemStatusIndicator } from './SystemStatusIndicator';
import { TokenUsageIndicator } from './TokenUsageIndicator';

interface HeaderProps {
    onSettingsClick: () => void;
    onHistoryClick: () => void;
    onArtifactsClick: () => void;
    tasks: Task[];
    agentStatus: AgentStatus;
    sessionStats: SessionStats;
    currentMode: AgentMode;
    onModeChange: (mode: AgentMode) => void;
}

export const Header = ({ onSettingsClick, onHistoryClick, onArtifactsClick, tasks, agentStatus, sessionStats, currentMode, onModeChange }: HeaderProps): ReactNode => {
    return (
        <header className="flex-none h-14 bg-echo-surface border-b border-echo-border px-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <LogoIcon className="w-6 h-6 text-echo-cyan" />
                <h1 className="text-base font-semibold text-white">ECHO</h1>

                <div className="h-5 w-px bg-echo-border mx-1"></div>

                {/* Mode Toggle */}
                <div className="flex items-center bg-echo-void rounded-lg p-1 border border-echo-border" role="group" aria-label="Agent mode selection">
                    <button
                        onClick={() => onModeChange(AgentMode.ACTION)}
                        aria-pressed={currentMode === AgentMode.ACTION}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            currentMode === AgentMode.ACTION
                                ? 'bg-echo-cyan text-black'
                                : 'text-gray-400 hover:text-white hover:bg-echo-surface-elevated'
                        }`}
                        title="Action Mode"
                    >
                        <CommandLineIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Action</span>
                    </button>
                    <button
                        onClick={() => onModeChange(AgentMode.CHAT)}
                        aria-pressed={currentMode === AgentMode.CHAT}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            currentMode === AgentMode.CHAT
                                ? 'bg-echo-cyan text-black'
                                : 'text-gray-400 hover:text-white hover:bg-echo-surface-elevated'
                        }`}
                        title="Chat Mode"
                    >
                        <MessageBubbleIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Chat</span>
                    </button>
                </div>

                <button onClick={onArtifactsClick} title="View Artifacts" aria-label="View artifacts" className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-echo-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                    <ArchiveBoxIcon className="w-5 h-5" />
                </button>
                <button onClick={onHistoryClick} title="View History" aria-label="View history" className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-echo-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                    <DocumentTextIcon className="w-5 h-5" />
                </button>
                <button onClick={onSettingsClick} title="Open Settings" aria-label="Open settings" className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-echo-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                    <SettingsIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex items-center gap-3">
                 <SystemStatusIndicator tasks={tasks} agentStatus={agentStatus} />
                 <div className="h-5 w-px bg-echo-border"></div>
                 <TokenUsageIndicator stats={sessionStats} />
                <img
                    src="https://picsum.photos/100/100"
                    alt="User profile"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-echo-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
        </header>
    );
};
