import { useState, useCallback } from 'react';
import { Message } from '../types';

export const useMemory = (initialMessages: Message[] = []) => {
    const [messages, setMessages] = useState<Message[]>(initialMessages);

    const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
        const newMessage: Message = {
            ...message,
            id: `msg-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(),
        };
        setMessages(prevMessages => [...prevMessages, newMessage]);
    }, []);
    
    const clearMemory = useCallback(() => {
        setMessages([]);
    }, []);

    return { messages, addMessage, clearMemory };
};
