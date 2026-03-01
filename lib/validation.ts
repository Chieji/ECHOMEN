/**
 * Zod Validation Schemas for ECHOMEN
 * 
 * Implements the validation requirements from PRD V1.1
 * All model outputs must pass Zod validation before execution
 */

import { z } from 'zod';

// PRD AgentPlan Schema
export const AgentPlanSchema = z.object({
    id: z.string(),
    steps: z.array(z.object({
        id: z.string(),
        action: z.string(),
        tool: z.string().optional(),
        expectedOutput: z.string().optional()
    }))
});

// Task validation schema
export const TaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(['Done', 'Executing', 'Queued', 'Error', 'Pending Review', 'Revising', 'Delegating', 'Cancelled']),
    agent: z.object({
        role: z.enum(['Planner', 'Executor', 'Reviewer', 'Synthesizer']),
        name: z.string()
    }),
    estimatedTime: z.string(),
    details: z.string(),
    dependencies: z.array(z.string()),
    logs: z.array(z.object({
        timestamp: z.string(),
        status: z.enum(['INFO', 'SUCCESS', 'ERROR', 'WARN']),
        message: z.string()
    })),
    reviewHistory: z.array(z.object({
        reviewer: z.string(),
        timestamp: z.string(),
        status: z.enum(['Approved', 'Changes Requested']),
        comments: z.string()
    })),
    retryCount: z.number(),
    maxRetries: z.number(),
    toolCall: z.object({
        name: z.string(),
        args: z.record(z.any())
    }).optional(),
    subSteps: z.array(z.object({
        thought: z.string(),
        toolCall: z.object({
            name: z.string(),
            args: z.record(z.any())
        }),
        observation: z.string()
    })).optional()
});

// Tool call validation
export const ToolCallSchema = z.object({
    name: z.string(),
    args: z.record(z.any())
});

// ReAct step validation
export const ReActStepSchema = z.object({
    thought: z.string(),
    toolCall: ToolCallSchema,
    observation: z.string()
});

// Playbook validation
export const PlaybookSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    triggerPrompt: z.string(),
    tasks: z.array(z.object({
        title: z.string(),
        details: z.string(),
        agent: z.object({
            role: z.enum(['Planner', 'Executor', 'Reviewer', 'Synthesizer']),
            name: z.string()
        }),
        estimatedTime: z.string()
    })),
    createdAt: z.string()
});

// AI Response validation
export const AIResponseSchema = z.object({
    text: z.string(),
    toolCalls: z.array(ToolCallSchema).optional(),
    usage: z.object({
        totalTokens: z.number()
    })
});

// Validation utility functions
export class ValidationError extends Error {
    constructor(message: string, public readonly details: any) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Validates and sanitizes AI model outputs
 */
export const validateAIResponse = (response: any, schema: z.ZodType<any>) => {
    try {
        const validated = schema.parse(response);
        return { success: true, data: validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const details = error.errors;
            throw new ValidationError(
                'AI response validation failed',
                details
            );
        }
        throw error;
    }
};

/**
 * Validates tool calls before execution
 */
export const validateToolCall = (toolCall: any) => {
    const result = validateAIResponse(toolCall, ToolCallSchema);
    if (!result.success) {
        const details = result.data;
        throw new ValidationError(
            'Invalid tool call',
            details
        );
    }
    return result.data;
};

/**
 * Validates complete agent plans
 */
export const validateAgentPlan = (plan: any) => {
    const result = validateAIResponse(plan, AgentPlanSchema);
    if (!result.success) {
        const details = result.data;
        throw new ValidationError(
            'Invalid agent plan',
            details
        );
    }
    return result.data;
};

/**
 * Retry logic with validation correction
 */
export const validatedRetry = async <T>(
    operation: () => Promise<T>,
    schema: z.ZodType<any>,
    maxRetries = 3
): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const result = await operation();
            const validated = validateAIResponse(result, schema);
            if (validated.success) {
                return validated.data;
            }
            const details = validated.data;
            lastError = new ValidationError(
                `Validation failed on attempt ${attempt + 1}`,
                details
            );
        } catch (error) {
            lastError = error as Error;
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw lastError!;
};

export { z };