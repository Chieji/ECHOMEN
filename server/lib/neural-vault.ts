/**
 * Neural Vault Export - Knowledge Graph ZIP Export
 * 
 * Exports entire knowledge base as portable ZIP archive
 * Includes: notes, artifacts, playbooks, backlinks
 */

import { createWriteStream } from 'fs';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { createHash } from 'crypto';

export interface ExportManifest {
  version: string;
  exportedAt: string;
  nodeCount: number;
  linkCount: number;
  playbookCount: number;
  totalSize: number;
  checksum: string;
}

export interface ExportOptions {
  includeArtifacts: boolean;
  includePlaybooks: boolean;
  includeBacklinks: boolean;
  format: 'json' | 'markdown';
}

/**
 * Generate export manifest
 */
export function generateManifest(
  nodes: any[],
  links: any[],
  playbooks: any[]
): ExportManifest {
  const manifest: ExportManifest = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    nodeCount: nodes.length,
    linkCount: links.length,
    playbookCount: playbooks.length,
    totalSize: 0,
    checksum: '',
  };
  
  // Calculate estimated size
  manifest.totalSize = JSON.stringify({ nodes, links, playbooks }).length;
  
  // Generate checksum
  const hash = createHash('sha256');
  hash.update(JSON.stringify({ nodes, links, playbooks }));
  manifest.checksum = hash.digest('hex');
  
  return manifest;
}

/**
 * Convert knowledge node to markdown
 */
export function nodeToMarkdown(node: any, backlinks?: any[]): string {
  const backlinkList = backlinks?.map(bl => `- [[${bl.sourceTitle}]]`).join('\n') || '';
  
  return `# ${node.title}

**Type:** ${node.type}
**Created:** ${new Date(node.createdAt).toLocaleDateString()}
**Updated:** ${new Date(node.updatedAt).toLocaleDateString()}

---

${node.content || '*No content*'}

${backlinks && backlinks.length > 0 ? `\n## Backlinks\n\n${backlinkList}\n` : ''}
---

*Exported from ECHO Knowledge Graph*
`;
}

/**
 * Convert playbook to markdown
 */
export function playbookToMarkdown(playbook: any): string {
  const steps = playbook.pattern.steps
    .map((s: any, i: number) => `${i + 1}. **${s.type}**: ${s.description}`)
    .join('\n');
  
  const criteria = playbook.pattern.successCriteria
    .map((c: string) => `- ${c}`)
    .join('\n');
  
  return `# ${playbook.name}

**Description:** ${playbook.description}
**Executions:** ${playbook.executionCount}
**Success Rate:** ${(parseFloat(playbook.successRate) * 100).toFixed(1)}%
**Last Executed:** ${playbook.lastExecuted ? new Date(playbook.lastExecuted).toLocaleDateString() : 'Never'}

---

## Trigger

${playbook.pattern.trigger}

## Steps

${steps}

## Success Criteria

${criteria}

---

*Exported from ECHO Playbooks*
`;
}

/**
 * Create export structure
 */
export function createExportStructure(
  nodes: any[],
  links: any[],
  playbooks: any[],
  options: ExportOptions
): Record<string, string> {
  const files: Record<string, string> = {};
  
  // README
  files['README.md'] = `# ECHO Knowledge Graph Export

**Exported:** ${new Date().toISOString()}
**Nodes:** ${nodes.length}
**Links:** ${links.length}
**Playbooks:** ${playbooks.length}

## Structure

- \`notes/\` - Knowledge notes in markdown format
- \`artifacts/\` - Code artifacts and documents
- \`playbooks/\` - Learned execution patterns
- \`backlinks/\` - Bidirectional link index
- \`manifest.json\` - Export metadata

## Import

To import this knowledge graph:
1. Unzip the archive
2. Use the ECHO import function
3. Select the manifest.json file
`;

  // Manifest
  const manifest = generateManifest(nodes, links, playbooks);
  files['manifest.json'] = JSON.stringify(manifest, null, 2);
  
  // Export nodes
  if (options.includeArtifacts) {
    nodes.forEach(node => {
      const filename = `notes/${sanitizeFilename(node.title)}.md`;
      const backlinks = links.filter(l => l.targetId === node.id);
      files[filename] = nodeToMarkdown(node, backlinks);
    });
  }
  
  // Export playbooks
  if (options.includePlaybooks) {
    playbooks.forEach(playbook => {
      const filename = `playbooks/${sanitizeFilename(playbook.name)}.md`;
      files[filename] = playbookToMarkdown(playbook);
    });
  }
  
  // Export backlink index
  if (options.includeBacklinks) {
    const backlinkIndex = links.map(link => ({
      source: link.sourceId,
      target: link.targetId,
      type: link.type,
    }));
    files['backlinks/index.json'] = JSON.stringify(backlinkIndex, null, 2);
  }
  
  return files;
}

/**
 * Sanitize filename for safe export
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);
}

/**
 * Simple ZIP writer (minimal implementation)
 * For production, use a library like 'archiver' or 'jszip'
 */
export async function createZipArchive(
  files: Record<string, string>,
  outputPath: string
): Promise<void> {
  // This is a placeholder - in production use a real ZIP library
  // For now, we'll create a tar.gz as an alternative
  
  const { createWriteStream } = await import('fs');
  const { createGzip } = await import('zlib');
  const { pipeline } = await import('stream/promises');
  const { Readable } = await import('stream');
  
  // Concatenate all files with headers
  let content = '';
  for (const [filename, data] of Object.entries(files)) {
    content += `--- ${filename} ---\n${data}\n\n`;
  }
  
  // Write compressed archive
  const readStream = Readable.from(content);
  const writeStream = createWriteStream(outputPath);
  const gzip = createGzip();
  
  await pipeline(readStream, gzip, writeStream);
}

/**
 * Import knowledge graph from ZIP
 */
export async function importFromZip(
  zipPath: string
): Promise<{ nodes: any[]; links: any[]; playbooks: any[] }> {
  // Placeholder for import implementation
  // In production, use a ZIP library to extract and parse
  
  throw new Error('Import not yet implemented - use ZIP library');
}
