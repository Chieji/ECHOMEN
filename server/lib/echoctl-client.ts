import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface EchoctlAgent {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  model: string;
  tasksCompleted: number;
  lastActive: string;
}

export interface EchoctlEvent {
  type: 'status_update' | 'log' | 'task_complete' | 'artifact_created' | 'agent_list';
  agentId: string;
  data: any;
  timestamp: string;
}

/**
 * EchoctlClient - WebSocket bridge to Echoctl CLI
 * 
 * Provides bidirectional communication with Echoctl for:
 * - Real-time agent status streaming
 * - Command execution
 * - Event subscriptions
 */
export class EchoctlClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribers: Map<string, Set<(event: EchoctlEvent) => void>> = new Map();
  private pendingRequests: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void; timeout?: NodeJS.Timeout }> = new Map();

  constructor(url: string) {
    super();
    this.url = url;
  }

  /**
   * Connect to Echoctl WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        console.log('[EchoctlClient] Connected to', this.url);
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('[EchoctlClient] Connection error:', error);
        reject(error);
      });

      this.ws.on('message', (data: string) => {
        try {
          const event: EchoctlEvent = JSON.parse(data);
          this.handleEvent(event);
        } catch (error) {
          console.error('[EchoctlClient] Failed to parse message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('[EchoctlClient] Disconnected, attempting reconnect...');
        this.handleReconnect();
      });
    });
  }

  /**
   * Handle incoming events
   */
  private handleEvent(event: EchoctlEvent): void {
    // Notify subscribers for this agent
    const subscribers = this.subscribers.get(event.agentId);
    if (subscribers) {
      subscribers.forEach(cb => cb(event));
    }

    // Handle pending requests (request-response pattern)
    if (event.type === 'agent_list' && event.data.requestId) {
      const pending = this.pendingRequests.get(event.data.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(event.data);
        this.pendingRequests.delete(event.data.requestId);
      }
    }

    // Emit generic event for listeners
    this.emit('event', event);
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      console.log(`[EchoctlClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('[EchoctlClient] Max reconnect attempts reached');
      this.emit('disconnected');
    }
  }

  /**
   * Check if connected to Echoctl
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Subscribe to agent status updates (async generator)
   */
  async *subscribeAgent(agentId: string): AsyncGenerator<EchoctlEvent> {
    const queue: EchoctlEvent[] = [];
    let resolve: (() => void) | null = null;

    const callback = (event: EchoctlEvent) => {
      queue.push(event);
      if (resolve) resolve();
    };

    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set());
    }
    this.subscribers.get(agentId)!.add(callback);

    try {
      while (true) {
        while (queue.length > 0) {
          yield queue.shift()!;
        }
        await new Promise<void>(r => { resolve = r; });
      }
    } finally {
      this.subscribers.get(agentId)?.delete(callback);
    }
  }

  /**
   * Execute agent command
   */
  async execute(agentId: string, prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const executionId = `exec-${Date.now()}`;
      
      const handler = (event: EchoctlEvent) => {
        if (event.type === 'task_complete' && event.data.executionId === executionId) {
          this.off('event', handler);
          resolve(event.data.result);
        }
      };
      
      this.on('event', handler);
      
      this.ws?.send(JSON.stringify({
        type: 'execute',
        executionId,
        agentId,
        prompt,
      }));

      // Timeout after 5 minutes
      const timeout = setTimeout(() => {
        this.off('event', handler);
        reject(new Error('Execution timeout'));
      }, 5 * 60 * 1000);

      // Clear timeout when handler is called
      const originalOff = this.off.bind(this);
      this.off = (event, listener) => {
        if (listener === handler) clearTimeout(timeout);
        return originalOff(event, listener);
      };
    });
  }

  /**
   * Cancel execution
   */
  async cancel(executionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws?.send(JSON.stringify({
          type: 'cancel',
          executionId,
        }));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * List all agents
   */
  async listAgents(): Promise<EchoctlAgent[]> {
    return new Promise((resolve, reject) => {
      const requestId = `req-${Date.now()}`;
      
      const handler = (event: EchoctlEvent) => {
        if (event.type === 'agent_list' && event.data.requestId === requestId) {
          this.off('event', handler);
          resolve(event.data.agents);
        }
      };
      
      this.on('event', handler);
      
      this.ws?.send(JSON.stringify({
        type: 'list_agents',
        requestId,
      }));
      
      const timeout = setTimeout(() => {
        this.off('event', handler);
        reject(new Error('Timeout waiting for agent list'));
      }, 5000);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data.agents);
        },
        reject,
      });
    });
  }

  /**
   * Close connection
   */
  close(): void {
    this.ws?.close();
    this.subscribers.clear();
    this.pendingRequests.clear();
  }
}
