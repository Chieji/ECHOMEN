import React, { useState, useEffect } from 'react';
import { AppDeployment, LogEntry } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { LinkIcon } from './icons/LinkIcon';
import { AppLogViewerModal } from './AppLogViewerModal';

const statusConfig = {
    deploying: { color: 'text-yellow-400', icon: <SpinnerIcon className="w-4 h-4 text-yellow-400" /> },
    ready: { color: 'text-green-400', icon: <div className="w-3 h-3 rounded-full bg-green-500" /> },
    error: { color: 'text-red-400', icon: <div className="w-3 h-3 rounded-full bg-red-500" /> },
};

export const AppDeployments: React.FC = () => {
    const [apps, setApps] = useState<AppDeployment[]>([]);
    const [selectedApp, setSelectedApp] = useState<AppDeployment | null>(null);

    const updateApp = (id: string, updates: Partial<AppDeployment>) => {
        setApps(prev => prev.map(app => app.id === id ? { ...app, ...updates } : app));
    };

    const addLog = (id: string, log: Omit<LogEntry, 'timestamp'>) => {
        const newLog = { ...log, timestamp: new Date().toISOString() };
        setApps(prev => prev.map(app => app.id === id ? { ...app, logs: [...app.logs, newLog] } : app));
    };

    const handleCreateApp = () => {
        const name = window.prompt("Enter a name for your new application:");
        if (!name || !name.trim()) return;

        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const newApp: AppDeployment = {
            id: `app-${Date.now()}`,
            name,
            slug,
            createdAt: new Date().toISOString(),
            status: 'deploying',
            url: '',
            logs: [],
        };
        setApps(prev => [...prev, newApp]);

        // Simulate deployment process
        const deploymentLogs: Omit<LogEntry, 'timestamp'>[] = [
            { status: 'INFO', message: 'Deployment process initiated...' },
            { status: 'INFO', message: 'Provisioning Supabase backend...' },
            { status: 'SUCCESS', message: 'Database schema created for table: apps' },
            { status: 'INFO', message: 'Generating serverless function...' },
            { status: 'INFO', message: 'Deploying to edge network...' },
            { status: 'SUCCESS', message: 'Deployment successful. Generating URL...' },
        ];

        let logIndex = 0;
        const interval = setInterval(() => {
            if (logIndex < deploymentLogs.length) {
                addLog(newApp.id, deploymentLogs[logIndex]);
                logIndex++;
            } else {
                clearInterval(interval);
                const randomId = Math.random().toString(36).substring(2, 12);
                updateApp(newApp.id, { 
                    status: 'ready',
                    url: `https://${randomId}.app.echomen.dev`
                });
            }
        }, 1200);
    };
    
    return (
        <>
            <div className="space-y-2">
                {apps.map(app => (
                    <div key={app.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                        <div>
                            <p className="font-semibold text-white">{app.name}</p>
                            {app.status === 'ready' && app.url ? (
                                <a href={app.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-cyan-400 hover:underline">
                                    <LinkIcon className="w-3 h-3" />
                                    <span>{app.url}</span>
                                </a>
                            ) : (
                                <p className="text-xs text-gray-500">
                                    {new Date(app.createdAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 text-xs font-semibold ${statusConfig[app.status].color}`}>
                                {statusConfig[app.status].icon}
                                <span className="capitalize">{app.status}</span>
                            </div>
                            <button onClick={() => setSelectedApp(app)} className="text-gray-400 hover:text-white" title="View Logs">
                                <DocumentTextIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
                 {apps.length === 0 && (
                    <p className="text-sm text-center text-gray-500 py-4">No apps deployed yet.</p>
                )}
            </div>
            <button 
                onClick={handleCreateApp}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
                <PlusIcon className="w-5 h-5" />
                Create New App
            </button>

            <AppLogViewerModal
                app={selectedApp}
                isOpen={!!selectedApp}
                onClose={() => setSelectedApp(null)}
            />
        </>
    );
};