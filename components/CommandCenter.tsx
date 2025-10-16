import React, { useState } from 'react';
import { AgentMode } from '../types';
import { MobileControlBar } from './MobileControlBar';
import { SendIcon } from './icons/SendIcon';

interface CommandCenterProps {
    agentMode: AgentMode;
    setAgentMode: (mode: AgentMode) => void;
    onSendCommand: (prompt: string, isWebToolActive: boolean) => void;
    onClearChat: () => void;
    inputValue: string;
    onInputChange: (value: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ agentMode, setAgentMode, onSendCommand, onClearChat, inputValue, onInputChange }) => {
    const [isWebToolActive, setIsWebToolActive] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onInputChange(e.target.value);
        // Auto-resize textarea
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendCommand(inputValue, isWebToolActive);
            setIsWebToolActive(false); // Reset web tool state after sending
        }
    };
    
    const handleWebToolToggle = () => setIsWebToolActive(prev => !prev);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const inputPlaceholder = isWebToolActive
        ? "Enter a URL and task for the web agent..."
        : agentMode === AgentMode.ACTION 
        ? "Describe the action or task for the AI agents..." 
        : "Chat with the AI assistant...";

    const borderColor = agentMode === AgentMode.ACTION ? 'border-cyan-500/90 dark:border-[#00D4FF]/90' : 'border-violet-500/90';
    const buttonBg = agentMode === AgentMode.ACTION ? 'bg-cyan-500 hover:bg-cyan-600 dark:bg-[#00D4FF] dark:hover:bg-[#00b8e6]' : 'bg-violet-500 hover:bg-violet-600';
    const buttonText = agentMode === AgentMode.ACTION ? 'text-white dark:text-black' : 'text-white';

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40">
            <div className="max-w-3xl mx-auto px-4 pb-4">
                <div className={`bg-white/80 dark:bg-[#121212]/80 backdrop-blur-2xl border-2 ${borderColor} rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden`}>
                    <div className="p-4 flex items-end gap-3">
                        <textarea
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={inputPlaceholder}
                            rows={1}
                            className={`w-full bg-transparent text-zinc-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-0 transition-colors duration-300 max-h-48`}
                        />
                         <button 
                            onClick={handleSend}
                            disabled={!inputValue.trim()}
                            className={`${buttonBg} ${buttonText} rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                            aria-label="Send command"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <MobileControlBar 
                        agentMode={agentMode} 
                        setAgentMode={setAgentMode} 
                        isWebToolActive={isWebToolActive}
                        onWebToolClick={handleWebToolToggle}
                        onClearChat={onClearChat}
                    />
                </div>
            </div>
        </div>
    );
};