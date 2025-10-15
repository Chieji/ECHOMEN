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
    
    const editMessage = useCallback((messageId: string, newText: string) => {
        setMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, text: newText } : msg
            )
        );
    }, []);

    const removeMessage = useCallback((messageId: string) => {
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
    }, []);

    const clearMemory = useCallback(() => {
        setMessages([]);
    }, []);

    return { messages, addMessage, editMessage, removeMessage, clearMemory };
};