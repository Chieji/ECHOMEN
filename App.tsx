import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CommandCenter } from './components/CommandCenter';
import { ExecutionDashboard } from './components/ExecutionDashboard';
import { MasterConfigurationPanel } from './components/MasterConfigurationPanel';
import { AnimatePresence, motion } from 'framer-motion';
import { Task, LogEntry, AgentMode, AgentStatus, Artifact } from './types';
import { createInitialPlan, getChatResponse, summarizePlanIntoPlaybook, clarifyAndCorrectPrompt } from './services/planner';
import { useMemory } from './hooks/useMemory';
import { ChatInterface } from './components/ChatInterface';
import { HistoryPanel } from './components/HistoryPanel';
import { ExecutionStatusBar } from './components/ExecutionStatusBar';
import { AgentExecutor } from './services/agentExecutor';
import { ArtifactsPanel } from './components/ArtifactsPanel';

const App: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isArtifactsOpen, setIsArtifactsOpen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const { messages, addMessage } = useMemory([]);
    const [agentMode, setAgentMode] = useState<AgentMode>(AgentMode.ACTION);
    const [agentStatus, setAgentStatus] = useState<AgentStatus>(AgentStatus.IDLE);
    const [currentPrompt, setCurrentPrompt] = useState<string>('');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const handleSettingsClick = () => setIsSettingsOpen(true);
    const handleSettingsClose = () => setIsSettingsOpen(false);
    const handleHistoryClick = () => setIsHistoryOpen(true);
    const handleHistoryClose = () => setIsHistoryOpen(false);
    const handleArtifactsClick = () => setIsArtifactsOpen(true);
    const handleArtifactsClose = () => setIsArtifactsOpen(false);

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

    const handleSendCommand = async (prompt: string, isWebToolActive: boolean) => {
        if (agentMode === AgentMode.CHAT) {
            addMessage({ sender: 'user', text: prompt });
            const agentResponse = await getChatResponse(prompt);
            addMessage({ sender: 'agent', text: agentResponse });
            return;
        }

        setTasks([]);
        setLiveLogs([]);
        setArtifacts([]);
        setCurrentPrompt(prompt); // Save original prompt for synthesis
        setAgentStatus(AgentStatus.RUNNING);

        addLog({ status: 'INFO', message: `User command received: "${prompt}"` });

        try {
            // Step 1: Clarify and correct the user's prompt
            addLog({ status: 'INFO', message: '[Planner] Analyzing and clarifying prompt...' });
            const correctedPrompt = await clarifyAndCorrectPrompt(prompt);
            if (prompt !== correctedPrompt) {
                 addLog({ status: 'SUCCESS', message: `[Planner] Refined prompt: "${correctedPrompt}"` });
            } else {
                 addLog({ status: 'SUCCESS', message: '[Planner] Prompt is clear.' });
            }

            const finalPrompt = isWebToolActive 
                ? `Using the web tool, execute this task: ${correctedPrompt}` 
                : correctedPrompt;

            addLog({ status: 'INFO', message: '[Planner] Deconstructing the request...' });
            
            // Step 2: Create the initial plan based on the corrected prompt
            const initialTasks = await createInitialPlan(finalPrompt);
            setTasks(initialTasks);
            
            if (initialTasks.length > 0 && initialTasks[0].id.startsWith('playbook-')) {
                 addLog({ status: 'SUCCESS', message: '[Planner] Found relevant playbook. Loading tasks from memory.' });
            } else {
                 addLog({ status: 'SUCCESS', message: '[Planner] Initial task pipeline generated.' });
            }

            // Step 3: Execute the plan
            const executor = new AgentExecutor({
                onTaskUpdate: (updatedTask) => {
                    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                },
                onLog: addLog,
                onArtifactCreated: handleCreateArtifact,
                onFinish: () => {
                    addLog({ status: 'SUCCESS', message: 'ECHO: All tasks completed successfully.' });
                    setAgentStatus(AgentStatus.FINISHED);
                },
                onFail: (errorMessage) => {
                    addLog({ status: 'ERROR', message: `ECHO: Execution failed. ${errorMessage}` });
                    setAgentStatus(AgentStatus.ERROR);
                }
            });

            await executor.run(initialTasks, finalPrompt);

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
                    const newPlaybook = await summarizePlanIntoPlaybook(currentPrompt, tasks);
                    const savedPlaybooksJSON = localStorage.getItem('echo-playbooks');
                    const playbooks = savedPlaybooksJSON ? JSON.parse(savedPlaybooksJSON) : [];
                    playbooks.push(newPlaybook);
                    localStorage.setItem('echo-playbooks', JSON.stringify(playbooks));
                    addLog({ status: 'SUCCESS', message: `[Synthesizer] New playbook created: "${newPlaybook.name}"` });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    addLog({ status: 'ERROR', message: `[Synthesizer] Failed to create playbook: ${errorMessage}` });
                } finally {
                    setAgentStatus(AgentStatus.IDLE);
                }
            } else if (agentStatus === AgentStatus.FINISHED) {
                // If it was a playbook or no tasks, just go back to idle.
                setAgentStatus(AgentStatus.IDLE);
            }
        }
        handleSynthesis();
    }, [agentStatus, currentPrompt, tasks]);


    const handleStopExecution = () => {
        // In a real scenario, this would signal the executor to gracefully stop.
        // For now, we'll just update the UI state.
        addLog({ status: 'WARN', message: 'User initiated stop command. Halting all tasks.' });
        setAgentStatus(AgentStatus.IDLE);
        setTasks(tasks => tasks.map(t => ['Executing', 'Queued', 'Revising', 'Pending Review'].includes(t.status) ? {...t, status: 'Error'} : t));
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
        <div className="bg-white dark:bg-[#0A0A0A] text-zinc-800 dark:text-gray-200 min-h-screen font-sans flex flex-col">
            <Header 
                onSettingsClick={handleSettingsClick} 
                onHistoryClick={handleHistoryClick} 
                onArtifactsClick={handleArtifactsClick}
                tasks={tasks}
                agentStatus={agentStatus}
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
                           <ChatInterface messages={messages} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {agentMode === AgentMode.ACTION && (
                    <ExecutionStatusBar tasks={tasks} agentStatus={agentStatus} onStopExecution={handleStopExecution} />
                )}
            </AnimatePresence>

            <CommandCenter 
                agentMode={agentMode}
                setAgentMode={setAgentMode}
                onSendCommand={handleSendCommand} 
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
        </div>
    );
};

export default App;
