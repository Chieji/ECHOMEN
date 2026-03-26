import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { EchoctlClient } from "../lib/echoctl-client";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  echoctl: EchoctlClient;
  logActivity: (opts: { action: string; status: string; agentId?: number }) => Promise<void>;
};

// Lazy import db to avoid circular dependency
let _logActivity: any = null;
async function getLogActivity() {
  if (!_logActivity) {
    const db = await import('../db');
    _logActivity = db.logActivity;
  }
  return _logActivity;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Get or create EchoctlClient (singleton pattern)
  const echoctl = (global as any).__echoctlClient || (() => {
    const { EchoctlClient } = require('../lib/echoctl-client');
    const client = new EchoctlClient(process.env.ECHOCTL_WS_URL || 'ws://localhost:8080');
    client.connect().catch(console.error);
    (global as any).__echoctlClient = client;
    return client;
  })();

  return {
    req: opts.req,
    res: opts.res,
    user,
    echoctl,
    logActivity: async (opts) => {
      const logActivity = await getLogActivity();
      await logActivity(opts);
    },
  };
}
