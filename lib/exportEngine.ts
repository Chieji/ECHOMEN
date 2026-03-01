import JSZip from 'jszip';
import { saveAs } from 'file-saver'; // We'll assume this or use a basic link trigger
import { Artifact, LogEntry } from '../types';

/**
 * ECHO Data Forge: The Neural Vault Export Engine
 * 
 * Bundles all session data, notes, and artifacts into a 
 * structured, portable archive.
 */

export const exportNeuralVault = async (
    notes: { title: string, content: string }[],
    artifacts: Artifact[],
    logs: LogEntry[]
) => {
    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const root = zip.folder(`ECHO-Vault-${timestamp}`);

    // 1. Export Notes (Markdown)
    const notesFolder = root?.folder("Notes");
    notes.forEach(note => {
        const fileName = `${note.title.replace(/[^a-z0-9]/gi, '_')}.md`;
        notesFolder?.file(fileName, note.content);
    });

    // 2. Export Artifacts (Original + HTML)
    const artifactsFolder = root?.folder("Artifacts");
    artifacts.forEach(art => {
        const baseName = art.title.replace(/[^a-z0-9]/gi, '_');
        const ext = art.type === 'code' ? 'txt' : (art.type === 'markdown' ? 'md' : 'json');
        
        artifactsFolder?.file(`${baseName}.${ext}`, art.content);
        
        // Also wrap in a basic HTML template for portability
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>ECHO Artifact: ${art.title}</title>
                <style>
                    body { font-family: sans-serif; line-height: 1.6; padding: 40px; background: #09090B; color: #eee; }
                    pre { background: #18181B; padding: 20px; border-radius: 8px; border: 1px solid #333; overflow-x: auto; }
                    .header { border-bottom: 1px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
                    .label { color: #00D4FF; font-weight: bold; font-family: monospace; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${art.title}</h1>
                    <p class="label">TYPE: ${art.type.toUpperCase()} | CREATED: ${art.createdAt}</p>
                </div>
                <div>${art.type === 'markdown' ? art.content : `<pre><code>${art.content}</code></pre>`}</div>
            </body>
            </html>
        `;
        artifactsFolder?.file(`${baseName}.html`, htmlContent);
    });

    // 3. Export System Logs
    const logsContent = logs.map(l => `[${l.timestamp}] [${l.status}] ${l.message}`).join('
');
    root?.file("system_pulse.log", logsContent);

    // 4. Metadata Snapshot
    root?.file("vault_metadata.json", JSON.stringify({
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        noteCount: notes.length,
        artifactCount: artifacts.length
    }, null, 2));

    // Generate and Trigger Download
    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ECHO-Neural-Vault-${timestamp}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log(`[Data Forge] Neural Vault exported successfully.`);
};
