import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  onboardingCompleted: int("onboardingCompleted").default(0).notNull(),
  onboardingStep: int("onboardingStep").default(0).notNull(),
  firstAgentCreated: int("firstAgentCreated").default(0).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * AI Agents managed by the ECHOMEN platform.
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  model: varchar("model", { length: 64 }).notNull().default("GPT-4o"),
  status: mysqlEnum("status", ["running", "idle", "error", "stopped"]).default("idle").notNull(),
  tasksCompleted: int("tasksCompleted").default(0).notNull(),
  lastActive: timestamp("lastActive"),
  config: json("config").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Chat messages between user and AI assistant.
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Key-value settings store for platform configuration.
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: json("value").$type<unknown>(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

/**
 * Activity log for tracking platform events.
 */
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  action: text("action").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("info"),
  agentId: int("agentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

/**
 * Knowledge Graph - Wiki-linked notes, artifacts, and tasks
 */
export const knowledgeNodes = mysqlTable("knowledge_nodes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["note", "artifact", "task", "conversation"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeNode = typeof knowledgeNodes.$inferSelect;
export type InsertKnowledgeNode = typeof knowledgeNodes.$inferInsert;

/**
 * Knowledge Links - Bidirectional backlinks between nodes
 */
export const knowledgeLinks = mysqlTable("knowledge_links", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull(),
  targetId: int("targetId").notNull(),
  type: mysqlEnum("type", ["backlink", "reference", "related"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KnowledgeLink = typeof knowledgeLinks.$inferSelect;
export type InsertKnowledgeLink = typeof knowledgeLinks.$inferInsert;

/**
 * Playbooks - Learned execution patterns from successful tasks
 */
export const playbooks = mysqlTable("playbooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  pattern: json("pattern").$type<{
    trigger: string;
    steps: Array<{ type: string; description: string }>;
    successCriteria: string[];
  }>().notNull(),
  executionCount: int("executionCount").default(0).notNull(),
  successRate: varchar("successRate", { length: 10 }).default("1.0").notNull(),
  lastExecuted: timestamp("lastExecuted"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Playbook = typeof playbooks.$inferSelect;
export type InsertPlaybook = typeof playbooks.$inferInsert;

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type InsertActivityLogEntry = typeof activityLog.$inferInsert;

/**
 * Onboarding sessions to track wizard progress per user.
 */
export const onboardingSessions = mysqlTable("onboarding_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  currentStep: int("currentStep").default(0).notNull(),
  cliConnected: int("cliConnected").default(0).notNull(),
  firstAgentId: int("firstAgentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OnboardingSession = typeof onboardingSessions.$inferSelect;
export type InsertOnboardingSession = typeof onboardingSessions.$inferInsert;
