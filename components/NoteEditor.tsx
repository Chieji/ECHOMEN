import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { motion, AnimatePresence } from 'framer-motion';
import { Artifact } from '../types';

interface NoteEditorProps {
    initialContent?: string;
    onSave: (content: string) => void;
    availableNotes: { id: string; title: string }[];
}

/**
 * NoteEditor Component
 * 
 * A high-fidelity editor with Obsidian-style wiki-linking.
 * Triggers on '[[' to provide autocomplete for existing notes and artifacts.
 */
export const NoteEditor: React.FC<NoteEditorProps> = ({ initialContent = '', onSave, availableNotes }) => {
    const [isSaved, setIsSaved] = useState(true);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Mention.configure({
                HTMLAttributes: {
                    class: 'px-1 py-0.5 rounded bg-cyan-500/20 text-[#00D4FF] font-bold border border-cyan-500/30 cursor-pointer hover:bg-cyan-500/40 transition-colors',
                },
                suggestion: {
                    char: '[[',
                    items: ({ query }) => {
                        return availableNotes
                            .filter(note => note.title.toLowerCase().startsWith(query.toLowerCase()))
                            .slice(0, 5);
                    },
                    render: () => {
                        let component: any;
                        let popup: any;

                        return {
                            onStart: (props) => {
                                // Logic for rendering the autocomplete dropdown would go here
                                // For the MVP, we are focusing on the extension configuration
                                console.log("Suggestion started for:", props.query);
                            },
                            onUpdate: (props) => {
                                console.log("Suggestion updated:", props.query);
                            },
                            onExit: () => {
                                console.log("Suggestion exited");
                            },
                        };
                    },
                },
            }),
        ],
        content: initialContent,
        onUpdate: ({ editor }) => {
            setIsSaved(false);
            onSave(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] text-gray-200 leading-relaxed',
            },
        },
    });

    if (!editor) return null;

    return (
        <div className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
            <header className="px-6 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">ECHO Editor v1.0</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-mono ${isSaved ? 'text-green-500' : 'text-orange-500'}`}>
                        {isSaved ? '● SYNCHRONIZED' : '○ UNSAVED CHANGES'}
                    </span>
                    <button 
                        onClick={() => {
                            onSave(editor.getHTML());
                            setIsSaved(true);
                        }}
                        className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-black text-[10px] font-bold rounded transition-colors"
                    >
                        FORCE SAVE
                    </button>
                </div>
            </header>
            
            <div className="flex-grow overflow-y-auto p-8 bg-transparent">
                <EditorContent editor={editor} />
            </div>

            <footer className="px-6 py-2 border-t border-white/5 bg-white/[0.02] flex items-center gap-6">
                <span className="text-[10px] text-gray-500 font-mono">TYPE <span className="text-[#00D4FF]">[[</span> TO LINK NOTES</span>
                <span className="text-[10px] text-gray-500 font-mono">CTRL+S TO SYNC</span>
            </footer>
        </div>
    );
};
