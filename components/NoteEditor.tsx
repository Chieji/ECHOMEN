import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';

interface NoteEditorProps {
    initialContent?: string;
    onSave: (content: string) => void;
    availableNotes: { id: string; title: string }[];
}

/**
 * NoteEditor - Clean editor with wiki-linking
 */
export const NoteEditor: React.FC<NoteEditorProps> = ({ initialContent = '', onSave, availableNotes }) => {
    const [isSaved, setIsSaved] = useState(true);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Mention.configure({
                HTMLAttributes: {
                    class: 'px-1 py-0.5 rounded bg-echo-cyan/20 text-echo-cyan border border-echo-cyan/30',
                },
                suggestion: {
                    char: '[[',
                    items: ({ query }: { query: string }) => {
                        return availableNotes
                            .filter(note => note.title.toLowerCase().startsWith(query.toLowerCase()))
                            .slice(0, 5);
                    },
                    render: () => {
                        return {
                            onStart: (props: { query: string }) => {
                                console.log("Suggestion started for:", props.query);
                            },
                            onUpdate: (props: { query: string }) => {
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
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] text-gray-200',
            },
        },
    });

    if (!editor) return null;

    return (
        <div className="bg-echo-surface border border-echo-border rounded-lg overflow-hidden flex flex-col h-full">
            <header className="px-4 py-2 border-b border-echo-border bg-echo-surface-elevated flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-xs text-gray-500">Editor</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs ${isSaved ? 'text-green-500' : 'text-orange-500'}`}>
                        {isSaved ? 'Saved' : 'Unsaved'}
                    </span>
                    <button
                        onClick={() => {
                            onSave(editor.getHTML());
                            setIsSaved(true);
                        }}
                        className="px-3 py-1 bg-echo-cyan hover:bg-cyan-400 text-black text-xs rounded transition-colors"
                    >
                        Save
                    </button>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto p-4 bg-transparent">
                <EditorContent editor={editor} />
            </div>

            <footer className="px-4 py-2 border-t border-echo-border bg-echo-surface-elevated flex items-center gap-4 text-xs text-gray-500">
                <span>Type [[ to link notes</span>
                <span>Ctrl+S to save</span>
            </footer>
        </div>
    );
};
