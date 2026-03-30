/**
 * ECHOMEN Universal AI Bridge (Backend Proxy)
 * 
 * SECURITY FIX 1.2: All AI provider calls now go through backend proxy
 * - No API keys in frontend
 * - No dangerouslyAllowBrowser flag
 * - All requests authenticated with CSRF + API key
 * 
 * Implements the multi-provider AI routing system as specified in PRD V1.1
 * Supported Providers: Groq, Gemini, Together AI, Cohere, OpenRouter, Mistral, Hugging Face
 * 
 * Smart Routing Logic:
 * - Fast chat: Groq
 * - Complex reasoning: Gemini
 * - Code generation: Together AI
 * - Data processing: Cohere
 * - Fallback chain: Automatic exponential retry
 */

import { getSecureItem, getSensitiveItem } from "./secureStorage";
import { Service, ToolCallDefinition, AIResponseData } from "../types";

export type AIProvider = 'google' | 'openai' | 'anthropic' | 'groq' | 'cohere' | 'openrouter' | 'together' | 'mistral' | 'huggingface';

export type TaskType = 'chat' | 'reasoning' | 'code' | 'data' | 'general';

export interface AIResponse extends AIResponseData {
    provider: AIProvider;
}

export interface ProviderConfig {
    id: string;
    provider: AIProvider;
    model: string;
    enabled: boolean;
}

interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
};

// SECURITY FIX: Use relative path - same origin, always correct
const BACKEND_URL = '/api/ai';

class RateLimiter {
    private requestTimes: number[] = [];
    private requestsPerMinute: number;
    private tokensPerMinute: number;
    private currentTokens: number = 0;

    constructor(requestsPerMinute = 60, tokensPerMinute = 90000) {
        this.requestsPerMinute = requestsPerMinute;
        this.tokensPerMinute = tokensPerMinute;
    }

    async acquire(): Promise<void> {
        const now = Date.now();
        this.requestTimes = this.requestTimes.filter(t => now - t < 60000);
        
        if (this.requestTimes.length >= this.requestsPerMinute) {
            const oldestRequest = this.requestTimes[0];
            const waitTime = 60000 - (now - oldestRequest);
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        this.requestTimes.push(now);
    }

    setTokensUsed(tokens: number): void {
        this.currentTokens = tokens;
    }

    canProceed(): boolean {
        return this.currentTokens < this.tokensPerMinute;
    }
}

const providerRateLimiters: Map<AIProvider, RateLimiter> = new Map();

function getRateLimiter(provider: AIProvider): RateLimiter {
    if (!providerRateLimiters.has(provider)) {
        providerRateLimiters.set(provider, new RateLimiter());
    }
    return providerRateLimiters.get(provider)!;
}

async function exponentialBackoff(
    attempt: number,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<void> {
    const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt),
        config.maxDelay
    );
    await new Promise(resolve => setTimeout(resolve, delay));
}

async function withRetry<T>(
    operation: () => Promise<T>,
    provider: AIProvider,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
    let lastError: Error | unknown = null;
    const rateLimiter = getRateLimiter(provider);

    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        try {
            await rateLimiter.acquire();
            return await operation();
        } catch (error) {
            lastError = error;

            const errorStatus = (error as { status?: number | string }).status;
            if (errorStatus === 429 || errorStatus === 'rate_limit_error') {
                console.warn(`[AI Bridge] Rate limited by ${provider}, attempt ${attempt + 1}/${config.maxRetries}`);
                await exponentialBackoff(attempt, config);
                continue;
            }

            if (attempt === config.maxRetries - 1) break;

            if (typeof errorStatus === 'number' && errorStatus >= 500) {
                await exponentialBackoff(attempt, config);
                continue;
            }

            throw error;
        }
    }

    throw lastError;
}

export class AIBridge {
    private static providers: Map<AIProvider, ProviderConfig> = new Map();
    private static initialized = false;

