import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types';
import { PlannerIcon } from './icons/PlannerIcon';
import { ExecutorIcon } from './icons/ExecutorIcon';
import { ReviewerIcon } from './icons/ReviewerIcon';
import { SynthesizerIcon } from './icons/SynthesizerIcon';
import { CpuChipIcon } from './icons/CpuChipIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

interface AgentOrchestrationProps {
    tasks: Task[];
}

type AgentRole = 'Planner' | 'Executor' | 'Reviewer' | 'Synthesizer';
type NodeRole = AgentRole | 'Core';
type NodeStatus = 'idle' | 'pending' | 'executing' | 'success' | 'error';

const nodePositions: Record<NodeRole, { top: string; left: string; x: number; y: number; }> = {
    Core: { top: '50%', left: '50%', x: 50, y: 50 },
    Planner: { top: '10%', left: '50%', x: 50, y: 10 },
    Executor: { top: '50%', left: '10%', x: 10, y: 50 },
    Reviewer: { top: '50%', left: '90%', x: 90, y: 50 },
    Synthesizer: { top: '90%', left: '50%', x: 50, y: 90 },
};

const roleIcons: Record<NodeRole, React.ReactNode> = {
    Core: <CpuChipIcon className="w-10 h-10" />,
    Planner: <PlannerIcon className="w-8 h-8" />,
    Executor: <ExecutorIcon className="w-8 h-8" />,
    Reviewer: <ReviewerIcon className="w-8 h-8" />,
    Synthesizer: <SynthesizerIcon className="w-8 h-8" />,
};

const statusConfig: Record<NodeStatus, { color: string; glow: string; textColor: string; icon?: React.ReactNode }> = {
    idle: { color: 'border-white/20', glow: '', textColor: 'text-gray-500' },
    pending: { color: 'border-yellow-500/80', glow: 'shadow-[0_0_12px_rgba(234,179,8,0.6)] animate-pulse', textColor: 'text-yellow-400' },
    executing: { color: 'border-[#00D4FF]', glow: 'shadow-[0_0_15px_rgba(0,212,255,0.7)] animate-pulse', textColor: 'text-[#00D4FF]' },
    success: { color: 'border-green-500', glow: 'shadow-[0_0_10px_rgba(34,197,94,0.6)]', textColor: 'text-green-400', icon: <CheckCircleIcon className="w-5 h-5 absolute -top-1 -right-1 text-green-400 bg-[#121212] rounded-full" /> },
    error: { color: 'border-red-500', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.6)]', textColor: 'text-red-400', icon: <ExclamationTriangleIcon className="w-5 h-5 absolute -top-1 -right-1 text-red-400 bg-[#121212] rounded-full" /> },
};


