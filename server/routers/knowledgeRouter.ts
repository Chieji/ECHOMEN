/**
 * Knowledge Router - tRPC API for Knowledge Graph
 * 
 * Endpoints:
 * - nodes: CRUD for knowledge nodes
 * - links: Bidirectional backlink management
 * - playbooks: Playbook CRUD and extraction
 * - search: Full-text search across knowledge
 * - export: Neural Vault ZIP export
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { parseWikiLinks, extractLinkTitles } from '../lib/wiki-link-parser';
import { extractPlaybookFromExecution, matchPlaybook } from '../lib/playbook-extractor';
import { createExportStructure, generateManifest } from '../lib/neural-vault';

// In-memory store (replace with DB queries in production)
const knowledgeNodesStore: any[] = [];
const knowledgeLinksStore: any[] = [];
const playbooksStore: any[] = [];

export const knowledgeRouter = router({
  /**
   * List all knowledge nodes
   */
  listNodes: protectedProcedure
    .input(z.object({
      type: z.enum(['note', 'artifact', 'task', 'conversation']).optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      let nodes = knowledgeNodesStore;
      
      if (input.type) {
        nodes = nodes.filter(n => n.type === input.type);
      }
      
      return nodes.slice(0, input.limit);
    }),

  /**
   * Get node by ID with backlinks
   */
  getNode: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const node = knowledgeNodesStore.find(n => n.id === input.id);
      
      if (!node) {
        throw new Error('Node not found');
      }
      
      // Get backlinks
      const backlinks = knowledgeLinksStore.filter(l => l.targetId === input.id);
      
      return {
        ...node,
        backlinks: backlinks.map(bl => ({
          id: bl.sourceId,
          type: bl.type,
        })),
      };
    }),

  /**
   * Create knowledge node with auto-link detection
   */
  createNode: protectedProcedure
    .input(z.object({
      title: z.string(),
      content: z.string().optional(),
      type: z.enum(['note', 'artifact', 'task', 'conversation']),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Parse wiki links from content
      const links = input.content ? parseWikiLinks(input.content).links : [];
      
      const node = {
        id: Date.now(),
        userId: 1, // TODO: Get from ctx.user
        title: input.title,
        content: input.content,
        type: input.type,
        metadata: input.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      knowledgeNodesStore.push(node);
      
      // Create links to referenced nodes
      for (const link of links) {
        const targetNode = knowledgeNodesStore.find(n => n.title === link.title);
        if (targetNode) {
          knowledgeLinksStore.push({
            id: Date.now() + Math.random(),
            sourceId: node.id,
            targetId: targetNode.id,
            type: 'reference' as const,
            createdAt: new Date(),
          });
        }
      }
      
      await ctx.logActivity({
        action: `Knowledge node created: ${input.title}`,
        status: 'success',
      } as any);
      
      return node;
    }),

  /**
   * Update node
   */
  updateNode: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const node = knowledgeNodesStore.find(n => n.id === input.id);
      
      if (!node) {
        throw new Error('Node not found');
      }
      
      Object.assign(node, {
        title: input.title ?? node.title,
        content: input.content ?? node.content,
        metadata: input.metadata ?? node.metadata,
        updatedAt: new Date(),
      });
      
      await ctx.logActivity({
        action: `Knowledge node updated: ${node.title}`,
        status: 'info',
      } as any);
      
      return node;
    }),

  /**
   * Delete node
   */
  deleteNode: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const index = knowledgeNodesStore.findIndex(n => n.id === input.id);
      
      if (index === -1) {
        throw new Error('Node not found');
      }
      
      knowledgeNodesStore.splice(index, 1);
      
      // Remove associated links
      const linkIndices = knowledgeLinksStore
        .map((l, i) => l.sourceId === input.id || l.targetId === input.id ? i : -1)
        .filter(i => i !== -1);
      
      linkIndices.sort((a, b) => b - a).forEach(i => {
        knowledgeLinksStore.splice(i, 1);
      });
      
      await ctx.logActivity({
        action: `Knowledge node deleted`,
        status: 'info',
      } as any);
      
      return { success: true };
    }),

  /**
   * Search knowledge nodes
   */
  search: protectedProcedure
    .input(z.object({
      query: z.string(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const queryLower = input.query.toLowerCase();
      
      const results = knowledgeNodesStore
        .filter(node => {
          const titleMatch = node.title.toLowerCase().includes(queryLower);
          const contentMatch = node.content?.toLowerCase().includes(queryLower);
          return titleMatch || contentMatch;
        })
        .map(node => {
          const titleMatch = node.title.toLowerCase().includes(queryLower);
          const contentMatch = node.content?.toLowerCase().includes(queryLower);
          
          return {
            ...node,
            score: (titleMatch ? 10 : 0) + (contentMatch ? 5 : 0),
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, input.limit);
      
      return results;
    }),

  /**
   * Get backlinks for node
   */
  getBacklinks: protectedProcedure
    .input(z.object({ nodeId: z.number() }))
    .query(async ({ input }) => {
      const backlinks = knowledgeLinksStore.filter(l => l.targetId === input.nodeId);
      
      return backlinks.map(bl => {
        const sourceNode = knowledgeNodesStore.find(n => n.id === bl.sourceId);
        return {
          link: bl,
          sourceNode,
        };
      });
    }),

  /**
   * List playbooks
   */
  listPlaybooks: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return playbooksStore.slice(0, input.limit);
    }),

  /**
   * Extract playbook from execution
   */
  extractPlaybook: protectedProcedure
    .input(z.object({
      tasks: z.array(z.object({
        id: z.string(),
        type: z.enum(['research', 'code', 'shell', 'file', 'chat', 'validation']),
        description: z.string(),
        status: z.enum(['Queued', 'Executing', 'Done', 'Failed', 'Cancelled', 'AwaitingApproval']),
        dependencies: z.array(z.string()),
      })),
      prompt: z.string(),
      success: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const playbook = extractPlaybookFromExecution(input.tasks as any, input.prompt, input.success);
      
      if (!playbook) {
        return { extracted: false };
      }
      
      const savedPlaybook = {
        id: Date.now(),
        userId: 1,
        ...playbook,
        executionCount: 1,
        successRate: playbook.confidence.toString(),
        lastExecuted: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      playbooksStore.push(savedPlaybook);
      
      await ctx.logActivity({
        action: `Playbook extracted: ${playbook.name}`,
        status: 'success',
      } as any);
      
      return { extracted: true, playbook: savedPlaybook };
    }),

  /**
   * Match prompt to existing playbooks
   */
  matchPlaybooks: protectedProcedure
    .input(z.object({
      prompt: z.string(),
    }))
    .query(async ({ input }) => {
      const matches = matchPlaybook(input.prompt, playbooksStore);
      return matches.slice(0, 5); // Top 5 matches
    }),

  /**
   * Export knowledge graph (Neural Vault)
   */
  exportVault: protectedProcedure
    .input(z.object({
      includeArtifacts: z.boolean().default(true),
      includePlaybooks: z.boolean().default(true),
      includeBacklinks: z.boolean().default(true),
      format: z.enum(['json', 'markdown']).default('markdown'),
    }))
    .mutation(async ({ input }) => {
      const files = createExportStructure(
        knowledgeNodesStore,
        knowledgeLinksStore,
        playbooksStore,
        {
          includeArtifacts: input.includeArtifacts,
          includePlaybooks: input.includePlaybooks,
          includeBacklinks: input.includeBacklinks,
          format: input.format,
        }
      );
      
      const manifest = generateManifest(
        knowledgeNodesStore,
        knowledgeLinksStore,
        playbooksStore
      );
      
      return {
        files,
        manifest,
        downloadUrl: '/api/knowledge/export/download', // Placeholder
      };
    }),

  /**
   * Get knowledge stats
   */
  getStats: protectedProcedure.query(async () => {
    return {
      totalNodes: knowledgeNodesStore.length,
      totalLinks: knowledgeLinksStore.length,
      totalPlaybooks: playbooksStore.length,
      nodesByType: {
        note: knowledgeNodesStore.filter(n => n.type === 'note').length,
        artifact: knowledgeNodesStore.filter(n => n.type === 'artifact').length,
        task: knowledgeNodesStore.filter(n => n.type === 'task').length,
        conversation: knowledgeNodesStore.filter(n => n.type === 'conversation').length,
      },
    };
  }),
});
