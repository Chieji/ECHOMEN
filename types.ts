import React from 'react';

export enum AgentMode {
    ACTION = 'ACTION',
    CHAT = 'CHAT',
}

export interface SessionStats {
    totalTokensUsed: number;
}

export interface Message {
    id: string;
    text: string;
    sender: 'user' | 'agent';
    timestamp: string;
    type?: 'chat' | 'system' | 'action_prompt';
    suggestedPrompt?: string;
}

export type TaskStatus = 'Done' | 'Executing' | 'Queued' | 'Error' | 'Pending Review' | 'Revising' | 'Delegating' | 'Cancelled';

export interface LogEntry {
    timestamp: string;
    status: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN';
    message: string;
}

export interface ReviewEntry {
    reviewer: string;
    timestamp: string;
    status: 'Approved' | 'Changes Requested';
    comments: string;
}

export interface ToolCall {
    name: string;
    args: { [key:string]: any };
}

export type AgentRole = 'Planner' | 'Executor' | 'Reviewer' | 'Synthesizer';

export interface SubStep {
    thought: string;
    toolCall: ToolCall;
    observation: string;
}

export interface Task {
    id: string;
    title: string;
    status: TaskStatus;
    agent: {
        role: AgentRole;
        name: string; // e.g., 'Gemini Advanced', 'GPT-4', 'Claude Sonnet'
    };
    estimatedTime: string;
    details: string;
    dependencies: string[];
    logs: LogEntry[];
    reviewHistory: ReviewEntry[];
    retryCount: number;
    maxRetries: number;
    toolCall?: ToolCall;
    subSteps?: SubStep[];
    delegatorTaskId?: string;
}

export interface ChildAgentTemplate {
  id_prefix: string;
  llm_profile_id: string;
  default_tools: string[];
  timeout_seconds: number;
  max_retries: number;
}

export interface CustomAgent {
  id: string;
  name:string;
  description?: string;
  instructions: string;
  isCore?: boolean;
  enabled?: boolean;
  icon?: string;
  llm_profile_id?: string;
  delegation_enabled?: boolean;
  review_policy?: string;
  learning_log_collection?: string;
  child_agent_template?: ChildAgentTemplate;
  capabilities?: string[];
  enabled_tools?: string[];
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  triggerPrompt: string;
  tasks: Omit<Task, 'id' | 'status' | 'dependencies' | 'logs' | 'reviewHistory' | 'retryCount' | 'maxRetries' | 'subSteps'>[];
  createdAt: string;
}

export interface AppDeployment {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  status: 'deploying' | 'ready' | 'error';
  url: string;
  logs: LogEntry[];
}

export type AgentPreferences = Partial<Record<AgentRole, string>>;

export interface TodoItem {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: string;
}

export enum AgentStatus {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
    PAUSED = 'PAUSED',
    FINISHED = 'FINISHED',
    SYNTHESIZING = 'SYNTHESIZING',
    ERROR = 'ERROR',
}

// FIX: Moved Service-related types here to be globally available and fix import error.
export type InputType = 'text' | 'password';

export interface ServiceInput {
    id: string;
    label: string;
    type: InputType;
    placeholder: string;
}

export interface Service {
    id: string;
    name: string;
    icon: React.ReactNode;
    inputs: ServiceInput[];
    status: 'Connected' | 'Not Connected';
}

export type ArtifactType = 'code' | 'markdown' | 'log' | 'live-preview';

export interface Artifact {
    id: string;
    taskId: string;
    title: string;
    type: ArtifactType;
    content: string;
    createdAt: string;
}

export interface ModelProviderConfig {
  id: string;
  provider: 'GEMINI' | 'OLLAMA' | 'HUGGING_FACE' | string;
  type: 'CLOUD' | 'LOCAL';
  description: string;
  config: {
    model_name: string;
    api_key_env_var?: string;
    base_url?: string;
    endpoint_url?: string;
  };
  integration_layer: 'NATIVE' | 'LANGCHAIN';
  enabled: boolean;
}

export interface ExecutionErrorDetails {
  code:
    | 'LLM_BUDGET_EXCEEDED'
    | 'MAX_SUB_STEPS_REACHED'
    | 'DEPENDENCY_DEADLOCK'
    | 'TOOL_EXECUTION_FAILED'
    | 'UNKNOWN';
  taskId?: string;
  toolName?: string;
  cause?: unknown;
}

export class ExecutionError extends Error {
  public readonly details: ExecutionErrorDetails;

  constructor(message: string, details: ExecutionErrorDetails) {
    super(message);
    this.name = 'ExecutionError';
    this.details = details;
  }
}
