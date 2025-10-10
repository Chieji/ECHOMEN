import React, { useState } from 'react';
import { AgentMode } from '../types';
import { MobileControlBar } from './MobileControlBar';

interface CommandCenterProps {
    onSettingsClick: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onSettingsClick }) => {
    const [agentMode, setAgentMode] = useState<AgentMode>(AgentMode.ACTION);
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        // Auto-resize textarea
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const inputPlaceholder = agentMode === AgentMode.ACTION 
        ? "Describe the action or task for the AI agents..." 
        : "Chat with the AI assistant...";

    const borderColor = agentMode === AgentMode.ACTION ? 'border-[#00D4FF]/50' : 'border-[#8B5CF6]/50';

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40">
            <div className="max-w-3xl mx-auto px-4 pb-4">
                <div className={`bg-[#121212]/80 backdrop-blur-xl border ${borderColor} rounded-2xl shadow-2xl shadow-black/50 overflow-hidden`}>
                    <div className="p-4">
                        <textarea
                            value={inputValue}
                            onChange={handleInputChange}
                            placeholder={inputPlaceholder}
                            rows={1}
                            className={`w-full bg-transparent text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-0 transition-colors duration-300`}
                        />
                    </div>
                    <MobileControlBar 
                        agentMode={agentMode} 
                        setAgentMode={setAgentMode} 
                        onSettingsClick={onSettingsClick} 
                    />
                </div>
            </div>
        </div>
    );
};
