import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types';
import { PlannerIcon } from './icons/PlannerIcon';
import { ExecutorIcon } from './icons/ExecutorIcon';
import { ReviewerIcon } from './icons/ReviewerIcon';
import { SynthesizerIcon } from './icons/SynthesizerIcon';

interface AgentOrchestrationProps {
    tasks: Task[];
}

type AgentRole = 'Planner' | 'Executor' | 'Reviewer' | 'Synthesizer';

const agentPositions: Record<AgentRole, { top: string; left: string; }> = {
    Planner: { top: '0%', left: '50%' },
    Executor: { top: '50%', left: '0%' },
    Reviewer: { top: '50%', left: '100%' },
    Synthesizer: { top: '100%', left: '50%' },
};

const roleIcons: Record<AgentRole, React.ReactNode> = {
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

const AgentNode: React.FC<{ role: AgentRole, isActive: boolean }> = ({ role, isActive }) => (
    <div
        className="absolute w-20 h-20 flex flex-col items-center justify-center transition-all duration-300"
        style={{
            top: agentPositions[role].top,
            left: agentPositions[role].left,
            transform: `translate(-50%, -50%)`,
        }}
    >
        <div className={`relative w-14 h-14 bg-black/50 border-2 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'border-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.8)]' : 'border-white/20'}`}>
            <div className={`${isActive ? 'text-[#FF6B00]' : 'text-gray-400'}`}>{roleIcons[role]}</div>
        </div>
        <p className={`mt-2 text-xs font-bold tracking-wider uppercase ${isActive ? 'text-[#FF6B00]' : 'text-gray-500'}`}>{role}</p>
    </div>
);

export const AgentOrchestration: React.FC<AgentOrchestrationProps> = ({ tasks }) => {
    const [animation, setAnimation] = useState<AnimationState | null>(null);

    const activeAgents = useMemo(() => {
        const agents = new Set<AgentRole>();
        tasks.forEach(task => {
            if (['Executing', 'Pending Review', 'Revising'].includes(task.status)) {
                agents.add(task.agent.role);
                 if (task.status === 'Executing' || task.status === 'Revising') agents.add('Planner');
                 if (task.status === 'Pending Review') agents.add('Executor');
            }
        });
        if (animation) {
            agents.add(animation.from);
            agents.add(animation.to);
        }
        return Array.from(agents);
    }, [tasks, animation]);

    useEffect(() => {
        const activeTask = tasks.find(t => ['Executing', 'Pending Review', 'Revising'].includes(t.status));

        if (activeTask) {
            let newAnimation: AnimationState | null = null;
            if (activeTask.status === 'Executing' || activeTask.status === 'Revising') {
                newAnimation = { key: `${activeTask.id}-exec`, from: activeTask.status === 'Revising' ? 'Reviewer' : 'Planner', to: 'Executor', color: '#00D4FF' };
            } else if (activeTask.status === 'Pending Review') {
                newAnimation = { key: `${activeTask.id}-review`, from: 'Executor', to: 'Reviewer', color: '#FBBF24' };
            }
            setAnimation(newAnimation);
        } else {
            const lastDoneTask = tasks.filter(t => t.status === 'Done').sort((a, b) => new Date(b.logs[b.logs.length-1]?.timestamp || 0).getTime() - new Date(a.logs[a.logs.length-1]?.timestamp || 0).getTime())[0];
            if(lastDoneTask && lastDoneTask.agent.role !== 'Planner') {
                setAnimation({ key: `${lastDoneTask.id}-done`, from: lastDoneTask.agent.role, to: 'Synthesizer', color: '#22C55E' });
            } else {
                 setAnimation(null);
            }
        }

    }, [tasks]);

    return (
        <div className="relative w-full aspect-video max-w-lg mx-auto my-4 bg-black/20 border border-white/10 rounded-lg p-4">
             <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20" width="100%" height="100%">
                <defs>
                    <marker id="arrowhead" markerWidth="5" markerHeight="3.5" refX="0" refY="1.75" orient="auto">
                        <polygon points="0 0, 5 1.75, 0 3.5" fill="#fff" />
                    </marker>
                </defs>
                {/* Planner to Executor */}
                <line x1="50%" y1="12%" x2="12%" y2="50%" stroke="white" strokeWidth="1" strokeDasharray="4" markerEnd="url(#arrowhead)" />
                {/* Executor to Reviewer */}
                <line x1="12%" y1="50%" x2="88%" y2="50%" stroke="white" strokeWidth="1" strokeDasharray="4" markerEnd="url(#arrowhead)" />
                 {/* Reviewer to Executor (feedback) */}
                <path d="M 88% 55% C 65% 75%, 35% 75%, 12% 55%" stroke="white" strokeWidth="1" strokeDasharray="4" fill="none" markerEnd="url(#arrowhead)" />
                {/* Executor to Synthesizer */}
                 <line x1="12%" y1="50%" x2="50%" y2="88%" stroke="white" strokeWidth="1" strokeDasharray="4" markerEnd="url(#arrowhead)" />
                 {/* Reviewer to Synthesizer */}
                 <line x1="88%" y1="50%" x2="50%" y2="88%" stroke="white" strokeWidth="1" strokeDasharray="4" markerEnd="url(#arrowhead)" />
            </svg>
            
            {(['Planner', 'Executor', 'Reviewer', 'Synthesizer'] as AgentRole[]).map(role => (
                <AgentNode key={role} role={role} isActive={activeAgents.includes(role)} />
            ))}

            <AnimatePresence>
                {animation && (
                    <motion.div
                        key={animation.key}
                        className="absolute w-3 h-3 rounded-full"
                        initial={{
                            top: agentPositions[animation.from].top,
                            left: agentPositions[animation.from].left,
                            translateX: '-50%',
                            translateY: '-50%',
                            opacity: 0,
                            scale: 0.5,
                            backgroundColor: animation.color,
                            boxShadow: `0 0 8px ${animation.color}`,
                        }}
                        animate={{
                            top: agentPositions[animation.to].top,
                            left: agentPositions[animation.to].left,
                            translateX: '-50%',
                            translateY: '-50%',
                            opacity: [0, 1, 1, 0],
                            scale: 1,
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear", times: [0, 0.1, 0.9, 1] }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};