import React from 'react';
import { Message } from '../types';
import { motion } from 'framer-motion';
import { MessageBubbleIcon } from './icons/MessageBubbleIcon';
import { LogoIcon } from './icons/LogoIcon';

interface ChatInterfaceProps {
    messages: Message[];
}

const WelcomeScreen: React.FC = () => (
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
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md w-full">
            <div className="bg-zinc-100 dark:bg-[#121212] p-4 rounded-lg text-left text-sm cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                <p className="font-semibold text-zinc-700 dark:text-zinc-200">Explain a concept</p>
                <p className="text-gray-500 dark:text-gray-400">"Explain quantum computing in simple terms."</p>
            </div>
             <div className="bg-zinc-100 dark:bg-[#121212] p-4 rounded-lg text-left text-sm cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                <p className="font-semibold text-zinc-700 dark:text-zinc-200">Help me debug</p>
                <p className="text-gray-500 dark:text-gray-400">"Why is my React component not re-rendering?"</p>
            </div>
        </div>
    </div>
);

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages }) => {

    if (messages.length === 0) {
        return <WelcomeScreen />;
    }

    return (
        <div className="w-full max-w-3xl mx-auto px-4 flex-grow flex flex-col justify-end">
            <div className="space-y-8 pb-8">
                {messages.map((msg, index) => (
                    <motion.div 
                        key={msg.id} 
                        className={`flex gap-4 items-start ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender === 'user' ? 'bg-[#FF6B00]' : 'bg-[#00D4FF]'}`}>
                            {msg.sender === 'agent' && <LogoIcon className="w-5 h-5 text-black" />}
                        </div>
                        <div className={`p-4 rounded-2xl max-w-lg shadow-md ${msg.sender === 'user' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100' : 'bg-white dark:bg-[#181818] text-zinc-800 dark:text-zinc-100'}`}>
                            <p className="text-base whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};