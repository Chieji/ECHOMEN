import React from 'react';
import { AgentMode } from '../types';
import { ActionIcon } from './icons/ActionIcon';
import { AgentsIcon } from './icons/AgentsIcon';
import { AttachmentIcon } from './icons/AttachmentIcon';
import { ChatIcon } from './icons/ChatIcon';
import { MicIcon } from './icons/MicIcon';
import { PlugIcon } from './icons/PlugIcon';
import { WebToolIcon } from './icons/WebToolIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';


interface MobileControlBarProps {
    agentMode: AgentMode;
    setAgentMode: (mode: AgentMode) => void;
    isWebToolActive: boolean;
    onWebToolClick: () => void;
    onClearChat: () => void;
}

const ControlButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    activeColorClass?: string;
}> = ({ icon, label, isActive = false, onClick, activeColorClass = 'text-[#00D4FF]' }) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all duration-200 ${isActive ? `${activeColorClass} bg-black/5 dark:bg-white/5` : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
    </button>
);


export const MobileControlBar: React.FC<MobileControlBarProps> = ({ agentMode, setAgentMode, isWebToolActive, onWebToolClick, onClearChat }) => {
    
    return (
        <div className="border-t border-black/10 dark:border-white/10 mt-2 pt-2 px-2 flex justify-between items-center">
            {/* Left Group: Mode & Agents */}
            <div className="flex items-center gap-1">
                <ControlButton
                    icon={<ActionIcon className="w-5 h-5" />}
                    label="Action"
                    isActive={agentMode === AgentMode.ACTION}
                    onClick={() => setAgentMode(AgentMode.ACTION)}
                    activeColorClass="text-[#00D4FF]"
                />
                <ControlButton
                    icon={<ChatIcon className="w-5 h-5" />}
                    label="Chat"
                    isActive={agentMode === AgentMode.CHAT}
                    onClick={() => setAgentMode(AgentMode.CHAT)}
                    activeColorClass="text-[#8B5CF6]"
                />
                {agentMode === AgentMode.CHAT && (
                    <ControlButton
                        icon={<PlusCircleIcon className="w-5 h-5" />}
                        label="New"
                        onClick={onClearChat}
                    />
                )}
                 <ControlButton
                    icon={<AgentsIcon className="w-5 h-5" />}
                    label="Agents"
                />
            </div>
            
            {/* Center Group: Tools */}
            <div className="flex items-center gap-1">
                 <ControlButton
                    icon={<WebToolIcon className="w-5 h-5" />}
                    label="Web"
                    isActive={isWebToolActive}
                    onClick={onWebToolClick}
                />
                <ControlButton
                    icon={<PlugIcon className="w-5 h-5" />}
                    label="Apps"
                />
                <ControlButton
                    icon={<AttachmentIcon className="w-5 h-5" />}
                    label="Attach"
                />
            </div>

            {/* Right Group: Input */}
            <div className="flex items-center gap-1">
                 <ControlButton
                    icon={<MicIcon className="w-5 h-5" />}
                    label="Voice"
                />
            </div>
        </div>
    );
};