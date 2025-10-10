export enum AgentMode {
    ACTION = 'ACTION',
    CHAT = 'CHAT',
}

export interface Message {
    id: string;
    text: string;
    sender: 'user' | 'agent';
    timestamp: string;
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

export interface Task {
    id: string;
    title: string;
    status: TaskStatus;
    agent: {
        role: 'Planner' | 'Executor' | 'Reviewer' | 'Synthesizer';
        name: string; // e.g., 'Gemini Advanced', 'GPT-4', 'Claude Sonnet'
    };
    estimatedTime: string;
    details: string;
    dependencies: string[];
    logs: LogEntry[];
    reviewHistory: ReviewEntry[];
    retryCount: number;
    maxRetries: number;
}

export interface CustomAgent {
  id: string;
  name: string;
  instructions: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  timestamp: string;
  label?: string;
  isArchived?: boolean;
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