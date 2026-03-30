import React from 'react';

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // SECURITY FIX: Validate href protocols to prevent javascript: XSS
    const isSafeHref = (href: string): boolean =>
        href.startsWith('https://') ||
        href.startsWith('http://') ||
        href.startsWith('/') ||
        href.startsWith('#');

    const processInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={index} className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-1 rounded text-sm font-mono text-cyan-400">{part.slice(1, -1)}</code>;
            }
            return part;
        });
    };

    const sections = content.split('\n\n');

    return (
        <div className="text-base">
            {sections.map((section, i) => {
                if (section.startsWith('```')) {
                    const lines = section.split('\n');
                    const language = lines[0].slice(3).trim();
                    const code = lines.slice(1, -1).join('\n');
                    return (
                        <pre key={i} className="bg-echo-surface p-4 rounded-lg my-4 overflow-x-auto border border-echo-border">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-mono text-gray-500 uppercase">{language || 'code'}</span>
                            </div>
                            <code className="text-sm font-mono text-cyan-300">{code}</code>
                        </pre>
                    );
                }
                if (section.startsWith('### ')) {
                    return <h3 key={i} className="text-xl font-bold mt-4 mb-2">{processInline(section.substring(4))}</h3>;
                }
                if (section.startsWith('* ')) {
                    const listItems = section.split('\n').map((item, j) => (
                        <li key={j} className="ml-5">{processInline(item.substring(2))}</li>
                    ));
                    return <ul key={i} className="list-disc space-y-1 my-2">{listItems}</ul>;
                }
                if (section.trim() === '---') {
                    return <hr key={i} className="my-4 border-zinc-300 dark:border-zinc-700" />;
                }
                return <p key={i}>{processInline(section)}</p>;
            })}
        </div>
    );
};
