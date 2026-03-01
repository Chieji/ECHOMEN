import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentMode } from '../types';
import { MobileControlBar } from './MobileControlBar';
import { SendIcon } from './icons/SendIcon';

interface CommandCenterProps {
    onSendCommand: (prompt: string, isWebToolActive: boolean) => void;
    // Optional props for standalone usage
    agentMode?: AgentMode;
    setAgentMode?: (mode: AgentMode) => void;
    onClearChat?: () => void;
    inputValue?: string;
    onInputChange?: (value: string) => void;
}

/**
 * CommandCenter Component
 * 
 * The primary input engine for ECHO. Features auto-resizing text,
 * web-tool toggles, and high-fidelity 'Echo Pulse' animations on send.
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
    const [isEchoing, setIsEchoing] = useState(false);

    const value = externalValue !== undefined ? externalValue : internalValue;

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (onInputChange) {
            onInputChange(e.target.value);
        } else {
            setInternalValue(e.target.value);
        }
        // Auto-resize textarea
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleSend = () => {
        if (value.trim()) {
            setIsEchoing(true);
            onSendCommand(value, isWebToolActive);
            
            if (!onInputChange) setInternalValue('');
            setIsWebToolActive(false);
            
            setTimeout(() => setIsEchoing(false), 1000);
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
        ? "Describe the action or task for the AI agents..." 
        : "Chat with the AI assistant...";

    const borderColor = agentMode === AgentMode.ACTION ? 'border-echo-cyan/90' : 'border-violet-500/90';
    const buttonBg = agentMode === AgentMode.ACTION ? 'bg-echo-cyan hover:bg-echo-cyan/80' : 'bg-violet-500 hover:bg-violet-600';
    const buttonText = agentMode === AgentMode.ACTION ? 'text-black' : 'text-white';

    return (
        <motion.div 
            animate={isEchoing ? { scale: [1, 1.01, 1] } : {}}
            className="relative"
        >
            <div className={`bg-white/10 dark:bg-black/40 backdrop-blur-2xl border-2 ${borderColor} rounded-2xl shadow-neon overflow-hidden relative`}>
                <div className="p-4 flex items-end gap-3 relative z-10">
                    <textarea
                        value={value}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={inputPlaceholder}
                        rows={1}
                        className="w-full bg-transparent text-zinc-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-0 transition-colors duration-300 max-h-48"
                    />
                     <button 
                        onClick={handleSend}
                        disabled={!value.trim()}
                        className={`${buttonBg} ${buttonText} rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-neon`}
                        aria-label="Send command"
                    >
                        <SendIcon className="w-5 h-5" />
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
                    {isEchoing && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1.05 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="absolute inset-0 border-2 border-[#00D4FF] rounded-2xl pointer-events-none z-0"
                        />
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
