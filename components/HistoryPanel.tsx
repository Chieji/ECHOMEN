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
    Done: { color: 'bg-green-500/20 text-green-500 dark:text-green-400 border-green-500/30' },
    Executing: { color: 'bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30' },
    Queued: { color: 'bg-gray-500/20 text-gray-500 dark:text-gray-400 border-gray-500/30' },
    Error: { color: 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500/30' },
    'Pending Review': { color: 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-400 border-yellow-500/30' },
    Revising: { color: 'bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/30' },
    Cancelled: { color: 'bg-zinc-500/10 text-zinc-600 dark:text-gray-500 border-zinc-500/20 dark:bg-gray-600/20 dark:border-gray-600/30' },
    Delegating: { color: 'bg-purple-500/20 text-purple-500 dark:text-purple-400 border-purple-500/70 dark:border-purple-400/70' },
    AwaitingApproval: { color: 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-400 border-yellow-500/30' },
};

const roleIcons = {
    Planner: <PlannerIcon className="w-4 h-4" />,
    Executor: <ExecutorIcon className="w-4 h-4" />,
    Reviewer: <ReviewerIcon className="w-4 h-4" />,
    Synthesizer: <SynthesizerIcon className="w-4 h-4" />,
};

// FIX: Renamed discriminant property to `historyType` to avoid conflict with `Message.type`.
type HistoryItem = (Task & { historyType: 'task' }) | (Message & { historyType: 'message' });

// FIX: Added a helper to reliably get a task's timestamp for sorting and display.
const getTaskTimestamp = (task: Task): string => {
    // Prefer the first log's timestamp if it exists.
    if (task.logs && task.logs.length > 0 && task.logs[0].timestamp) {
        return task.logs[0].timestamp;
    }
    // Fallback to parsing the creation timestamp from the task ID.
    // We look for the last 13-digit number, as that's most likely the Date.now() timestamp.
    const matches = task.id.match(/\d{13}/g);
    if (matches && matches.length > 0) {
        return new Date(parseInt(matches[matches.length - 1], 10)).toISOString();
    }
    // Final fallback, though it shouldn't be reached in normal operation.
    return new Date(0).toISOString();
}


const HistoryItemCard: React.FC<{ item: HistoryItem }> = ({ item }) => {
    // FIX: Use `historyType` for discriminating the union.
    if (item.historyType === 'task') {
        const config = statusConfig[item.status];
        return (
            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-black/10 dark:border-white/10">
                <div className="flex justify-between items-start">
                    <p className="font-bold text-zinc-800 dark:text-white">{item.title}</p>
                    <span className={`text-xs font-mono px-2 py-1 rounded w-fit ${config.color}`}>{item.status}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                    {roleIcons[item.agent.role]}
                    <span>{item.agent.role}: <span className="font-semibold">{item.agent.name}</span></span>
                </p>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {new Date(getTaskTimestamp(item)).toLocaleString()}
                </p>
            </div>
        );
    } else {
        // FIX: Added an else block to ensure proper type narrowing for `Message`.
        return (
             <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${item.sender === 'user' ? 'bg-orange-500' : 'bg-cyan-500'}`}>
                    {item.sender === 'agent' && <ChatIcon className="w-5 h-5 text-black" />}
                </div>
                <div className={`p-3 rounded-xl max-w-sm w-full ${item.sender === 'user' ? 'bg-orange-500/10' : 'bg-cyan-500/10'}`}>
                    <p className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">{item.text}</p>
                     <p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-2">
                        {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                </div>
            </div>
        );
    }
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ tasks, messages, onClose, onClearChat }) => {
    // In a real app, filtering state would be managed here with useState
    // FIX: Use `historyType` when creating the combined array to avoid type conflicts.
    const historyItems: HistoryItem[] = [
        ...tasks.map(t => ({ ...t, historyType: 'task' as const })),
        ...messages.map(m => ({ ...m, historyType: 'message' as const }))
    ].sort((a, b) => {
        // FIX: Use `getTaskTimestamp` helper to correctly access timestamp properties for sorting.
        const timeA = new Date(a.historyType === 'task' ? getTaskTimestamp(a) : a.timestamp).getTime();
        const timeB = new Date(b.historyType === 'task' ? getTaskTimestamp(b) : b.timestamp).getTime();
        return timeB - timeA;
    });

    const groupedItems = historyItems.reduce((acc, item) => {
        // FIX: Use `getTaskTimestamp` helper for grouping items by date.
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
                className="w-full max-w-xl h-full bg-zinc-100 dark:bg-[#0F0F0F] border-l-2 border-orange-500/50 shadow-2xl flex flex-col"
                initial={{ x: '100%' }}
                animate={{ x: '0%' }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
            >
                <header className="p-6 flex justify-between items-center border-b border-black/10 dark:border-white/10 flex-shrink-0">
                    <h2 className="flex items-center gap-3 text-xl font-bold text-zinc-800 dark:text-gray-100">
                        <DocumentTextIcon className="w-6 h-6 text-orange-500" />
                        Execution & Chat History
                    </h2>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onClearChat}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                            title="Start New Chat"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            <span>New Chat</span>
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="p-4 border-b border-black/10 dark:border-white/10 flex-shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input type="text" placeholder="Search..." className="col-span-1 md:col-span-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"/>
                        <select className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                            <option>All Modes</option>
                            <option>Action</option>
                            <option>Chat</option>
                        </select>
                         <select className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50">
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
                                    <h3 className="font-semibold text-gray-500 dark:text-gray-400 pb-2 mb-4 border-b border-black/10 dark:border-white/10">{date}</h3>
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