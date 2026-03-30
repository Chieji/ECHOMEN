import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { Task, LogEntry } from '../types';
import { PlannerIcon } from './icons/PlannerIcon';
import { ExecutorIcon } from './icons/ExecutorIcon';
import { ReviewerIcon } from './icons/ReviewerIcon';
import { SynthesizerIcon } from './icons/SynthesizerIcon';
import { AgentOrchestration } from './AgentOrchestration';
import { LiveTerminal } from './LiveTerminal';
import { TerminalDisplay } from './TerminalDisplay';
import { BrainIcon } from './icons/BrainIcon';
import { PlugIcon } from './icons/PlugIcon';
import { WebHawkIcon } from './icons/WebHawkIcon';
import { StopIcon } from './icons/StopIcon';


const statusConfig = {
    Done: { color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    Executing: { color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    Queued: { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    Error: { color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    'Pending Review': { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    Revising: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    Delegating: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    Cancelled: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
    AwaitingApproval: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
};


const roleIcons = {
    Planner: <PlannerIcon className="w-4 h-4" />,
    Executor: <ExecutorIcon className="w-4 h-4" />,
    Reviewer: <ReviewerIcon className="w-4 h-4" />,
    Synthesizer: <SynthesizerIcon className="w-4 h-4" />,
};

const TaskItem = React.forwardRef<HTMLDivElement, {
    task: Task;
    onClick: () => void;
    highlight: 'selected' | 'dependency' | 'dependent' | 'none';
    isDimmed: boolean;
}>(({ task, onClick, highlight, isDimmed }, ref): React.ReactElement => {
    const config = statusConfig[task.status];

    let highlightClass = '';
    switch(highlight) {
        case 'selected':
            highlightClass = 'border-echo-cyan';
            break;
        case 'dependency':
            highlightClass = 'border-cyan-400';
            break;
        case 'dependent':
            highlightClass = 'border-purple-400';
            break;
        default:
            highlightClass = '';
            break;
    }

    return (
        <motion.div
            ref={ref}
            layoutId={`task-container-${task.id}`}
            onClick={onClick}
            className={`bg-echo-surface border ${config.color} ${highlightClass} rounded p-2.5 flex-shrink-0 w-56 cursor-pointer transition-opacity ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
            whileHover={{ scale: isDimmed ? 1 : 1.02 }}
        >
            <div className="flex justify-between items-start">
                <p className="text-sm text-white truncate pr-2">{task.title}</p>
                <span className="text-xs text-gray-500 font-mono">{task.estimatedTime}</span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                {roleIcons[task.agent.role]}
                <span>{task.agent.role}: <span className="text-gray-400">{task.agent.name}</span></span>
            </p>
            <div className={`mt-2 text-[10px] px-2 py-0.5 rounded w-fit`} >{task.status}</div>
        </motion.div>
    );
});
TaskItem.displayName = 'TaskItem';

interface Line {
    key: string;
    sourceId: string;
    targetId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

const logStatusColors = {
    SUCCESS: 'text-green-400',
    ERROR: 'text-red-400',
    WARN: 'text-yellow-400',
    INFO: 'text-cyan-400',
}

interface ExecutionDashboardProps {
    tasks: Task[];
    liveLogs: LogEntry[];
    onCancelTask: (taskId: string) => void;
}


export const ExecutionDashboard: React.FC<ExecutionDashboardProps> = ({ tasks, liveLogs, onCancelTask }) => {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [relatedTaskIds, setRelatedTaskIds] = useState<{ dependencies: string[], dependents: string[] }>({ dependencies: [], dependents: [] });
    const [lines, setLines] = useState<Line[]>([]);
    
    const pipelineRef = useRef<HTMLDivElement>(null);
    const taskRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    useEffect(() => {
        if (selectedTaskId) {
            const selectedTask = tasks.find(t => t.id === selectedTaskId);
            if (!selectedTask) {
                setRelatedTaskIds({ dependencies: [], dependents: [] });
                return;
            }

            const deps = selectedTask.dependencies;
            const dependents = tasks
                .filter(t => t.dependencies.includes(selectedTaskId))
                .map(t => t.id);

            setRelatedTaskIds({ dependencies: deps, dependents: dependents });
        } else {
            setRelatedTaskIds({ dependencies: [], dependents: [] });
        }
    }, [selectedTaskId, tasks]);

    useLayoutEffect(() => {
        const calculateLines = () => {
            if (!pipelineRef.current || !taskRefs.current) return;
            const newLines: Line[] = [];
            const pipelineRect = pipelineRef.current.getBoundingClientRect();

            tasks.forEach(task => {
                task.dependencies.forEach(depId => {
                    const sourceNode = taskRefs.current![depId];
                    const targetNode = taskRefs.current![task.id];

                    if (sourceNode && targetNode) {
                        const sourceRect = sourceNode.getBoundingClientRect();
                        const targetRect = targetNode.getBoundingClientRect();

                        newLines.push({
                            key: `${depId}-${task.id}`,
                            sourceId: depId,
                            targetId: task.id,
                            x1: sourceRect.right - pipelineRect.left,
                            y1: sourceRect.top + sourceRect.height / 2 - pipelineRect.top,
                            x2: targetRect.left - pipelineRect.left,
                            y2: targetRect.top + targetRect.height / 2 - pipelineRect.top,
                        });
                    }
                });
            });
            setLines(newLines);
        };
        
        calculateLines();
        const observer = new ResizeObserver(calculateLines);
        if(pipelineRef.current) observer.observe(pipelineRef.current);
        return () => observer.disconnect();

    }, [tasks]);

    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    const isCancellable = selectedTask && !['Done', 'Error', 'Cancelled'].includes(selectedTask.status);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 flex-grow flex flex-col gap-8">
            <div>
                <h2 className="text-sm font-medium text-gray-400">Agent Brain</h2>
                <AgentOrchestration tasks={tasks} />
            </div>
            <div>
                 <h2 className="text-sm font-medium text-gray-400 mb-2">Task Pipeline</h2>
                 <div ref={pipelineRef} className="relative mt-2 flex gap-4 overflow-x-auto pb-4 p-2 -m-2">
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
                        <AnimatePresence>
                            {lines.map((line) => {
                                const isDependency = selectedTaskId === line.targetId && relatedTaskIds.dependencies.includes(line.sourceId);
                                const isDependent = selectedTaskId === line.sourceId && relatedTaskIds.dependents.includes(line.targetId);
                                const isDimmed = selectedTaskId && !isDependency && !isDependent;

                                let strokeColor = "var(--color-accent)";
                                if(isDependency) strokeColor = "var(--echo-cyan)";
                                if(isDependent) strokeColor = "var(--color-primary)";

                                return (
                                <motion.path
                                    key={line.key}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: isDimmed ? 0.3 : 1 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    d={`M ${line.x1} ${line.y1} C ${line.x1 + 40} ${line.y1}, ${line.x2 - 40} ${line.y2}, ${line.x2} ${line.y2}`}
                                    stroke={strokeColor}
                                    strokeWidth={isDependency || isDependent ? "3" : "2"}
                                    fill="none"
                                    strokeLinecap="round"
                                />
                            )})}
                        </AnimatePresence>
                    </svg>
                    {tasks.map(task => {
                        let highlight: 'selected' | 'dependency' | 'dependent' | 'none' = 'none';
                        if (selectedTaskId) {
                            if (task.id === selectedTaskId) highlight = 'selected';
                            else if (relatedTaskIds.dependencies.includes(task.id)) highlight = 'dependency';
                            else if (relatedTaskIds.dependents.includes(task.id)) highlight = 'dependent';
                        }
                        const isDimmed = selectedTaskId ? highlight === 'none' : false;

                        return (
                            <TaskItem
                                key={task.id}
                                ref={(el: HTMLDivElement | null) => { if (taskRefs.current) taskRefs.current[task.id] = el }}
                                task={task}
                                highlight={highlight}
                                isDimmed={isDimmed}
                                onClick={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
                            />
                        )
                    })}
                 </div>
            </div>
            
            <AnimatePresence>
                {selectedTask && (
                     <motion.div
                        layoutId={`task-container-${selectedTask.id}`}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
                        animate={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                        exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
                        onClick={() => setSelectedTaskId(null)}
                     >
                        <motion.div
                            className="w-full max-w-2xl bg-echo-surface border border-echo-border rounded-lg flex flex-col max-h-[90vh]"
                            onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
                        >
                            <div className="flex-shrink-0 p-6 pb-4 border-b border-black/10 dark:border-white/10">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{selectedTask.title}</h3>
                                    <button onClick={() => setSelectedTaskId(null)} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                                        <CloseIcon className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-sm flex-wrap">
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[selectedTask.status].color}`}>{selectedTask.status}</span>
                                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">{roleIcons[selectedTask.agent.role]} {selectedTask.agent.role}: {selectedTask.agent.name}</span>
                                    </div>
                                    {isCancellable && (
                                        <button
                                            onClick={() => {
                                                onCancelTask(selectedTask.id);
                                                setSelectedTaskId(null);
                                            }}
                                            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 font-bold text-xs py-1.5 px-3 rounded-md transition-colors"
                                        >
                                            <StopIcon className="w-4 h-4" />
                                            <span>Cancel Task</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto p-6 space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Details</h4>
                                    <div className="font-mono text-sm p-4 bg-zinc-200/50 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg text-zinc-700 dark:text-gray-300">
                                        <p className="whitespace-pre-wrap">{selectedTask.details}</p>
                                    </div>
                                </div>

                                {selectedTask.subSteps && selectedTask.subSteps.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Agent's Thought Process</h4>
                                        <div className="space-y-4">
                                            {selectedTask.subSteps.map((step, index) => (
                                                <div key={index} className="border-l-2 border-dashed border-gray-300 dark:border-gray-700 pl-4">
                                                    <div className="flex items-center gap-2 text-[var(--color-primary)]">
                                                        <BrainIcon className="w-5 h-5" />
                                                        <h5 className="font-bold">Thought</h5>
                                                    </div>
                                                    <p className="text-sm italic text-gray-600 dark:text-gray-300 pl-7 pb-2">"{step.thought}"</p>
                                                    
                                                    <div className="flex items-center gap-2 text-cyan-600 dark:text-echo-cyan">
                                                        <PlugIcon className="w-5 h-5" />
                                                        <h5 className="font-bold">Action</h5>
                                                    </div>
                                                    <div className="font-mono text-xs p-3 my-1 ml-7 bg-black/40 border border-white/10 rounded-lg text-gray-300">
                                                        <p className="text-cyan-400">{step.toolCall.name}</p>
                                                        <pre className="whitespace-pre-wrap text-gray-400 text-[10px] mt-1">{JSON.stringify(step.toolCall.args, null, 2)}</pre>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-green-500 mt-2">
                                                        <WebHawkIcon className="w-5 h-5" />
                                                        <h5 className="font-bold">Observation</h5>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 pl-7">{step.observation}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {selectedTask.reviewHistory.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Review History</h4>
                                        <div className="space-y-2">
                                            {selectedTask.reviewHistory.map((review, index) => (
                                                <div key={index} className={`p-3 rounded-lg border ${review.status === 'Approved' ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                                                    <div className="flex justify-between items-center text-xs mb-1">
                                                        <p className="font-semibold text-zinc-800 dark:text-white">Reviewer: {review.reviewer}</p>
                                                        <p className={`${review.status === 'Approved' ? 'text-green-500 dark:text-green-400' : 'text-yellow-500 dark:text-yellow-400'} font-bold`}>{review.status}</p>
                                                    </div>
                                                    <p className="text-sm text-zinc-700 dark:text-gray-300 italic">"{review.comments}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {selectedTask.logs && selectedTask.logs.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Execution Logs</h4>
                                        <div className="font-mono text-xs p-3 bg-zinc-200/50 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg max-h-48 overflow-y-auto text-gray-500 dark:text-gray-400 space-y-2">
                                            {selectedTask.logs.map((log, index) => (
                                                <div key={index} className="flex items-start gap-3">
                                                    <span className="text-gray-400 dark:text-gray-600 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    <span className={`font-bold flex-shrink-0 ${logStatusColors[log.status]}`}>
                                                        [{log.status}]
                                                    </span>
                                                    <p className="whitespace-pre-wrap text-zinc-700 dark:text-gray-300 break-words">{log.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                    <h2 className="text-sm font-medium text-gray-300 mb-2">Live Terminal</h2>
                    <LiveTerminal logs={liveLogs} />
                </div>
                <div>
                    <h2 className="text-sm font-medium text-gray-300 mb-2">Reference</h2>
                    <TerminalDisplay />
                </div>
            </div>
        </div>
    );
};