import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { Task, TaskStatus, LogEntry, ReviewEntry } from '../types';
import { TerminalDisplay } from './TerminalDisplay';
import { PlannerIcon } from './icons/PlannerIcon';
import { ExecutorIcon } from './icons/ExecutorIcon';
import { ReviewerIcon } from './icons/ReviewerIcon';
import { SynthesizerIcon } from './icons/SynthesizerIcon';
import { AgentOrchestration } from './AgentOrchestration';


const mockTasks: Task[] = [
    {
        id: 'task-plan',
        title: "Decompose Landing Page Task",
        status: "Done",
        agent: { role: 'Planner', name: 'Gemini Advanced' },
        estimatedTime: "5s",
        details: "Decomposed the main goal 'Build a responsive landing page' into five sub-tasks: HTML structure, CSS styling, reviews for both, and final synthesis.",
        dependencies: [],
        logs: [{ timestamp: new Date().toISOString(), status: 'SUCCESS', message: 'Task decomposition complete.' }],
        reviewHistory: [],
        retryCount: 0,
        maxRetries: 3,
    },
    {
        id: 'task-html',
        title: "Write HTML Structure",
        status: "Pending Review",
        agent: { role: 'Executor', name: 'GPT-4' },
        estimatedTime: "45s",
        details: "Generated the semantic HTML structure for the landing page, including header, hero section, feature blocks, and footer.",
        dependencies: ['task-plan'],
        logs: [{ timestamp: new Date().toISOString(), status: 'SUCCESS', message: 'Initial HTML draft generated.' }],
        reviewHistory: [],
        retryCount: 0,
        maxRetries: 3,
    },
    {
        id: 'task-css',
        title: "Create CSS Styles",
        status: "Executing",
        agent: { role: 'Executor', name: 'Groq API' },
        estimatedTime: "1m 10s",
        details: "Developing the responsive stylesheet using a mobile-first approach with Tailwind CSS conventions.",
        dependencies: ['task-plan'],
        logs: [{ timestamp: new Date().toISOString(), status: 'INFO', message: 'Generating CSS utility classes.' }],
        reviewHistory: [],
        retryCount: 0,
        maxRetries: 3,
    },
    {
        id: 'task-review-html',
        title: "Review HTML",
        status: "Queued",
        agent: { role: 'Reviewer', name: 'Claude 3.5 Sonnet' },
        estimatedTime: "30s",
        details: "Validate the generated HTML for semantic correctness, accessibility (ARIA attributes), and best practices.",
        dependencies: ['task-html'],
        logs: [],
        reviewHistory: [],
        retryCount: 0,
        maxRetries: 3,
    },
     {
        id: 'task-review-css',
        title: "Review CSS",
        status: "Queued",
        agent: { role: 'Reviewer', name: 'GPT-4' },
        estimatedTime: "50s",
        details: "Check the CSS for responsiveness issues, cross-browser compatibility, and adherence to the design spec.",
        dependencies: ['task-css'],
        logs: [],
        reviewHistory: [],
        retryCount: 0,
        maxRetries: 3,
    },
    {
        id: 'task-synthesis',
        title: "Synthesize Final Page",
        status: "Queued",
        agent: { role: 'Synthesizer', name: 'Gemini Advanced' },
        estimatedTime: "20s",
        details: "Combine the validated HTML and CSS into a single, polished index.html file, ready for deployment.",
        dependencies: ['task-review-html', 'task-review-css'],
        logs: [],
        reviewHistory: [],
        retryCount: 0,
        maxRetries: 3,
    },
];

const statusConfig = {
    Done: { color: 'bg-green-500/20 text-green-400 border-green-500/30', glow: 'shadow-[0_0_8px_rgba(34,197,94,0.5)]' },
    Executing: { color: 'bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30', glow: 'shadow-[0_0_12px_rgba(0,212,255,0.7)] animate-pulse' },
    Queued: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', glow: '' },
    Error: { color: 'bg-red-500/20 text-red-400 border-red-500/30', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse' },
    'Pending Review': { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.6)] animate-pulse' },
    Revising: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.7)] animate-pulse' },
};

const roleIcons = {
    Planner: <PlannerIcon className="w-4 h-4" />,
    Executor: <ExecutorIcon className="w-4 h-4" />,
    Reviewer: <ReviewerIcon className="w-4 h-4" />,
    Synthesizer: <SynthesizerIcon className="w-4 h-4" />,
};

