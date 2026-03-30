import React from 'react';

export type SandboxTier = 'pure' | 'dom' | 'full';

interface SandboxTierIndicatorProps {
  tier: SandboxTier;
}

export const SandboxTierIndicator: React.FC<SandboxTierIndicatorProps> = ({ tier }) => {
  const config = {
    pure: {
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: '🟢',
      label: 'Tier 1 (Worker)',
      description: 'Safe - Pure computation only',
    },
    dom: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      icon: '🟡',
      label: 'Tier 2 (DOM)',
      description: 'Isolated - DOM access, no network',
    },
    full: {
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      icon: '🔴',
      label: 'Tier 3 (Full)',
      description: 'Restricted - Requires approval',
    },
  };

  const current = config[tier];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${current.bgColor} border ${current.borderColor}`}>
      <span className="text-sm">{current.icon}</span>
      <div className="flex flex-col">
        <span className={`text-xs font-semibold ${current.color}`}>
          {current.label}
        </span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {current.description}
        </span>
      </div>
    </div>
  );
};

export default SandboxTierIndicator;
