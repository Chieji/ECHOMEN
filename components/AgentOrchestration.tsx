import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types';
import { PlannerIcon } from './icons/PlannerIcon';
import { ExecutorIcon } from './icons/ExecutorIcon';
import { ReviewerIcon } from './icons/ReviewerIcon';
import { SynthesizerIcon } from './icons/SynthesizerIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

interface AgentOrchestrationProps {
    tasks: Task[];
}

type AgentRole = 'Planner' | 'Executor' | 'Reviewer' | 'Synthesizer';
type NodeStatus = 'idle' | 'pending' | 'executing' | 'success' | 'error';

const nodePositions: Record<AgentRole, { top: string; left: string; x: number; y: number; }> = {
    Planner: { top: '15%', left: '50%', x: 50, y: 15 },
    Executor: { top: '50%', left: '15%', x: 15, y: 50 },
    Reviewer: { top: '50%', left: '85%', x: 85, y: 50 },
    Synthesizer: { top: '85%', left: '50%', x: 50, y: 85 },
};

const roleIcons: Record<AgentRole, React.ReactNode> = {
    Planner: <PlannerIcon className="w-8 h-8" />,
    Executor: <ExecutorIcon className="w-8 h-8" />,
    Reviewer: <ReviewerIcon className="w-8 h-8" />,
    Synthesizer: <SynthesizerIcon className="w-8 h-8" />,
};

const statusConfig: Record<NodeStatus, { color: string; glow: string; textColor: string; icon?: React.ReactNode }> = {
    idle: { color: 'border-zinc-400/30 dark:border-white/20', glow: '', textColor: 'text-zinc-500 dark:text-gray-500' },
    pending: { color: 'border-yellow-500/80', glow: 'shadow-[0_0_12px_rgba(234,179,8,0.6)] animate-pulse', textColor: 'text-yellow-600 dark:text-yellow-400' },
    executing: { color: 'border-amber-500', glow: 'shadow-[0_0_20px] shadow-amber-500/60', textColor: 'text-amber-500' },
    success: { color: 'border-green-500', glow: 'shadow-[0_0_10px_rgba(34,197,94,0.6)]', textColor: 'text-green-600 dark:text-green-400', icon: <CheckCircleIcon className="w-5 h-5 absolute -top-1 -right-1 text-green-500 bg-zinc-200 dark:bg-[#121212] rounded-full" /> },
    error: { color: 'border-red-500', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.6)]', textColor: 'text-red-600 dark:text-red-400', icon: <ExclamationTriangleIcon className="w-5 h-5 absolute -top-1 -right-1 text-red-500 bg-zinc-200 dark:bg-[#121212] rounded-full" /> },
};


const AgentNode: React.FC<{ role: AgentRole, status: NodeStatus }> = ({ role, status }) => {
    const config = statusConfig[status];
    
    return (
        <div
            className="absolute flex flex-col items-center justify-center transition-all duration-300"
            style={{
                top: nodePositions[role].top,
                left: nodePositions[role].left,
                transform: `translate(-50%, -50%)`,
            }}
        >
            <div className={`relative w-16 h-16 bg-zinc-300/20 dark:bg-black/50 border-2 rounded-full flex items-center justify-center transition-all duration-300 ${config.color} ${config.glow}`}>
                <div className={`${config.textColor}`}>{roleIcons[role]}</div>
                {config.icon}
            </div>
            <p className={`mt-2 text-xs font-bold tracking-wider uppercase ${config.textColor}`}>{role}</p>
        </div>
    );
};

