import React, { useMemo } from 'react';
import { Task, AgentStatus } from '../types';
import { StopIcon } from './icons/StopIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { BrainIcon } from './icons/BrainIcon';

interface ExecutionStatusBarProps {
    tasks: Task[];
    agentStatus: AgentStatus;
    onStopExecution: () => void;
}

export const ExecutionStatusBar: React.FC<ExecutionStatusBarProps> = ({ tasks, agentStatus, onStopExecution }) => {
    const { statusText, Icon } = useMemo(() => {
        const executingTask = tasks.find(t => t.status === 'Executing');
        const taskTitle = executingTask ? ` - ${executingTask.title}` : '';

        switch (agentStatus) {
            case AgentStatus.PERCEIVE:
                return {
                    statusText: `PERCEIVE: Gathering context${taskTitle}`,
                    Icon: <SpinnerIcon className="w-4 h-4 animate-spin text-blue-400" />,
                };
            case AgentStatus.REASON:
                return {
                    statusText: `REASON: Planning next steps${taskTitle}`,
                    Icon: <BrainIcon className="w-4 h-4 text-purple-400 animate-pulse" />,
                };
            case AgentStatus.ACT:
                return {
                    statusText: `ACT: Executing tool${taskTitle}`,
                    Icon: <SpinnerIcon className="w-4 h-4 animate-spin text-echo-cyan" />,
                };
            case AgentStatus.OBSERVE:
                return {
                    statusText: `OBSERVE: Recording outcome${taskTitle}`,
                    Icon: <SpinnerIcon className="w-4 h-4 animate-spin text-green-400" />,
                };
            case AgentStatus.REFLECT:
                return {
                    statusText: `REFLECT: Learning from result${taskTitle}`,
                    Icon: <BrainIcon className="w-4 h-4 text-yellow-400" />,
                };
            case AgentStatus.RUNNING:
                return {
                    statusText: executingTask ? `Running: ${executingTask.title}` : 'Agent is running...',
                    Icon: <SpinnerIcon className="w-4 h-4 animate-spin text-echo-cyan" />,
                };
            case AgentStatus.SYNTHESIZING:
                return {
                    statusText: 'Synthesizing...',
                    Icon: <BrainIcon className="w-4 h-4 text-purple-400" />,
                }
            case AgentStatus.FINISHED:
                 return {
                    statusText: 'Completed',
                    Icon: <ClipboardCheckIcon className="w-4 h-4 text-green-500" />,
                };
            case AgentStatus.ERROR:
                 return {
                    statusText: 'Error occurred',
                    Icon: <StopIcon className="w-4 h-4 text-red-500" />,
                };
            case AgentStatus.IDLE:
            default:
                 return {
                    statusText: 'Ready',
                    Icon: null,
                };
        }
    }, [tasks, agentStatus]);

    const isExecuting = [
        AgentStatus.RUNNING,
        AgentStatus.PERCEIVE,
        AgentStatus.REASON,
        AgentStatus.ACT,
        AgentStatus.OBSERVE,
        AgentStatus.REFLECT
    ].includes(agentStatus);

    if (agentStatus === AgentStatus.IDLE) {
        return null;
    }

    return (
        <div className="flex-none h-10 bg-echo-surface border-t border-echo-border px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                {Icon}
                <p className="text-sm text-gray-300">{statusText}</p>
            </div>
            {isExecuting && (
                <button
                    onClick={onStopExecution}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded transition-colors"
                >
                    <StopIcon className="w-3 h-3" />
                    <span>Stop</span>
                </button>
            )}
        </div>
    );
};
