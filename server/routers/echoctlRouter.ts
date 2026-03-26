import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { AgentExecutor } from '../lib/agent-executor';
import { analyzeIntent, createInitialPlan } from '../lib/planner';
import { aiProviderChain } from '../lib/ai-provider-chain';

// Global execution registry
const activeExecutions = new Map<string, {
  executor: AgentExecutor;
  tasks: any[];
  artifacts: any[];
  startTime: number;
}>();

/**
 * Echoctl Router - Real-time WebSocket bridge to Echoctl CLI
 *
 * Provides:
 * - Health check for Echoctl connection
 * - Agent listing from Echoctl
 * - Agent execution with streaming
 * - Real-time status subscriptions
 * - Multi-agent execution engine
 */
export const echoctlRouter = router({
  /**
   * Check Echoctl connection health
   */
  health: publicProcedure.query(async ({ ctx }) => {
    return {
      connected: ctx.echoctl.isConnected(),
      timestamp: new Date().toISOString(),
      url: process.env.ECHOCTL_WS_URL || 'ws://localhost:8080',
    };
  }),

  /**
   * List all agents from Echoctl
   */
  listAgents: protectedProcedure.query(async ({ ctx }) => {
    return ctx.echoctl.listAgents();
  }),

  /**
   * Execute agent command
   */
  execute: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      prompt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const executionId = await ctx.echoctl.execute(input.agentId, input.prompt);
      
      await ctx.logActivity({
        action: `Agent '${input.agentId}' executed: ${input.prompt.substring(0, 50)}...`,
        status: 'running',
      });
      
      return { executionId, status: 'started' as const };
    }),

  /**
   * Cancel execution
   */
  cancel: protectedProcedure
    .input(z.object({
      executionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.echoctl.cancel(input.executionId);
      
      await ctx.logActivity({
        action: `Execution '${input.executionId}' cancelled`,
        status: 'info',
      });
      
      return { success: true };
    }),

  /**
   * Stream agent status updates (SSE-like subscription)
   */
  streamAgentStatus: protectedProcedure
    .input(z.object({
      agentId: z.string(),
    }))
    .subscription(async function* ({ ctx, input }) {
      for await (const event of ctx.echoctl.subscribeAgent(input.agentId)) {
        yield {
          type: event.type,
          status: event.data?.status,
          timestamp: event.timestamp,
          logs: event.data?.logs,
          data: event.data,
        };
      }
    }),

  /**
   * Analyze user intent (determine if actionable)
   */
  analyzeIntent: protectedProcedure
    .input(z.object({
      prompt: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      let tokenCount = 0;
      const result = await analyzeIntent(input.prompt, (count) => {
        tokenCount += count;
      });
      
      await ctx.logActivity({
        action: `Intent analyzed: ${result.is_actionable ? 'actionable' : 'conversational'}`,
        status: 'info',
      });
      
      return { ...result, tokensUsed: tokenCount };
    }),

  /**
   * Create execution plan from prompt
   */
  createPlan: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      isActionable: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      let tokenCount = 0;
      const tasks = await createInitialPlan(
        input.prompt,
        input.isActionable,
        undefined,
        (count) => { tokenCount += count; }
      );
      
      await ctx.logActivity({
        action: `Plan created with ${tasks.length} task(s)`,
        status: 'info',
      });
      
      return { tasks, tokensUsed: tokenCount };
    }),

  /**
   * Start multi-agent execution
   */
  startExecution: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      tasks: z.array(z.object({
        id: z.string(),
        type: z.enum(['research', 'code', 'shell', 'file', 'chat', 'validation']),
        description: z.string(),
        status: z.enum(['Queued', 'Executing', 'Done', 'Failed', 'Cancelled', 'AwaitingApproval']),
        dependencies: z.array(z.string()),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const executionId = `exec-${Date.now()}`;
      
      const executor = new AgentExecutor({
        onTaskUpdate: (task) => {
          // Broadcast task update to subscribers
          ctx.echoctl.emit('taskUpdate', { executionId, task });
        },
        onTasksUpdate: (tasks) => {
          ctx.echoctl.emit('tasksUpdate', { executionId, tasks });
        },
        onLog: (log) => {
          ctx.echoctl.emit('log', { executionId, log });
        },
        onTokenUpdate: (_count) => {
          // Track token usage
        },
        onArtifactCreated: (artifact) => {
          ctx.echoctl.emit('artifact', { executionId, artifact });
        },
        onFinish: () => {
          ctx.echoctl.emit('finish', { executionId });
          activeExecutions.delete(executionId);
        },
        onFail: (error) => {
          ctx.echoctl.emit('fail', { executionId, error });
          activeExecutions.delete(executionId);
        },
        onApprovalRequired: async (_task, _toolName) => {
          // In production, this would pause and wait for user approval
          // For now, auto-approve
          return true;
        },
      });
      
      // Store active execution
      activeExecutions.set(executionId, {
        executor,
        tasks: input.tasks,
        artifacts: [],
        startTime: Date.now(),
      });
      
      // Start execution in background
      executor.run(input.tasks, input.prompt, []);
      
      await ctx.logActivity({
        action: `Multi-agent execution started: ${input.prompt.substring(0, 50)}...`,
        status: 'running',
      });
      
      return { executionId, status: 'started' as const };
    }),

  /**
   * Get execution status
   */
  getExecutionStatus: protectedProcedure
    .input(z.object({
      executionId: z.string(),
    }))
    .query(async ({ input }) => {
      const execution = activeExecutions.get(input.executionId);
      
      if (!execution) {
        return { found: false };
      }
      
      return {
        found: true,
        tasks: execution.tasks,
        artifacts: execution.artifacts,
        duration: Date.now() - execution.startTime,
      };
    }),

  /**
   * Cancel execution
   */
  cancelExecution: protectedProcedure
    .input(z.object({
      executionId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const execution = activeExecutions.get(input.executionId);
      
      if (execution) {
        execution.executor.stop();
        activeExecutions.delete(input.executionId);
        
        await ctx.logActivity({
          action: `Execution '${input.executionId}' cancelled`,
          status: 'info',
        });
      }
      
      return { success: true };
    }),

  /**
   * Get AI provider health metrics
   */
  getProviderHealth: protectedProcedure.query(async () => {
    return aiProviderChain.getHealthMetrics();
  }),

  /**
   * Test AI provider connectivity
   */
  testProvider: protectedProcedure
    .input(z.object({
      type: z.enum(['groq', 'gemini', 'together', 'cohere', 'openrouter', 'mistral', 'huggingface']),
    }))
    .mutation(async ({ input }) => {
      return aiProviderChain.testProvider(input.type);
    }),

  /**
   * Add/update provider configuration
   */
  configureProvider: protectedProcedure
    .input(z.object({
      type: z.enum(['groq', 'gemini', 'together', 'cohere', 'openrouter', 'mistral', 'huggingface']),
      apiKey: z.string(),
      model: z.string(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      aiProviderChain.addProvider({
        type: input.type,
        apiKey: input.apiKey,
        model: input.model,
        isDefault: input.isDefault,
      });
      
      return { success: true };
    }),

  /**
   * Generate completion with smart routing
   */
  generateCompletion: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      systemPrompt: z.string().optional(),
      taskType: z.enum(['chat', 'reasoning', 'code', 'data', 'general', 'eu-compliance', 'specialized']),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const response = await aiProviderChain.generate({
        prompt: input.prompt,
        systemPrompt: input.systemPrompt,
        taskType: input.taskType,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      });
      
      await ctx.logActivity({
        action: `AI completion generated via ${response.provider} (${response.model})`,
        status: 'success',
      });
      
      return response;
    }),
});
