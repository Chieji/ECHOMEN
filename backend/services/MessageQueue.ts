/**
 * Message Queue System
 * Enables async task processing and inter-service communication
 */

export interface Message {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  retries: number;
  maxRetries: number;
  processingStarted?: number;
  processedAt?: number;
  error?: string;
}

export interface QueueConfig {
  name: string;
  maxRetries?: number;
  retryDelay?: number;
  processingTimeout?: number;
}

export type MessageHandler = (message: Message) => Promise<void>;

class MessageQueue {
  private queues: Map<string, Message[]> = new Map();
  private handlers: Map<string, MessageHandler[]> = new Map();
  private processing: Map<string, boolean> = new Map();
  private config: Map<string, QueueConfig> = new Map();

  /**
   * Create a new queue
   */
  createQueue(config: QueueConfig): void {
    this.queues.set(config.name, []);
    this.handlers.set(config.name, []);
    this.processing.set(config.name, false);
    this.config.set(config.name, {
      maxRetries: 3,
      retryDelay: 5000,
      processingTimeout: 30000,
      ...config,
    });

    console.log(`✓ Created queue: ${config.name}`);
  }

  /**
   * Subscribe to queue messages
   */
  subscribe(queueName: string, handler: MessageHandler): void {
    if (!this.handlers.has(queueName)) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    this.handlers.get(queueName)!.push(handler);
  }

  /**
   * Publish a message to queue
   */
  async publish(
    queueName: string,
    type: string,
    payload: any,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<string> {
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const message: Message = {
      id: `${queueName}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      timestamp: Date.now(),
      priority,
      retries: 0,
      maxRetries: this.config.get(queueName)?.maxRetries || 3,
    };

    const queue = this.queues.get(queueName)!;

    // Insert by priority (critical first, then high, normal, low)
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    let inserted = false;

    for (let i = 0; i < queue.length; i++) {
      if (priorityOrder[priority] < priorityOrder[queue[i].priority]) {
        queue.splice(i, 0, message);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      queue.push(message);
    }

    // Process queue asynchronously
    this.processQueue(queueName);

    return message.id;
  }

  /**
   * Process messages in queue
   */
  private async processQueue(queueName: string): Promise<void> {
    if (this.processing.get(queueName)) {
      return; // Already processing
    }

    this.processing.set(queueName, true);

    try {
      const queue = this.queues.get(queueName)!;
      const handlers = this.handlers.get(queueName)!;
      const config = this.config.get(queueName)!;

      while (queue.length > 0) {
        const message = queue.shift()!;

        try {
          message.processingStarted = Date.now();

          // Execute all handlers for this message type
          const relevantHandlers = handlers.filter(() => {
            // For now, execute all handlers
            // In production, could filter by message type
            return true;
          });

          if (relevantHandlers.length === 0) {
            console.warn(`No handlers for message type: ${message.type}`);
            continue;
          }

          // Execute handlers with timeout
          await Promise.race([
            Promise.all(relevantHandlers.map((h) => h(message))),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Message processing timeout')),
                config.processingTimeout
              )
            ),
          ]);

          message.processedAt = Date.now();
          console.log(`✓ Processed message: ${message.id}`);
        } catch (error: any) {
          message.error = error.message;
          message.retries++;

          if (message.retries < message.maxRetries) {
            // Re-queue for retry
            console.warn(
              `⚠ Retrying message ${message.id} (${message.retries}/${message.maxRetries})`
            );

            // Add back to queue with delay
            setTimeout(() => {
              queue.push(message);
            }, config.retryDelay);
          } else {
            // Max retries exceeded
            console.error(`✗ Message failed after ${message.maxRetries} retries: ${message.id}`);
          }
        }
      }
    } finally {
      this.processing.set(queueName, false);
    }
  }

  /**
   * Get queue statistics
   */
  getStats(queueName: string): {
    queued: number;
    processing: boolean;
    handlers: number;
  } {
    return {
      queued: this.queues.get(queueName)?.length || 0,
      processing: this.processing.get(queueName) || false,
      handlers: this.handlers.get(queueName)?.length || 0,
    };
  }

  /**
   * Get all queues
   */
  getAllQueues(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Clear a queue
   */
  clearQueue(queueName: string): void {
    const queue = this.queues.get(queueName);

    if (queue) {
      queue.length = 0;
    }
  }

  /**
   * Destroy a queue
   */
  destroyQueue(queueName: string): void {
    this.queues.delete(queueName);
    this.handlers.delete(queueName);
    this.processing.delete(queueName);
    this.config.delete(queueName);

    console.log(`✓ Destroyed queue: ${queueName}`);
  }
}

export const messageQueue = new MessageQueue();

/**
 * Common queue types
 */
export const QUEUES = {
  TOOL_EXECUTION: 'tool-execution',
  APPROVAL_REQUESTS: 'approval-requests',
  AUDIT_LOGS: 'audit-logs',
  NOTIFICATIONS: 'notifications',
  BACKGROUND_JOBS: 'background-jobs',
};

// Initialize common queues
messageQueue.createQueue({ name: QUEUES.TOOL_EXECUTION, maxRetries: 3 });
messageQueue.createQueue({ name: QUEUES.APPROVAL_REQUESTS, maxRetries: 1 });
messageQueue.createQueue({ name: QUEUES.AUDIT_LOGS, maxRetries: 5 });
messageQueue.createQueue({ name: QUEUES.NOTIFICATIONS, maxRetries: 2 });
messageQueue.createQueue({ name: QUEUES.BACKGROUND_JOBS, maxRetries: 3 });
