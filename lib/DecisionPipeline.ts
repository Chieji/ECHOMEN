/**
 * ECHOMEN Decision Pipeline
 * 
 * Implements multi-stage decision making with validation,
 * constraint checking, and fallback chains.
 */

import { z } from 'zod';
import { Tool, ToolRegistry } from './ToolRegistry';

export interface Goal {
  id: string;
  type: 'query' | 'action' | 'create' | 'analyze' | 'browse';
  description: string;
  constraints?: string[];
}

export interface Intent {
  type: Goal['type'];
  confidence: number;
  entities: Entity[];
  constraints: Constraint[];
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
}

export interface Constraint {
  type: 'time' | 'resource' | 'permission' | 'quality';
  value: string;
  strict: boolean;
}

export interface Context {
  goal: Goal;
  playbooks: any[];
  similarCases: any[];
  session: any;
}

export interface ActionOption {
  tool: Tool;
  args: any;
  expectedOutcome: string;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
  estimatedDuration: number;
}

export interface Decision {
  tool: Tool;
  args: any;
  confidence: number;
  alternatives: ActionOption[];
}

export interface ValidationResult {
  valid: boolean;
  violations: ConstraintViolation[];
  warnings: string[];
}

export interface ConstraintViolation {
  constraint: Constraint;
  reason: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// Decision Pipeline
// ============================================================================

export class DecisionPipeline {
  private toolRegistry: ToolRegistry;
  
  constructor(toolRegistry: ToolRegistry) {
    this.toolRegistry = toolRegistry;
  }
  
  async makeDecision(goal: Goal, context: any): Promise<Decision> {
    // Stage 1: Intent Classification
    const intent = await this.classifyIntent(goal);
    
    // Stage 2: Context Retrieval
    const retrievalContext = await this.retrieveContext(intent, context);
    
    // Stage 3: Option Generation
    const options = await this.generateOptions(intent, retrievalContext);
    
    // Stage 4: Constraint Check
    const validOptions = await this.checkConstraints(options, goal.constraints || []);
    
    // Stage 5: Selection
    const selected = this.selectBest(validOptions);
    
    // Stage 6: Validation
    const validated = await this.validateDecision(selected, goal);
    
    return validated;
  }
  
  // ============================================================================
  // Stage 1: Intent Classification
  // ============================================================================
  
  private async classifyIntent(goal: Goal): Promise<Intent> {
    const lowerDesc = goal.description.toLowerCase();
    
    // Simple keyword-based classification
    // Can be enhanced with ML model
    const typeKeywords: Record<Goal['type'], string[]> = {
      query: ['what', 'how', 'why', 'explain', 'tell', 'find', 'search'],
      action: ['run', 'execute', 'start', 'stop', 'restart', 'deploy'],
      create: ['create', 'make', 'build', 'write', 'generate', 'add'],
      analyze: ['analyze', 'check', 'review', 'examine', 'inspect'],
      browse: ['navigate', 'open', 'visit', 'go to', 'browse']
    };
    
    const scores: Record<Goal['type'], number> = {
      query: 0,
      action: 0,
      create: 0,
      analyze: 0,
      browse: 0
    };
    
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      for (const keyword of keywords) {
        if (lowerDesc.includes(keyword)) {
          scores[type as Goal['type']] += 1;
        }
      }
    }
    
