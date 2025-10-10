import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { AppDeployment } from '../types';
import { RocketIcon } from './icons/RocketIcon';

interface AppLogViewerModalProps {
    app: AppDeployment | null;
    isOpen: boolean;
    onClose: () => void;
}

const logStatusColors = {
    SUCCESS: 'text-green-400',
    ERROR: 'text-red-400',
    WARN: 'text-yellow-400',
    INFO: 'text-[#00D4FF]',
}

export const AppLogViewerModal: React.FC<AppLogViewerModalProps> = ({ app, isOpen, onClose }) => {
    if (!app) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                    animate={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
                    exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full max-w-2xl bg-[#141414] border-2 border-[#00D4FF]/50 rounded-xl p-6 shadow-2xl shadow-black/50 flex flex-col max-h-[80vh]"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex justify-between items-center mb-4 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="text-[#00D4FF]"><RocketIcon className="w-6 h-6" /></div>
                                <h3 className="text-xl font-bold text-white">Deployment Logs: {app.name}</h3>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="font-mono text-xs p-4 bg-black/40 border border-white/10 rounded-lg overflow-y-auto text-gray-400 space-y-2 flex-grow">
                            {app.logs.map((log, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <span className="text-gray-600 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className={`font-bold flex-shrink-0 ${logStatusColors[log.status]}`}>
                                        [{log.status}]
                                    </span>
                                    <p className="whitespace-pre-wrap text-gray-300 break-words">{log.message}</p>
                                </div>
                            ))}
                            {app.logs.length === 0 && (
                                <p>No logs available yet.</p>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
