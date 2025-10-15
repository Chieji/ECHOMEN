import React, { useMemo } from 'react';
import { Task, AgentStatus } from '../types';

interface SystemStatusIndicatorProps {
    tasks: Task[];
    agentStatus: AgentStatus;
}

export const SystemStatusIndicator: React.FC<SystemStatusIndicatorProps> = ({ tasks, agentStatus }) => {
    const { statusText, statusColor, pulse, activeTaskCount } = useMemo(() => {
        const activeTasks = tasks.filter(t => !['Done', 'Error'].includes(t.status)).length;

        switch (agentStatus) {
            case AgentStatus.RUNNING:
                return {
                    statusText: `${activeTasks} Active Task${activeTasks !== 1 ? 's' : ''}`,
                    statusColor: 'text-cyan-600 dark:text-[#00D4FF]',
                    pulse: true,
                    activeTaskCount: activeTasks,
                };
            case AgentStatus.SYNTHESIZING:
                return {
                    statusText: 'Synthesizing Playbook',
                    statusColor: 'text-[#8B5CF6]',
                    pulse: true,
                    activeTaskCount: activeTasks,
                };
            case AgentStatus.FINISHED:
                return {
                    statusText: 'Execution Complete',
                    statusColor: 'text-green-500',
                    pulse: false,
                    activeTaskCount: 0,
                };
            case AgentStatus.ERROR:
                return {
                    statusText: 'System Error',
                    statusColor: 'text-red-500',
                    pulse: false,
                    activeTaskCount: activeTasks,
                };
            case AgentStatus.IDLE:
            default:
                return {
                    statusText: 'System Idle',
                    statusColor: 'text-gray-500',
                    pulse: false,
                    activeTaskCount: 0,
                };
        }
    }, [tasks, agentStatus]);

    return (
        <div className={`hidden sm:flex items-center gap-2 text-sm font-semibold ${statusColor}`}>
            {pulse && (
                <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor.replace('text-', 'bg-')}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${statusColor.replace('text-', 'bg-')}`}></span>
                </span>
            )}
            {!pulse && (
                 <span className="relative flex h-3 w-3">
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${statusColor.replace('text-', 'bg-')}`}></span>
                </span>
            )}
            <span>{statusText}</span>
        </div>
    );
};