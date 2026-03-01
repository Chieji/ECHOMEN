import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getSecureItem } from "./secureStorage";
import { Service } from "../types";

/**
 * Universal AI Bridge for ECHO
 */

export type AIProvider = 'google' | 'openai' | 'anthropic';

export interface AIResponse {
    text: string;
    toolCalls?: any[]; // We'll keep this as any[] for now due to provider variations
    usage: {
        totalTokens: number;
    };
}

export class AIBridge {
    private static async getClient(provider: AIProvider): Promise<GoogleGenAI | OpenAI | Anthropic> {
        const servicesData = await getSecureItem('echo-services');
        if (!servicesData) throw new Error(`Provider ${provider} not configured.`);
        
        const services = JSON.parse(servicesData) as Service[];
        const config = services.find(s => s.id === provider);
        
        if (!config || config.status !== 'Connected') {
            throw new Error(`${provider.toUpperCase()} is not connected.`);
        }

        const apiKey = await getSecureItem(`service_${provider}_apiKey`);
        if (!apiKey) throw new Error(`API Key for ${provider} missing.`);

        switch (provider) {
            case 'google':
                return new GoogleGenAI(apiKey);
            case 'openai':
                return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
            case 'anthropic':
                return new Anthropic({ apiKey });
            default:
                throw new Error("Unsupported provider");
        }
    }

    /**
     * Executes a completion request across any supported provider.
     */
    static async generate(
        provider: AIProvider, 
        model: string, 
        systemPrompt: string, 
        userPrompt: string, 
        tools: any[]
    ): Promise<AIResponse> {
        console.log(`[AI Bridge] Routing request to ${provider} (${model})`);
        
        switch (provider) {
            case 'openai':
                return this.generateOpenAI(model, systemPrompt, userPrompt, tools);
            case 'anthropic':
                return this.generateAnthropic(model, systemPrompt, userPrompt, tools);
            case 'google':
            default:
                return this.generateGemini(model, systemPrompt, userPrompt, tools);
        }
    }

    private static async generateGemini(model: string, system: string, user: string, tools: any[]): Promise<AIResponse> {
        // Logic for Gemini generation
        return { text: "Routing to Gemini Native...", usage: { totalTokens: 0 } };
    }

    private static async generateOpenAI(model: string, system: string, user: string, tools: any[]): Promise<AIResponse> {
        const client = await this.getClient('openai') as OpenAI;
        const response = await client.chat.completions.create({
            model: model || "gpt-4o",
            messages: [
                { role: "system", content: system },
                { role: "user", content: user }
            ],
            tools: tools.map(t => ({ type: "function", function: t }))
        });

        return {
            text: response.choices[0].message.content || "",
            toolCalls: response.choices[0].message.tool_calls,
            usage: { totalTokens: response.usage?.total_tokens || 0 }
        };
    }

    private static async generateAnthropic(model: string, system: string, user: string, tools: any[]): Promise<AIResponse> {
        const client = await this.getClient('anthropic') as Anthropic;
        const response = await client.messages.create({
            model: model || "claude-3-5-sonnet-latest",
            max_tokens: 4096,
            system: system,
            messages: [{ role: "user", content: user }],
            tools: tools as any // Anthropic tool schema mapping
        });

        return {
            text: (response.content[0] as any).text || "",
            toolCalls: response.content.filter(c => c.type === 'tool_use'),
            usage: { totalTokens: response.usage.input_tokens + response.usage.output_tokens }
        };
    }
}
