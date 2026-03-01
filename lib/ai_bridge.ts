/**
 * ECHOMEN Universal AI Bridge
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

import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import Cohere from "cohere-ai";
import { getSecureItem } from "./secureStorage";
import { Service } from "../types";

export type AIProvider = 'google' | 'openai' | 'anthropic' | 'groq' | 'cohere' | 'openrouter' | 'together' | 'mistral' | 'huggingface';

export type TaskType = 'chat' | 'reasoning' | 'code' | 'data' | 'general';

export interface AIResponse {
    text: string;
    toolCalls?: any[];
    usage: {
        totalTokens: number;
    };
    provider: AIProvider;
    model: string;
}

export interface ProviderConfig {
    id: string;
    provider: AIProvider;
    model: string;
    apiKey: string;
    baseUrl?: string;
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
    let lastError: Error | null = null;
    const rateLimiter = getRateLimiter(provider);

    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        try {
            await rateLimiter.acquire();
            return await operation();
        } catch (error: any) {
            lastError = error;
            
            if (error.status === 429 || error.status === 'rate_limit_error') {
                console.warn(`[AI Bridge] Rate limited by ${provider}, attempt ${attempt + 1}/${config.maxRetries}`);
                await exponentialBackoff(attempt, config);
                continue;
            }
            
            if (attempt === config.maxRetries - 1) break;
            
            if (error.status >= 500) {
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
                        const apiKey = await getSecureItem(`service_${service.id}_apiKey`);
                        if (apiKey) {
                            const provider = this.mapServiceToProvider(service.id);
                            if (provider) {
                                this.providers.set(provider, {
                                    id: service.id,
                                    provider,
                                    model: this.getDefaultModel(provider),
                                    apiKey,
                                    enabled: true,
                                });
                            }
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

    static async generate(
        providerOrTaskType: AIProvider | TaskType,
        model: string | null,
        systemPrompt: string,
        userPrompt: string,
        tools: any[] = []
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

        console.log(`[AI Bridge] Routing to ${provider} (${actualModel})`);

        try {
            const result = await withRetry(
                () => this.executeProvider(provider, actualModel, systemPrompt, userPrompt, tools),
                provider
            );
            
            return result;
        } catch (error) {
            console.error(`[AI Bridge] All providers failed, trying fallback chain`);
            return await this.fallbackChain(providerOrTaskType, model, systemPrompt, userPrompt, tools);
        }
    }

    private static isProviderKeyTaskType(key: string): key is TaskType {
        return ['chat', 'reasoning', 'code', 'data', 'general'].includes(key);
    }

    private static async executeProvider(
        provider: AIProvider,
        model: string,
        system: string,
        user: string,
        tools: any[]
    ): Promise<AIResponse> {
        switch (provider) {
            case 'google':
                return await this.generateGemini(model, system, user, tools);
            case 'openai':
                return await this.generateOpenAI(model, system, user, tools);
            case 'anthropic':
                return await this.generateAnthropic(model, system, user, tools);
            case 'groq':
                return await this.generateGroq(model, system, user, tools);
            case 'cohere':
                return await this.generateCohere(model, system, user, tools);
            case 'openrouter':
                return await this.generateOpenRouter(model, system, user, tools);
            case 'together':
                return await this.generateTogether(model, system, user, tools);
            case 'mistral':
                return await this.generateMistral(model, system, user, tools);
            case 'huggingface':
                return await this.generateHuggingFace(model, system, user, tools);
            default:
                throw new Error(`Provider ${provider} not implemented`);
        }
    }

    private static async fallbackChain(
        providerOrTaskType: AIProvider | TaskType,
        model: string | null,
        systemPrompt: string,
        userPrompt: string,
        tools: any[]
    ): Promise<AIResponse> {
        const providers = this.getAvailableProviders();
        
        for (const provider of providers) {
            try {
                const actualModel = model || this.providers.get(provider)?.model || this.getDefaultModel(provider);
                return await this.executeProvider(provider, actualModel, systemPrompt, userPrompt, tools);
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

    private static async generateGemini(model: string, system: string, user: string, tools: any[]): Promise<AIResponse> {
        const config = this.providers.get('google');
        const apiKey = config?.apiKey || '';
        
        if (!apiKey) throw new Error("Gemini API key not configured");
        
        const ai = new GoogleGenAI({ apiKey });
        
        const contents = [{ role: "user", parts: [{ text: user }] }];
        const systemInstruction = system;
        
        let resultText = "";
        let totalTokens = 0;

        if (tools.length > 0) {
            const result = await ai.models.generateContent({
                model: model || 'gemini-2.0-flash-exp',
                contents,
                config: {
                    systemInstruction,
                    tools: tools.map(t => ({ functionDeclarations: t })),
                },
            });
            
            resultText = result.text || "";
            if (result.usageMetadata) {
                totalTokens = result.usageMetadata.totalTokenCount || 0;
            }
        } else {
            const result = await ai.models.generateContent({
                model: model || 'gemini-2.0-flash-exp',
                contents,
                config: { systemInstruction },
            });
            
            resultText = result.text || "";
            if (result.usageMetadata) {
                totalTokens = result.usageMetadata.totalTokenCount || 0;
            }
        }

        return {
            text: resultText,
            usage: { totalTokens },
            provider: 'google',
            model,
        };
    }

    private static async generateOpenAI(model: string, system: string, user: string, tools: any[]): Promise<AIResponse> {
        const config = this.providers.get('openai');
        const apiKey = config?.apiKey || '';
        
        if (!apiKey) throw new Error("OpenAI API key not configured");
        
        const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        
        const messages: any[] = [
            { role: "system", content: system },
            { role: "user", content: user }
        ];
        
        const response = await client.chat.completions.create({
            model: model || "gpt-4o",
            messages,
            tools: tools.length > 0 ? tools.map(t => ({ type: "function", function: t })) : undefined,
            temperature: 0.7,
        });

        const choice = response.choices[0];
        return {
            text: choice.message.content || "",
            toolCalls: choice.message.tool_calls,
            usage: { totalTokens: response.usage?.total_tokens || 0 },
            provider: 'openai',
            model,
        };
    }

    private static async generateAnthropic(model: string, system: string, user: string, tools: any[]): Promise<AIResponse> {
        const config = this.providers.get('anthropic');
        const apiKey = config?.apiKey || '';
        
        if (!apiKey) throw new Error("Anthropic API key not configured");
        
        const client = new Anthropic({ apiKey });
        
        const response = await client.messages.create({
            model: model || "claude-3.5-sonnet-20241022",
            max_tokens: 4096,
            system,
            messages: [{ role: "user", content: user }],
            tools: tools as any,
        });

        const content = response.content[0] as any;
        return {
            text: content?.text || "",
            usage: { totalTokens: response.usage.input_tokens + response.usage.output_tokens },
            provider: 'anthropic',
            model,
        };
    }

    private static async generateGroq(model: string, system: string, user: string, tools: any[]): Promise<AIResponse> {
        const config = this.providers.get('groq');
        const apiKey = config?.apiKey || '';
        
        if (!apiKey) throw new Error("Groq API key not configured");
        
        const client = new Groq({ apiKey });
        
        const messages: any[] = [
            { role: "system", content: system },
            { role: "user", content: user }
        ];
        
        const response = await client.chat.completions.create({
            model: model || "llama-3.3-70b-versatile",
            messages,
            tools: tools.length > 0 ? tools.map(t => ({ type: "function", function: t })) : undefined,
            temperature: 0.7,
        });

        const choice = response.choices[0];
        return {
            text: choice.message.content || "",
            toolCalls: choice.message.tool_calls,
            usage: { totalTokens: response.usage?.total_tokens || 0 },
            provider: 'groq',
            model,
        };
    }

    private static async generateCohere(model: string, system: string, user: string, _tools: any[]): Promise<AIResponse> {
        const config = this.providers.get('cohere');
        const apiKey = config?.apiKey || '';
        
        if (!apiKey) throw new Error("Cohere API key not configured");
        
        const prompt = `${system}\n\nUser: ${user}`;
        
        const response = await fetch("https://api.cohere.ai/v1/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model || "command-r-plus-20240522",
                prompt,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error(`Cohere API error: ${response.statusText}`);
        }

        const data = await response.json();

        return {
            text: data.generations?.[0]?.text || "",
            usage: { totalTokens: 0 },
            provider: 'cohere',
            model,
        };
    }

    private static async generateOpenRouter(model: string, system: string, user: string, tools: any[]): Promise<AIResponse> {
        const config = this.providers.get('openrouter');
        const apiKey = config?.apiKey || '';
        
        if (!apiKey) throw new Error("OpenRouter API key not configured");
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://echomen.ai",
                "X-Title": "ECHOMEN",
            },
            body: JSON.stringify({
                model: model || "openai/gpt-4o",
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ],
                tools: tools.length > 0 ? tools.map(t => ({ type: "function", function: t })) : undefined,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        const choice = data.choices[0];

        return {
            text: choice.message.content || "",
            toolCalls: choice.message.tool_calls,
            usage: { totalTokens: data.usage?.total_tokens || 0 },
            provider: 'openrouter',
            model,
        };
    }

    private static async generateTogether(model: string, system: string, user: string, _tools: any[]): Promise<AIResponse> {
        const config = this.providers.get('together');
        const apiKey = config?.apiKey || '';

        if (!apiKey) throw new Error("Together AI API key not configured");

        const response = await fetch("https://api.together.xyz/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model || "togethercomputer/llama-3.3-70b-instruct-turbo",
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error(`Together AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const choice = data.choices[0];

        return {
            text: choice.message.content || "",
            usage: { totalTokens: data.usage?.total_tokens || 0 },
            provider: 'together',
            model,
        };
    }

    private static async generateMistral(model: string, system: string, user: string, tools: any[]): Promise<AIResponse> {
        const config = this.providers.get('mistral');
        const apiKey = config?.apiKey || '';

        if (!apiKey) throw new Error("Mistral API key not configured");

        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model || "mistral-large-latest",
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ],
                tools: tools.length > 0 ? tools.map(t => ({ type: "function", function: t })) : undefined,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error(`Mistral API error: ${response.statusText}`);
        }

        const data = await response.json();
        const choice = data.choices[0];

        return {
            text: choice.message.content || "",
            toolCalls: choice.message.tool_calls,
            usage: { totalTokens: data.usage?.total_tokens || 0 },
            provider: 'mistral',
            model,
        };
    }

    private static async generateHuggingFace(model: string, system: string, user: string, _tools: any[]): Promise<AIResponse> {
        const config = this.providers.get('huggingface');
        const apiKey = config?.apiKey || '';

        if (!apiKey) throw new Error("Hugging Face API key not configured");

        const modelId = model || "meta-llama/Llama-3.3-70B-Instruct";
        const prompt = `<|system|>\n${system}</s>\n<|user|>\n${user}</s>\n<|assistant|>`;

        const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ],
                temperature: 0.7,
                max_tokens: 4096,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Hugging Face API error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0] || data;

        return {
            text: choice.message?.content || choice.generated_text || "",
            usage: { totalTokens: data.usage?.total_tokens || 0 },
            provider: 'huggingface',
            model,
        };
    }

    static detectTaskType(prompt: string): TaskType {
        const lowerPrompt = prompt.toLowerCase();
        
        const codeKeywords = ['code', 'function', 'class', 'implement', 'write', 'create', 'build', 'program', 'script'];
        const dataKeywords = ['analyze', 'data', 'chart', 'graph', 'visualize', 'statistics', 'calculate', 'process'];
        const reasoningKeywords = ['reason', 'explain', 'why', 'how', 'think', 'solve', 'problem', 'logic'];
        
        for (const keyword of codeKeywords) {
            if (lowerPrompt.includes(keyword)) return 'code';
        }
        
        for (const keyword of dataKeywords) {
            if (lowerPrompt.includes(keyword)) return 'data';
        }
        
        for (const keyword of reasoningKeywords) {
            if (lowerPrompt.includes(keyword)) return 'reasoning';
        }
        
        return 'chat';
    }
}

export default AIBridge;