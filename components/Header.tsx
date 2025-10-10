
import React from 'react';
import { LogoIcon } from './icons/LogoIcon';

interface HeaderProps {
    onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
    return (
        <header className="fixed top-0 left-0 right-0 bg-[#0A0A0A]/50 backdrop-blur-lg border-b border-white/10 p-4 flex justify-between items-center z-50">
            <div className="flex items-center gap-3">
                <LogoIcon className="w-8 h-8 text-[#00D4FF]" />
                <h1 className="text-xl font-bold tracking-wider text-gray-100">ECHO</h1>
                <div className="h-6 w-px bg-white/20"></div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4FF] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00D4FF]"></span>
                    </span>
                    <span>3 Active Tasks</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <img
                    src="https://picsum.photos/100/100"
                    alt="User Avatar"
                    className="w-9 h-9 rounded-full border-2 border-[#00D4FF]/50"
                />
            </div>
        </header>
    );
};
