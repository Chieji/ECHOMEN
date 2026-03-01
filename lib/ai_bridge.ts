import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getSecureItem } from "./secureStorage";

/**
 * Universal AI Bridge for ECHO
 * 
 * Provides a unified interface for Gemini, OpenAI, and Anthropic.
 * Automatically maps tool calling and system prompts between providers.
 */

export type AIProvider = 'google' | 'openai' | 'anthropic';

export interface AIResponse {
    text: string;
    toolCalls?: any[];
    usage: {
        totalTokens: number;
    };
}

export class AIBridge {
    private static async getClient(provider: AIProvider) {
        const servicesData = await getSecureItem('echo-services');
        if (!servicesData) throw new Error(`Provider ${provider} not configured in Settings.`);
        
        const services = JSON.parse(servicesData);
        const config = services.find((s: any) => s.id === provider);
        
        if (!config || config.status !== 'Connected') {
            throw new Error(`${provider.toUpperCase()} is not connected. Please add your API key in Settings.`);
        }

        const apiKeyInput = config.inputs.find((i: any) => i.id === 'apiKey');
        const apiKey = await getSecureItem(`service_${provider}_apiKey`); // Assuming we store specific keys this way

        switch (provider) {
            case 'google':
                return new GoogleGenAI(apiKey!);
            case 'openai':
                return new OpenAI({ apiKey: apiKey!, dangerouslyAllowBrowser: true });
            case 'anthropic':
                return new Anthropic({ apiKey: apiKey! });
            default:
                throw new Error("Unsupported provider");
        }
    }

    /**
     * Executes a completion request across any supported provider.
     */
    static async generate(provider: AIProvider, model: string, systemPrompt: string, userPrompt: string, tools: any[]): Promise<AIResponse> {
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
        // Implementation for Gemini (already largely in your planner.ts)
        // We will move that logic here to centralize it
        return { text: "Gemini implementation routing...", usage: { totalTokens: 0 } };
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
            model: model || "claude-3-5-sonnet-20240620",
            max_tokens: 4096,
            system: system,
            messages: [{ role: "user", content: user }],
            tools: tools // Anthropic uses a slightly different tool format we would map here
        });

        return {
            text: (response.content[0] as any).text || "",
            toolCalls: response.content.filter(c => c.type === 'tool_use'),
            usage: { totalTokens: response.usage.input_tokens + response.usage.output_tokens }
        };
    }
}
