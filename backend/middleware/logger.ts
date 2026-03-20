/**
 * Comprehensive Logging & Audit Trail System
 * Tracks all requests, tool executions, and security events
 */

import { Request, Response, NextFunction } from 'express';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';
  category: string;
  message: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class Logger {
  private logDir: string;
  private maxLogSize = 100 * 1024 * 1024; // 100MB per file

  constructor(logDir?: string) {
    this.logDir = logDir || join(homedir(), '.echo', 'logs');

    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatEntry(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date(entry.timestamp).toISOString(),
    });
  }

  private getLogFile(category: string): string {
    const date = new Date().toISOString().split('T')[0];
    return join(this.logDir, `${category}-${date}.log`);
  }

  private rotateIfNeeded(filePath: string): void {
    try {
      const stats = require('fs').statSync(filePath);
      if (stats.size > this.maxLogSize) {
        const timestamp = Date.now();
        const rotatedPath = `${filePath}.${timestamp}`;
        require('fs').renameSync(filePath, rotatedPath);
      }
    } catch (error) {
      // File doesn't exist yet, no rotation needed
    }
  }

  log(entry: LogEntry): void {
    const logFile = this.getLogFile(entry.category);
    this.rotateIfNeeded(logFile);

    try {
      appendFileSync(logFile, this.formatEntry(entry) + '\n');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  info(category: string, message: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category,
      message,
      metadata,
    });
  }

  warn(category: string, message: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      category,
      message,
      metadata,
    });
  }

  error(category: string, message: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category,
      message,
      metadata,
    });
  }

  audit(
    userId: string,
    action: string,
    resource: string,
    result: 'success' | 'failure',
    metadata?: Record<string, any>
  ): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'AUDIT',
      category: 'audit',
      message: `${action} on ${resource}: ${result}`,
      userId,
      metadata: {
        action,
        resource,
        result,
        ...metadata,
      },
    });
  }
}

export const logger = new Logger();

/**
 * HTTP Request Logging Middleware
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const sessionId = req.headers['x-session-id'] as string;
    const userId = (req as any).user?.id;

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = Date.now() - startTime;

      logger.log({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        category: 'http',
        message: `${req.method} ${req.path}`,
        userId,
        sessionId,
        ipAddress: req.ip,
        statusCode: res.statusCode,
        duration,
        metadata: {
          method: req.method,
          path: req.path,
          query: req.query,
          headers: {
            'user-agent': req.headers['user-agent'],
            'content-type': req.headers['content-type'],
          },
        },
      });

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Tool Execution Audit Logger
 */
export function logToolExecution(
  userId: string,
  toolName: string,
  args: any,
  result: any,
  duration: number,
  sessionId?: string
): void {
  const success = result.success !== false;

  logger.audit(userId, 'EXECUTE_TOOL', toolName, success ? 'success' : 'failure', {
    toolName,
    args: sanitizeArgs(args),
    result: sanitizeResult(result),
    duration,
    sessionId,
  });
}

/**
 * Security Event Logger
 */
export function logSecurityEvent(
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  message: string,
  metadata?: Record<string, any>
): void {
  logger.log({
    timestamp: new Date().toISOString(),
    level: severity === 'critical' ? 'ERROR' : 'WARN',
    category: 'security',
    message: `[${severity.toUpperCase()}] ${eventType}: ${message}`,
    metadata: {
      eventType,
      severity,
      ...metadata,
    },
  });
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeArgs(args: any): any {
  if (!args) return args;

  const sanitized = { ...args };
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'key', 'auth'];

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

function sanitizeResult(result: any): any {
  if (!result) return result;

  const sanitized = { ...result };
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'key', 'auth'];

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * HITL Approval Logger
 */
export function logApprovalRequest(
  userId: string,
  toolName: string,
  approved: boolean,
  sessionId?: string
): void {
  logger.audit(
    userId,
    'APPROVE_TOOL',
    toolName,
    approved ? 'approved' : 'rejected',
    {
      toolName,
      approved,
      sessionId,
    }
  );
}

/**
 * Error Tracking Logger
 */
export function logError(
  category: string,
  error: Error,
  context?: Record<string, any>
): void {
  logger.error(category, error.message, {
    stack: error.stack,
    ...context,
  });
}
