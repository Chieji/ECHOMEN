import React from 'react';
import { CpuChipIcon } from './icons/CpuChipIcon';
import { BrainIcon } from './icons/BrainIcon';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { Service, Task, LogEntry, SessionStats } from '../types';

interface EchoBrainProps {
    services: Service[];
    activeTasks: Task[];
    logs: LogEntry[];
    sessionStats: SessionStats;
}

/**
 * EchoBrain Component - Clean, minimal status display
 */
export const EchoBrain: React.FC<EchoBrainProps> = ({ services, activeTasks, logs, sessionStats }) => {
    const connectedServices = services.filter(s => s.status === 'Connected');
    const runningTasks = activeTasks.filter(t => t.status === 'Executing');
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

    return (
        <div className="bg-echo-surface border border-echo-border rounded-lg p-4 h-full">
            <header className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BrainIcon className="w-4 h-4 text-echo-cyan" />
                    <h2 className="text-sm font-medium text-white">Status</h2>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                    {sessionStats.totalTokensUsed.toLocaleString()} tokens
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Services */}
                <div className="bg-echo-surface-elevated border border-echo-border rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <CpuChipIcon className="w-3.5 h-3.5 text-gray-500" />
                        <h3 className="text-xs font-medium text-gray-300">Services</h3>
                    </div>
                    <div className="space-y-1.5">
                        {connectedServices.map(service => (
                            <div key={service.id} className="flex items-center justify-between bg-echo-surface px-2 py-1.5 rounded">
                                <span className="text-xs text-gray-400">{service.name}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            </div>
                        ))}
                        {connectedServices.length === 0 && <p className="text-xs text-gray-600">No services</p>}
                    </div>
                </div>

                {/* Active Tasks */}
                <div className="bg-echo-surface-elevated border border-echo-border rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <CommandLineIcon className="w-3.5 h-3.5 text-gray-500" />
                        <h3 className="text-xs font-medium text-gray-300">Active</h3>
                    </div>
                    <div className="space-y-1.5">
                        {runningTasks.map(task => (
                            <div key={task.id} className="bg-echo-surface px-2 py-1.5 rounded">
                                <p className="text-xs text-echo-cyan truncate">{task.title}</p>
                            </div>
                        ))}
                        {runningTasks.length === 0 && <p className="text-xs text-gray-600">Idle</p>}
                    </div>
                </div>

                {/* Recent Log */}
                <div className="bg-echo-surface-elevated border border-echo-border rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        <h3 className="text-xs font-medium text-gray-300">Log</h3>
                    </div>
                    <div className="h-16 overflow-hidden">
                         {lastLog ? (
                            <div className="text-[10px] font-mono leading-relaxed">
                                <span className={`${lastLog.status === 'ERROR' ? 'text-red-400' : (lastLog.status === 'SUCCESS' ? 'text-green-400' : 'text-gray-400')}`}>
                                    {lastLog.status}
                                </span>
                                <span className="text-gray-500 ml-1">{lastLog.message.slice(0, 50)}</span>
                            </div>
                        ) : (
                            <p className="text-[10px] text-gray-600">No activity</p>
                        )}
                    </div>
                </div>
            </div>

            <footer className="mt-4 pt-3 border-t border-echo-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-600">Latency</span>
                        <span className="text-xs font-mono text-gray-400">12ms</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-600">Uptime</span>
                        <span className="text-xs font-mono text-gray-400">99.9%</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};
