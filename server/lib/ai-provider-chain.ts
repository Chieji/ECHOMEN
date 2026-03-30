/**
 * AI Provider Chain for ECHO
 * 
 * Smart routing across 7+ AI providers based on task type:
 * - Groq: Fast chat (<100ms latency)
 * - Gemini: Complex reasoning (default)
 * - Together AI: Code generation
 * - Cohere: Data processing
 * - OpenRouter: General purpose fallback
 * - Mistral: EU compliance
 * - Hugging Face: Specialized models
 */

import Groq from 'groq-sdk';
import { CohereClient } from 'cohere-ai';

export type ProviderType = 
  | 'groq'
  | 'gemini'
  | 'together'
  | 'cohere'
  | 'openrouter'
  | 'mistral'
  | 'huggingface';

export type TaskType = 
  | 'chat'           // Fast responses
  | 'reasoning'      // Complex logic
  | 'code'           // Code generation
  | 'data'           // Data processing
  | 'general'        // Default
  | 'eu-compliance'  // GDPR compliant
  | 'specialized';   // Niche models

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
  isDefault?: boolean;
}

export interface ProviderHealth {
  type: ProviderType;
  status: 'healthy' | 'degraded' | 'down';
  latency: number; // ms
  successRate: number; // 0-1
  lastChecked: number;
}

export interface CompletionRequest {
  prompt: string;
  systemPrompt?: string;
  taskType: TaskType;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  text: string;
  provider: ProviderType;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Smart routing logic - selects optimal provider based on task type
 */
export const selectProvider = (taskType: TaskType): ProviderType => {
  const routing: Record<TaskType, ProviderType> = {
    'chat': 'groq',           // Ultra-low latency
    'reasoning': 'gemini',    // Best complex reasoning
    'code': 'together',       // Code-specialized models
    'data': 'cohere',         // Data processing optimized
    'general': 'openrouter',  // Good all-rounder
    'eu-compliance': 'mistral', // EU-based, GDPR compliant
    'specialized': 'huggingface' // Niche/specialized models
  };
  
  return routing[taskType];
};

/**
 * AI Provider Chain - unified interface for multiple LLM providers
 */
export class AIProviderChain {
  private providers: Map<ProviderType, ProviderConfig> = new Map();
  private healthMetrics: Map<ProviderType, ProviderHealth> = new Map();
  private groqClient: Groq | null = null;
  private cohereClient: CohereClient | null = null;

  constructor() {
    this.initializeDefaultProviders();
  }

  private initializeDefaultProviders() {
    // Initialize with environment-based configs
    if (process.env.GROQ_API_KEY) {
      this.groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
      this.providers.set('groq', {
        type: 'groq',
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.1-70b-versatile',
        isDefault: false
      });
    }

    if (process.env.COHERE_API_KEY) {
      this.cohereClient = new CohereClient({ token: process.env.COHERE_API_KEY });
      this.providers.set('cohere', {
        type: 'cohere',
        apiKey: process.env.COHERE_API_KEY,
        model: 'command-r-plus',
        isDefault: false
      });
    }

    if (process.env.GEMINI_API_KEY) {
      this.providers.set('gemini', {
        type: 'gemini',
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-1.5-pro',
        isDefault: true // Default fallback
      });
    }

    if (process.env.TOGETHER_API_KEY) {
      this.providers.set('together', {
        type: 'together',
        apiKey: process.env.TOGETHER_API_KEY,
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        isDefault: false
      });
    }

    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set('openrouter', {
        type: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        model: 'meta-llama/llama-3-70b-instruct',
        baseUrl: 'https://openrouter.ai/api/v1',
        isDefault: false
      });
    }

    if (process.env.MISTRAL_API_KEY) {
      this.providers.set('mistral', {
        type: 'mistral',
        apiKey: process.env.MISTRAL_API_KEY,
        model: 'mistral-large-latest',
        isDefault: false
      });
    }

    if (process.env.HUGGINGFACE_API_KEY) {
      this.providers.set('huggingface', {
        type: 'huggingface',
        apiKey: process.env.HUGGINGFACE_API_KEY,
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        baseUrl: 'https://api-inference.huggingface.co/models',
        isDefault: false
      });
    }

