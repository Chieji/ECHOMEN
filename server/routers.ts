import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  listAgents, getAgentById, createAgent, updateAgent, deleteAgent,
  getChatHistory, saveChatMessage, clearChatHistory,
  getAllSettings, upsertSetting,
  getRecentActivity, logActivity,
  getDashboardStats,
} from "./db";
import { echoctlRouter } from "./routers/echoctlRouter";
import { browserRouter } from "./routers/browserRouter";
import { knowledgeRouter } from "./routers/knowledgeRouter";

// ─── Agents Router ───────────────────────────────────────────────────────────

const agentsRouter = router({
  list: publicProcedure.query(async () => {
    return listAgents();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getAgentById(input.id);
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      model: z.string().default("GPT-4o"),
    }))
    .mutation(async ({ input }) => {
      const agent = await createAgent({
        name: input.name,
        description: input.description ?? null,
        model: input.model,
        status: "idle",
      });
      await logActivity({ action: `Agent '${input.name}' created`, status: "success", agentId: agent?.id });
      return agent;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      model: z.string().optional(),
      status: z.enum(["running", "idle", "error", "stopped"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await updateAgent(id, data);
      if (data.status) {
        await logActivity({
          action: `Agent '${updated?.name}' status changed to ${data.status}`,
          status: data.status === "error" ? "error" : "info",
          agentId: id,
        });
      }
      return updated;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const agent = await getAgentById(input.id);
      await deleteAgent(input.id);
      await logActivity({ action: `Agent '${agent?.name}' deleted`, status: "info" });
      return { success: true };
    }),
});

// ─── Dashboard Router ────────────────────────────────────────────────────────

const dashboardRouter = router({
  stats: publicProcedure.query(async () => {
    return getDashboardStats();
  }),

  activity: publicProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      return getRecentActivity(input?.limit ?? 20);
    }),
});

// ─── Chat Router ─────────────────────────────────────────────────────────────

const chatRouter = router({
  history: publicProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      const messages = await getChatHistory(input?.limit ?? 50);
      return messages.reverse(); // oldest first for display
    }),

  send: publicProcedure
    .input(z.object({
      message: z.string().min(1),
      model: z.string().default("GPT-4o"),
    }))
    .mutation(async ({ input }) => {
      // Save user message
      await saveChatMessage({ role: "user", content: input.message, model: input.model });

      // Get recent history for context
      const history = await getChatHistory(20);
      const contextMessages = history.reverse().map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Call LLM
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are ECHOMEN, an advanced AI orchestration assistant. You help users manage AI agents, analyze code, and automate tasks. Be concise, helpful, and professional. Use markdown formatting when appropriate.",
          },
          ...contextMessages,
        ],
      });

      const assistantContent = typeof response.choices[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : "I apologize, but I was unable to generate a response. Please try again.";

      // Save assistant response
      await saveChatMessage({ role: "assistant", content: assistantContent, model: input.model });

      return { role: "assistant" as const, content: assistantContent, model: input.model };
    }),

  clear: publicProcedure.mutation(async () => {
    await clearChatHistory();
    return { success: true };
  }),
});

// ─── Code Summarizer Router ─────────────────────────────────────────────────

const summarizerRouter = router({
  analyze: publicProcedure
    .input(z.object({
      code: z.string().min(1),
      language: z.string().default("auto"),
      fileName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a senior code analyst. Analyze the provided code and return a structured summary in JSON format with these fields:
- overview: A 2-3 sentence high-level description
- language: The detected programming language
- complexity: "low", "medium", or "high"
- functions: Array of { name, description, lineCount } for each function/method
- dependencies: Array of imported/required modules
- suggestions: Array of improvement suggestions
- securityIssues: Array of potential security concerns (empty if none)
- linesOfCode: Total lines of code (number)`,
          },
          {
            role: "user",
            content: `Analyze this ${input.language !== "auto" ? input.language : ""} code${input.fileName ? ` from file "${input.fileName}"` : ""}:\n\n\`\`\`\n${input.code}\n\`\`\``,
          },
        ],
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "code_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                overview: { type: "string" },
                language: { type: "string" },
                complexity: { type: "string", enum: ["low", "medium", "high"] },
                functions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      lineCount: { type: "integer" },
                    },
                    required: ["name", "description", "lineCount"],
                    additionalProperties: false,
                  },
                },
                dependencies: { type: "array", items: { type: "string" } },
                suggestions: { type: "array", items: { type: "string" } },
                securityIssues: { type: "array", items: { type: "string" } },
                linesOfCode: { type: "integer" },
              },
              required: ["overview", "language", "complexity", "functions", "dependencies", "suggestions", "securityIssues", "linesOfCode"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : null;

      await logActivity({
        action: `Code summarization completed${input.fileName ? ` for ${input.fileName}` : ""}`,
        status: "success",
      });

      return parsed;
    }),
});

// ─── Settings Router ─────────────────────────────────────────────────────────

const settingsRouter = router({
  getAll: publicProcedure.query(async () => {
    const rows = await getAllSettings();
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }),

  update: publicProcedure
    .input(z.object({
      key: z.string(),
      value: z.unknown(),
    }))
    .mutation(async ({ input }) => {
      await upsertSetting(input.key, input.value);
      return { success: true };
    }),

  updateBatch: publicProcedure
    .input(z.record(z.string(), z.unknown()))
    .mutation(async ({ input }) => {
      for (const [key, value] of Object.entries(input)) {
        await upsertSetting(key, value);
      }
      return { success: true };
    }),
});

// ─── Main App Router ─────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  agents: agentsRouter,
  dashboard: dashboardRouter,
  chat: chatRouter,
  summarizer: summarizerRouter,
  settings: settingsRouter,
  echoctl: echoctlRouter,
  browser: browserRouter,
  knowledge: knowledgeRouter,
});

export type AppRouter = typeof appRouter;
