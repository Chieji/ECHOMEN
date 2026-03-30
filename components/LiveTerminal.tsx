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
        <div className="bg-echo-surface border border-echo-border rounded-lg h-80 flex flex-col font-mono text-sm">
            <header className="flex-shrink-0 flex items-center justify-between bg-echo-surface-elevated border-b border-echo-border px-3 py-2">
                <div className="flex items-center gap-2">
                    <WindowControlsIcon />
                    <h3 className="text-gray-300 text-xs">Terminal</h3>
                </div>
            </header>
            <div ref={terminalRef} className="flex-grow p-3 overflow-y-auto text-xs">
                {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 mb-1">
                        <span className="text-gray-600 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <p className="text-gray-300">
                            <span className={`${logStatusColors[log.status]}`}>[{log.status}]</span> {log.message}
                        </p>
                    </div>
                ))}
                <div className="flex items-center gap-2 text-gray-500 mt-1">
                    <span>$</span>
                    <span className="inline-block w-2 h-3 bg-gray-500 rounded-sm"></span>
                </div>
            </div>
        </div>
    );
};