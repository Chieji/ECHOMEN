import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Index } from 'flexsearch';
import { Artifact, LogEntry } from '../types';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ClockIcon } from './icons/ClockIcon';

interface SearchResult {
    id: string;
    title: string;
    type: 'artifact' | 'log' | 'note';
    content: string;
    timestamp: string;
}

interface SearchViewProps {
    artifacts: Artifact[];
    logs: LogEntry[];
    onSelect: (result: SearchResult) => void;
}

/**
 * SearchView Component
 * 
 * A high-performance global search interface powered by FlexSearch.
 * Indexes artifacts, logs, and notes for sub-millisecond retrieval.
 */
export const SearchView: React.FC<SearchViewProps> = ({ artifacts, logs, onSelect }) => {
    const [query, setQuery] = useState('');
    
    // Combine all searchable data into a unified format
    const searchableData = useMemo(() => {
        const results: SearchResult[] = [];
        
        artifacts.forEach(a => results.push({
            id: a.id,
            title: a.title,
            type: 'artifact',
            content: a.content,
            timestamp: a.createdAt
        }));
        
        logs.forEach((l, index) => results.push({
            id: `log-${index}`,
            title: l.message.substring(0, 50),
            type: 'log',
            content: l.message,
            timestamp: l.timestamp
        }));
        
        return results;
    }, [artifacts, logs]);

    // Initialize FlexSearch index
    const index = useMemo(() => {
        const idx = new Index({
            tokenize: "forward",
            optimize: true,
            resolution: 9
        });
        
        searchableData.forEach(item => {
            idx.add(item.id, `${item.title} ${item.content}`);
        });
        
        return idx;
    }, [searchableData]);

    // Perform search
    const results = useMemo(() => {
        if (!query.trim()) return [];
        const resultIds = index.search(query, { limit: 10 });
        return searchableData.filter(item => resultIds.includes(item.id));
    }, [query, index, searchableData]);

    return (
        <div className="bg-[#0F0F0F] border border-white/10 rounded-2xl p-6 shadow-3xl h-full flex flex-col">
            <div className="relative mb-8">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search across ECHO's memory..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50 transition-all text-lg"
                />
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 custom-scrollbar">
                <AnimatePresence>
                    {results.map((result, idx) => (
                        <motion.div
                            key={result.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => onSelect(result)}
                            className="bg-white/[0.02] border border-white/5 p-4 rounded-xl cursor-pointer hover:bg-white/5 hover:border-[#00D4FF]/30 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-cyan-500/10 rounded-lg text-[#00D4FF]">
                                        {result.type === 'artifact' ? <DocumentIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
                                    </div>
                                    <h4 className="font-bold text-gray-200 group-hover:text-white transition-colors">{result.title}</h4>
                                </div>
                                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">{result.type}</span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 font-mono leading-relaxed">
                                {result.content}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {query && results.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-600 font-mono italic">No matches found in active memory.</p>
                    </div>
                )}
                
                {!query && (
                    <div className="text-center py-20">
                        <p className="text-gray-600 font-mono text-xs uppercase tracking-[0.2em]">Ready for Global Retrieval</p>
                    </div>
                )}
            </div>
        </div>
    );
};