const TaskItem = React.forwardRef<HTMLDivElement, { 
    task: Task; 
    isSelected: boolean;
    onClick: () => void;
}>(({ task, isSelected, onClick }, ref) => {
    const config = statusConfig[task.status];
    return (
        <motion.div
            ref={ref}
            layoutId={`task-container-${task.id}`}
            onClick={onClick}
            className={`bg-black/40 backdrop-blur-sm border ${config.color} ${isSelected ? 'border-2 border-[#FF6B00]' : ''} rounded-lg p-3 flex-shrink-0 w-64 cursor-pointer transition-all duration-300 ${config.glow}`}
            whileHover={{ scale: 1.03, y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <div className="flex justify-between items-start">
                <p className="font-bold text-white truncate pr-2">{task.title}</p>
                <span className="text-xs font-mono text-gray-400">{task.estimatedTime}</span>
            </div>
            <p className="text-sm text-gray-400 flex items-center gap-2">
                {roleIcons[task.agent.role]}
                <span>{task.agent.role}: <span className="font-semibold">{task.agent.name}</span></span>
            </p>
            <div className={`mt-2 text-xs font-mono px-2 py-1 rounded w-fit ${config.color}`} >{task.status}</div>
        </motion.div>
    );
});
TaskItem.displayName = 'TaskItem';

interface Line {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

const logStatusColors = {
    SUCCESS: 'text-green-400',
    ERROR: 'text-red-400',
    WARN: 'text-yellow-400',
    INFO: 'text-[#00D4FF]',
}

export const ExecutionDashboard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>(mockTasks);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [lines, setLines] = useState<Line[]>([]);
    const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
    
    const pipelineRef = useRef<HTMLDivElement>(null);
    const taskRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const addLog = (log: Omit<LogEntry, 'timestamp'>) => {
        const newLog = { ...log, timestamp: new Date().toISOString() };
        setLiveLogs(prev => [...prev.slice(-10), newLog]);
    };

    const updateTaskState = (taskId: string, updates: Partial<Task>) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    };
    
    const triggerNextTasks = (completedTaskId: string) => {
        const nextTasks = tasks.filter(t => t.dependencies.includes(completedTaskId));
        for (const nextTask of nextTasks) {
            // Check if all dependencies for the next task are met
            const allDepsDone = nextTask.dependencies.every(depId => 
                tasks.find(t => t.id === depId)?.status === 'Done'
            );
            if (allDepsDone && nextTask.status === 'Queued') {
                const newStatus = nextTask.agent.role === 'Reviewer' ? 'Executing' : 'Executing'; // Reviewer tasks also start as 'Executing' for simulation
                addLog({ status: 'INFO', message: `[${nextTask.agent.role}] ${nextTask.title} is starting.` });
                updateTaskState(nextTask.id, { status: newStatus });
            }
        }
    };

    const simulateExecution = (task: Task) => {
        addLog({ status: 'INFO', message: `[${task.agent.name}] Executing: ${task.title}` });

        setTimeout(() => {
            if (task.agent.role === 'Reviewer') {
                 simulateReview(task);
            } else {
                 if (Math.random() > 0.1) { // 90% chance of success for executors
                    addLog({ status: 'SUCCESS', message: `[${task.agent.name}] Draft complete for: ${task.title}.` });
                    updateTaskState(task.id, { status: 'Pending Review' });
                } else {
                    handleFailure(task, 'Failed to generate initial draft.');
                }
            }
        }, 3000);
    };

    const simulateReview = (task: Task) => {
        addLog({ status: 'INFO', message: `[${task.agent.name}] Reviewing: ${task.title}` });
        
        setTimeout(() => {
            const reviewedTask = tasks.find(t => task.dependencies.includes(t.id));
            if (!reviewedTask) return;

            const isApproved = Math.random() > 0.4; // 60% approval rate
            const review: Omit<ReviewEntry, 'timestamp'> = isApproved
                ? { reviewer: task.agent.name, status: 'Approved', comments: 'Looks good. Meets all requirements.' }
                : { reviewer: task.agent.name, status: 'Changes Requested', comments: 'Missing accessibility attributes. Please add ARIA labels.' };
            
            const newReviewHistory = [...reviewedTask.reviewHistory, { ...review, timestamp: new Date().toISOString() }];

            if (isApproved) {
                addLog({ status: 'SUCCESS', message: `[${task.agent.name}] Approved: ${reviewedTask.title}` });
                updateTaskState(reviewedTask.id, { status: 'Done', reviewHistory: newReviewHistory });
                updateTaskState(task.id, { status: 'Done' }); // Mark reviewer task as done
            } else {
                addLog({ status: 'WARN', message: `[${task.agent.name}] Changes requested for: ${reviewedTask.title}` });
                updateTaskState(reviewedTask.id, { status: 'Revising', reviewHistory: newReviewHistory, retryCount: reviewedTask.retryCount + 1 });
                updateTaskState(task.id, { status: 'Queued' }); // Re-queue reviewer task
            }
        }, 2500);
    };

    const handleFailure = (task: Task, errorMessage: string) => {
        addLog({ status: 'ERROR', message: `Error on "${task.title}": ${errorMessage}` });
        updateTaskState(task.id, { status: 'Error' });
    };
    
    // This effect runs when tasks change, to process the queue
    useEffect(() => {
        tasks.forEach(task => {
            if (task.status === 'Executing' || task.status === 'Revising') {
                // To prevent re-triggering simulation, we need a better check
                // For this mock, we'll just run it once. A real app would manage this differently.
            } else if (task.status === 'Done') {
                 triggerNextTasks(task.id);
            }
        });
    }, [tasks.map(t => t.id + t.status).join(',')]); // Rerun when any task status changes

    // Simulation starter
    useEffect(() => {
        const interval = setInterval(() => {
            setTasks(prevTasks => {
                const activeTask = prevTasks.find(t => ['Executing', 'Revising', 'Pending Review'].includes(t.status));
                if (activeTask) return prevTasks; // A task is already running

                const nextTask = prevTasks.find(t => t.status === 'Queued' && t.dependencies.every(depId => prevTasks.find(d => d.id === depId)?.status === 'Done'));

                if (nextTask) {
                    if (nextTask.agent.role === 'Reviewer') {
                        const dependencyTask = prevTasks.find(t => nextTask.dependencies.includes(t.id));
                        if (dependencyTask?.status === 'Pending Review') {
                            return prevTasks.map(t => t.id === nextTask.id ? { ...t, status: 'Executing' } : t);
                        }
                    } else if (nextTask.agent.role === 'Executor' || nextTask.agent.role === 'Synthesizer') {
                         return prevTasks.map(t => t.id === nextTask.id ? { ...t, status: 'Executing' } : t);
                    }
                }
                return prevTasks;
            });
        }, 5000); // Check for new tasks every 5 seconds

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
         tasks.forEach(task => {
            if (task.status === 'Executing') {
                simulateExecution(task);
            }
        });
    }, [tasks.filter(t => t.status === 'Executing').map(t => t.id).join(',')]);
    
     useEffect(() => {
         tasks.forEach(task => {
            if (task.status === 'Revising') {
                simulateExecution(task); // Re-run execution logic for revision
            }
        });
    }, [tasks.filter(t => t.status === 'Revising').map(t => t.id).join(',')]);


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

    return (
        <div className="w-full max-w-7xl mx-auto px-4 flex-grow flex flex-col gap-8">
            <div>
                <h2 className="text-lg font-bold text-[#00D4FF] tracking-widest uppercase">Agent Brain</h2>
                <AgentOrchestration tasks={tasks} />
            </div>
            <div>
                 <h2 className="text-lg font-bold text-[#00D4FF] tracking-widest uppercase">Task Pipeline</h2>
                 <div ref={pipelineRef} className="relative mt-2 flex gap-4 overflow-x-auto pb-4 p-2 -m-2">
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
                        <defs>
                            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{ stopColor: 'rgba(255,107,0,0.7)', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: 'rgba(0,212,255,0.7)', stopOpacity: 1 }} />
                            </linearGradient>
                        </defs>
                        <AnimatePresence>
                            {lines.map((line, i) => (
                                <motion.path
                                    key={i}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    d={`M ${line.x1} ${line.y1} C ${line.x1 + 40} ${line.y1}, ${line.x2 - 40} ${line.y2}, ${line.x2} ${line.y2}`}
                                    stroke="url(#line-gradient)"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                            ))}
                        </AnimatePresence>
                    </svg>
                    {tasks.map(task => (
                        <TaskItem
                            key={task.id}
                            ref={el => { taskRefs.current[task.id] = el }}
                            task={task}
                            isSelected={selectedTaskId === task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                        />
                    ))}
                 </div>
            </div>
            
            <AnimatePresence>
                {selectedTask && (
                     <motion.div
                        layoutId={`task-container-${selectedTask.id}`}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                        animate={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
                        exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                        onClick={() => setSelectedTaskId(null)}
                     >
                        <motion.div 
                            className="w-full max-w-2xl bg-[#0F0F0F] border-2 border-[#FF6B00] rounded-xl p-6 shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex-shrink-0">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-white">{selectedTask.title}</h3>
                                    <button onClick={() => setSelectedTaskId(null)} className="text-gray-500 hover:text-white transition-colors">
                                        <CloseIcon className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[selectedTask.status].color}`}>{selectedTask.status}</span>
                                    <span className="text-gray-400 flex items-center gap-1.5">{roleIcons[selectedTask.agent.role]} {selectedTask.agent.role}: {selectedTask.agent.name}</span>
                                    <span className="text-gray-400 font-mono">ETA: {selectedTask.estimatedTime}</span>
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                                <div className="font-mono text-sm p-4 bg-black/40 border border-white/10 rounded-lg text-gray-300">
                                    <p className="whitespace-pre-wrap">{selectedTask.details}</p>
                                </div>
                                
                                {selectedTask.reviewHistory.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Review History</h4>
                                        <div className="space-y-2">
                                            {selectedTask.reviewHistory.map((review, index) => (
                                                <div key={index} className={`p-3 rounded-lg border ${review.status === 'Approved' ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                                                    <div className="flex justify-between items-center text-xs mb-1">
                                                        <p className="font-semibold text-white">Reviewer: {review.reviewer}</p>
                                                        <p className={`${review.status === 'Approved' ? 'text-green-400' : 'text-yellow-400'} font-bold`}>{review.status}</p>
                                                    </div>
                                                    <p className="text-sm text-gray-300 italic">"{review.comments}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {selectedTask.maxRetries > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Retries</h4>
                                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-lg p-3">
                                            <span className="font-mono text-orange-400">{selectedTask.retryCount} / {selectedTask.maxRetries}</span>
                                            <div className="w-full bg-white/10 rounded-full h-2">
                                                <motion.div
                                                    className="bg-orange-500 h-2 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(selectedTask.retryCount / selectedTask.maxRetries) * 100}%` }}
                                                    transition={{ duration: 0.5 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedTask.dependencies.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Dependencies</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTask.dependencies.map(depId => {
                                                const depTask = tasks.find(t => t.id === depId);
                                                return depTask ? (
                                                    <button 
                                                        key={depId} 
                                                        onClick={() => setSelectedTaskId(depId)}
                                                        className="bg-white/10 text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        {depTask.title}
                                                    </button>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}
                                {selectedTask.logs && selectedTask.logs.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Execution Logs</h4>
                                        <div className="font-mono text-xs p-3 bg-black/40 border border-white/10 rounded-lg max-h-48 overflow-y-auto text-gray-400 space-y-2">
                                            {selectedTask.logs.map((log, index) => (
                                                <div key={index} className="flex items-start gap-3">
                                                    <span className="text-gray-600 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    <span className={`font-bold flex-shrink-0 ${logStatusColors[log.status]}`}>
                                                        [{log.status}]
                                                    </span>
                                                    <p className="whitespace-pre-wrap text-gray-300 break-words">{log.message}</p>
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
                 <h2 className="text-lg font-bold text-[#00D4FF] tracking-widest uppercase">Live Results</h2>
                 <div className="font-mono text-sm mt-2 p-4 bg-black/30 border border-white/10 rounded-lg h-64 overflow-y-auto">
                    {liveLogs.map((log, index) => (
                         <p key={index}>
                            <span className={`${logStatusColors[log.status]}`}>[{log.status}]</span> {log.message}
                         </p>
                    ))}
                    {tasks.some(t => t.status === 'Executing' || t.status === 'Pending Review' || t.status === 'Revising') && (
                        <p className="animate-pulse">
                            <span className="text-[#00D4FF]">[INFO]</span> Awaiting next operation...<span className="inline-block w-1 h-3 bg-white ml-1 animate-ping"></span>
                        </p>
                    )}
                 </div>
            </div>
        </div>
    );
};