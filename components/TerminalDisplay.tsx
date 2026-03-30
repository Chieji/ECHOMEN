import React from 'react';

const logoLines = [
'      /\\',
'__/\\_/  \\/\\/\\___',
'\\/   \\__/  \\____>',
];


export const TerminalDisplay: React.FC = () => {
    return (
        <div className="p-4 bg-echo-surface border border-echo-border rounded-lg">
            <pre
                className="font-mono text-center text-sm md:text-base text-echo-cyan"
            >
                {logoLines.join('\n')}
            </pre>
            <div className="font-mono text-xs md:text-sm text-gray-400 mt-4">
                <p>ECHO Command Reference:</p>
                <ul className="list-none pl-2 mt-2 space-y-1">
                    <li><span className="text-echo-cyan">/pipeline</span> - View and manage the live task queue.</li>
                    <li><span className="text-echo-cyan">/agents</span>   - Configure specialized agents in the MCP.</li>
                    <li><span className="text-echo-cyan">/mode</span>     - Switch between [Action] and [Chat] modes.</li>
                </ul>
            </div>
        </div>
    );
};