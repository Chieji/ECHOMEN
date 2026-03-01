import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { MasterConfigurationPanel } from './components/MasterConfigurationPanel';
import { AnimatePresence, motion } from 'framer-motion';
import { Task, LogEntry, AgentMode, AgentStatus, Artifact, CustomAgent, Service, Playbook, TodoItem, SessionStats } from './types';
import { createInitialPlan, getChatResponse, suggestPlaybookName, clarifyAndCorrectPrompt, analyzeChatMessageForAction } from './services/planner';
import { useMemory } from './hooks/useMemory';
import { ExecutionStatusBar } from './components/ExecutionStatusBar';
import { AgentExecutor } from './services/agentExecutor';
import { CommandDeck } from './components/CommandDeck';
import { CommandPalette } from './components/CommandPalette';
import { PlaybookCreationModal } from './components/PlaybookCreationModal';

/**
 * ECHO Main Application Entry
 * 
 * Orchestrates the multi-agent system, handles global state,
 * and manages the elite workstation UI.
 */
const App: React.FC = () => {
    // UI State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isPlaybookModalOpen, setIsPlaybookModalOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [agentStatus, setAgentStatus] = useState<AgentStatus>(AgentStatus.IDLE);
    
    // Data State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [agents, setAgents] = useState<CustomAgent[]>([]);
    const [sessionStats, setSessionStats] = useState<SessionStats>({ totalTokensUsed: 0 });
    const [services, setServices] = useState<Service[]>([]);
    const [currentPrompt, setCurrentPrompt] = useState<string>('');
    const [playbookCandidate, setPlaybookCandidate] = useState<{ suggestedName: string; tasks: Task[]; triggerPrompt: string } | null>(null);

    const executorRef = useRef<AgentExecutor | null>(null);

    // --- Lifecycle & Initialization ---

    useEffect(() => {
        const savedServicesJSON = localStorage.getItem('echo-services');
        if (savedServicesJSON) {
            try {
                setServices(JSON.parse(savedServicesJSON));
            } catch (e) { console.error("Failed to load services", e); }
        }
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    // Global Hotkeys (Ctrl+P / Cmd+K)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'k')) {
                e.preventDefault();
                setIsPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // --- Handlers ---

    const handleTokenUpdate = (tokenCount: number) => {
        setSessionStats(prev => ({ ...prev, totalTokensUsed: prev.totalTokensUsed + tokenCount }));
    };

    const addLog = (log: Omit<LogEntry, 'timestamp'>) => {
        const newLog = { ...log, timestamp: new Date().toISOString() };
        setLiveLogs(prev => [...prev.slice(-100), newLog]);
    };
    
    const handleCreateArtifact = (artifactData: Omit<Artifact, 'id' | 'createdAt'>) => {
        const newArtifact: Artifact = {
            ...artifactData,
            id: `artifact-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        setArtifacts(prev => [...prev, newArtifact]);
    };

    const handleAgentCreated = (newAgent: CustomAgent) => {
        setAgents(prev => [...prev, newAgent]);
    };

    const handleSendCommand = async (prompt: string) => {
        if (!prompt.trim()) return;
        
        setTasks([]);
        setLiveLogs([]);
        setCurrentPrompt(prompt);
        setAgentStatus(AgentStatus.RUNNING);
        addLog({ status: 'INFO', message: `[User] Received directive: "${prompt}"` });

        try {
            const correctedPrompt = await clarifyAndCorrectPrompt(prompt, handleTokenUpdate);
            const executionContext = {
                connectedServices: services.filter(s => s.status === 'Connected').map(s => s.name),
                playbooks: [], // Placeholder for memory logic
                customAgents: agents,
                activeTodos: [],
            };

            const initialTasks = await createInitialPlan(correctedPrompt, false, executionContext, handleTokenUpdate);
            setTasks(initialTasks);

            const executor = new AgentExecutor({
                onTaskUpdate: (updatedTask) => setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t)),
                onTasksUpdate: (updatedTasks) => setTasks(updatedTasks),
                onLog: addLog,
                onTokenUpdate: handleTokenUpdate,
                onArtifactCreated: handleCreateArtifact,
                onAgentCreated: handleAgentCreated,
                onFinish: () => {
                    addLog({ status: 'SUCCESS', message: 'ECHO: All objectives achieved.' });
                    setAgentStatus(AgentStatus.FINISHED);
                },
                onFail: (err) => {
                    addLog({ status: 'ERROR', message: `ECHO: Execution halted. ${err}` });
                    setAgentStatus(AgentStatus.ERROR);
                }
            });

            executorRef.current = executor;
            await executor.run(initialTasks, correctedPrompt, artifacts);
        } catch (error) {
            console.error(error);
            setAgentStatus(AgentStatus.ERROR);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#09090B] text-gray-100 selection:bg-[#00D4FF]/30 overflow-hidden">
            <Header 
                onSettingsClick={() => setIsSettingsOpen(true)} 
                agentStatus={agentStatus}
                sessionStats={sessionStats}
            />

            <main className="flex-grow overflow-hidden relative">
                <CommandDeck 
                    tasks={tasks}
                    logs={liveLogs}
                    artifacts={artifacts}
                    services={services}
                    sessionStats={sessionStats}
                    onCommand={handleSendCommand}
                    onCancelTask={(id) => executorRef.current?.cancelTask(id)}
                />
            </main>

            <ExecutionStatusBar status={agentStatus} tokenCount={sessionStats.totalTokensUsed} />

            <CommandPalette 
                isOpen={isPaletteOpen} 
                onClose={() => setIsPaletteOpen(false)} 
                onAction={(id) => id === 'open-settings' && setIsSettingsOpen(true)}
            />

            <AnimatePresence>
                {isSettingsOpen && (
                    <MasterConfigurationPanel 
                        onClose={() => setIsSettingsOpen(false)}
                        theme={theme}
                        setTheme={setTheme}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default App;
