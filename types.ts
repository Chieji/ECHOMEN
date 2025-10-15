import React from 'react';

export enum AgentMode {
    ACTION = 'ACTION',
    CHAT = 'CHAT',
}

export interface Message {
    id: string;
    text: string;
    sender: 'user' | 'agent';
    timestamp: string;
    type?: 'chat' | 'system';
}

export type TaskStatus = 'Done' | 'Executing' | 'Queued' | 'Error' | 'Pending Review' | 'Revising';

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
    args: { [key: string]: any };
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
}

export interface CustomAgent {
  id: string;
  name:string;
  instructions: string;
  isCore?: boolean;
  enabled?: boolean;
  icon?: string;
  description?: string;
}

export interface Playbook {
  id: string;
  name: string;
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

export type ArtifactType = 'code' | 'markdown' | 'log';

export interface Artifact {
    id: string;
    taskId: string;
    title: string;
    type: ArtifactType;
    content: string;
    createdAt: string;
}