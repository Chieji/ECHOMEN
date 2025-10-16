import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { CommandCenter } from './components/CommandCenter';
import { ExecutionDashboard } from './components/ExecutionDashboard';
import { MasterConfigurationPanel } from './components/MasterConfigurationPanel';
import { AnimatePresence, motion } from 'framer-motion';
import { Task, LogEntry, AgentMode, AgentStatus, Artifact, CustomAgent, Service, Playbook, TodoItem, SessionStats } from './types';
import { createInitialPlan, getChatResponse, suggestPlaybookName, clarifyAndCorrectPrompt, analyzeChatMessageForAction } from './services/planner';
import { useMemory } from './hooks/useMemory';
import { ChatInterface } from './components/ChatInterface';
import { HistoryPanel } from './components/HistoryPanel';
import { ExecutionStatusBar } from './components/ExecutionStatusBar';
import { AgentExecutor } from './services/agentExecutor';
import { ArtifactsPanel } from './components/ArtifactsPanel';
import { PlaybookCreationModal } from './components/PlaybookCreationModal';

const App: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isArtifactsOpen, setIsArtifactsOpen] = useState(false);
    const [isPlaybookModalOpen, setIsPlaybookModalOpen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [agents, setAgents] = useState<CustomAgent[]>([]);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const { messages, addMessage, editMessage, removeMessage, clearMemory } = useMemory([]);
    const [agentMode, setAgentMode] = useState<AgentMode>(AgentMode.ACTION);
    const [agentStatus, setAgentStatus] = useState<AgentStatus>(AgentStatus.IDLE);
    const [currentPrompt, setCurrentPrompt] = useState<string>('');
    const [commandCenterInput, setCommandCenterInput] = useState<string>('');
    const [sessionStats, setSessionStats] = useState<SessionStats>({ totalTokensUsed: 0 });
    const [playbookCandidate, setPlaybookCandidate] = useState<{ suggestedName: string; tasks: Task[]; triggerPrompt: string } | null>(null);

    const executorRef = useRef<AgentExecutor | null>(null);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);
    
    const handleSuggestionClick = (prompt: string) => {
        setCommandCenterInput(prompt);
    };

    const handleSettingsClick = () => setIsSettingsOpen(true);
    const handleSettingsClose = () => setIsSettingsOpen(false);
    const handleHistoryClick = () => setIsHistoryOpen(true);
    const handleHistoryClose = () => setIsHistoryOpen(false);
    const handleArtifactsClick = () => setIsArtifactsOpen(true);
    const handleArtifactsClose = () => setIsArtifactsOpen(false);

    const handleTokenUpdate = (tokenCount: number) => {
        if (typeof tokenCount === 'number' && !isNaN(tokenCount)) {
            setSessionStats(prev => ({ ...prev, totalTokensUsed: prev.totalTokensUsed + tokenCount }));
        }
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
        addLog({ status: 'SUCCESS', message: `[Executor] New artifact created: "${artifactData.title}"` });
    };

    const handleAgentCreated = (newAgent: CustomAgent) => {
        setAgents(prev => {
            const updatedAgents = [...prev, newAgent];
            try {
                const userAgents = updatedAgents.filter(agent => !agent.isCore);
                localStorage.setItem('echo-custom-agents', JSON.stringify(userAgents));
            } catch (error) {
                console.error("Failed to save new agent to localStorage", error);
            }
            return updatedAgents;
        });
        addLog({ status: 'SUCCESS', message: `[System] New specialist agent spawned: "${newAgent.name}"` });
    };
    
    const handleCancelTask = (taskId: string) => {
        if (executorRef.current) {
            executorRef.current.cancelTask(taskId);
        }
    };
    
    const handleAcceptAction = (messageId: string, prompt: string) => {
        removeMessage(messageId);
        addMessage({
            sender: 'agent',
            text: 'Switching to Action Mode to execute the task.',
            type: 'system',
        });
        setAgentMode(AgentMode.ACTION);
        // We use a timeout to allow the mode switch animation to complete
        // before kicking off the command, which can be computationally intensive.
        setTimeout(() => {
            handleSendCommand(prompt, false);
        }, 300);
    };

    const handleDeclineAction = (messageId: string) => {
        removeMessage(messageId);
        addMessage({
            sender: 'agent',
            text: "Understood. We'll stay in Chat Mode. How else can I assist you?",
        });
    };

    const handleSendCommand = async (prompt: string, isWebToolActive: boolean) => {
        if (agentMode === AgentMode.CHAT) {
            addMessage({ sender: 'user', text: prompt });
            try {
                const actionAnalysis = await analyzeChatMessageForAction(prompt, handleTokenUpdate);
                if (actionAnalysis.is_actionable) {
                    addMessage({
                        sender: 'agent',
                        text: 'It looks like you want me to perform an action. Shall I switch to Action Mode and execute this task?',
                        type: 'action_prompt',
                        suggestedPrompt: actionAnalysis.suggested_prompt,
                    });
                } else {
                    const agentResponse = await getChatResponse(prompt, handleTokenUpdate);
                    addMessage({ sender: 'agent', text: agentResponse });
                }
            } catch (error) {
                 console.error("Error during chat analysis/response:", error);
                 addMessage({ sender: 'agent', text: "Sorry, I encountered an error. Please try again." });
            }
            return;
        }

        setTasks([]);
        setLiveLogs([]);
        setArtifacts([]);
        setCurrentPrompt(prompt);
        setAgentStatus(AgentStatus.RUNNING);

        addLog({ status: 'INFO', message: `User command received: "${prompt}"` });

        try {
            addLog({ status: 'INFO', message: '[Planner] Analyzing and clarifying prompt...' });
            const correctedPrompt = await clarifyAndCorrectPrompt(prompt, handleTokenUpdate);
            if (prompt !== correctedPrompt) {
                 addLog({ status: 'SUCCESS', message: `[Planner] Refined prompt: "${correctedPrompt}"` });
            } else {
                 addLog({ status: 'SUCCESS', message: '[Planner] Prompt is clear.' });
            }

            addLog({ status: 'INFO', message: '[Planner] Deconstructing the request...' });
            
            // Gather full context for the planner
            const connectedServices = JSON.parse(localStorage.getItem('echo-services') || '[]').filter((s: Service) => s.status === 'Connected').map((s: Service) => s.name);
            const playbooks = JSON.parse(localStorage.getItem('echo-playbooks') || '[]') as Playbook[];
            const customAgents = JSON.parse(localStorage.getItem('echo-custom-agents') || '[]') as CustomAgent[];
            const todos = JSON.parse(localStorage.getItem('echo-todo-list') || '[]') as TodoItem[];
            
            const executionContext = {
                connectedServices,
                playbooks,
                customAgents,
                activeTodos: todos.filter(t => !t.isCompleted),
            };

            const initialTasks = await createInitialPlan(correctedPrompt, isWebToolActive, executionContext, handleTokenUpdate);
            setTasks(initialTasks);
            
            if (initialTasks.length > 0 && initialTasks[0].id.startsWith('playbook-')) {
                 addLog({ status: 'SUCCESS', message: '[Planner] Found relevant playbook. Loading tasks from memory.' });
            } else {
                 addLog({ status: 'SUCCESS', message: '[Planner] Initial task pipeline generated.' });
            }

            const executor = new AgentExecutor({
                onTaskUpdate: (updatedTask) => {
                    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                },
                onTasksUpdate: (updatedTasks) => {
                    setTasks(updatedTasks);
                },
                onLog: addLog,
                onTokenUpdate: handleTokenUpdate,
                onArtifactCreated: handleCreateArtifact,
                onAgentCreated: handleAgentCreated,
                onFinish: () => {
                    addLog({ status: 'SUCCESS', message: 'ECHO: All tasks completed successfully.' });
                    setAgentStatus(AgentStatus.FINISHED);
                },
                onFail: (errorMessage) => {
                    addLog({ status: 'ERROR', message: `ECHO: Execution failed. ${errorMessage}` });
                    setAgentStatus(AgentStatus.ERROR);
                }
            });
            executorRef.current = executor;
            await executor.run(initialTasks, correctedPrompt, artifacts);

        } catch (error) {
            console.error("Error during agent execution:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            addLog({ status: 'ERROR', message: `[System] A critical error occurred: ${errorMessage}` });
            setAgentStatus(AgentStatus.ERROR);
        }
    };
    
    useEffect(() => {
        const handleSynthesis = async () => {
            if (agentStatus === AgentStatus.FINISHED && currentPrompt && tasks.length > 0 && !tasks[0].id.startsWith('playbook-')) {
                setAgentStatus(AgentStatus.SYNTHESIZING);
                addLog({ status: 'INFO', message: '[Synthesizer] Analyzing successful plan to create a new playbook...' });
                try {
                    const suggestedName = await suggestPlaybookName(currentPrompt, tasks, handleTokenUpdate);
                    setPlaybookCandidate({
                        suggestedName,
                        tasks,
                        triggerPrompt: currentPrompt,
                    });
                    setIsPlaybookModalOpen(true);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    addLog({ status: 'ERROR', message: `[Synthesizer] Failed to create playbook: ${errorMessage}` });
                    setAgentStatus(AgentStatus.IDLE);
                }
            } else if (agentStatus === AgentStatus.FINISHED || agentStatus === AgentStatus.ERROR) {
                setAgentStatus(AgentStatus.IDLE);
            }
        }
        handleSynthesis();
    }, [agentStatus, currentPrompt, tasks]);


    const handleSavePlaybook = (name: string, description: string) => {
        if (!playbookCandidate) return;

        const taskTemplates = playbookCandidate.tasks.map(({ id, status, dependencies, logs, reviewHistory, retryCount, maxRetries, subSteps, ...rest }) => rest);
        const newPlaybook: Playbook = {
            id: `playbook-${Date.now()}`,
            name,
            description,
            triggerPrompt: playbookCandidate.triggerPrompt,
            tasks: taskTemplates,
            createdAt: new Date().toISOString(),
        };

        const savedPlaybooksJSON = localStorage.getItem('echo-playbooks');
        const playbooks = savedPlaybooksJSON ? JSON.parse(savedPlaybooksJSON) : [];
        playbooks.push(newPlaybook);
        localStorage.setItem('echo-playbooks', JSON.stringify(playbooks));
        
        addLog({ status: 'SUCCESS', message: `[Synthesizer] New playbook created: "${newPlaybook.name}"` });
        
        setIsPlaybookModalOpen(false);
        setPlaybookCandidate(null);
        setAgentStatus(AgentStatus.IDLE);
    };

    const handleCancelPlaybookCreation = () => {
        setIsPlaybookModalOpen(false);
        setPlaybookCandidate(null);
        setAgentStatus(AgentStatus.IDLE);
        addLog({ status: 'WARN', message: '[Synthesizer] Playbook creation cancelled by user.' });
    };

    const handleStopExecution = () => {
        if (executorRef.current) {
            executorRef.current.stop();
        }
        addLog({ status: 'WARN', message: 'User initiated stop command. Halting all tasks.' });
        setAgentStatus(AgentStatus.IDLE);
    };

    const pageVariants = {
        initial: { opacity: 0, y: 20 },
        in: { opacity: 1, y: 0 },
        out: { opacity: 0, y: -20 },
    };

    const pageTransition = {
        type: "tween",
        ease: "anticipate",
        duration: 0.5,
    };

    return (
        <div className="bg-zinc-100 dark:bg-[#0A0A0A] text-zinc-900 dark:text-gray-200 min-h-screen font-sans flex flex-col">
            <Header 
                onSettingsClick={handleSettingsClick} 
                onHistoryClick={handleHistoryClick} 
                onArtifactsClick={handleArtifactsClick}
                tasks={tasks}
                agentStatus={agentStatus}
                sessionStats={sessionStats}
            />
            
            <main className="flex-grow pt-24 pb-48 md:pb-40 flex flex-col">
                 <AnimatePresence mode="wait">
                    {agentMode === AgentMode.ACTION ? (
                        <motion.div
                            key="action-mode"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={pageVariants}
                            transition={pageTransition}
                            className="flex-grow flex flex-col"
                        >
                            <ExecutionDashboard 
                                tasks={tasks}
                                liveLogs={liveLogs}
                                onCancelTask={handleCancelTask}
                            />
                        </motion.div>
                    ) : (
                         <motion.div
                            key="chat-mode"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={pageVariants}
                            transition={pageTransition}
                            className="flex-grow flex flex-col"
                        >
                           <ChatInterface 
                                messages={messages} 
                                onSuggestionClick={handleSuggestionClick}
                                onEditMessage={editMessage}
                                onAcceptAction={handleAcceptAction}
                                onDeclineAction={handleDeclineAction}
                           />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {agentMode === AgentMode.ACTION && tasks.length > 0 && (
                    <ExecutionStatusBar tasks={tasks} agentStatus={agentStatus} onStopExecution={handleStopExecution} />
                )}
            </AnimatePresence>

            <CommandCenter 
                agentMode={agentMode}
                setAgentMode={setAgentMode}
                onSendCommand={(prompt, isWebToolActive) => {
                    handleSendCommand(prompt, isWebToolActive);
                    setCommandCenterInput('');
                }} 
                onClearChat={() => {
                    clearMemory();
                    setSessionStats({ totalTokensUsed: 0 }); // Reset token count on new chat
                }}
                inputValue={commandCenterInput}
                onInputChange={setCommandCenterInput}
            />
            
            <AnimatePresence>
                {isSettingsOpen && (
                    <MasterConfigurationPanel 
                        onClose={handleSettingsClose}
                        theme={theme}
                        setTheme={setTheme}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isHistoryOpen && (
                    <HistoryPanel 
                        tasks={tasks}
                        messages={messages} 
                        onClose={handleHistoryClose} 
                        onClearChat={() => {
                            clearMemory();
                            handleHistoryClose();
                        }}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isArtifactsOpen && (
                    <ArtifactsPanel
                        artifacts={artifacts}
                        onClose={handleArtifactsClose}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isPlaybookModalOpen && playbookCandidate && (
                    <PlaybookCreationModal
                        isOpen={isPlaybookModalOpen}
                        suggestedName={playbookCandidate.suggestedName}
                        triggerPrompt={playbookCandidate.triggerPrompt}
                        onClose={handleCancelPlaybookCreation}
                        onSave={handleSavePlaybook}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default App;