/**
 * ECHO Wire Protocol — Shared types for CLI ↔ Web communication.
 * 
 * This defines the message format exchanged over the WebSocket bridge
 * between Echoctl (CLI) and ECHOMEN (Browser App).
 */

// ============================================================================
// Message Types
// ============================================================================

export type MessageType =
  | 'tool_request'       // One side asks the other to execute a tool
  | 'tool_result'        // Response to a tool_request
  | 'status_update'      // Agent status change (IDLE, RUNNING, etc.)
  | 'memory_sync'        // Sync a memory entry between CLI and Web
  | 'provider_switch'    // Notify about provider failover or preference change
  | 'log'                // Stream log entries
  | 'ping'               // Keepalive
  | 'pong';              // Keepalive response

export type MessageSource = 'cli' | 'web';

export interface EchoMessage {
  type: MessageType;
  id: string;            // Unique message ID for request/response correlation
  source: MessageSource;
  timestamp: number;
  payload: any;
}

// ============================================================================
// Payload Types
// ============================================================================

export interface ToolRequestPayload {
  tool: string;
  args: Record<string, any>;
  sessionId?: string;
}

export interface ToolResultPayload {
  requestId: string;     // Correlates to the original message ID
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

export interface StatusUpdatePayload {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'ERROR';
  taskId?: string;
  taskTitle?: string;
  message?: string;
}

export interface MemorySyncPayload {
  action: 'write' | 'delete';
  key: string;
  value?: any;
  scope: 'working' | 'shortterm' | 'longterm' | 'episodic';
}

export interface ProviderSwitchPayload {
  provider: string;
  model: string;
  reason: string;        // e.g., 'failover', 'user_preference', 'task_routing'
}

export interface LogPayload {
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  source: string;        // Component name, e.g., 'ReActEngine', 'WebHawk'
}

// ============================================================================
// Helpers
// ============================================================================

let messageCounter = 0;

export function createMessage(
  type: MessageType,
  source: MessageSource,
  payload: any
): EchoMessage {
  return {
    type,
    id: `${source}-${Date.now()}-${++messageCounter}`,
    source,
    timestamp: Date.now(),
    payload,
  };
}

export function isValidMessage(data: any): data is EchoMessage {
  return (
    data &&
    typeof data.type === 'string' &&
    typeof data.id === 'string' &&
    typeof data.source === 'string' &&
    typeof data.timestamp === 'number' &&
    data.payload !== undefined
  );
}
