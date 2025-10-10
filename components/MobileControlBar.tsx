
import React from 'react';
import { AgentMode } from '../types';
import { ActionIcon } from './icons/ActionIcon';
import { AgentsIcon } from './icons/AgentsIcon';
import { AppsIcon } from './icons/AppsIcon';
import { AttachmentIcon } from './icons/AttachmentIcon';
import { ChatIcon } from './icons/ChatIcon';
import { MicIcon } from './icons/MicIcon';
import { SettingsIcon } from './icons/SettingsIcon';

interface MobileControlBarProps {
    agentMode: AgentMode;
    setAgentMode: (mode: AgentMode) => void;
    onSettingsClick: () => void;
}

const ControlButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    activeColorClass?: string;
}> = ({ icon, label, isActive = false, onClick, activeColorClass = 'text-[#00D4FF]' }) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all duration-200 ${isActive ? `${activeColorClass} bg-white/5` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
    </button>
);


export const MobileControlBar: React.FC<MobileControlBarProps> = ({ agentMode, setAgentMode, onSettingsClick }) => {
    
    return (
        <div className="border-t border-white/10 mt-2 pt-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
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
            </div>
            
            <div className="flex items-center gap-2">
                 <ControlButton
                    icon={<AgentsIcon className="w-5 h-5" />}
                    label="Agents"
                />
                 <ControlButton
                    icon={<AppsIcon className="w-5 h-5" />}
                    label="Apps"
                />
                <ControlButton
                    icon={<AttachmentIcon className="w-5 h-5" />}
                    label="Attach"
                />
            </div>

            <div className="flex items-center gap-2">
                 <ControlButton
                    icon={<MicIcon className="w-5 h-5" />}
                    label="Voice"
                />
                 <ControlButton
                    icon={<SettingsIcon className="w-5 h-5" />}
                    label="MCP"
                    onClick={onSettingsClick}
                />
            </div>
        </div>
    );
};
