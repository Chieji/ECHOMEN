import React from 'react';
import { WebHawkIcon } from './icons/WebHawkIcon';
import { CodeForgeIcon } from './icons/CodeForgeIcon';
import { DocumentMasterIcon } from './icons/DocumentMasterIcon';
import { BrainIcon } from './icons/BrainIcon';
import { PencilIcon } from './icons/PencilIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { PlugIcon } from './icons/PlugIcon';
import { RocketIcon } from './icons/RocketIcon';
import { CommandLineIcon } from './icons/CommandLineIcon';

export const PREDEFINED_ICONS: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    WebHawk: WebHawkIcon,
    CodeForge: CodeForgeIcon,
    DocumentMaster: DocumentMasterIcon,
    Brain: BrainIcon,
    Pencil: PencilIcon,
    UserCircle: UserCircleIcon,
    Plug: PlugIcon,
    Rocket: RocketIcon,
    CommandLine: CommandLineIcon,
};

export const AgentIcon: React.FC<{ icon?: string; className?: string }> = ({ icon, className = 'w-6 h-6' }) => {
    if (!icon) {
        return <UserCircleIcon className={className} />;
    }

    if (icon.startsWith('http')) {
        return <img src={icon} alt="Agent Icon" className={`${className} rounded-full object-cover`} />;
    }

    const IconComponent = PREDEFINED_ICONS[icon] || UserCircleIcon;
    return <IconComponent className={className} />;
};
