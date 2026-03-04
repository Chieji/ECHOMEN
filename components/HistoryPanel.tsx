import React from 'react';
import { motion } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { Task, Message } from '../types';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PlannerIcon } from './icons/PlannerIcon';
import { ExecutorIcon } from './icons/ExecutorIcon';
import { ReviewerIcon } from './icons/ReviewerIcon';
import { SynthesizerIcon } from './icons/SynthesizerIcon';
import { ChatIcon } from './icons/ChatIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface HistoryPanelProps {
    tasks: Task[];
    messages: Message[];
    onClose: () => void;
    onClearChat: () => void;
}

const statusConfig = {
    Done: { color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    Executing: { color: 'bg-echo-cyan/20 text-echo-cyan border-echo-cyan/30' },
    Queued: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    Error: { color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    'Pending Review': { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    Revising: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    Cancelled: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
    Delegating: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/70' },
    AwaitingApproval: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

const roleIcons = {
    Planner: <PlannerIcon className="w-4 h-4" />,
    Executor: <ExecutorIcon className="w-4 h-4" />,
    Reviewer: <ReviewerIcon className="w-4 h-4" />,
    Synthesizer: <SynthesizerIcon className="w-4 h-4" />,
};

type HistoryItem = (Task & { historyType: 'task' }) | (Message & { historyType: 'message' });

const getTaskTimestamp = (task: Task): string => {
    if (task.logs && task.logs.length > 0 && task.logs[0].timestamp) {
        return task.logs[0].timestamp;
    }
    const matches = task.id.match(/\d{13}/g);
    if (matches && matches.length > 0) {
        return new Date(parseInt(matches[matches.length - 1], 10)).toISOString();
    }
    return new Date(0).toISOString();
}


const HistoryItemCard: React.FC<{ item: HistoryItem }> = ({ item }) => {
    if (item.historyType === 'task') {
        const config = statusConfig[item.status];
        return (
            <div className="bg-echo-surface-elevated p-4 rounded-lg border border-echo-border">
                <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-100">{item.title}</p>
                    <span className={`text-xs font-mono px-2 py-1 rounded w-fit ${config.color}`}>{item.status}</span>
                </div>
                <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                    {roleIcons[item.agent.role]}
                    <span>{item.agent.role}: <span className="font-semibold">{item.agent.name}</span></span>
                </p>
                 <p className="text-xs text-gray-500 mt-2">
                    {new Date(getTaskTimestamp(item)).toLocaleString()}
                </p>
            </div>
        );
    } else {
        return (
             <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${item.sender === 'user' ? 'bg-orange-500' : 'bg-echo-cyan'}`}>
                    {item.sender === 'agent' && <ChatIcon className="w-5 h-5 text-black" />}
                </div>
                <div className={`p-3 rounded-xl max-w-sm w-full ${item.sender === 'user' ? 'bg-orange-500/10' : 'bg-echo-cyan/10'}`}>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{item.text}</p>
                     <p className="text-xs text-right text-gray-500 mt-2">
                        {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                </div>
            </div>
        );
    }
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ tasks, messages, onClose, onClearChat }) => {
    const historyItems: HistoryItem[] = [
        ...tasks.map(t => ({ ...t, historyType: 'task' as const })),
        ...messages.map(m => ({ ...m, historyType: 'message' as const }))
    ].sort((a, b) => {
        const timeA = new Date(a.historyType === 'task' ? getTaskTimestamp(a) : a.timestamp).getTime();
        const timeB = new Date(b.historyType === 'task' ? getTaskTimestamp(b) : b.timestamp).getTime();
        return timeB - timeA;
    });

    const groupedItems = historyItems.reduce((acc, item) => {
        const date = new Date(item.historyType === 'task' ? getTaskTimestamp(item) : item.timestamp).toDateString();
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {} as Record<string, HistoryItem[]>);

    return (
        <motion.div
            className="fixed inset-0 z-50 flex justify-end"
            initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
            animate={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-xl h-full bg-echo-surface border-l border-echo-border flex flex-col"
                initial={{ x: '100%' }}
                animate={{ x: '0%' }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
            >
                <header className="p-6 flex justify-between items-center border-b border-echo-border flex-shrink-0">
                    <h2 className="flex items-center gap-3 text-xl font-bold text-gray-100">
                        <DocumentTextIcon className="w-6 h-6 text-orange-500" />
                        Execution & Chat History
                    </h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClearChat}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white bg-echo-surface-elevated hover:bg-echo-surface px-3 py-1.5 rounded-lg transition-colors"
                            title="Start New Chat"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            <span>New Chat</span>
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="p-4 border-b border-echo-border flex-shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input type="text" placeholder="Search..." className="col-span-1 md:col-span-2 bg-echo-surface-elevated border border-echo-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"/>
                        <select className="bg-echo-surface-elevated border border-echo-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                            <option>All Modes</option>
                            <option>Action</option>
                            <option>Chat</option>
                        </select>
                         <select className="bg-echo-surface-elevated border border-echo-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                            <option>All Statuses</option>
                            <option>Done</option>
                            <option>Executing</option>
                             <option>Error</option>
                        </select>
                    </div>
                </div>

                <div className="p-6 flex-grow overflow-y-auto">
                    {historyItems.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>No history yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(groupedItems).map(([date, items]) => (
                                <div key={date}>
                                    <h3 className="font-semibold text-gray-400 pb-2 mb-4 border-b border-echo-border">{date}</h3>
                                    <div className="space-y-4">
                                        {items.map((item) => <HistoryItemCard key={item.id} item={item} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};
