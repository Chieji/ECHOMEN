import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';
import { WindowControlsIcon } from './icons/WindowControlsIcon';

interface LiveTerminalProps {
    logs: LogEntry[];
}

const logStatusColors = {
    SUCCESS: 'text-green-400',
    ERROR: 'text-red-400',
    WARN: 'text-yellow-400',
    INFO: 'text-cyan-400',
};

export const LiveTerminal: React.FC<LiveTerminalProps> = ({ logs }) => {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="bg-[#121212] border border-white/10 rounded-lg h-80 flex flex-col font-mono text-sm shadow-2xl shadow-black/50">
            <header className="flex-shrink-0 flex items-center justify-between bg-zinc-800/50 border-b border-white/10 px-4 py-2">
                <div className="flex items-center gap-2">
                    <WindowControlsIcon />
                    <h3 className="text-gray-300 font-semibold">/bin/bash - ECHO Execution Environment</h3>
                </div>
            </header>
            <div ref={terminalRef} className="flex-grow p-4 overflow-y-auto">
                {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2">
                        <span className="text-gray-500 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <p className="text-gray-200">
                            <span className={`${logStatusColors[log.status]}`}>[{log.status}]</span> {log.message}
                        </p>
                    </div>
                ))}
                <div className="flex items-center gap-2 text-gray-200">
                    <span>&gt;</span>
                    <span className="inline-block w-2 h-4 bg-green-400 animate-pulse"></span>
                </div>
            </div>
        </div>
    );
};