import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentMode } from '../types';
import { MobileControlBar } from './MobileControlBar';
import { SendIcon } from './icons/SendIcon';

interface CommandCenterProps {
    onSendCommand: (prompt: string, isWebToolActive: boolean) => void;
    agentMode?: AgentMode;
    setAgentMode?: (mode: AgentMode) => void;
    onClearChat?: () => void;
    inputValue?: string;
    onInputChange?: (value: string) => void;
}

/**
 * CommandCenter - Clean input component
 */
export const CommandCenter: React.FC<CommandCenterProps> = ({
    onSendCommand,
    agentMode = AgentMode.ACTION,
    setAgentMode,
    onClearChat,
    inputValue: externalValue,
    onInputChange
}) => {
    const [internalValue, setInternalValue] = useState('');
    const [isWebToolActive, setIsWebToolActive] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const value = externalValue !== undefined ? externalValue : internalValue;

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (onInputChange) {
            onInputChange(e.target.value);
        } else {
            setInternalValue(e.target.value);
        }
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleSend = () => {
        if (value.trim()) {
            setIsSending(true);
            onSendCommand(value, isWebToolActive);

            if (!onInputChange) setInternalValue('');
            setIsWebToolActive(false);

            setTimeout(() => setIsSending(false), 500);
        }
    };

    const handleWebToolToggle = () => setIsWebToolActive(prev => !prev);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !(e.nativeEvent as KeyboardEvent).shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const inputPlaceholder = isWebToolActive
        ? "Enter a URL and task for the web agent..."
        : agentMode === AgentMode.ACTION
        ? "What would you like me to do?"
        : "Chat with the AI...";

    const buttonColor = agentMode === AgentMode.ACTION ? 'bg-echo-cyan hover:bg-cyan-400' : 'bg-purple-500 hover:bg-purple-400';

    return (
        <div className="relative">
            <div className={`bg-echo-surface-elevated border border-echo-border rounded-lg overflow-hidden`}>
                <div className="p-3 flex items-end gap-2">
                    <textarea
                        value={value}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={inputPlaceholder}
                        rows={1}
                        className="w-full bg-transparent text-gray-200 placeholder-gray-500 resize-none focus:outline-none text-sm"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!value.trim()}
                        className={`${buttonColor} text-black rounded-md w-8 h-8 flex-shrink-0 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                        aria-label="Send"
                    >
                        <SendIcon className="w-4 h-4" />
                    </button>
                </div>
                {setAgentMode && onClearChat && (
                    <MobileControlBar
                        agentMode={agentMode}
                        setAgentMode={setAgentMode}
                        isWebToolActive={isWebToolActive}
                        onWebToolClick={handleWebToolToggle}
                        onClearChat={onClearChat}
                    />
                )}

                <AnimatePresence>
                    {isSending && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 border border-echo-cyan rounded-lg pointer-events-none"
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
