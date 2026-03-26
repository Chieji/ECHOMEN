import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// Mock the database module before importing routers
vi.mock("./db", () => ({
  listAgents: vi.fn(),
  getAgentById: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  getChatHistory: vi.fn(),
  saveChatMessage: vi.fn(),
  clearChatHistory: vi.fn(),
  getAllSettings: vi.fn(),
  upsertSetting: vi.fn(),
  getRecentActivity: vi.fn(),
  logActivity: vi.fn(),
  getDashboardStats: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getDb: vi.fn(),
}));

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { appRouter } from "./routers";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createCaller() {
  return appRouter.createCaller(createTestContext());
}

// ─── Agents Router Tests ─────────────────────────────────────────────────────

describe("agents", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mockAgent = {
    id: 1,
    name: "Test Agent",
    description: "A test agent",
    model: "GPT-4o",
    status: "idle" as const,
    tasksCompleted: 0,
    lastActive: null,
    config: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("lists all agents", async () => {
    vi.mocked(db.listAgents).mockResolvedValue([mockAgent]);
    const caller = createCaller();
    const result = await caller.agents.list();
    expect(result).toEqual([mockAgent]);
    expect(db.listAgents).toHaveBeenCalledOnce();
  });

  it("gets an agent by id", async () => {
    vi.mocked(db.getAgentById).mockResolvedValue(mockAgent);
    const caller = createCaller();
    const result = await caller.agents.getById({ id: 1 });
    expect(result).toEqual(mockAgent);
    expect(db.getAgentById).toHaveBeenCalledWith(1);
  });

  it("creates a new agent", async () => {
    vi.mocked(db.createAgent).mockResolvedValue(mockAgent);
    vi.mocked(db.logActivity).mockResolvedValue(undefined);
    const caller = createCaller();
    const result = await caller.agents.create({
      name: "Test Agent",
      description: "A test agent",
      model: "GPT-4o",
    });
    expect(result).toEqual(mockAgent);
    expect(db.createAgent).toHaveBeenCalledWith({
      name: "Test Agent",
      description: "A test agent",
      model: "GPT-4o",
      status: "idle",
    });
    expect(db.logActivity).toHaveBeenCalled();
  });

  it("updates an agent", async () => {
    const updated = { ...mockAgent, status: "running" as const };
    vi.mocked(db.updateAgent).mockResolvedValue(updated);
    vi.mocked(db.logActivity).mockResolvedValue(undefined);
    const caller = createCaller();
    const result = await caller.agents.update({ id: 1, status: "running" });
    expect(result).toEqual(updated);
    expect(db.updateAgent).toHaveBeenCalledWith(1, { status: "running" });
  });

  it("deletes an agent", async () => {
    vi.mocked(db.getAgentById).mockResolvedValue(mockAgent);
    vi.mocked(db.deleteAgent).mockResolvedValue(undefined);
    vi.mocked(db.logActivity).mockResolvedValue(undefined);
    const caller = createCaller();
    const result = await caller.agents.delete({ id: 1 });
    expect(result).toEqual({ success: true });
    expect(db.deleteAgent).toHaveBeenCalledWith(1);
  });
});

// ─── Dashboard Router Tests ──────────────────────────────────────────────────

describe("dashboard", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns dashboard stats", async () => {
    const mockStats = { activeAgents: 2, totalAgents: 5, totalTasks: 42, totalMessages: 100 };
    vi.mocked(db.getDashboardStats).mockResolvedValue(mockStats);
    const caller = createCaller();
    const result = await caller.dashboard.stats();
    expect(result).toEqual(mockStats);
  });

  it("returns recent activity", async () => {
    const mockActivity = [
      { id: 1, action: "Agent created", status: "success", agentId: 1, createdAt: new Date() },
    ];
    vi.mocked(db.getRecentActivity).mockResolvedValue(mockActivity);
    const caller = createCaller();
    const result = await caller.dashboard.activity();
    expect(result).toEqual(mockActivity);
    expect(db.getRecentActivity).toHaveBeenCalledWith(20);
  });
});

// ─── Chat Router Tests ───────────────────────────────────────────────────────

