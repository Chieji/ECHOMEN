import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types';
import { PlannerIcon } from './icons/PlannerIcon';
import { ExecutorIcon } from './icons/ExecutorIcon';
import { ReviewerIcon } from './icons/ReviewerIcon';
import { SynthesizerIcon } from './icons/SynthesizerIcon';
import { CpuChipIcon } from './icons/CpuChipIcon';

interface AgentOrchestrationProps {
    tasks: Task[];
}

type AgentRole = 'Planner' | 'Executor' | 'Reviewer' | 'Synthesizer';
type NodeRole = AgentRole | 'Core';

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

interface AnimationState {
    key: string;
    from: AgentRole;
    to: AgentRole;
    color: string;
}

const AgentNode: React.FC<{ role: NodeRole, isActive: boolean }> = ({ role, isActive }) => {
    const isCore = role === 'Core';
    const activeColor = isCore ? 'border-[#00D4FF]' : 'border-[#FF6B00]';
    const activeGlow = isCore ? 'shadow-[0_0_15px_rgba(0,212,255,0.7)]' : 'shadow-[0_0_15px_rgba(255,107,0,0.8)]';
    const textColor = isCore ? 'text-[#00D4FF]' : 'text-[#FF6B00]';

    return (
        <div
            className="absolute flex flex-col items-center justify-center transition-all duration-300"
            style={{
                top: nodePositions[role].top,
                left: nodePositions[role].left,
                transform: `translate(-50%, -50%)`,
            }}
        >
            <div className={`relative ${isCore ? 'w-20 h-20' : 'w-16 h-16'} bg-black/50 border-2 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? `${activeColor} ${activeGlow}` : 'border-white/20'}`}>
                <div className={`${isActive ? textColor : 'text-gray-400'}`}>{roleIcons[role]}</div>
            </div>
            <p className={`mt-2 text-xs font-bold tracking-wider uppercase ${isActive ? textColor : 'text-gray-500'}`}>{role}</p>
        </div>
    );
};

export const AgentOrchestration: React.FC<AgentOrchestrationProps> = ({ tasks }) => {
    const [animation, setAnimation] = useState<AnimationState | null>(null);

    const activeAgents = useMemo(() => {
        const agents = new Set<NodeRole>();
        const activeTask = tasks.find(t => ['Executing', 'Pending Review', 'Revising'].includes(t.status));

        if (activeTask) {
            agents.add('Core');
            agents.add(activeTask.agent.role);
            
            const prevRole = (activeTask.status === 'Revising' ? 'Reviewer' : 
                              activeTask.dependencies.length > 0 ? tasks.find(t => t.id === activeTask.dependencies[0])?.agent.role : 'Planner') || 'Planner';
            agents.add(prevRole);
        }
        
        return Array.from(agents);
    }, [tasks]);

    useEffect(() => {
        const activeTask = tasks.find(t => ['Executing', 'Pending Review', 'Revising'].includes(t.status));

        if (activeTask) {
            let fromRole: AgentRole;
            const depId = activeTask.dependencies[0];
            const depTask = tasks.find(t => t.id === depId);

            if (activeTask.status === 'Revising') {
                fromRole = 'Reviewer';
            } else {
                fromRole = depTask?.agent.role || 'Planner';
            }

            const toRole = activeTask.agent.role;
            let color = '#00D4FF';
            if (toRole === 'Reviewer') color = '#FBBF24';
            if (fromRole === 'Reviewer') color = '#F97316';

            setAnimation({ key: `${activeTask.id}-${activeTask.status}`, from: fromRole, to: toRole, color });

        } else {
             const lastDoneTask = tasks.filter(t => t.status === 'Done').sort((a, b) => new Date(b.logs[b.logs.length-1]?.timestamp || 0).getTime() - new Date(a.logs[a.logs.length-1]?.timestamp || 0).getTime())[0];
             if(lastDoneTask && lastDoneTask.agent.role !== 'Synthesizer' && tasks.some(t => t.status === 'Queued' && t.dependencies.includes(lastDoneTask.id))) {
                 const nextTask = tasks.find(t => t.status === 'Queued' && t.dependencies.includes(lastDoneTask.id));
                 if (nextTask) {
                    setAnimation({ key: `${lastDoneTask.id}-done`, from: lastDoneTask.agent.role, to: nextTask.agent.role, color: '#22C55E' });
                 }
             } else {
                  setAnimation(null);
             }
        }

    }, [tasks]);

    const getPath = (from: AgentRole, to: AgentRole) => {
        const p1 = nodePositions[from];
        const p2 = nodePositions[to];
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
                    <radialGradient id="pulse-gradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="white" />
                        <stop offset="100%" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
                
                {/* Static Paths */}
                {(['Planner', 'Executor', 'Reviewer', 'Synthesizer'] as AgentRole[]).map(role => (
                    <path key={`path-to-${role}`} d={`M ${nodePositions['Core'].x},${nodePositions['Core'].y} L ${nodePositions[role].x},${nodePositions[role].y}`} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                ))}
                 <path d={`M ${nodePositions['Reviewer'].x},${nodePositions['Reviewer'].y} Q 50,75 ${nodePositions['Executor'].x},${nodePositions['Executor'].y}`} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" fill="none" />

            </svg>
            
            <div className="relative w-full h-full">
                {(['Core', 'Planner', 'Executor', 'Reviewer', 'Synthesizer'] as NodeRole[]).map(role => (
                    <AgentNode key={role} role={role} isActive={activeAgents.includes(role)} />
                ))}

                <svg className="absolute top-0 left-0 w-full h-full overflow-visible" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <AnimatePresence>
                        {animation && (
                            <motion.path
                                key={animation.key}
                                d={getPath(animation.from, animation.to)}
                                fill="none"
                                stroke={animation.color}
                                strokeWidth="1"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: [0, 0.8, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ filter: `drop-shadow(0 0 3px ${animation.color})` }}
                            />
                        )}
                    </AnimatePresence>
                </svg>
            </div>
        </div>
    );
};