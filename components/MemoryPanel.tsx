import React, { useState, useEffect } from 'react';
import { MemorySearchResult } from '../lib/SemanticMemory';
import { MagnifyingGlassIcon as SearchIcon } from './icons/MagnifyingGlassIcon';
import { BrainIcon } from './icons/BrainIcon';

export const MemoryPanel: React.FC = () => {
    const [memories, setMemories] = useState<MemorySearchResult[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Mock initial memories (since real memory access might require a complex hook)
    useEffect(() => {
        setMemories([
            {
                id: 'mem_1',
                content: 'User prefers dark mode and high-density terminal layouts.',
                similarity: 0.95,
                metadata: { type: 'preference' },
                timestamp: Date.now() - 3600000
            },
            {
                id: 'mem_2',
                content: 'Project ECHOMEN is a multi-agent BDI cognitive architecture.',
                similarity: 0.88,
                metadata: { type: 'fact' },
                timestamp: Date.now() - 7200000
            }
        ]);
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate semantic search
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsLoading(false);
        }, 800);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div className="h-full flex flex-col bg-echo-void/50">
            <div className="flex-none p-4 border-b border-echo-border bg-echo-surface/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Cognitive Memory</h3>
                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        placeholder="Search semantic memory..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-echo-surface border border-echo-border rounded-md px-3 py-1.5 pl-9 text-xs text-gray-200 focus:outline-none focus:border-echo-cyan focus:ring-1 focus:ring-echo-cyan/20"
                    />
                    <SearchIcon className="absolute left-3 top-2 w-3.5 h-3.5 text-gray-500" />
                </form>
            </div>

            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-echo-cyan"></div>
                    </div>
                ) : (
                    memories.map((mem) => (
                        <div key={mem.id} className="p-3 rounded-lg bg-echo-surface/50 border border-echo-border group hover:border-echo-cyan/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <BrainIcon className="w-3 h-3 text-purple-400" />
                                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">
                                        {mem.metadata.type || 'memory'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-echo-cyan font-bold">
                                    {(mem.similarity * 100).toFixed(0)}% Match
                                </span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed italic">
                                "{mem.content}"
                            </p>
                            <div className="mt-2 text-[9px] text-gray-600 flex justify-between">
                                <span>{new Date(mem.timestamp).toLocaleTimeString()}</span>
                                <span className="text-[10px] text-gray-500 font-mono">#{mem.id.slice(-4)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
