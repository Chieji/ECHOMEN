import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { MasterConfigurationPanel } from './components/MasterConfigurationPanel';
import { AnimatePresence } from 'framer-motion';
import { Task, LogEntry, AgentStatus, Artifact, CustomAgent, Service, SessionStats, Message, AgentMode } from './types';
import { createInitialPlan, clarifyAndCorrectPrompt } from './services/planner';
import { ExecutionStatusBar } from './components/ExecutionStatusBar';
import { AgentExecutor } from './services/agentExecutor';
import { CommandDeck } from './components/CommandDeck';
import { CommandPalette } from './components/CommandPalette';
import { ChatInterface } from './components/ChatInterface';

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
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [agentStatus, setAgentStatus] = useState<AgentStatus>(AgentStatus.IDLE);
    const [agentMode, setAgentMode] = useState<AgentMode>(AgentMode.ACTION);

    // Data State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [agents, setAgents] = useState<CustomAgent[]>([]);
    const [sessionStats, setSessionStats] = useState<SessionStats>({ totalTokensUsed: 0 });
    const [services, setServices] = useState<Service[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

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

    // --- Chat Mode Handlers ---

    const handleSuggestionClick = (prompt: string) => {
        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            text: prompt,
            sender: 'user',
            timestamp: new Date().toISOString(),
            type: 'chat',
        };
        setMessages(prev => [...prev, userMessage]);

        // Simulate agent response (in a real app, this would call the LLM)
        setTimeout(() => {
            const agentMessage: Message = {
                id: `msg-${Date.now()}-agent`,
                text: `I understand you want to: "${prompt}". This is a chat mode response. In a full implementation, this would connect to the AI provider.`,
                sender: 'agent',
                timestamp: new Date().toISOString(),
                type: 'chat',
            };
            setMessages(prev => [...prev, agentMessage]);
        }, 500);
    };

    const handleEditMessage = (messageId: string, newText: string) => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, text: newText } : msg
        ));
    };

    const handleAcceptAction = (messageId: string, prompt: string) => {
        // Remove the action prompt and switch to action mode with the prompt
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        setAgentMode(AgentMode.ACTION);
        handleSendCommand(prompt);
    };

    const handleDeclineAction = (messageId: string) => {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    const handleSendCommand = async (prompt: string) => {
        if (!prompt.trim()) return;

        // In chat mode, just add the message and get a response
        if (agentMode === AgentMode.CHAT) {
            const userMessage: Message = {
                id: `msg-${Date.now()}-user`,
                text: prompt,
                sender: 'user',
                timestamp: new Date().toISOString(),
                type: 'chat',
            };
            setMessages(prev => [...prev, userMessage]);

            // Simulate agent response (in real app, this would call the LLM)
            const agentMessage: Message = {
                id: `msg-${Date.now()}-agent`,
                text: `Processing your request: "${prompt}"... This is a chat mode response. The actual AI response would be generated here.`,
                sender: 'agent',
                timestamp: new Date().toISOString(),
                type: 'chat',
            };
            setMessages(prev => [...prev, agentMessage]);
            return;
        }

        setTasks([]);
        setLiveLogs([]);
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
        <div className="flex flex-col h-screen bg-echo-void text-gray-100 overflow-hidden">
            <Header
                onSettingsClick={() => setIsSettingsOpen(true)}
                onHistoryClick={() => {}}
                onArtifactsClick={() => {}}
                onModeChange={setAgentMode}
                currentMode={agentMode}
                tasks={tasks}
                agentStatus={agentStatus}
                sessionStats={sessionStats}
            />

            <main className="flex-grow overflow-hidden relative">
                {agentMode === AgentMode.CHAT ? (
                    <ChatInterface
                        messages={messages}
                        onSuggestionClick={handleSuggestionClick}
                        onEditMessage={handleEditMessage}
                        onAcceptAction={handleAcceptAction}
                        onDeclineAction={handleDeclineAction}
                    />
                ) : (
                    <CommandDeck
                        tasks={tasks}
                        logs={liveLogs}
                        artifacts={artifacts}
                        services={services}
                        sessionStats={sessionStats}
                        messages={messages}
                        onCommand={handleSendCommand}
                        onCancelTask={(id) => executorRef.current?.cancelTask(id)}
                        onClearChat={() => setMessages([])}
                    />
                )}
            </main>

            <ExecutionStatusBar tasks={tasks} agentStatus={agentStatus} onStopExecution={() => executorRef.current?.cancelTask('')} />

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
