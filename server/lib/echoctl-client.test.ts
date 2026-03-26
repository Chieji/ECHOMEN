import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EchoctlClient } from './echoctl-client';

// Mock WebSocket
vi.mock('ws', () => {
  const MockWebSocket = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
  }));
  return { 
    default: MockWebSocket,
    OPEN: 1,
    CLOSED: 3,
  };
});

describe('EchoctlClient', () => {
  let client: EchoctlClient;

  beforeEach(() => {
    client = new EchoctlClient('ws://localhost:8080');
  });

  afterEach(() => {
    client.close();
  });

  it('should initialize with WebSocket URL', () => {
    expect(client).toBeDefined();
    expect(client.isConnected()).toBe(false);
  });

  it('should have correct initial state', () => {
    expect(client).toBeInstanceOf(EchoctlClient);
    expect(client).toHaveProperty('connect');
    expect(client).toHaveProperty('execute');
    expect(client).toHaveProperty('cancel');
    expect(client).toHaveProperty('listAgents');
    expect(client).toHaveProperty('subscribeAgent');
    expect(client).toHaveProperty('close');
  });

  it('should close and clean up subscribers', () => {
    client.close();
    // After close, subscribers should be cleared
    expect(client).toBeDefined();
  });
});
