import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
// FIX: Import Service from the central types file as it's used across the app.
import { Service } from '../types';

interface ServiceConnectionModalProps {
    service: Service | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (serviceId: string, values: { [key: string]: string }) => void;
    onDisconnect: (serviceId: string) => void;
}

export const ServiceConnectionModal: React.FC<ServiceConnectionModalProps> = ({ service, isOpen, onClose, onSave, onDisconnect }) => {
    const [formState, setFormState] = useState<{ [key: string]: string }>({});
    const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        if (service) {
            const initialState = service.inputs.reduce((acc, input) => {
                acc[input.id] = '';
                return acc;
            }, {} as { [key: string]: string });
            setFormState(initialState);
            setErrors({});
            setTouched({});
        }
    }, [service]);

    const validateInput = (id: string, value: string): string | null => {
        if (!value || value.trim() === '') {
            return 'This field is required.';
        }
        if (id.toLowerCase().includes('key')) {
            if (value.trim().length < 10) {
                return 'API Key must be at least 10 characters long.';
            }
        }
        if (id.toLowerCase().includes('url')) {
            if (!/^(https?:\/\/)/.test(value)) {
                return 'URL must start with http:// or https://';
            }
            if (!value.includes('.')) {
                return 'Please enter a valid URL.';
            }
        }
        return null;
    };

    const isSaveDisabled = useMemo(() => {
        if (!service) return true;
        for (const input of service.inputs) {
            const value = formState[input.id] || '';
            if (validateInput(input.id, value)) {
                return true;
            }
        }
        return false;
    }, [formState, service]);


    const handleInputChange = (id: string, value: string) => {
        setFormState(prev => ({ ...prev, [id]: value }));
        if (touched[id]) {
            setErrors(prev => ({ ...prev, [id]: validateInput(id, value) }));
        }
    };
    
    const handleBlur = (id: string) => {
        setTouched(prev => ({ ...prev, [id]: true }));
        setErrors(prev => ({ ...prev, [id]: validateInput(id, formState[id] || '') }));
    };

    const handleSave = () => {
        if (isSaveDisabled) return;

        let hasErrors = false;
        const newErrors: { [key: string]: string | null } = {};
        const newTouched: { [key: string]: boolean } = {};

        service.inputs.forEach(input => {
            const errorMessage = validateInput(input.id, formState[input.id] || '');
            newErrors[input.id] = errorMessage;
            newTouched[input.id] = true;
            if (errorMessage) {
                hasErrors = true;
            }
        });

        setErrors(newErrors);
        setTouched(newTouched);

        if (!hasErrors) {
            onSave(service.id, formState);
        }
    };

    const handleDisconnect = () => {
        onDisconnect(service.id);
    }
    
    if (!service) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                                            <span 
                                                className={`w-2 h-2 rounded-full transition-colors ${
                                                    errors[input.id] && touched[input.id]
                                                        ? 'bg-red-500' 
                                                        : formState[input.id] && !errors[input.id] 
                                                        ? 'bg-green-500' 
                                                        : 'bg-gray-500'
                                                }`}
                                            />
                                        </div>
                                        <input
                                            type={input.type}
                                            id={input.id}
                                            value={formState[input.id] || ''}
                                            onChange={(e) => handleInputChange(input.id, e.target.value)}
                                            onBlur={() => handleBlur(input.id)}
                                            placeholder={input.placeholder}
                                            className={`w-full bg-black/40 border rounded-lg px-3 py-2 pl-8 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                                                errors[input.id] && touched[input.id] 
                                                ? 'border-red-500/50 focus:ring-red-500/50' 
                                                : 'border-white/10 focus:ring-[#8B5CF6]/50'
                                            }`}
                                        />
                                    </div>
                                    {errors[input.id] && touched[input.id] && (
                                        <p className="mt-1 text-xs text-red-400">{errors[input.id]}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <footer className="mt-8 flex justify-between items-center">
                             {service.status === 'Connected' ? (
                                <button
                                    onClick={handleDisconnect}
                                    className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors"
                                >
                                    Disconnect
                                </button>
                            ) : <div></div>}
                            <button
                                onClick={handleSave}
                                disabled={isSaveDisabled}
                                className="bg-[#8B5CF6] hover:bg-[#7c4ee3] text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {service.status === 'Connected' ? 'Save Changes' : 'Save Connection'}
                            </button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};