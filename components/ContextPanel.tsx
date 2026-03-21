import React from 'react';
import { Task } from '../types';

interface ContextPanelProps {
    tasks: Task[];
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ tasks }) => {
    const renderTaskTree = (parentId: string | null = null, depth = 0) => {
        const filteredTasks = tasks.filter(t => {
            if (parentId === null) {
                return !t.delegatorTaskId;
            }
            return t.delegatorTaskId === parentId;
        });

        if (filteredTasks.length === 0 && depth === 0) {
            return <div className="text-gray-500 italic text-sm p-4">No active task tree.</div>;
        }

        return (
            <ul className={`space-y-2 ${depth > 0 ? 'ml-4 mt-2 border-l border-echo-border pl-4' : ''}`}>
                {filteredTasks.map(task => (
                    <li key={task.id} className="group">
                        <div className={`p-3 rounded-lg border ${
                            task.status === 'Executing' ? 'border-echo-cyan bg-echo-cyan/5' :
                            task.status === 'Done' ? 'border-green-500/30 bg-green-500/5' :
                            'border-echo-border bg-echo-surface/50'
                        }`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-mono text-gray-500">#{task.id.slice(-4)}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                    task.status === 'Executing' ? 'bg-echo-cyan text-echo-void' :
                                    task.status === 'Done' ? 'bg-green-500 text-echo-void' :
                                    'bg-gray-700 text-gray-300'
                                }`}>
                                    {task.status}
                                </span>
                            </div>
                            <h4 className="text-sm font-semibold text-gray-200">{task.title}</h4>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.details}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-echo-cyan font-mono">{task.agent.name}</span>
                                <span className="text-[10px] text-gray-500">•</span>
                                <span className="text-[10px] text-gray-500">{task.estimatedTime}</span>
                            </div>
                        </div>
                        {renderTaskTree(task.id, depth + 1)}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="h-full flex flex-col bg-echo-void/50">
            <div className="flex-none p-4 border-b border-echo-border bg-echo-surface/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Task Hierarchy</h3>
            </div>
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                {renderTaskTree()}
            </div>
        </div>
    );
};
