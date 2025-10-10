import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';

type InputType = 'text' | 'password';

export interface ServiceInput {
    id: string;
    label: string;
    type: InputType;
    placeholder: string;
}

export interface Service {
    id: string;
    name: string;
    icon: React.ReactNode;
    inputs: ServiceInput[];
    status: 'Connected' | 'Not Connected';
}

interface ServiceConnectionModalProps {
    service: Service | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (serviceId: string, values: { [key: string]: string }) => void;
    onDisconnect: (serviceId: string) => void;
}

export const ServiceConnectionModal: React.FC<ServiceConnectionModalProps> = ({ service, isOpen, onClose, onSave, onDisconnect }) => {
    const [formState, setFormState] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (service) {
            const initialState = service.inputs.reduce((acc, input) => {
                acc[input.id] = '';
                return acc;
            }, {} as { [key: string]: string });
            setFormState(initialState);
        }
    }, [service]);

    if (!service) return null;

    const handleInputChange = (id: string, value: string) => {
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    const handleSave = () => {
        onSave(service.id, formState);
    };

    const handleDisconnect = () => {
        onDisconnect(service.id);
    }

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
                        className="w-full max-w-lg bg-[#141414] border-2 border-[#8B5CF6]/50 rounded-xl p-6 shadow-2xl shadow-black/50 flex flex-col"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="text-[#8B5CF6]">{service.icon}</div>
                                <h3 className="text-xl font-bold text-white">Connect to {service.name}</h3>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="space-y-4">
                            {service.inputs.map(input => (
                                <div key={input.id}>
                                    <label htmlFor={input.id} className="block text-sm font-medium text-gray-400 mb-1">{input.label}</label>
                                    <input
                                        type={input.type}
                                        id={input.id}
                                        value={formState[input.id] || ''}
                                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                                        placeholder={input.placeholder}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                                    />
                                </div>
                            ))}
                        </div>

                        <footer className="mt-8 flex justify-between items-center">
                            <button
                                onClick={handleDisconnect}
                                className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors"
                            >
                                Disconnect
                            </button>
                            <button
                                onClick={handleSave}
                                className="bg-[#8B5CF6] hover:bg-[#7c4ee3] text-white font-bold py-2 px-6 rounded-lg transition-colors"
                            >
                                Save Connection
                            </button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
