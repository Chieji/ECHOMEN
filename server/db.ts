import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  agents, InsertAgent, Agent,
  chatMessages, InsertChatMessage,
  settings, InsertSetting,
  activityLog, InsertActivityLogEntry,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) { values.lastSignedIn = new Date(); }
    if (Object.keys(updateSet).length === 0) { updateSet.lastSignedIn = new Date(); }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Agents ──────────────────────────────────────────────────────────────────

export async function listAgents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents).orderBy(desc(agents.createdAt));
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result[0];
}

export async function createAgent(data: InsertAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agents).values(data);
  const insertId = result[0].insertId;
  return getAgentById(insertId);
}

export async function updateAgent(id: number, data: Partial<InsertAgent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(agents).set({ ...data, updatedAt: new Date() }).where(eq(agents.id, id));
  return getAgentById(id);
}

export async function deleteAgent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(agents).where(eq(agents.id, id));
}

// ─── Chat Messages ───────────────────────────────────────────────────────────

export async function getChatHistory(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(limit);
}

export async function saveChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chatMessages).values(data);
}

export async function clearChatHistory() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(chatMessages);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(settings);
}

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0];
}

export async function upsertSetting(key: string, value: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

// ─── Activity Log ────────────────────────────────────────────────────────────

export async function getRecentActivity(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
}

export async function logActivity(data: InsertActivityLogEntry) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values(data);
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { activeAgents: 0, totalTasks: 0, totalMessages: 0 };

  const agentRows = await db.select({
    total: sql<number>`COUNT(*)`,
    active: sql<number>`SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END)`,
    totalTasks: sql<number>`SUM(tasksCompleted)`,
  }).from(agents);

  const msgRows = await db.select({
    total: sql<number>`COUNT(*)`,
  }).from(chatMessages);

  return {
    activeAgents: Number(agentRows[0]?.active ?? 0),
    totalAgents: Number(agentRows[0]?.total ?? 0),
    totalTasks: Number(agentRows[0]?.totalTasks ?? 0),
    totalMessages: Number(msgRows[0]?.total ?? 0),
  };
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

import { OnboardingSession, InsertOnboardingSession, onboardingSessions } from "../drizzle/schema";

export async function getOnboardingSession(userId: number): Promise<OnboardingSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(onboardingSessions).where(eq(onboardingSessions.userId, userId)).limit(1);
  return result[0];
}

export async function createOnboardingSession(data: InsertOnboardingSession): Promise<OnboardingSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(onboardingSessions).values(data);
  const insertId = result[0].insertId;
  return db.select().from(onboardingSessions).where(eq(onboardingSessions.id, insertId)).limit(1).then(r => r[0]);
}

export async function updateOnboardingSession(userId: number, data: Partial<InsertOnboardingSession>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(onboardingSessions).set({ ...data, updatedAt: new Date() }).where(eq(onboardingSessions.userId, userId));
}

export async function updateUserOnboarding(userId: number, data: { onboardingCompleted?: number; onboardingStep?: number; firstAgentCreated?: number }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
}
