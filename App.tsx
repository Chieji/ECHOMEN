import React, { useState } from 'react';
import { Header } from './components/Header';
import { CommandCenter } from './components/CommandCenter';
import { ExecutionDashboard } from './components/ExecutionDashboard';
import { MasterConfigurationPanel } from './components/MasterConfigurationPanel';
import { AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSettingsClick = () => setIsSettingsOpen(true);
    const handleSettingsClose = () => setIsSettingsOpen(false);

    return (
        <div className="bg-[#0A0A0A] text-gray-200 min-h-screen font-sans flex flex-col">
            <Header onSettingsClick={handleSettingsClick} />
            
            <main className="flex-grow pt-24 pb-32 md:pb-56 flex flex-col">
                <ExecutionDashboard />
            </main>

            <CommandCenter onSettingsClick={handleSettingsClick} />
            
            <AnimatePresence>
                {isSettingsOpen && (
                    <MasterConfigurationPanel onClose={handleSettingsClose} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default App;
