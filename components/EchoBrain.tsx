import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
 * EchoBrain Component
 *
 * Provides a real-time, high-fidelity visualization of the agent's internal state,
 * connected services, and execution performance.
 */
export const EchoBrain: React.FC<EchoBrainProps> = ({ services, activeTasks, logs, sessionStats }) => {
    const connectedServices = services.filter(s => s.status === 'Connected');
    const runningTasks = activeTasks.filter(t => t.status === 'Executing');
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

    return (
        <div className="bg-[#0F0F0F] border-2 border-[#00D4FF]/20 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
                        <BrainIcon className="w-8 h-8 text-[#00D4FF] animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">ECHO Core</h2>
                        <p className="text-xs text-gray-400 font-mono">v1.0.0-beta.local</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Tokens</p>
                        <p className="text-lg font-mono text-cyan-400">{sessionStats.totalTokensUsed.toLocaleString()}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Card: Services */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <CpuChipIcon className="w-5 h-5 text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-200">System Connect</h3>
                    </div>
                    <div className="space-y-2">
                        {connectedServices.map(service => (
                            <div key={service.id} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                                <span className="text-xs font-medium text-gray-300">{service.name}</span>
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                            </div>
                        ))}
                        {connectedServices.length === 0 && <p className="text-xs text-gray-500 italic">No services online.</p>}
                    </div>
                </div>

                {/* Status Card: Tasks */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <CommandLineIcon className="w-5 h-5 text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-200">Active Thought</h3>
                    </div>
                    <div className="space-y-2">
                        {runningTasks.map(task => (
                            <div key={task.id} className="bg-cyan-500/10 px-3 py-2 rounded-lg border border-cyan-500/20">
                                <p className="text-xs font-bold text-cyan-400 truncate">{task.title}</p>
                                <p className="text-[10px] text-cyan-300/60 font-mono mt-1">{task.agent.name} is working...</p>
                            </div>
                        ))}
                        {runningTasks.length === 0 && <p className="text-xs text-gray-500 italic text-center py-2">ECHO is currently idle.</p>}
                    </div>
                </div>

                {/* Status Card: Real-time Pulse */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                        <h3 className="text-sm font-semibold text-gray-200">System Pulse</h3>
                    </div>
                    <div className="h-20 overflow-hidden relative">
                         <AnimatePresence mode="wait">
                            {lastLog ? (
                                <motion.div
                                    key={lastLog.timestamp}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-[11px] font-mono leading-relaxed"
                                >
                                    <span className={`font-bold ${lastLog.status === 'ERROR' ? 'text-red-400' : (lastLog.status === 'SUCCESS' ? 'text-green-400' : 'text-cyan-400')}`}>
                                        [{lastLog.status}]
                                    </span>
                                    <span className="text-gray-400 ml-2">{lastLog.message}</span>
                                </motion.div>
                            ) : (
                                <p className="text-[10px] text-gray-600 font-mono italic text-center pt-6">Monitoring system events...</p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <footer className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Latency</span>
                        <span className="text-sm font-mono text-white">12ms</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Reliability</span>
                        <span className="text-sm font-mono text-white">99.9%</span>
                    </div>
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all border border-white/5">
                    View System Trace
                </button>
            </footer>
        </div>
    );
};
