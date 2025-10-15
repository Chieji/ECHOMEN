import React, { useState } from 'react';
import { Message } from '../types';
import { motion } from 'framer-motion';
import { MessageBubbleIcon } from './icons/MessageBubbleIcon';
import { LogoIcon } from './icons/LogoIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { EyeSlashIcon } from './icons/EyeSlashIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { ClipboardDocumentIcon } from './icons/ClipboardDocumentIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';

interface ChatInterfaceProps {
    messages: Message[];
    onSuggestionClick: (prompt: string) => void;
    onEditMessage: (messageId: string, newText: string) => void;
    onAcceptAction: (messageId: string, prompt: string) => void;
    onDeclineAction: (messageId: string) => void;
}

interface WelcomeScreenProps {
    onSuggestionClick: (prompt: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick }) => {
    const handleSuggestionKeyPress = (e: React.KeyboardEvent, prompt: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSuggestionClick(prompt);
        }
    };

    const suggestions = [
        {
            title: "Draft an email",
            prompt: "Draft a professional email to my team about the new project timeline."
        },
        {
            title: "Write a script",
            prompt: "Write a Python script to organize files in my downloads folder by file type."
        },
        {
            title: "Research a topic",
            prompt: "What are the latest advancements in autonomous AI agents?"
        },
        {
            title: "Create a plan",
            prompt: "Create a step-by-step plan to launch a new weekly podcast."
        },
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
            >
                <MessageBubbleIcon className="w-24 h-24 text-zinc-300 dark:text-zinc-700" />
            </motion.div>
            <h2 className="mt-6 text-2xl font-bold text-zinc-800 dark:text-gray-100">ECHO Chat Mode</h2>
            <p className="mt-2 max-w-md text-gray-500 dark:text-gray-400">
                Ask questions, brainstorm ideas, or get help on any topic. This is a direct line to the AI, no actions will be taken.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                {suggestions.map((suggestion) => (
                    <div
                        key={suggestion.title}
                        className="bg-zinc-100 dark:bg-[#121212] p-4 rounded-lg text-left text-sm cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                        onClick={() => onSuggestionClick(suggestion.prompt)}
                        onKeyDown={(e) => handleSuggestionKeyPress(e, suggestion.prompt)}
                        role="button"
                        tabIndex={0}
                    >
                        <p className="font-semibold text-zinc-700 dark:text-zinc-200">{suggestion.title}</p>
                        <p className="text-gray-500 dark:text-gray-400">"{suggestion.prompt}"</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSuggestionClick, onEditMessage, onAcceptAction, onDeclineAction }) => {
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    if (messages.length === 0) {
        return <WelcomeScreen onSuggestionClick={onSuggestionClick} />;
    }
    
    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
    };

    const handleEditClick = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditText(msg.text);
    };

    const handleSaveEdit = () => {
        if (editingMessageId && editText.trim()) {
            onEditMessage(editingMessageId, editText);
        }
        setEditingMessageId(null);
        setEditText('');
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelEdit();
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 flex-grow flex flex-col">
            <div className="py-4">
                <div className="flex justify-between items-center max-w-3xl mx-auto">
                    <h2 className="text-lg font-bold text-zinc-800 dark:text-gray-100">Chat Mode</h2>
                </div>
            </div>
            <div className="flex-grow flex flex-col justify-end">
                <div className="space-y-8 pb-8">
                    {messages.map((msg) => {
                        const isEditing = editingMessageId === msg.id;
                        
                        if (msg.type === 'system') {
                            return (
                                <motion.div
                                    key={msg.id}
                                    className="flex justify-center items-center my-4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                                >
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                        <EyeSlashIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{msg.text}</p>
                                    </div>
                                </motion.div>
                            );
                        }

                        if (msg.type === 'action_prompt') {
                             return (
                                <motion.div
                                    key={msg.id}
                                    className="flex gap-4 items-start"
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                >
                                    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-cyan-600 dark:bg-[#00D4FF]">
                                        <LogoIcon className="w-5 h-5 text-black" />
                                    </div>
                                    <div className="relative p-4 rounded-2xl max-w-lg bg-white dark:bg-[#181818] shadow-md w-full border border-cyan-500/30">
                                        <p className="text-base text-zinc-800 dark:text-zinc-100">{msg.text}</p>
                                        <div className="mt-4 p-3 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10">
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">PROPOSED ACTION:</p>
                                            <p className="text-sm font-medium text-zinc-800 dark:text-white mt-1">"{msg.suggestedPrompt}"</p>
                                        </div>
                                        <div className="flex justify-end items-center gap-3 mt-4">
                                            <p className="text-sm font-semibold text-zinc-800 dark:text-white">Activate Agent?</p>
                                            <button 
                                                onClick={() => onDeclineAction(msg.id)}
                                                className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-400 transition-colors"
                                                aria-label="Decline Action"
                                            >
                                                ❌
                                            </button>
                                            <button 
                                                onClick={() => onAcceptAction(msg.id, msg.suggestedPrompt || '')}
                                                className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-700 dark:text-green-400 transition-colors"
                                                aria-label="Accept Action"
                                            >
                                                ✔️
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                             )
                        }

                        return (
                            <motion.div 
                                key={msg.id} 
                                className={`group flex gap-4 items-start ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.05, type: 'spring', stiffness: 200, damping: 25 }}
                            >
                                <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender === 'user' ? 'bg-[#FF6B00]' : 'bg-cyan-600 dark:bg-[#00D4FF]'}`}>
                                    {msg.sender === 'agent' && <LogoIcon className="w-5 h-5 text-black" />}
                                </div>
                                <div className={`relative p-4 rounded-2xl max-w-lg shadow-md w-full ${msg.sender === 'user' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100' : 'bg-white dark:bg-[#181818] text-zinc-800 dark:text-zinc-100'}`}>
                                    {isEditing ? (
                                        <div>
                                            <textarea
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                className="w-full bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg p-2 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                                                rows={Math.max(3, editText.split('\n').length)}
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={handleCancelEdit} className="text-sm font-semibold px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                                                <button onClick={handleSaveEdit} className="text-sm font-semibold px-3 py-1 rounded-md bg-[#8B5CF6] text-white hover:bg-[#7c4ee3] transition-colors">Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {msg.sender === 'agent' ? <MarkdownRenderer content={msg.text} /> : <p className="text-base whitespace-pre-wrap">{msg.text}</p>}
                                        </>
                                    )}
                                    <div className="absolute -bottom-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                         style={msg.sender === 'user' ? { right: '0' } : { left: '0' }}>
                                        {msg.sender === 'user' && !isEditing && (
                                            <button onClick={() => handleEditClick(msg)} className="p-1 rounded-full bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-400 dark:hover:bg-zinc-600"><PencilSquareIcon className="w-4 h-4" /></button>
                                        )}
                                        <button onClick={() => handleCopy(msg.text, msg.id)} className="p-1 rounded-full bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-400 dark:hover:bg-zinc-600">
                                            {copiedMessageId === msg.id ? <ClipboardCheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};