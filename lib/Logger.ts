/**
 * Structured Logging System
 * Fixes Priority 2.5: Enables production debugging and monitoring
 */

export interface LogContext {
  sessionId?: string;
  userId?: string;
  toolName?: string;
  requestId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: string;
  stack?: string;
  metadata?: Record<string, any>;
}

class StructuredLogger {
  private context: LogContext = {};
  private logHistory: LogEntry[] = [];
  private maxHistorySize: number = 10000;
  private logLevel: 'debug' | 'info' | 'warn' | 'error' | 'security' = 'info';

  constructor(logLevel?: string) {
    if (logLevel) {
      this.logLevel = logLevel as any;
    }
  }

  /**
   * Set context for all subsequent logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Debug level log
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  /**
   * Info level log
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  /**
   * Warning level log
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  /**
   * Error level log
   */
  error(message: string, error?: Error | string, metadata?: Record<string, any>): void {
    const errorData: any = {};

    if (error instanceof Error) {
      errorData.error = error.message;
      errorData.stack = error.stack;
    } else if (typeof error === 'string') {
      errorData.error = error;
    }

    this.log('error', message, { ...errorData, ...metadata });
  }

  /**
   * Security level log (highest priority)
   */
  security(message: string, metadata?: Record<string, any>): void {
    this.log('security', message, metadata);
  }

  /**
   * Log tool execution
   */
  logToolExecution(
    toolName: string,
    status: 'start' | 'success' | 'error',
    metadata?: Record<string, any>
  ): void {
    const logMessage = `TOOL_${status.toUpperCase()}: ${toolName}`;

    this.log('info', logMessage, {
      tool: toolName,
      status,
      ...metadata,
    });
  }

  /**
   * Log API call
   */
  logApiCall(
    method: string,
    url: string,
    statusCode?: number,
    latencyMs?: number
  ): void {
    this.log('info', `API_CALL: ${method} ${url}`, {
      method,
      url,
      statusCode,
      latencyMs,
    });
  }

  /**
   * Log authentication event
   */
  logAuth(event: 'login' | 'logout' | 'failed' | 'token_refresh', userId?: string): void {
    this.security(`AUTH_${event.toUpperCase()}`, { userId });
  }

  /**
   * Log permission check
   */
  logPermissionCheck(
    resource: string,
    action: string,
    allowed: boolean,
    reason?: string
  ): void {
    const level = allowed ? 'debug' : 'warn';
    const message = `PERMISSION_${allowed ? 'GRANTED' : 'DENIED'}: ${action} on ${resource}`;

    this.log(level, message, {
      resource,
      action,
      allowed,
      reason,
    });
  }

  /**
   * Log rate limit
   */
  logRateLimit(identifier: string, limit: number, remaining: number): void {
    this.warn('RATE_LIMIT_CHECK', {
      identifier,
      limit,
      remaining,
      percentage: ((remaining / limit) * 100).toFixed(1),
    });
  }

  /**
   * Log cost tracking
   */
  logCost(service: string, cost: number, tokens?: number): void {
    this.info('COST_TRACKED', {
      service,
      cost: cost.toFixed(4),
      tokens,
    });
  }

  /**
   * Internal log method
   */
  private log(
    level: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    // Check log level
    const levels = ['debug', 'info', 'warn', 'error', 'security'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex < currentLevelIndex && level !== 'security') {
      return; // Skip logs below current level
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      metadata: this.redactSensitiveData(metadata),
    };

    // Add to history
    this.logHistory.push(entry);

    // Trim history if too large
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }

    // Output to console
    this.outputToConsole(entry);
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase();
    const message = entry.message;

    let color = '';
    let reset = '\x1b[0m';

    switch (entry.level) {
      case 'debug':
        color = '\x1b[36m'; // Cyan
        break;
      case 'info':
        color = '\x1b[32m'; // Green
        break;
      case 'warn':
        color = '\x1b[33m'; // Yellow
        break;
      case 'error':
        color = '\x1b[31m'; // Red
        break;
      case 'security':
        color = '\x1b[35m'; // Magenta
        break;
    }

    const logLine = `${color}[${timestamp}] ${level}${reset} ${message}`;

    if (entry.level === 'error' || entry.level === 'security') {
      console.error(logLine, entry.metadata || '');
    } else if (entry.level === 'warn') {
      console.warn(logLine, entry.metadata || '');
    } else {
      console.log(logLine, entry.metadata || '');
    }
  }

  /**
   * Redact sensitive data from logs
   */
  private redactSensitiveData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) return undefined;

    const redacted = { ...data };
    const sensitiveKeys = [
      'apiKey',
      'password',
      'token',
      'secret',
      'authorization',
      'creditCard',
      'ssn',
      'privateKey',
    ];

    for (const key of sensitiveKeys) {
      if (key in redacted) {
        redacted[key] = '[REDACTED]';
      }
    }

    return redacted;
  }

  /**
   * Get log history
   */
  getHistory(limit?: number): LogEntry[] {
    if (limit) {
      return this.logHistory.slice(-limit);
    }
    return [...this.logHistory];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: string): LogEntry[] {
    return this.logHistory.filter((entry) => entry.level === level);
  }

  /**
   * Get logs by context
   */
  getLogsByContext(contextKey: string, contextValue: any): LogEntry[] {
    return this.logHistory.filter((entry) => entry.context?.[contextKey] === contextValue);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportAsCSV(): string {
    if (this.logHistory.length === 0) {
      return '';
    }

    const headers = ['timestamp', 'level', 'message', 'context', 'metadata'];
    const rows = this.logHistory.map((entry) => [
      entry.timestamp,
      entry.level,
      entry.message,
      JSON.stringify(entry.context || {}),
      JSON.stringify(entry.metadata || {}),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    return csv;
  }
}

// Global logger instance
export const logger = new StructuredLogger(process.env.LOG_LEVEL);

export default logger;
