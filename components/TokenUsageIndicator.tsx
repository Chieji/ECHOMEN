import React from 'react';
import { SessionStats } from '../types';
import { CpuChipIcon } from './icons/CpuChipIcon';

interface TokenUsageIndicatorProps {
    stats: SessionStats;
}

export const TokenUsageIndicator: React.FC<TokenUsageIndicatorProps> = ({ stats }) => {
    
    const formattedTokens = new Intl.NumberFormat().format(stats.totalTokensUsed);

    return (
        <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
            <CpuChipIcon className="w-5 h-5" />
            <span>{formattedTokens} Tokens</span>
        </div>
    );
};