const AgentNode: React.FC<{ role: NodeRole, status: NodeStatus }> = ({ role, status }) => {
    const isCore = role === 'Core';
    const config = statusConfig[status];
    
    const coreStatus = status === 'executing' 
        ? { color: 'border-[#00D4FF]', glow: 'shadow-[0_0_15px_rgba(0,212,255,0.7)]', textColor: 'text-[#00D4FF]' }
        : { color: 'border-white/20', glow: '', textColor: 'text-gray-400' };

    const finalConfig = isCore ? coreStatus : config;

    return (
        <div
            className="absolute flex flex-col items-center justify-center transition-all duration-300"
            style={{
                top: nodePositions[role].top,
                left: nodePositions[role].left,
                transform: `translate(-50%, -50%)`,
            }}
        >
            <div className={`relative ${isCore ? 'w-20 h-20' : 'w-16 h-16'} bg-black/50 border-2 rounded-full flex items-center justify-center transition-all duration-300 ${finalConfig.color} ${finalConfig.glow}`}>
                <div className={`${finalConfig.textColor}`}>{roleIcons[role]}</div>
                {finalConfig.icon}
            </div>
            <p className={`mt-2 text-xs font-bold tracking-wider uppercase ${finalConfig.textColor}`}>{role}</p>
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

        const agentTasks: Record<AgentRole, Task[]> = {
            Planner: [], Executor: [], Reviewer: [], Synthesizer: []
        };

        if (tasks.length === 0) {
            return { agentStatuses: statuses, links: [] };
        }

        tasks.forEach(task => {
            agentTasks[task.agent.role].push(task);
        });

        for (const role in agentTasks) {
            const roleKey = role as AgentRole;
            const tasksForRole = agentTasks[roleKey];
            if (tasksForRole.length === 0) {
                statuses[roleKey] = 'idle';
                continue;
            }
            if (tasksForRole.some(t => t.status === 'Error')) {
                statuses[roleKey] = 'error';
            } else if (tasksForRole.some(t => ['Executing', 'Revising', 'Pending Review', 'Delegating'].includes(t.status))) {
                statuses[roleKey] = 'executing';
            } else if (tasksForRole.every(t => t.status === 'Done')) {
                statuses[roleKey] = 'success';
            } else {
                statuses[roleKey] = 'pending';
            }
        }
        
        const newLinks: { key: string; from: NodeRole; to: NodeRole; status: 'active' | 'completed' | 'pending' }[] = [];
        const executingTask = tasks.find(t => ['Executing', 'Revising'].includes(t.status));

        tasks.forEach(task => {
            const toRole = task.agent.role;
            if (task.dependencies.length === 0 && (task.status === 'Executing' || task.status === 'Queued')) {
                newLinks.push({ key: `core-${task.id}`, from: 'Core', to: toRole, status: task.status === 'Executing' ? 'active' : 'pending' });
            }
            task.dependencies.forEach(depId => {
                const depTask = tasks.find(t => t.id === depId);
                if (depTask) {
                    const fromRole = depTask.agent.role;
                    let status: 'active' | 'completed' | 'pending' = 'pending';
                    if (depTask.status === 'Done' && (task.status === 'Queued' || ['Executing', 'Revising'].includes(task.status))) {
                        status = task.status === 'Queued' ? 'completed' : 'active';
                    }
                    newLinks.push({ key: `${depTask.id}-${task.id}`, from: fromRole, to: toRole, status });
                }
            });
        });
        
        return { agentStatuses: statuses, links: newLinks };
    }, [tasks]);

    const getPath = (from: NodeRole, to: NodeRole) => {
        const p1 = nodePositions[from];
        const p2 = nodePositions[to];
        // For direct lines from Core, no curve is needed.
        if (from === 'Core' || p1.x === p2.x || p1.y === p2.y) {
            return `M ${p1.x},${p1.y} L ${p2.x},${p2.y}`;
        }
        // Curve paths through the core for inter-agent communication
        const core = nodePositions['Core'];
        return `M ${p1.x},${p1.y} Q ${core.x},${core.y} ${p2.x},${p2.y}`;
    };

    return (
        <div className="relative w-full aspect-square max-w-lg mx-auto my-4 bg-black/20 border border-white/10 rounded-lg overflow-hidden">
             <svg className="absolute top-0 left-0 w-full h-full" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5"/>
                    </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
            </svg>
            
            <div className="relative w-full h-full">
                 <svg className="absolute top-0 left-0 w-full h-full overflow-visible" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <AnimatePresence>
                        {links.map(link => {
                             const pathConfig = {
                                active: { color: '#00D4FF', width: 1, dash: "0" },
                                completed: { color: '#22C55E', width: 0.7, dash: "0" },
                                pending: { color: 'rgba(255,255,255,0.3)', width: 0.5, dash: "2 2" },
                            }[link.status];

                            return (
                                <motion.path
                                    key={link.key}
                                    d={getPath(link.from, link.to)}
                                    fill="none"
                                    stroke={pathConfig.color}
                                    strokeWidth={pathConfig.width}
                                    strokeDasharray={pathConfig.dash}
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    style={link.status === 'active' ? { filter: `drop-shadow(0 0 3px ${pathConfig.color})` } : {}}
                                />
                            );
                        })}
                    </AnimatePresence>
                     <AnimatePresence>
                        {links.filter(l => l.status === 'active').map(link => (
                             <motion.circle
                                key={`${link.key}-pulse`}
                                r="1"
                                fill={statusConfig.executing.color}
                                style={{ filter: `drop-shadow(0 0 5px ${statusConfig.executing.color})` }}
                              >
                                <animateMotion
                                  dur="1.5s"
                                  repeatCount="indefinite"
                                  path={getPath(link.from, link.to)}
                                  rotate="auto"
                                />
                              </motion.circle>
                        ))}
                     </AnimatePresence>
                </svg>

                <AgentNode role="Core" status={Object.values(agentStatuses).some(s => s === 'executing') ? 'executing' : 'idle'} />
                {(['Planner', 'Executor', 'Reviewer', 'Synthesizer'] as AgentRole[]).map(role => (
                    <AgentNode key={role} role={role} status={agentStatuses[role]} />
                ))}
            </div>
        </div>
    );
};