    // Find best match
    let bestType: Goal['type'] = 'query';
    let bestScore = 0;
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type as Goal['type'];
      }
    }
    
    // Extract entities (simple regex)
    const entities = this.extractEntities(goal.description);
    
    // Extract constraints
    const constraints = this.extractConstraints(goal);
    
    return {
      type: bestType,
      confidence: Math.min(bestScore / 3, 1.0), // Normalize
      entities,
      constraints
    };
  }
  
  private extractEntities(description: string): Entity[] {
    const entities: Entity[] = [];
    
    // Extract file paths
    const pathRegex = /\/[\w/.-]+/g;
    const paths = description.match(pathRegex) || [];
    for (const path of paths) {
      entities.push({
        type: 'file_path',
        value: path,
        confidence: 0.9
      });
    }
    
    // Extract URLs
    const urlRegex = /https?:\/\/[\w./-]+/g;
    const urls = description.match(urlRegex) || [];
    for (const url of urls) {
      entities.push({
        type: 'url',
        value: url,
        confidence: 0.95
      });
    }
    
    // Extract code references
    const codeRegex = /`[^`]+`/g;
    const codes = description.match(codeRegex) || [];
    for (const code of codes) {
      entities.push({
        type: 'code',
        value: code.slice(1, -1),
        confidence: 0.85
      });
    }
    
    return entities;
  }
  
  private extractConstraints(goal: Goal): Constraint[] {
    const constraints: Constraint[] = [];
    const lowerDesc = goal.description.toLowerCase();
    
    // Time constraints
    if (lowerDesc.includes('quickly') || lowerDesc.includes('fast')) {
      constraints.push({
        type: 'time',
        value: 'fast',
        strict: false
      });
    }
    
    if (lowerDesc.includes('carefully') || lowerDesc.includes('thorough')) {
      constraints.push({
        type: 'quality',
        value: 'high',
        strict: false
      });
    }
    
    // Add goal constraints
    if (goal.constraints) {
      for (const constraint of goal.constraints) {
        constraints.push({
          type: 'resource',
          value: constraint,
          strict: true
        });
      }
    }
    
    return constraints;
  }
  
  // ============================================================================
  // Stage 2: Context Retrieval
  // ============================================================================
  
  private async retrieveContext(intent: Intent, context: any): Promise<any> {
    return {
      intent,
      playbooks: context.playbooks || [],
      similarCases: context.similarCases || [],
      session: context.session || {}
    };
  }
  
  // ============================================================================
  // Stage 3: Option Generation
  // ============================================================================
  
  private async generateOptions(intent: Intent, context: any): Promise<ActionOption[]> {
    const tools = this.toolRegistry.list();
    const options: ActionOption[] = [];
    
    for (const tool of tools) {
      // Check if tool matches intent type
      const matchScore = this.calculateToolMatch(tool, intent);
      
      if (matchScore > 0.3) {
        options.push({
          tool,
          args: this.generateToolArgs(tool, intent, context),
          expectedOutcome: tool.description,
          confidence: matchScore,
          risk: this.assessRisk(tool),
          estimatedDuration: tool.timeout / 1000
        });
      }
    }
    
    return options.sort((a, b) => b.confidence - a.confidence);
  }
  
  private calculateToolMatch(tool: Tool, intent: Intent): number {
    const toolDesc = tool.description.toLowerCase();
    const intentType = intent.type;
    
    // Simple keyword matching
    // Can be enhanced with embeddings
    const typeKeywords: Record<Goal['type'], string[]> = {
      query: ['read', 'get', 'list', 'search'],
      action: ['execute', 'run', 'start', 'stop'],
      create: ['write', 'create', 'make', 'build'],
      analyze: ['analyze', 'check', 'validate'],
      browse: ['navigate', 'browse', 'visit']
    };
    
    let score = 0;
    for (const keyword of typeKeywords[intentType]) {
      if (toolDesc.includes(keyword)) {
        score += 0.5;
      }
    }
    
    // Boost if tool name matches intent
    if (tool.name.toLowerCase().includes(intentType)) {
      score += 0.3;
    }
    
    return Math.min(score, 1.0);
  }
  
  private generateToolArgs(tool: Tool, intent: Intent, context: any): any {
    // Generate args based on tool schema and intent entities
    // This is a placeholder - real implementation would use schema inference
    return {
      query: intent.entities.find(e => e.type === 'query')?.value || ''
    };
  }
  
  private assessRisk(tool: Tool): 'low' | 'medium' | 'high' {
    if (tool.requiresApproval) {
      return 'high';
    }
    
    if (tool.effects.some(e => e.type === 'delete' || e.type === 'create')) {
      return 'medium';
    }
    
    return 'low';
  }
  
  // ============================================================================
  // Stage 4: Constraint Check
  // ============================================================================
  
  private async checkConstraints(
    options: ActionOption[],
    constraints: Constraint[]
  ): Promise<ActionOption[]> {
    const valid: ActionOption[] = [];
    
    for (const option of options) {
      const violations: ConstraintViolation[] = [];
      
      for (const constraint of constraints) {
        const violation = await this.checkConstraint(option, constraint);
        if (violation) {
          violations.push(violation);
        }
      }
      
      // Only include if no error-level violations
      const hasError = violations.some(v => v.severity === 'error');
      if (!hasError) {
        valid.push(option);
      }
    }
    
    return valid;
  }
  
  private async checkConstraint(
    option: ActionOption,
    constraint: Constraint
  ): Promise<ConstraintViolation | null> {
    switch (constraint.type) {
      case 'time':
        if (constraint.value === 'fast' && option.estimatedDuration > 30) {
          return {
            constraint,
            reason: `Tool takes ${option.estimatedDuration}s, expected fast`,
            severity: constraint.strict ? 'error' : 'warning'
          };
        }
        break;
        
      case 'quality':
        if (constraint.value === 'high' && option.risk === 'high') {
          return {
            constraint,
            reason: 'High-risk tool may not meet quality requirements',
            severity: 'warning'
          };
        }
        break;
        
      case 'resource':
        // Check if required resources are available
        // Placeholder - real implementation would check actual resources
        break;
        
      case 'permission':
        // Check if tool has required permissions
        // Placeholder - real implementation would check permissions
        break;
    }
    
    return null;
  }
  
  // ============================================================================
  // Stage 5: Selection
  // ============================================================================
  
  private selectBest(options: ActionOption[]): Decision {
    if (options.length === 0) {
      throw new Error('No valid options available');
    }
    
    // Select highest confidence option
    const selected = options[0];
    
    return {
      tool: selected.tool,
      args: selected.args,
      confidence: selected.confidence,
      alternatives: options.slice(1, 4) // Top 3 alternatives
    };
  }
  
  // ============================================================================
  // Stage 6: Validation
  // ============================================================================
  
  private async validateDecision(decision: Decision, goal: Goal): Promise<Decision> {
    // Check confidence threshold
    if (decision.confidence < 0.5) {
      console.warn(
        `[DecisionPipeline] Low confidence decision: ${decision.confidence}`
      );
      
      // Fall back to safest alternative
      if (decision.alternatives.length > 0) {
        const safeAlternative = decision.alternatives.find(
          alt => alt.risk === 'low'
        );
        
        if (safeAlternative) {
          return {
            tool: safeAlternative.tool,
            args: safeAlternative.args,
            confidence: safeAlternative.confidence,
            alternatives: decision.alternatives
          };
        }
      }
    }
    
    // Check risk threshold
    if (decision.tool.requiresApproval) {
      console.log(
        `[DecisionPipeline] Tool ${decision.tool.name} requires human approval`
      );
    }
    
    return decision;
  }
}

// ============================================================================
// Intent Classifier (Standalone)
// ============================================================================

export class IntentClassifier {
  async classify(description: string): Promise<Intent> {
    // Can be used standalone for intent classification
    const lowerDesc = description.toLowerCase();
    
    // Simple heuristic classification
    const type = this.detectType(lowerDesc);
    const entities = this.extractEntities(description);
    const constraints = this.extractConstraints({ description, type } as Goal);
    
    return {
      type,
      confidence: 0.7, // Placeholder
      entities,
      constraints
    };
  }
  
  private detectType(description: string): Goal['type'] {
    if (description.includes('?') || description.startsWith('what') || description.startsWith('how')) {
      return 'query';
    }
    
    if (description.includes('create') || description.includes('make') || description.includes('write')) {
      return 'create';
    }
    
    if (description.includes('analyze') || description.includes('check')) {
      return 'analyze';
    }
    
    if (description.includes('navigate') || description.includes('open')) {
      return 'browse';
    }
    
    return 'action';
  }
  
  private extractEntities(description: string): Entity[] {
    // Same as in DecisionPipeline
    return [];
  }
  
  private extractConstraints(goal: Goal): Constraint[] {
    // Same as in DecisionPipeline
    return [];
  }
}