    static async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const servicesData = await getSecureItem('echo-services');
            if (servicesData) {
                const services = JSON.parse(servicesData) as Service[];
                for (const service of services) {
                    if (service.status === 'Connected') {
                        const provider = this.mapServiceToProvider(service.id);
                        if (provider) {
                            this.providers.set(provider, {
                                id: service.id,
                                provider,
                                model: this.getDefaultModel(provider),
                                enabled: true,
                            });
                        }
                    }
                }
            }
            this.initialized = true;
        } catch (error) {
            console.error("[AI Bridge] Failed to initialize providers:", error);
        }
    }

    private static mapServiceToProvider(serviceId: string): AIProvider | null {
        const mapping: Record<string, AIProvider> = {
            'google': 'google',
            'gemini': 'google',
            'openai': 'openai',
            'anthropic': 'anthropic',
            'groq': 'groq',
            'cohere': 'cohere',
            'openrouter': 'openrouter',
            'together': 'together',
            'mistral': 'mistral',
            'huggingface': 'huggingface',
        };
        return mapping[serviceId.toLowerCase()] || null;
    }

    private static getDefaultModel(provider: AIProvider): string {
        const models: Record<AIProvider, string> = {
            'google': 'gemini-2.0-flash-exp',
            'openai': 'gpt-4o',
            'anthropic': 'claude-3.5-sonnet-20241022',
            'groq': 'llama-3.3-70b-versatile',
            'cohere': 'command-r-plus-20240522',
            'openrouter': 'openai/gpt-4o',
            'together': 'togethercomputer/llama-3.3-70b-instruct-turbo',
            'mistral': 'mistral-large-latest',
            'huggingface': 'meta-llama/Llama-3.3-70B-Instruct',
        };
        return models[provider];
    }

    static getProviderForTask(taskType: TaskType): AIProvider {
        const routing: Record<TaskType, AIProvider> = {
            'chat': 'groq',
            'reasoning': 'google',
            'code': 'together',
            'data': 'cohere',
            'general': 'openrouter',
        };
        
        const provider = routing[taskType];
        if (this.providers.has(provider) && this.providers.get(provider)!.enabled) {
            return provider;
        }
        
        if (this.providers.has('google') && this.providers.get('google')!.enabled) {
            return 'google';
        }
        
        for (const [p, config] of this.providers) {
            if (config.enabled) return p;
        }
        
        return 'google';
    }

    static setProviderConfig(config: ProviderConfig): void {
        this.providers.set(config.provider, config);
    }

    static getProviderConfig(provider: AIProvider): ProviderConfig | undefined {
        return this.providers.get(provider);
    }

    static isProviderEnabled(provider: AIProvider): boolean {
        const config = this.providers.get(provider);
        return config?.enabled ?? false;
    }

    static getAvailableProviders(): AIProvider[] {
        return Array.from(this.providers.entries())
            .filter(([_, config]) => config.enabled)
            .map(([provider]) => provider);
    }

    /**
     * SECURITY FIX 1.2: All AI generation now goes through backend proxy
     * Frontend never handles API keys or makes direct calls to AI providers
     */
    static async generate(
        providerOrTaskType: AIProvider | TaskType,
        model: string | null,
        systemPrompt: string,
        userPrompt: string,
        tools: ToolCallDefinition[] = []
    ): Promise<AIResponse> {
        await this.initialize();

        let provider: AIProvider;
        
        if (this.isProviderKeyTaskType(providerOrTaskType)) {
            provider = this.getProviderForTask(providerOrTaskType);
        } else {
            provider = providerOrTaskType;
        }

        const config = this.providers.get(provider);
        if (!config || !config.enabled) {
            const fallbackProvider = this.findWorkingProvider();
            if (!fallbackProvider) {
                throw new Error("No AI providers available. Please configure at least one provider in settings.");
            }
            provider = fallbackProvider;
        }

        const actualModel = model || this.providers.get(provider)?.model || this.getDefaultModel(provider);

        console.log(`[AI Bridge] Routing to ${provider} (${actualModel}) via backend proxy`);

        try {
            // Get CSRF token - use relative path
            const csrfResponse = await fetch('/api/csrf-token', {
                method: 'GET',
                headers: { 'X-Session-ID': 'echomen-frontend' },
            });
            const { token: csrfToken } = await csrfResponse.json();

            // Get API key from secure storage - NO hardcoded fallback
            const apiKey = (import.meta as any).env?.VITE_API_KEY ||
                          await getSensitiveItem('echo-api-key');

            if (!apiKey) {
                throw new Error('[ECHO Engine] API key not configured. Set VITE_API_KEY or configure in settings.');
            }

            const result = await withRetry(
                () => this.callBackendAI(
                    provider,
                    actualModel,
                    systemPrompt,
                    userPrompt,
                    tools,
                    csrfToken,
                    apiKey
                ),
                provider
            );

            return result;
        } catch (error) {
            console.error(`[AI Bridge] All providers failed, trying fallback chain`);
            return await this.fallbackChain(model, systemPrompt, userPrompt, tools);
        }
    }

    private static async callBackendAI(
        provider: AIProvider,
        model: string,
        system: string,
        user: string,
        tools: ToolCallDefinition[],
        csrfToken: string,
        apiKey: string
    ): Promise<AIResponse> {
        // SECURITY FIX: Validate API key - no hardcoded fallback
        if (!apiKey) {
            throw new Error('[ECHO Engine] API key not configured. Set VITE_API_KEY or configure in settings.');
        }

        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
                'Authorization': `Bearer ${apiKey}`,
                'X-Session-ID': 'echomen-frontend'
            },
            body: JSON.stringify({
                provider,
                model,
                systemPrompt: system,
                userPrompt: user,
                tools
            })
        });

        if (!response.ok) {
            throw new Error(`Backend AI error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            text: data.text,
            toolCalls: data.toolCalls,
            usage: data.usage,
            provider,
            model
        };
    }

    private static isProviderKeyTaskType(key: string): key is TaskType {
        return ['chat', 'reasoning', 'code', 'data', 'general'].includes(key);
    }

    private static async fallbackChain(
        model: string | null,
        systemPrompt: string,
        userPrompt: string,
        tools: ToolCallDefinition[]
    ): Promise<AIResponse> {
        const providers = this.getAvailableProviders();

        // SECURITY FIX: Get API key from secure storage, validate no hardcoded fallback
        const apiKey = (import.meta as any).env?.VITE_API_KEY ||
                      await getSensitiveItem('echo-api-key');

        if (!apiKey) {
            throw new Error('[ECHO Engine] API key not configured. Set VITE_API_KEY or configure in settings.');
        }

        for (const provider of providers) {
            try {
                const actualModel = model || this.providers.get(provider)?.model || this.getDefaultModel(provider);

                // Get CSRF token
                const csrfResponse = await fetch('/api/csrf-token', {
                    method: 'GET',
                    headers: { 'X-Session-ID': 'echomen-frontend' },
                });
                const { token: csrfToken } = await csrfResponse.json();

                return await this.callBackendAI(
                    provider,
                    actualModel,
                    systemPrompt,
                    userPrompt,
                    tools,
                    csrfToken,
                    apiKey
                );
            } catch (error) {
                console.warn(`[AI Bridge] Provider ${provider} failed, trying next...`);
                continue;
            }
        }

        throw new Error("All AI providers failed");
    }

    private static findWorkingProvider(): AIProvider | null {
        const priority: AIProvider[] = ['google', 'openai', 'groq', 'anthropic', 'openrouter', 'cohere', 'together'];
        
        for (const provider of priority) {
            if (this.providers.has(provider) && this.providers.get(provider)!.enabled) {
                return provider;
            }
        }
        
        return null;
    }
}