    // Initialize health metrics
    this.providers.forEach((config) => {
      this.healthMetrics.set(config.type, {
        type: config.type,
        status: 'healthy',
        latency: 0,
        successRate: 1.0,
        lastChecked: Date.now()
      });
    });
  }

  /**
   * Add or update provider configuration
   */
  public addProvider(config: ProviderConfig) {
    this.providers.set(config.type, config);
    
    // Reinitialize clients if needed
    if (config.type === 'groq' && config.apiKey) {
      this.groqClient = new Groq({ apiKey: config.apiKey });
    } else if (config.type === 'cohere' && config.apiKey) {
      this.cohereClient = new CohereClient({ token: config.apiKey });
    }
  }

  /**
   * Get provider health status
   */
  public getHealthMetrics(): ProviderHealth[] {
    return Array.from(this.healthMetrics.values());
  }

  /**
   * Generate completion with smart routing
   */
  public async generate(request: CompletionRequest): Promise<CompletionResponse> {
    const providerType = selectProvider(request.taskType);
    const config = this.providers.get(providerType);

    if (!config) {
      // Fallback to default provider
      const defaultProvider = Array.from(this.providers.values()).find(p => p.isDefault);
      if (!defaultProvider) {
        throw new Error('No AI providers configured');
      }
      return this.executeProvider(defaultProvider, request);
    }

    try {
      return await this.executeProvider(config, request);
    } catch (error) {
      // Update health metrics
      this.updateHealth(providerType, false);
      
      // Try fallback chain
      const fallback = this.getFallbackProvider(providerType);
      if (fallback) {
        console.log(`Provider ${providerType} failed, falling back to ${fallback.type}`);
        return this.executeProvider(fallback, request);
      }
      
      throw error;
    }
  }

  /**
   * Execute completion with specific provider
   */
  private async executeProvider(
    config: ProviderConfig, 
    request: CompletionRequest
  ): Promise<CompletionResponse> {
    const startTime = Date.now();

    switch (config.type) {
      case 'groq':
        return this.executeGroq(config, request, startTime);
      
      case 'cohere':
        return this.executeCohere(config, request, startTime);
      
      case 'gemini':
        return this.executeGemini(config, request, startTime);
      
      case 'together':
        return this.executeTogether(config, request, startTime);
      
      case 'openrouter':
        return this.executeOpenRouter(config, request, startTime);
      
      case 'mistral':
        return this.executeMistral(config, request, startTime);
      
      case 'huggingface':
        return this.executeHuggingFace(config, request, startTime);
      
      default:
        throw new Error(`Unknown provider: ${config.type}`);
    }
  }

