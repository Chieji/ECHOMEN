import React from 'react';

const logoLines = [
'      /\\',
'__/\\_/  \\/\\/\\___',
'\\/   \\__/  \\____>',
];


export const TerminalDisplay: React.FC = () => {
    return (
        <div className="p-4 bg-black/30 border border-white/10 rounded-lg">
            <pre
                className="font-mono text-center text-sm md:text-base text-[#00D4FF]"
                style={{ textShadow: '0 0 5px rgba(0, 212, 255, 0.7), 0 0 10px rgba(0, 212, 255, 0.5)' }}
            >
                {logoLines.join('\n')}
            </pre>
            <div className="font-mono text-xs md:text-sm text-gray-400 mt-4">
                <p>ECHO Command Reference:</p>
                <ul className="list-none pl-2 mt-2 space-y-1">
                    <li><span className="text-[#00D4FF]">/pipeline</span> - View and manage the live task queue.</li>
                    <li><span className="text-[#00D4FF]">/agents</span>   - Configure specialized agents in the MCP.</li>
                    <li><span className="text-[#00D4FF]">/mode</span>     - Switch between [Action] and [Chat] modes.</li>
                </ul>
            </div>
        </div>
    );
};