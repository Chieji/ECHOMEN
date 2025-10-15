import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
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
        switch (agentStatus) {
            case AgentStatus.RUNNING:
                const executingTask = tasks.find(t => t.status === 'Executing');
                return {
                    statusText: executingTask ? `Executing: ${executingTask.title}` : 'Agent is running...',
                    Icon: <SpinnerIcon className="w-5 h-5 animate-spin text-cyan-600 dark:text-[#00D4FF]" />,
                };
            case AgentStatus.SYNTHESIZING:
                return {
                    statusText: 'Learning from successful plan...',
                    Icon: <BrainIcon className="w-5 h-5 text-[#8B5CF6]" />,
                }
            case AgentStatus.FINISHED:
                 return {
                    statusText: 'All tasks completed successfully.',
                    Icon: <ClipboardCheckIcon className="w-5 h-5 text-green-500" />,
                };
            case AgentStatus.ERROR:
                 return {
                    statusText: 'Execution Halted: An error occurred.',
                    Icon: <StopIcon className="w-5 h-5 text-red-500" />,
                };
            case AgentStatus.IDLE:
            default:
                 return {
                    statusText: 'ECHO is idle. Awaiting command.',
                    Icon: null,
                };
        }
    }, [tasks, agentStatus]);

    const isExecuting = agentStatus === AgentStatus.RUNNING;

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-28 md:bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-3xl z-30"
        >
            <div className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border border-cyan-600/50 dark:border-[#00D4FF]/50 rounded-lg shadow-2xl shadow-black/50 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {Icon}
                    <p className="text-sm font-semibold text-zinc-800 dark:text-gray-200">{statusText}</p>
                </div>
                {isExecuting && (
                    <button 
                        onClick={onStopExecution}
                        className="flex items-center gap-2 bg-red-500/80 hover:bg-red-500 text-white font-bold text-sm py-1.5 px-3 rounded-md transition-colors"
                    >
                        <StopIcon className="w-4 h-4" />
                        <span>Stop</span>
                    </button>
                )}
            </div>
        </motion.div>
    );
};