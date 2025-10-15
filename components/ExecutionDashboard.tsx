import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { Task, LogEntry, TaskStatus } from '../types';
import { PlannerIcon } from './icons/PlannerIcon';
import { ExecutorIcon } from './icons/ExecutorIcon';
import { ReviewerIcon } from './icons/ReviewerIcon';
import { SynthesizerIcon } from './icons/SynthesizerIcon';
import { AgentOrchestration } from './AgentOrchestration';
import { LiveTerminal } from './LiveTerminal';
import { BrainIcon } from './icons/BrainIcon';
import { PlugIcon } from './icons/PlugIcon';
import { WebHawkIcon } from './icons/WebHawkIcon';
import { StopIcon } from './icons/StopIcon';


const statusConfig = {
    Done: { color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 dark:bg-green-500/20 dark:border-green-500/30', glow: 'shadow-[0_0_8px_rgba(34,197,94,0.5)]' },
    Executing: { color: 'bg-cyan-600/10 text-cyan-700 dark:bg-[#00D4FF]/20 dark:text-[#00D4FF] border-cyan-600/20 dark:border-[#00D4FF]/30', glow: 'shadow-[0_0_12px_rgba(8,145,178,0.5)] dark:shadow-[0_0_12px_rgba(0,212,255,0.7)] animate-pulse' },
    Queued: { color: 'bg-zinc-500/10 text-zinc-600 dark:text-gray-400 border-zinc-500/20 dark:bg-gray-500/20 dark:border-gray-500/30', glow: '' },
    Error: { color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 dark:bg-red-500/20 dark:border-red-500/30', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse' },
    'Pending Review': { color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 dark:bg-yellow-500/20 dark:border-yellow-500/30', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.6)] animate-pulse' },
    Revising: { color: 'bg-orange-600/10 text-orange-700 dark:text-[#FF6B00] border-orange-600/20 dark:bg-[#FF6B00]/20 dark:border-[#FF6B00]/30', glow: 'shadow-[0_0_12px_rgba(255,107,0,0.7)] animate-pulse' },
    Delegating: { color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:bg-purple-500/20 dark:border-purple-500/30', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.7)] animate-pulse' },
    Cancelled: { color: 'bg-zinc-500/10 text-zinc-600 dark:text-gray-500 border-zinc-500/20 dark:bg-gray-600/20 dark:border-gray-600/30', glow: '' },
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
}>(({ task, onClick, highlight, isDimmed }, ref) => {
    const config = statusConfig[task.status];
    const prevStatusRef = useRef<TaskStatus | undefined>(undefined);
    const [animateComplete, setAnimateComplete] = useState(false);

    useEffect(() => {
        if (prevStatusRef.current && prevStatusRef.current !== 'Done' && task.status === 'Done') {
            setAnimateComplete(true);
            const timer = setTimeout(() => setAnimateComplete(false), 600);
            return () => clearTimeout(timer);
        }
        prevStatusRef.current = task.status;
    }, [task.status]);
    
    let highlightClass = '';
    if (highlight === 'selected') highlightClass = 'border-2 border-[#FF6B00]';
    if (highlight === 'dependency') highlightClass = 'border-2 border-cyan-500 dark:border-[#00D4FF]';
    if (highlight === 'dependent') highlightClass = 'border-2 border-purple-500';

    return (
        <motion.div
            ref={ref}
            layoutId={`task-container-${task.id}`}
            onClick={onClick}
            className={`bg-white dark:bg-black/40 backdrop-blur-sm border ${config.color} ${highlightClass} rounded-lg p-3 flex-shrink-0 w-64 cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-40' : 'opacity-100'} ${highlight === 'none' ? config.glow : ''}`}
            whileHover={{ scale: isDimmed ? 1 : 1.03, y: isDimmed ? 0 : -4, opacity: 1 }}
            animate={animateComplete ? { scale: [1, 1.05, 1] } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <div className="flex justify-between items-start">
                <p className="font-bold text-zinc-800 dark:text-white truncate pr-2">{task.title}</p>
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{task.estimatedTime}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                {roleIcons[task.agent.role]}
                <span>{task.agent.role}: <span className="font-semibold">{task.agent.name}</span></span>
            </p>
            <div className={`mt-2 text-xs font-mono px-2 py-1 rounded w-fit ${config.color}`} >{task.status}</div>
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
    SUCCESS: 'text-green-500 dark:text-green-400',
    ERROR: 'text-red-500 dark:text-red-400',
    WARN: 'text-yellow-500 dark:text-yellow-400',
    INFO: 'text-cyan-600 dark:text-[#00D4FF]',
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
            const selected = tasks.find(t => t.id === selectedTaskId);
            if (!selected) {
                setRelatedTaskIds({ dependencies: [], dependents: [] });
                return;
            }

            const deps = selected.dependencies;
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
            if (!pipelineRef.current) return;
            const newLines: Line[] = [];
            const pipelineRect = pipelineRef.current.getBoundingClientRect();

            tasks.forEach(task => {
                task.dependencies.forEach(depId => {
                    const sourceNode = taskRefs.current[depId];
                    const targetNode = taskRefs.current[task.id];

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
                <h2 className="text-lg font-bold text-cyan-600 dark:text-[#00D4FF] tracking-widest uppercase">Agent Brain</h2>
                <AgentOrchestration tasks={tasks} />
            </div>
            <div>
                 <h2 className="text-lg font-bold text-cyan-600 dark:text-[#00D4FF] tracking-widest uppercase">Task Pipeline</h2>
                 <div ref={pipelineRef} className="relative mt-2 flex gap-4 overflow-x-auto pb-4 p-2 -m-2">
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
                        <defs>
                            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(255,107,0,0.7)" />
                                <stop offset="100%" stopColor="rgba(0,212,255,0.7)" />
                            </linearGradient>
                             <linearGradient id="line-gradient-dep" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8B5CF6" />
                                <stop offset="100%" stopColor="#FF6B00" />
                            </linearGradient>
                            <linearGradient id="line-gradient-child" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#FF6B00" />
                                <stop offset="100%" stopColor="#00D4FF" />
                            </linearGradient>
                        </defs>
                        <AnimatePresence>
                            {lines.map((line) => {
                                const isDependency = selectedTaskId === line.targetId && relatedTaskIds.dependencies.includes(line.sourceId);
                                const isDependent = selectedTaskId === line.sourceId && relatedTaskIds.dependents.includes(line.targetId);
                                const isDimmed = selectedTaskId && !isDependency && !isDependent;
                                
                                let strokeUrl = "url(#line-gradient)";
                                if(isDependency) strokeUrl = "url(#line-gradient-dep)";
                                if(isDependent) strokeUrl = "url(#line-gradient-child)";

                                return (
                                <motion.path
                                    key={line.key}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: isDimmed ? 0.3 : 1 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    d={`M ${line.x1} ${line.y1} C ${line.x1 + 40} ${line.y1}, ${line.x2 - 40} ${line.y2}, ${line.x2} ${line.y2}`}
                                    stroke={strokeUrl}
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
                                ref={el => { taskRefs.current[task.id] = el }}
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
                        initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                        animate={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
                        exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                        onClick={() => setSelectedTaskId(null)}
                     >
                        <motion.div 
                            className="w-full max-w-2xl bg-white dark:bg-[#0F0F0F] border-2 border-[#FF6B00] rounded-xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
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
                                                    <div className="flex items-center gap-2 text-[#8B5CF6]">
                                                        <BrainIcon className="w-5 h-5" />
                                                        <h5 className="font-bold">Thought</h5>
                                                    </div>
                                                    <p className="text-sm italic text-gray-600 dark:text-gray-300 pl-7 pb-2">"{step.thought}"</p>
                                                    
                                                    <div className="flex items-center gap-2 text-cyan-600 dark:text-[#00D4FF]">
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
             
             <div>
                <h2 className="text-lg font-bold text-cyan-600 dark:text-[#00D4FF] tracking-widest uppercase mb-2">Live Terminal</h2>
                <LiveTerminal logs={liveLogs} />
            </div>
        </div>
    );
};