  private async executeGroq(
    config: ProviderConfig,
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    if (!this.groqClient) {
      throw new Error('Groq client not initialized');
    }

    const completion = await this.groqClient.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: request.prompt }
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
    });

    const latency = Date.now() - startTime;
    this.updateHealth('groq', true, latency);

    return {
      text: completion.choices[0]?.message?.content || '',
      provider: 'groq',
      model: config.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      }
    };
  }

  private async executeCohere(
    config: ProviderConfig,
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    if (!this.cohereClient) {
      throw new Error('Cohere client not initialized');
    }

    const response = await this.cohereClient.chat({
      model: config.model,
      message: request.prompt,
      preamble: request.systemPrompt,
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 2048,
    });

    const latency = Date.now() - startTime;
    this.updateHealth('cohere', true, latency);

    return {
      text: response.text || '',
      provider: 'cohere',
      model: config.model,
      usage: {
        promptTokens: response.meta?.tokens?.inputTokens || 0,
        completionTokens: response.meta?.tokens?.outputTokens || 0,
        totalTokens: (response.meta?.tokens?.inputTokens || 0) + (response.meta?.tokens?.outputTokens || 0)
      }
    };
  }

  private async executeGemini(
    config: ProviderConfig,
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    // Use REST API directly (no official SDK needed)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: request.prompt }]
        }],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 2048,
        }
      })
    });

    const data = await response.json();
    const latency = Date.now() - startTime;
    this.updateHealth('gemini', true, latency);

    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      provider: 'gemini',
      model: config.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      }
    };
  }

  private async executeTogether(
    config: ProviderConfig,
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    const url = 'https://api.together.xyz/v1/chat/completions';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      })
    });

    const data = await response.json();
    const latency = Date.now() - startTime;
    this.updateHealth('together', true, latency);

    return {
      text: data.choices?.[0]?.message?.content || '',
      provider: 'together',
      model: config.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  }

  private async executeOpenRouter(
    config: ProviderConfig,
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    const url = `${config.baseUrl}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Chieji/ECHOMEN',
        'X-Title': 'ECHOMEN'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      })
    });

    const data = await response.json();
    const latency = Date.now() - startTime;
    this.updateHealth('openrouter', true, latency);

    return {
      text: data.choices?.[0]?.message?.content || '',
      provider: 'openrouter',
      model: config.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  }

  private async executeMistral(
    config: ProviderConfig,
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    const url = 'https://api.mistral.ai/v1/chat/completions';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      })
    });

    const data = await response.json();
    const latency = Date.now() - startTime;
    this.updateHealth('mistral', true, latency);

    return {
      text: data.choices?.[0]?.message?.content || '',
      provider: 'mistral',
      model: config.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  }

  private async executeHuggingFace(
    config: ProviderConfig,
    request: CompletionRequest,
    startTime: number
  ): Promise<CompletionResponse> {
    const url = `${config.baseUrl}/${config.model}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: `<s>[INST] ${request.systemPrompt || 'You are a helpful assistant.'} [/INST] ${request.prompt}`,
        parameters: {
          temperature: request.temperature ?? 0.7,
          max_new_tokens: request.maxTokens ?? 2048,
        }
      })
    });

    const data = await response.json();
    const latency = Date.now() - startTime;
    this.updateHealth('huggingface', true, latency);

    return {
      text: Array.isArray(data) ? data[0]?.generated_text || '' : '',
      provider: 'huggingface',
      model: config.model,
      usage: {
        promptTokens: 0, // HF doesn't provide token counts
        completionTokens: 0,
        totalTokens: 0
      }
    };
  }

  /**
   * Get fallback provider for retry
   */
  private getFallbackProvider(failedType: ProviderType): ProviderConfig | null {
    // Priority fallback chain
    const fallbackOrder: ProviderType[] = [
      'openrouter', // Good general fallback
      'gemini',     // Reliable default
      'mistral'     // EU alternative
    ];

    for (const type of fallbackOrder) {
      if (type !== failedType) {
        const config = this.providers.get(type);
        const health = this.healthMetrics.get(type);
        
        if (config && health && health.status !== 'down') {
          return config;
        }
      }
    }

    return null;
  }

  /**
   * Update provider health metrics
   */
  private updateHealth(type: ProviderType, success: boolean, latency?: number) {
    const health = this.healthMetrics.get(type);
    if (!health) return;

    const alpha = 0.1; // Smoothing factor
    
    if (success) {
      health.successRate = (1 - alpha) * health.successRate + alpha * 1.0;
      if (latency) {
        health.latency = (1 - alpha) * health.latency + alpha * latency;
      }
    } else {
      health.successRate = (1 - alpha) * health.successRate + alpha * 0.0;
    }

    // Update status based on success rate
    if (health.successRate > 0.9) {
      health.status = 'healthy';
    } else if (health.successRate > 0.5) {
      health.status = 'degraded';
    } else {
      health.status = 'down';
    }

    health.lastChecked = Date.now();
  }

  /**
   * Test provider connectivity
   */
  public async testProvider(type: ProviderType): Promise<ProviderHealth> {
    const config = this.providers.get(type);
    if (!config) {
      throw new Error(`Provider ${type} not configured`);
    }

    try {
      await this.generate({
        prompt: 'Hello',
        taskType: 'chat',
        maxTokens: 10
      });
      
      return this.healthMetrics.get(type)!;
    } catch (error) {
      this.updateHealth(type, false);
      return this.healthMetrics.get(type)!;
    }
  }
}

// Export singleton instance
export const aiProviderChain = new AIProviderChain();