describe("chat", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns chat history in chronological order", async () => {
    const msgs = [
      { id: 2, role: "assistant" as const, content: "Hello!", model: "GPT-4o", createdAt: new Date("2024-01-02") },
      { id: 1, role: "user" as const, content: "Hi", model: "GPT-4o", createdAt: new Date("2024-01-01") },
    ];
    vi.mocked(db.getChatHistory).mockResolvedValue(msgs);
    const caller = createCaller();
    const result = await caller.chat.history();
    // getChatHistory returns desc order, .reverse() makes oldest first
    expect(result[0].content).toBe("Hi");
    expect(result[1].content).toBe("Hello!");
  });

  it("sends a message and returns AI response", async () => {
    vi.mocked(db.saveChatMessage).mockResolvedValue(undefined);
    vi.mocked(db.getChatHistory).mockResolvedValue([]);
    vi.mocked(invokeLLM).mockResolvedValue({
      id: "test",
      created: Date.now(),
      model: "GPT-4o",
      choices: [{
        index: 0,
        message: { role: "assistant", content: "I can help with that!" },
        finish_reason: "stop",
      }],
    });
    const caller = createCaller();
    const result = await caller.chat.send({ message: "Help me", model: "GPT-4o" });
    expect(result.role).toBe("assistant");
    expect(result.content).toBe("I can help with that!");
    expect(db.saveChatMessage).toHaveBeenCalledTimes(2); // user + assistant
    expect(invokeLLM).toHaveBeenCalled();
  });

  it("clears chat history", async () => {
    vi.mocked(db.clearChatHistory).mockResolvedValue(undefined);
    const caller = createCaller();
    const result = await caller.chat.clear();
    expect(result).toEqual({ success: true });
    expect(db.clearChatHistory).toHaveBeenCalledOnce();
  });
});

// ─── Code Summarizer Router Tests ────────────────────────────────────────────

describe("summarizer", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("analyzes code and returns structured summary", async () => {
    const mockAnalysis = {
      overview: "A simple utility function",
      language: "TypeScript",
      complexity: "low",
      functions: [{ name: "add", description: "Adds two numbers", lineCount: 3 }],
      dependencies: [],
      suggestions: ["Add type annotations"],
      securityIssues: [],
      linesOfCode: 5,
    };
    vi.mocked(invokeLLM).mockResolvedValue({
      id: "test",
      created: Date.now(),
      model: "GPT-4o",
      choices: [{
        index: 0,
        message: { role: "assistant", content: JSON.stringify(mockAnalysis) },
        finish_reason: "stop",
      }],
    });
    vi.mocked(db.logActivity).mockResolvedValue(undefined);

    const caller = createCaller();
    const result = await caller.summarizer.analyze({
      code: "function add(a: number, b: number) { return a + b; }",
      language: "TypeScript",
      fileName: "utils.ts",
    });

    expect(result.overview).toBe("A simple utility function");
    expect(result.language).toBe("TypeScript");
    expect(result.complexity).toBe("low");
    expect(result.functions).toHaveLength(1);
    expect(invokeLLM).toHaveBeenCalled();
  });
});

// ─── Settings Router Tests ───────────────────────────────────────────────────

describe("settings", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns all settings as key-value map", async () => {
    vi.mocked(db.getAllSettings).mockResolvedValue([
      { id: 1, key: "theme", value: "dark", updatedAt: new Date() },
      { id: 2, key: "model", value: "GPT-4o", updatedAt: new Date() },
    ]);
    const caller = createCaller();
    const result = await caller.settings.getAll();
    expect(result).toEqual({ theme: "dark", model: "GPT-4o" });
  });

  it("updates a single setting", async () => {
    vi.mocked(db.upsertSetting).mockResolvedValue(undefined);
    const caller = createCaller();
    const result = await caller.settings.update({ key: "theme", value: "light" });
    expect(result).toEqual({ success: true });
    expect(db.upsertSetting).toHaveBeenCalledWith("theme", "light");
  });

  it("updates multiple settings in batch", async () => {
    vi.mocked(db.upsertSetting).mockResolvedValue(undefined);
    const caller = createCaller();
    const result = await caller.settings.updateBatch({ theme: "dark", model: "Claude" });
    expect(result).toEqual({ success: true });
    expect(db.upsertSetting).toHaveBeenCalledTimes(2);
  });
});