export const AgentOrchestration: React.FC<AgentOrchestrationProps> = ({ tasks }) => {
    const { agentStatuses, links } = useMemo(() => {
        const statuses: Record<AgentRole, NodeStatus> = {
            Planner: 'idle',
            Executor: 'idle',
            Reviewer: 'idle',
            Synthesizer: 'idle',
        };

        if (tasks.length === 0) {
            return { agentStatuses: statuses, links: [] };
        }

        const agentTasks: Record<AgentRole, Task[]> = { Planner: [], Executor: [], Reviewer: [], Synthesizer: [] };
        tasks.forEach(task => {
            if (agentTasks[task.agent.role]) {
                agentTasks[task.agent.role].push(task);
            }
        });
        
        for (const role in agentTasks) {
            const roleKey = role as AgentRole;
            const tasksForRole = agentTasks[roleKey];
            if (tasksForRole.length === 0) {
                statuses[roleKey] = 'idle';
                continue;
            }
            if (tasksForRole.some(t => t.status === 'Error')) statuses[roleKey] = 'error';
            else if (tasksForRole.some(t => ['Executing', 'Revising', 'Pending Review', 'Delegating'].includes(t.status))) statuses[roleKey] = 'executing';
            else if (tasksForRole.every(t => t.status === 'Done')) statuses[roleKey] = 'success';
            else statuses[roleKey] = 'pending';
        }
        
        const newLinks: { key: string; from: AgentRole; to: AgentRole; status: 'active' | 'completed' | 'pending' }[] = [];
        tasks.forEach(task => {
            task.dependencies.forEach(depId => {
                const depTask = tasks.find(t => t.id === depId);
                if (depTask) {
                    let status: 'active' | 'completed' | 'pending' = 'pending';
                    if (depTask.status === 'Done' && (task.status === 'Queued' || ['Executing', 'Revising'].includes(task.status))) {
                        status = task.status === 'Queued' ? 'completed' : 'active';
                    }
                    newLinks.push({ key: `${depTask.id}-${task.id}`, from: depTask.agent.role, to: task.agent.role, status });
                }
            });
        });
        
        return { agentStatuses: statuses, links: Array.from(new Set(newLinks.map(l => l.key))).map(key => newLinks.find(l => l.key === key)!) };
    }, [tasks]);

    const p = nodePositions;
    const staticPaths = [
        { d: `M ${p.Planner.x},${p.Planner.y} L ${p.Executor.x},${p.Executor.y}`, dashed: false },
        { d: `M ${p.Executor.x},${p.Executor.y} L ${p.Synthesizer.x},${p.Synthesizer.y}`, dashed: false },
        { d: `M ${p.Synthesizer.x},${p.Synthesizer.y} L ${p.Reviewer.x},${p.Reviewer.y}`, dashed: false },
        { d: `M ${p.Reviewer.x},${p.Reviewer.y} L ${p.Planner.x},${p.Planner.y}`, dashed: false },
        { d: `M ${p.Executor.x},${p.Executor.y} L ${p.Reviewer.x},${p.Reviewer.y}`, dashed: true },
        { d: `M ${p.Planner.x},${p.Planner.y} L ${p.Synthesizer.x},${p.Synthesizer.y}`, dashed: true },
    ];
    
    return (
        <div className="relative w-full aspect-square max-w-lg mx-auto my-4 bg-zinc-200/30 dark:bg-black/30 backdrop-blur-xl border border-zinc-300 dark:border-white/10 rounded-lg overflow-hidden">
             <svg className="absolute top-0 left-0 w-full h-full" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                    <linearGradient id="active-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                </defs>
            </svg>
            
            <div className="relative w-full h-full">
                 <svg className="absolute top-0 left-0 w-full h-full overflow-visible" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                         <filter id="glow">
                            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {/* Static base lines */}
                    {staticPaths.map((path, i) => (
                        <path
                            key={`static-${i}`}
                            d={path.d}
                            stroke="rgba(255, 255, 255, 0.2)"
                            strokeWidth="0.5"
                            strokeDasharray={path.dashed ? "2 2" : "0"}
                            fill="none"
                        />
                    ))}
                    <AnimatePresence>
                        {links.filter(l => l.status === 'active').map(link => {
                            const fromPos = nodePositions[link.from];
                            const toPos = nodePositions[link.to];
                            const pathData = `M ${fromPos.x},${fromPos.y} L ${toPos.x},${toPos.y}`;

                            return (
                                <g key={`${link.key}-active`}>
                                    <motion.path
                                        d={pathData}
                                        stroke="url(#active-gradient)"
                                        strokeWidth="1"
                                        filter="url(#glow)"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5 }}
                                    />
                                    <motion.circle
                                        r="1.2"
                                        className="fill-amber-300"
                                        style={{ filter: `drop-shadow(0 0 3px #fde047)` }}
                                    >
                                        <animateMotion
                                            dur="2s"
                                            repeatCount="indefinite"
                                            path={pathData}
                                            rotate="auto"
                                        />
                                    </motion.circle>
                                </g>
                            );
                        })}
                    </AnimatePresence>
                </svg>

                {(['Planner', 'Executor', 'Reviewer', 'Synthesizer'] as AgentRole[]).map(role => (
                    <AgentNode key={role} role={role} status={agentStatuses[role]} />
                ))}
            </div>
        </div>
    );
};