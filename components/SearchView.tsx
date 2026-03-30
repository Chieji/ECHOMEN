import React, { useState, useMemo } from 'react';
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
 * SearchView - Clean global search component
 */
export const SearchView: React.FC<SearchViewProps> = ({ artifacts, logs, onSelect }) => {
    const [query, setQuery] = useState('');

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

    const index = useMemo(() => {
        const idx = new Index({
            tokenize: "forward",
            resolution: 9
        });

        searchableData.forEach(item => {
            idx.add(item.id, `${item.title} ${item.content}`);
        });

        return idx;
    }, [searchableData]);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const resultIds = index.search(query, { limit: 10 });
        return searchableData.filter(item => resultIds.includes(item.id));
    }, [query, index, searchableData]);

    return (
        <div className="bg-echo-surface border border-echo-border rounded-lg p-3 h-full flex flex-col">
            <div className="relative mb-3">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    autoFocus
                    value={query}
                    onChange={(e: any) => setQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-echo-surface-elevated border border-echo-border rounded-md py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-echo-cyan transition-colors"
                />
            </div>

            <div className="flex-grow overflow-y-auto space-y-2">
                <AnimatePresence>
                    {results.map((result, idx) => (
                        <motion.div
                            key={result.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => onSelect(result)}
                            className="bg-echo-surface-elevated border border-echo-border p-3 rounded cursor-pointer hover:border-gray-500 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-echo-surface rounded text-gray-400">
                                        {result.type === 'artifact' ? <DocumentIcon className="w-3 h-3" /> : <ClockIcon className="w-3 h-3" />}
                                    </div>
                                    <h4 className="text-sm font-medium text-gray-300">{result.title}</h4>
                                </div>
                                <span className="text-[10px] text-gray-500">{result.type}</span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">
                                {result.content}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {query && results.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-xs text-gray-600">No results</p>
                    </div>
                )}

                {!query && (
                    <div className="text-center py-8">
                        <p className="text-xs text-gray-600">Type to search</p>
                    </div>
                )}
            </div>
        </div>
    );
};
